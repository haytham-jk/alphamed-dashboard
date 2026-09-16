import { formatBioplexDate } from "./bioplexDates";
import { buildBioplexPdfGroups } from "./bioplexPdfGrouping";
export { buildBioplexPdfGroups } from "./bioplexPdfGrouping";
const value = (input) => String(input ?? "").trim();
const lot = (item) => value(item?.lot_number ?? item?.lotNumber) || "Not recorded";
const name = (item) => value(item?.product_name_snapshot ?? item?.productName) || "Not recorded";
const expiry = (item) => formatBioplexDate(item?.expiry_date ?? item?.expiryDate) || "Not recorded";
const quantity = (item) => item?.quantity == null || item?.quantity === "" ? "Not entered" : String(item.quantity);
export async function createBioplexInventoryPdf(record) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const margin = 12, width = 273, pageBottom = 195;
  const columns = [12, 48, 145, 190, 232, 258];
  let y = 14;
  function pageHeader() { doc.setTextColor(15,23,42); doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.text(`BioPlex Inventory - ${value(record.count.customers?.customer_name)||"Customer"}`,margin,y); doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.text(`Counted ${formatBioplexDate(record.count.counted_on)} | ${record.count.status}`,margin,y+6); y+=13; }
  function ensure(space) { if(y+space>pageBottom){doc.addPage();y=14;pageHeader();} }
  function tableHeader() { ensure(9); doc.setFillColor(30,41,59); doc.rect(margin,y,width,7,"F"); doc.setTextColor(255); doc.setFont("helvetica","bold"); doc.setFontSize(8); ["Role","Material","Lot","Expiry","QTY"].forEach((label,index)=>doc.text(label,columns[index]+2,y+4.7)); y+=7; }
  function row(item, role, style="normal", note="") { const materialLines=doc.splitTextToSize(name(item),88); const noteLines=note?doc.splitTextToSize(note,224):[]; const height=Math.max(8,materialLines.length*4+4)+(noteLines.length?noteLines.length*3.5+2:0); ensure(height); if(style==="reagent")doc.setFillColor(219,234,254);else if(style==="calibrator")doc.setFillColor(236,254,255);else if(style==="qc")doc.setFillColor(245,243,255);else doc.setFillColor(248,250,252); doc.rect(margin,y,width,height,"F"); doc.setDrawColor(203,213,225); doc.line(margin,y+height,margin+width,y+height); doc.setTextColor(15,23,42); doc.setFontSize(8); doc.setFont("helvetica",style==="reagent"?"bold":"normal"); doc.text(role,columns[0]+2,y+5); doc.text(materialLines,columns[1]+2,y+5); doc.text(lot(item),columns[2]+2,y+5); doc.text(expiry(item),columns[3]+2,y+5); doc.text(quantity(item),columns[4]+2,y+5); if(noteLines.length){doc.setFontSize(7);doc.setTextColor(71,85,105);doc.text(noteLines,columns[1]+2,y+materialLines.length*4+6);} y+=height; }
  function groupHeader(title) { ensure(10); doc.setFillColor(29,78,216); doc.rect(margin,y,width,8,"F"); doc.setTextColor(255); doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.text(title,margin+2,y+5.3); y+=8; tableHeader(); }
  function standalone(title, items) { if(!items.length)return; groupHeader(title); items.forEach((item)=>row(item,title.endsWith("s")?title.slice(0,-1):title)); y+=3; }
  pageHeader();
  const groups=buildBioplexPdfGroups(record);
  for(const group of groups.reagentGroups){ groupHeader(`${group.assay} | Matching Group ${group.number}`); row(group.reagent,"Reagent kit","reagent"); if(!group.calibrators.length) row({},"Calibrator","calibrator","No matching calibrator recorded in this historical count"); group.calibrators.forEach((entry)=>{const shared=entry.matchingReagentLots.length>1;row(entry.item,shared?"Shared calibrator":"Matching calibrator","calibrator",shared?`Matches reagent lots: ${entry.matchingReagentLots.join(", ")}`:`Matches reagent lot ${lot(group.reagent)}`);}); group.qc.forEach((entry)=>row(entry.item,"Related QC","qc","Assay-compatible QC; not a direct lot-to-lot match")); y+=3; }
  standalone("Standalone Calibrators",groups.standaloneCalibrators); standalone("Standalone QC",groups.standaloneQc); standalone("Consumables",groups.consumables);
  const pages=doc.getNumberOfPages(); for(let page=1;page<=pages;page++){doc.setPage(page);doc.setTextColor(100);doc.setFontSize(7);doc.text(`Page ${page} of ${pages}`,margin+width-20,203);}
  return doc.output("blob");
}
