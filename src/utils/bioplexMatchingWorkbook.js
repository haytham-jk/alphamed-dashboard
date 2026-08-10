import { strFromU8, unzipSync } from "fflate";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const EMPTY_MARKERS = new Set(["", "NA", "N/A", "/", "PRINTED"]);

function dateResult(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();
    return {
      value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      raw: `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`,
      issue: "",
    };
  }

  const raw = String(value ?? "").trim();
  if (!raw) return { value: null, raw: "", issue: "" };

  const match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/.exec(raw);
  if (!match) return { value: null, raw, issue: "INVALID_DATE" };

  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += year >= 70 ? 1900 : 2000;

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day ||
    year < 1990 ||
    year > 2100
  ) {
    return { value: null, raw, issue: "INVALID_DATE" };
  }

  return {
    value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    raw,
    issue: "",
  };
}
function text(value){if(value instanceof Date)return dateResult(value).raw;return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();}
function upper(value){return text(value).toUpperCase();}
export function normalizeLot(value){const normalized=upper(value);return EMPTY_MARKERS.has(normalized)?"":normalized;}
export function dateToIso(value){return dateResult(value);}
function headerIndex(headers,tests){return headers.findIndex((value)=>tests.some((test)=>test.test(value)));}
function allHeaderIndexes(headers,tests){return headers.map((value,index)=>tests.some((test)=>test.test(value))?index:-1).filter((index)=>index>=0);}
const MAX_UNCOMPRESSED_XML_BYTES = 120 * 1024 * 1024;

function columnToIndex(columnLetters) {
  let result = 0;
  for (const character of columnLetters) {
    result = result * 26 + character.charCodeAt(0) - 64;
  }
  return result - 1;
}

function parseCellReference(reference) {
  const match = /^([A-Z]+)(\d+)$/i.exec(String(reference ?? "").trim());
  if (!match) return null;
  return {
    row: Number(match[2]) - 1,
    column: columnToIndex(match[1].toUpperCase()),
  };
}

function parseMergeReference(reference) {
  const [fromReference, toReference = fromReference] = String(reference ?? "").split(":");
  const from = parseCellReference(fromReference);
  const to = parseCellReference(toReference);
  if (!from || !to) return null;
  return {
    reference,
    fromRow: Math.min(from.row, to.row),
    toRow: Math.max(from.row, to.row),
    fromColumn: Math.min(from.column, to.column),
    toColumn: Math.max(from.column, to.column),
  };
}

function xmlElements(document, localName) {
  return [...document.getElementsByTagNameNS("*", localName)];
}

function parseXml(xml, label) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error(`The workbook contains unreadable ${label} XML.`);
  }
  return document;
}

function resolveWorkbookTarget(target) {
  const clean = String(target ?? "").replace(/^\//, "");
  if (clean.startsWith("xl/")) return clean;
  return `xl/${clean.replace(/^\.\//, "")}`;
}

function extractWorkbookMergeMap(arrayBuffer) {
  let expandedBytes = 0;
  const wanted = new Set([
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
  ]);
  const archive = unzipSync(new Uint8Array(arrayBuffer), {
    filter(file) {
      const keep = wanted.has(file.name) || /^xl\/worksheets\/sheet\d+\.xml$/i.test(file.name);
      if (!keep) return false;
      expandedBytes += Number(file.originalSize || 0);
      if (expandedBytes > MAX_UNCOMPRESSED_XML_BYTES) {
        throw new Error("The workbook expands beyond the safe XML processing limit.");
      }
      return true;
    },
  });

  const workbookBytes = archive["xl/workbook.xml"];
  const relationshipsBytes = archive["xl/_rels/workbook.xml.rels"];
  if (!workbookBytes || !relationshipsBytes) {
    throw new Error("The workbook is missing required worksheet metadata.");
  }

  const workbookDocument = parseXml(strFromU8(workbookBytes), "workbook");
  const relationshipsDocument = parseXml(strFromU8(relationshipsBytes), "relationship");
  const targetsById = new Map(
    xmlElements(relationshipsDocument, "Relationship").map((relationship) => [
      relationship.getAttribute("Id"),
      resolveWorkbookTarget(relationship.getAttribute("Target")),
    ])
  );

  const mergeMap = new Map();
  for (const sheet of xmlElements(workbookDocument, "sheet")) {
    const sheetName = sheet.getAttribute("name");
    const relationshipId =
      sheet.getAttribute("r:id") ||
      sheet.getAttributeNS(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "id"
      );
    const worksheetPath = targetsById.get(relationshipId);
    const worksheetBytes = worksheetPath ? archive[worksheetPath] : null;
    if (!sheetName || !worksheetBytes) continue;

    const worksheetDocument = parseXml(strFromU8(worksheetBytes), `worksheet ${sheetName}`);
    const ranges = xmlElements(worksheetDocument, "mergeCell")
      .map((node) => parseMergeReference(node.getAttribute("ref")))
      .filter(Boolean);
    mergeMap.set(sheetName, ranges);
  }

  return mergeMap;
}

export function applyMergedCellValues(rows, mergeRanges = []) {
  const effectiveRows = rows.map((row) => [...row]);
  const inheritedByCell = new Map();

  for (const range of mergeRanges) {
    const sourceValue = effectiveRows[range.fromRow]?.[range.fromColumn];
    for (let rowIndex = range.fromRow; rowIndex <= range.toRow; rowIndex += 1) {
      if (!effectiveRows[rowIndex]) effectiveRows[rowIndex] = [];
      for (
        let columnIndex = range.fromColumn;
        columnIndex <= range.toColumn;
        columnIndex += 1
      ) {
        if (rowIndex === range.fromRow && columnIndex === range.fromColumn) continue;
        effectiveRows[rowIndex][columnIndex] = sourceValue;
        inheritedByCell.set(`${rowIndex}:${columnIndex}`, {
          mergeRange: range.reference,
          sourceRowNumber: range.fromRow + 1,
          sourceColumnNumber: range.fromColumn + 1,
        });
      }
    }
  }

  return { rows: effectiveRows, inheritedByCell };
}

function inheritedCellsForRow(inheritedByCell, rowIndex) {
  const inherited = [];
  for (const [key, metadata] of inheritedByCell.entries()) {
    const [cellRow, cellColumn] = key.split(":").map(Number);
    if (cellRow !== rowIndex) continue;
    inherited.push({
      columnNumber: cellColumn + 1,
      ...metadata,
    });
  }
  return inherited.sort((first, second) => first.columnNumber - second.columnNumber);
}

function sourceValues(row, inheritedCells = []){return{cells:row.map((value)=>value instanceof Date?dateResult(value).value:text(value)),inheritedMergedCells:inheritedCells};}
function splitCellLots(value){const raw=normalizeLot(value);return raw?raw.split(/\s*[,;]\s*|\s+\/\s+/).map(normalizeLot).filter(Boolean):[];}
function unique(values){return[...new Set(values.filter(Boolean))];}
function detectSections(rows){const found=[];rows.forEach((row,index)=>row.forEach((value)=>{const v=upper(value);if(v==="KITS"||v==="CONTROLS")found.push({type:v,start:index});}));found.sort((a,b)=>a.start-b.start);return found.map((section,index)=>({...section,end:found[index+1]?.start??rows.length}));}
function status(issues){return issues.includes("MISSING_LOT")||issues.includes("INVALID_DATE")||issues.includes("UNREADABLE_SECTION")?"Invalid":issues.length?"Warning":"Valid";}
function buildRow({sheetName,rowIndex,sectionType,assayName,materialType,lot,release,expiry,ccCode,relatedLot="",relatedMaterialType=null,row,inheritedCells=[],issues=[]}){const codes=[...new Set(issues.filter(Boolean))];const reviewStatus=status(codes);return{sheetName,sourceRowNumber:rowIndex+1,sectionType,assayNameRaw:assayName,assayNameNormalized:upper(assayName),materialType,ccCodeRaw:text(ccCode),productCodeRaw:"",lotNumberRaw:lot,lotNumberNormalized:normalizeLot(lot),releaseDateRaw:release.raw,releaseDate:release.value,expiryDateRaw:expiry.raw,expiryDate:expiry.value,relatedLotRaw:relatedLot,relatedLotNormalized:normalizeLot(relatedLot),relatedMaterialType,sourceValues:sourceValues(row,inheritedCells),issueCodes:codes,reviewStatus,proposedAction:reviewStatus==="Invalid"?"Review":"Create",reviewMessage:codes.join(", ")};}
function parseSection(sheetName,rows,section,inheritedByCell=new Map()){const assayName=/^SHEET\d*$/i.test(sheetName)?"":sheetName;let h=-1;for(let i=section.start+1;i<Math.min(section.end,section.start+8);i+=1){const joined=(rows[i]??[]).map(upper).join("|");if(joined.includes("BN")&&(joined.includes("EXPIR")||joined.includes("RELEASE"))){h=i;break;}}if(h<0)return[buildRow({sheetName,rowIndex:section.start,sectionType:section.type,assayName,materialType:section.type==="KITS"?"kit":"qc",lot:"",release:dateResult(null),expiry:dateResult(null),ccCode:"",row:rows[section.start]??[],issues:["UNREADABLE_SECTION","MISSING_LOT"]})];const headers=(rows[h]??[]).map(upper);const output=[];const ccIndex=headerIndex(headers,[/CC CODE/,/DC CODE/]);if(section.type==="KITS"){const kitIndex=headerIndex(headers,[/KIT BN/,/KIT BATCH/]);const kitRelease=headerIndex(headers,[/KIT RELEASE/]);const kitExpiry=headerIndex(headers,[/KIT EXPIR/]);const calSetIndex=headerIndex(headers,[/CALIBRATOR SET BN/]);const calRelease=headerIndex(headers,[/CALIBRATOR SET RELEASE/]);const calExpiry=headerIndex(headers,[/CALIBRATOR SET EXPIR/]);const cdIndexes=allHeaderIndexes(headers,[/CALIBRATOR CD BN/]);for(let r=h+1;r<section.end;r+=1){const row=rows[r]??[];const inheritedCells=inheritedCellsForRow(inheritedByCell,r);const kit=normalizeLot(row[kitIndex]);const calSet=normalizeLot(row[calSetIndex]);const cds=unique(cdIndexes.flatMap((index)=>splitCellLots(row[index])));const calibrators=unique([calSet,...cds]);if(!kit&&!calibrators.length)continue;const kr=dateResult(row[kitRelease]),ke=dateResult(row[kitExpiry]),cr=dateResult(row[calRelease]),ce=dateResult(row[calExpiry]);const commonIssues=[kr.issue,ke.issue,cr.issue,ce.issue].filter(Boolean);if(kit){if(calibrators.length){calibrators.forEach((cal)=>output.push(buildRow({sheetName,rowIndex:r,sectionType:section.type,assayName,materialType:"calibrator",lot:cal,release:cr,expiry:ce,ccCode:row[ccIndex],row,inheritedCells,issues:commonIssues})));calibrators.forEach((cal)=>output.push(buildRow({sheetName,rowIndex:r,sectionType:section.type,assayName,materialType:"kit",lot:kit,release:kr,expiry:ke,ccCode:row[ccIndex],relatedLot:cal,relatedMaterialType:"calibrator",row,inheritedCells,issues:commonIssues})));}else output.push(buildRow({sheetName,rowIndex:r,sectionType:section.type,assayName,materialType:"kit",lot:kit,release:kr,expiry:ke,ccCode:row[ccIndex],row,inheritedCells,issues:[...commonIssues,"MISSING_CALIBRATOR"]}));}else calibrators.forEach((cal)=>output.push(buildRow({sheetName,rowIndex:r,sectionType:section.type,assayName,materialType:"calibrator",lot:cal,release:cr,expiry:ce,ccCode:row[ccIndex],row,inheritedCells,issues:commonIssues})));}}
else{const setIndex=headerIndex(headers,[/CONTROL SET BN/,/SET BN/]);const relIndex=headerIndex(headers,[/SET RELEASE/]);const expIndex=headerIndex(headers,[/SET EXPIR/]);const cdIndexes=allHeaderIndexes(headers,[/CONTROL CD BN/,/CONTROL CB BN/]);for(let r=h+1;r<section.end;r+=1){const row=rows[r]??[];const inheritedCells=inheritedCellsForRow(inheritedByCell,r);const setLot=normalizeLot(row[setIndex]);const cds=unique(cdIndexes.flatMap((index)=>splitCellLots(row[index])));const lots=unique([setLot,...cds]);if(!lots.length)continue;const release=dateResult(row[relIndex]),expiry=dateResult(row[expIndex]);const issues=[release.issue,expiry.issue].filter(Boolean);lots.forEach((lot)=>output.push(buildRow({sheetName,rowIndex:r,sectionType:section.type,assayName,materialType:"qc",lot,release,expiry,ccCode:row[ccIndex],row,inheritedCells,issues})));}}
return output;}
function classifyDuplicates(rows){const seen=new Map();return rows.map((row)=>{const key=[row.assayNameNormalized,row.materialType,row.lotNumberNormalized,row.relatedMaterialType??"",row.relatedLotNormalized??""].join("|");if(!row.lotNumberNormalized||row.reviewStatus==="Invalid")return row;if(seen.has(key))return{...row,reviewStatus:"Exact Duplicate",proposedAction:"Skip Duplicate",issueCodes:[...row.issueCodes,"DUPLICATE_IN_FILE"],reviewMessage:`Exact duplicate of ${seen.get(key)}.`};seen.set(key,`${row.sheetName}:${row.sourceRowNumber}`);return row;});}
export async function parseBioplexMatchingWorkbook(file){
  if(!file) throw new Error("Select an .xlsx matching workbook.");
  if(!/\.xlsx$/i.test(file.name)) throw new Error("Only .xlsx matching workbooks are accepted.");
  if(file.size>MAX_FILE_BYTES) throw new Error("The workbook exceeds the 25 MB safety limit.");

  const arrayBuffer = await file.arrayBuffer();
  const mergeMap = extractWorkbookMergeMap(arrayBuffer);
  const workbookFile = new File([arrayBuffer], file.name, {
    type: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const {default:readExcelFile}=await import("read-excel-file/browser");
  const sheets=await readExcelFile(workbookFile);
  const parsed=[];
  for(const sheet of sheets){
    const effective = applyMergedCellValues(sheet.data??[], mergeMap.get(sheet.sheet)??[]);
    for(const section of detectSections(effective.rows)){
      parsed.push(...parseSection(sheet.sheet,effective.rows,section,effective.inheritedByCell));
    }
  }
  const rows=classifyDuplicates(parsed);
  return{fileName:file.name,sheetCount:sheets.length,rows,summary:summarizeImportRows(rows)};
}
export function summarizeImportRows(rows){const summary={total:rows.length,valid:0,warning:0,exactDuplicate:0,possibleDuplicate:0,conflict:0,invalid:0,excluded:0};for(const row of rows){const key={Valid:"valid",Warning:"warning","Exact Duplicate":"exactDuplicate","Possible Duplicate":"possibleDuplicate",Conflict:"conflict",Invalid:"invalid",Excluded:"excluded"}[row.reviewStatus];if(key)summary[key]+=1;}return summary;}
