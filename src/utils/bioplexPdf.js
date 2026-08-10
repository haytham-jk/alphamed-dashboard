import { formatBioplexDate } from "./bioplexDates";
import { orderedUniqueInventoryItems } from "./bioplexInventoryGrouping";
const text = (value) => String(value ?? "").trim();
const rank = { kit: 0, calibrator: 1, qc: 2, consumable: 3 };
function groups(record) {
  const map = new Map();
  for (const item of orderedUniqueInventoryItems(record.items ?? [], record.links ?? [])) {
    const assay = text(item.assay_name_snapshot) || "Unassigned assay";
    map.set(assay, [...(map.get(assay) ?? []), item]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([assay, items]) => ({ assay, items: items.sort((a, b) => (rank[a.material_type] ?? 9) - (rank[b.material_type] ?? 9) || (a.display_order ?? 0) - (b.display_order ?? 0)) }));
}
export async function createBioplexInventoryPdf(record) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const margin = 12, widths = [105, 30, 30, 45, 35]; let y = 16;
  function pageHeader() {
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(15, 23, 42);
    doc.text(`BioPlex Inventory - ${text(record.count.customers?.customer_name) || "Customer"} - ${formatBioplexDate(record.count.counted_on)}`, margin, y); y += 9;
    doc.setFillColor(29, 78, 216); doc.rect(margin, y, widths.reduce((sum, value) => sum + value, 0), 8, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(9);
    ["Material", "Type", "QTY", "Lot", "Expiry"].forEach((label, index) => doc.text(label, margin + widths.slice(0, index).reduce((sum, value) => sum + value, 0) + 2, y + 5)); y += 8;
  }
  function ensure(space = 10) { if (y + space > 195) { doc.addPage(); y = 16; pageHeader(); } }
  pageHeader();
  for (const group of groups(record)) {
    ensure(18); doc.setFillColor(15, 118, 110); doc.rect(margin, y, widths.reduce((sum, value) => sum + value, 0), 8, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.text(group.assay, margin + 2, y + 5); y += 8;
    doc.setFont("helvetica", "normal");
    for (const item of group.items) {
      ensure(8); doc.setTextColor(15, 23, 42);
      const values = [text(item.product_name_snapshot), text(item.material_type), item.quantity == null ? "" : String(item.quantity), text(item.lot_number), formatBioplexDate(item.expiry_date)];
      let x = margin; values.forEach((value, index) => { doc.rect(x, y, widths[index], 8); doc.text(value, x + 2, y + 5); x += widths[index]; }); y += 8;
    }
  }
  return doc.output("blob");
}
