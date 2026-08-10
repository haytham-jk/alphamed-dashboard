import { dateCell, formatBioplexDate } from "./bioplexDates";
import { orderedUniqueInventoryItems } from "./bioplexInventoryGrouping";

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
