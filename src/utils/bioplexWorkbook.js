import { dateCell, formatBioplexDate } from "./bioplexDates";
import { buildBioplexInventoryGroups, orderedUniqueInventoryItems } from "./bioplexInventoryGrouping";

const TITLE = { fontWeight: "bold", fontColor: "#FFFFFF", backgroundColor: "#0F172A", fontSize: 16, height: 28, align: "left", verticalAlign: "center" };
const HEADER = { fontWeight: "bold", fontColor: "#FFFFFF", backgroundColor: "#1D4ED8", wrap: true };
const ASSAY = { fontWeight: "bold", fontColor: "#FFFFFF", backgroundColor: "#0F766E", height: 24 };
const ZERO = { fontWeight: "bold", fontColor: "#7E22CE", backgroundColor: "#F3E8FF" };
const text = (value) => String(value ?? "").trim();
const cell = (value, style = {}) => ({ value, ...style });
const date = (value) => { const parsed = dateCell(value); return parsed ? cell(parsed, { format: "dd/mm/yyyy" }) : null; };
const qty = (value) => value === null || value === undefined ? null : Number(value) === 0 ? cell(0, ZERO) : Number(value);
const typeRank = { kit: 0, calibrator: 1, qc: 2, consumable: 3 };

function groupedItems(record) {
  const unique = orderedUniqueInventoryItems(record.items, record.links);
  const groups = new Map();
  for (const item of unique) {
    const assay = text(item.assay_name_snapshot) || "Unassigned assay";
    const list = groups.get(assay) ?? [];
    list.push(item);
    groups.set(assay, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([assay, items]) => ({
    assay,
    items: items.sort((a, b) => (typeRank[a.material_type] ?? 9) - (typeRank[b.material_type] ?? 9) || (a.display_order ?? 0) - (b.display_order ?? 0) || text(a.product_name_snapshot).localeCompare(text(b.product_name_snapshot))),
  }));
}
function reportTitle(prefix, count) {
  return `${prefix} - ${text(count.customers?.customer_name) || "Customer"} - ${formatBioplexDate(count.counted_on)}`;
}
function sheet(name, title, headers, rows, widths) {
  return { sheet: name, data: [[cell(title, { ...TITLE, span: headers.length })], [], headers.map((header) => cell(header, HEADER)), ...rows], columns: widths.map((width) => ({ width })), freezeRows: 3, stickyRowsCount: 3 };
}
function assayRows(record, columns, mapper) {
  const output = [];
  for (const group of groupedItems(record)) {
    output.push([cell(group.assay, { ...ASSAY, span: columns })]);
    group.items.forEach((item) => output.push(mapper(item)));
  }
  return output;
}
function detailedRow(item, count) {
  return [date(count.counted_on), count.id, text(item.assay_name_snapshot), text(item.material_type), text(item.product_name_snapshot), text(item.product_code_snapshot), text(item.lot_number), date(item.expiry_date), qty(item.quantity), text(item.verification_status), text(item.notes)];
}
export async function createDetailed(record) {
  const count = record.count;
  return [
    sheet("Summary", reportTitle("BioPlex Inventory Summary", count), ["Field", "Value"], [["Customer", count.customers?.customer_name ?? ""], ["Emirate", count.customers?.emirate ?? ""], ["Count date", date(count.counted_on)], ["Status", count.status], ["Notes", count.notes ?? ""]], [28, 72]),
    sheet("Detailed Inventory", reportTitle("BioPlex Detailed Inventory", count), ["Count date", "Count ID", "Assay", "Type", "Material", "Product code", "Lot", "Expiry", "QTY", "Verification", "Notes"], assayRows(record, 11, (item) => detailedRow(item, count)), [15, 12, 20, 14, 40, 18, 18, 15, 10, 18, 30]),
  ];
}
export async function createQuick(record) {
  const count = record.count;
  return [sheet("Quick Inventory", reportTitle("BioPlex Quick Inventory", count), ["Material", "Type", "QTY", "Lot", "Expiry"], assayRows(record, 5, (item) => [text(item.product_name_snapshot), text(item.material_type), qty(item.quantity), text(item.lot_number), date(item.expiry_date)]), [44, 14, 10, 20, 16])];
}
export async function createHistory(history) {
  const rows = [];
  for (const visit of history.visits ?? []) {
    const record = { count: visit.count, items: visit.items, links: [] };
    for (const group of groupedItems(record)) {
      rows.push([cell(`${formatBioplexDate(visit.count.counted_on)} - ${group.assay}`, { ...ASSAY, span: 11 })]);
      group.items.forEach((item) => rows.push(detailedRow(item, visit.count)));
    }
  }
  return [sheet("Inventory History", `BioPlex Inventory History - ${history.customer.name}`, ["Count date", "Count ID", "Assay", "Type", "Material", "Product code", "Lot", "Expiry", "QTY", "Verification", "Notes"], rows, [15, 12, 20, 14, 40, 18, 18, 15, 10, 18, 30])];
}
export async function workbookToBlob(sheets) { const { default: writeExcelFile } = await import("write-excel-file/browser"); return writeExcelFile(sheets).toBlob(); }

const TEMPLATE_PATH = "templates/bioplex-inventory-template.xlsx";
const TEMPLATE_SHEET_PATH = "xl/worksheets/sheet1.xml";

function normalizeProductCode(value) {
  const match = String(value ?? "").trim().match(/\d+/);
  return match ? match[0] : "";
}

const CONSUMABLE_TEMPLATE_CODES = [
  [/detector\s*calibrat/i, "6660001"],
  [/detector\s*clean/i, "6660002"],
  [/(?:sheath|seath)/i, "6600817"],
  [/(?:wash\s*)?buffer/i, "6600818"],
  [/(?:reaction\s*vessel|\brvs?\b)/i, "6602003"],
  [/(?:sodium\s*hydroxide|naoh)/i, "6600578"],
];
const ASSAY_TEMPLATE_CODES = {
  "celiac igg": { kit: "6652250", calibrator: "6632200", qc: "6632230" },
  "celiac iga": { kit: "6652350", calibrator: "6632300", qc: "6632330" },
  "apls igg": { kit: "6651950", calibrator: "6631900", qc: "6631930" },
  "apls igm": { kit: "6652050", calibrator: "6632000", qc: "6632030" },
  "apls iga": { kit: "6652150", calibrator: "6632100", qc: "6632130" },
  "ana": { kit: "6651150", calibrator: "6631101", qc: "6631131" },
  "ebv igg": { kit: "6651250", calibrator: "6631201", qc: "6631231" },
  "ebv igm": { kit: "6651350", calibrator: "6631300", qc: "6631330" },
  "vasculitis": { kit: "6651850", calibrator: "6631800", qc: "6631830" },
  "syphilis": { kit: "12000650", calibrator: "12000651", qc: "12000653" },
  "hsv": { kit: "6653350", calibrator: "6633300", qc: "6633330" },
  "mmrv igg": { kit: "6652450", calibrator: "6632400", qc: "6632430" },
  "mmv igm": { kit: "12000930", calibrator: "12000933", qc: "12000931" },
};
function normalizeTemplateAssay(value) {
  const normalized = text(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/\bceliac\b.*\bigg\b/.test(normalized)) return "celiac igg";
  if (/\bceliac\b.*\biga\b/.test(normalized)) return "celiac iga";
  if (/\bapls?\b.*\bigg\b/.test(normalized)) return "apls igg";
  if (/\bapls?\b.*\bigm\b/.test(normalized)) return "apls igm";
  if (/\bapls?\b.*\biga\b/.test(normalized)) return "apls iga";
  if (/\bana\b/.test(normalized)) return "ana";
  if (/\bebv\b.*(?:\bigg\b|\bg\b)/.test(normalized)) return "ebv igg";
  if (/\bebv\b.*(?:\bigm\b|\bm\b)/.test(normalized)) return "ebv igm";
  if (/\bvasc(?:ulitis)?\b/.test(normalized)) return "vasculitis";
  if (/\bsyphilis\b|\brpr\b/.test(normalized)) return "syphilis";
  if (/\bhsv\b|herpes/.test(normalized)) return "hsv";
  if (/\bmmrv\b/.test(normalized)) return "mmrv igg";
  if (/\bmmv\b.*\bigm\b/.test(normalized)) return "mmv igm";
  return "";
}
function inferTemplateProductCode(item) {
  const assay = normalizeTemplateAssay(`${text(item.assay_name_snapshot)} ${text(item.product_name_snapshot)}`);
  return ASSAY_TEMPLATE_CODES[assay]?.[item.material_type] ?? "";
}

function templateCodeForItem(item) {
  const storedCode = normalizeProductCode(item.product_code_snapshot);
  if (storedCode) return storedCode;
  if (item.material_type !== "consumable") return inferTemplateProductCode(item);
  const name = text(item.product_name_snapshot);
  return CONSUMABLE_TEMPLATE_CODES.find(([pattern]) => pattern.test(name))?.[1] ?? "";
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function inlineStringCell(reference, value, styleId) {
  const style = styleId == null ? "" : ` s="${styleId}"`;
  return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function numberCell(reference, value, styleId) {
  const style = styleId == null ? "" : ` s="${styleId}"`;
  return `<c r="${reference}"${style}><v>${Number(value)}</v></c>`;
}

function cellStyleId(cellXml) {
  return cellXml?.match(/\ss="(\d+)"/)?.[1] ?? null;
}

function replaceCell(sheetXml, reference, value, { numeric = false } = {}) {
  const cellStart = `<c\\b(?=[^>]*\\br="${reference}")[^>]*`;
  const pattern = new RegExp(`${cellStart}\\/>|${cellStart}>[\\s\\S]*?<\\/c>`);
  const existing = sheetXml.match(pattern)?.[0];
  if (!existing) throw new Error(`The BioPlex Excel template is missing cell ${reference}.`);
  const styleId = cellStyleId(existing);
  const cellXml = numeric ? numberCell(reference, value, styleId) : inlineStringCell(reference, value, styleId);
  return sheetXml.replace(pattern, cellXml);
}

function templateProductRows(sheetXml, sharedStringsXml) {
  const strings = [...sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join("")
  );
  const rows = new Map();
  for (const match of sheetXml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(match[1]);
    const cellA = match[2].match(/<c\b[^>]*\br="A\d+"[^>]*>([\s\S]*?)<\/c>/)?.[0];
    if (!cellA) continue;
    let rawValue = cellA.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
    if (/\bt="s"/.test(cellA)) rawValue = strings[Number(rawValue)] ?? "";
    const code = normalizeProductCode(rawValue);
    if (code) rows.set(code, rowNumber);
  }
  return rows;
}

function columnName(number) {
  let value = Number(number);
  let output = "";
  while (value > 0) {
    value -= 1;
    output = String.fromCharCode(65 + (value % 26)) + output;
    value = Math.floor(value / 26);
  }
  return output;
}
function emptyCell(reference, styleId) {
  const style = styleId == null ? "" : ` s="${styleId}"`;
  return `<c r="${reference}"${style}/>`;
}
function cellXmlInRow(rowXml, reference) {
  const start = `<c\\b(?=[^>]*\\br="${reference}")[^>]*`;
  return rowXml.match(new RegExp(`${start}\\/>|${start}>[\\s\\S]*?<\\/c>`))?.[0] ?? "";
}
function ensureTemplateSlots(sheetXml, slotCount) {
  if (slotCount <= 4) return sheetXml;
  const lastColumn = columnName(2 + slotCount * 3);
  sheetXml = sheetXml.replace(/<dimension ref="A1:[A-Z]+(\d+)"\/>/, `<dimension ref="A1:${lastColumn}$1"/>`);
  sheetXml = sheetXml.replace(/<col min="3" max="8"/, `<col min="3" max="${2 + slotCount * 3}"`);
  return sheetXml.replace(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g, (rowXml, rowText) => {
    const rowNumber = Number(rowText);
    let appended = "";
    for (let slot = 5; slot <= slotCount; slot += 1) {
      for (let offset = 0; offset < 3; offset += 1) {
        const reference = `${columnName(3 + (slot - 1) * 3 + offset)}${rowNumber}`;
        const sourceReference = `${columnName(6 + offset)}${rowNumber}`;
        const styleId = cellStyleId(cellXmlInRow(rowXml, sourceReference));
        const sourceCellXml = cellXmlInRow(rowXml, sourceReference);
        const sourceHasHeader = Boolean(sourceCellXml) && !/\/\s*>$/.test(sourceCellXml);
        if (sourceHasHeader) {
          appended += inlineStringCell(reference, ["Qty ", "Lot ", "Expiry "][offset], styleId);
        } else {
          appended += emptyCell(reference, styleId);
        }
      }
    }
    return rowXml.replace("</row>", `${appended}</row>`);
  });
}
function itemKey(item) { return item?.id ?? item?.clientKey; }
function relationSlots(record, rowByProductCode) {
  const grouped = buildBioplexInventoryGroups(record.items ?? [], record.links ?? []);
  const slotsByRow = new Map();
  const assigned = new Set();
  const rowFor = (item) => rowByProductCode.get(templateCodeForItem(item));
  const place = (item, preferredSlot = null) => {
    const row = rowFor(item);
    if (!row) return false;
    const slots = slotsByRow.get(row) ?? [];
    let slot = preferredSlot;
    if (slot == null || (slots[slot] && itemKey(slots[slot]) !== itemKey(item))) {
      slot = slots.findIndex((entry) => !entry);
      if (slot < 0) slot = slots.length;
    }
    slots[slot] = item;
    slotsByRow.set(row, slots);
    assigned.add(itemKey(item));
    return slot;
  };
  for (const group of grouped.reagentGroups) {
    const reagentSlot = place(group.root);
    for (const entry of group.children) {
      const type = entry.item?.material_type ?? entry.item?.materialType;
      if (type === "calibrator") place(entry.item, reagentSlot);
      else if (type === "qc") place(entry.item, reagentSlot);
    }
  }
  for (const item of orderedUniqueInventoryItems(record.items, record.links)) {
    if (!assigned.has(itemKey(item))) place(item);
  }
  return slotsByRow;
}
function templateSlotValues(item) {
  return [
    item.quantity === null || item.quantity === undefined ? "" : Number(item.quantity),
    text(item.lot_number),
    formatBioplexDate(item.expiry_date),
  ];
}

export async function createTemplateInventoryFromBytes(record, templateBytes) {
  const { unzipSync, zipSync, strFromU8, strToU8 } = await import("fflate");
  const files = unzipSync(new Uint8Array(templateBytes));
  if (!files[TEMPLATE_SHEET_PATH] || !files["xl/sharedStrings.xml"]) {
    throw new Error("The BioPlex Excel template structure is invalid.");
  }

  let sheetXml = strFromU8(files[TEMPLATE_SHEET_PATH]);
  const sharedStringsXml = strFromU8(files["xl/sharedStrings.xml"]);
  const rowByProductCode = templateProductRows(sheetXml, sharedStringsXml);
  const unmapped = [];
  for (const item of orderedUniqueInventoryItems(record.items, record.links)) {
    const code = templateCodeForItem(item);
    if (!code || !rowByProductCode.has(code)) {
      unmapped.push(`${text(item.product_name_snapshot) || "Unnamed material"} (${code || "no product code"})`);
    }
  }
  if (unmapped.length) {
    throw new Error(`The BioPlex Excel template has no row for: ${unmapped.join(", ")}.`);
  }
  const itemsByRow = relationSlots(record, rowByProductCode);
  const slotCount = Math.max(4, ...[...itemsByRow.values()].map((items) => items.length));
  sheetXml = ensureTemplateSlots(sheetXml, slotCount);
  sheetXml = replaceCell(sheetXml, "G1", text(record.count.customers?.customer_name));
  sheetXml = replaceCell(sheetXml, "G2", formatBioplexDate(record.count.counted_on));

  for (const [rowNumber, items] of itemsByRow) {
    for (let index = 0; index < slotCount; index += 1) {
      const values = items[index] ? templateSlotValues(items[index]) : ["", "", ""];
      for (let valueIndex = 0; valueIndex < 3; valueIndex += 1) {
        const column = columnName(3 + index * 3 + valueIndex);
        const value = values[valueIndex];
        const numeric = valueIndex === 0 && value !== "";
        sheetXml = replaceCell(sheetXml, `${column}${rowNumber}`, value, { numeric });
      }
    }
  }

  files[TEMPLATE_SHEET_PATH] = strToU8(sheetXml);
  return zipSync(files, { level: 6 });
}

export async function createTemplateInventory(record) {
  const baseUrl = String(import.meta.env.BASE_URL || "/");
  const templateUrl = `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}${TEMPLATE_PATH}`;
  const response = await fetch(templateUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("The BioPlex Excel template could not be loaded.");
  const bytes = await createTemplateInventoryFromBytes(record, await response.arrayBuffer());
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
