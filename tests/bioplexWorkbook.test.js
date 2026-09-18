import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { strFromU8, unzipSync } from "fflate";
import * as fflate from "fflate";

const templateUrl = new URL("../public/templates/bioplex-inventory-template.xlsx", import.meta.url);
const workbookUrl = new URL("../src/utils/bioplexWorkbook.js", import.meta.url);
const templateBytes = await readFile(templateUrl);

async function loadTemplateBuilder() {
  let source = await readFile(workbookUrl, "utf8");
  source = source
    .replace(
      /import\s+\{\s*dateCell,\s*formatBioplexDate\s*\}\s+from\s+["'][^"']+["'];?\s*/,
      `const dateCell = (value) => {\n  if (!value) return null;\n  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);\n  return year && month && day ? new Date(Date.UTC(year, month - 1, day)) : null;\n};\nconst formatBioplexDate = (value) => {\n  if (!value) return "";\n  const [year, month, day] = String(value).slice(0, 10).split("-");\n  return year && month && day ? \`${"${day}/${month}/${year}"}\` : "";\n};\n`
    )
    .replace(
      /import\s+\{\s*buildBioplexInventoryGroups,\s*orderedUniqueInventoryItems\s*\}\s+from\s+["'][^"']+["'];?\s*/,
      `const itemId = (item) => item?.id ?? item?.clientKey;\nconst parentId = (link) => link?.parent_item_id ?? link?.parentKey;\nconst childId = (link) => link?.child_item_id ?? link?.childKey;\nconst buildBioplexInventoryGroups = (items = [], links = []) => {\n  const byId = new Map(items.map((item) => [itemId(item), item]));\n  const parentLinks = new Map();\n  for (const link of links) {\n    const parent = parentId(link);\n    const child = childId(link);\n    if (!byId.has(parent) || !byId.has(child)) continue;\n    const list = parentLinks.get(parent) ?? [];\n    list.push(link);\n    parentLinks.set(parent, list);\n  }\n  const reagentGroups = items.filter((item) => item.material_type === "kit").map((root) => ({\n    root,\n    children: (parentLinks.get(itemId(root)) ?? []).map((link) => ({ item: byId.get(childId(link)) })).filter((entry) => entry.item),\n  }));\n  const linkedChildren = new Set(links.map(childId));\n  const standalone = items.filter((item) => item.material_type !== "kit" && !linkedChildren.has(itemId(item)));\n  return { reagentGroups, standalone };\n};\nconst orderedUniqueInventoryItems = (items = [], links = []) => {\n  const groups = buildBioplexInventoryGroups(items, links);\n  const output = [];\n  const seen = new Set();\n  const add = (item) => { const key = itemId(item); if (seen.has(key)) return; seen.add(key); output.push(item); };\n  for (const group of groups.reagentGroups) { add(group.root); group.children.forEach((entry) => add(entry.item)); }\n  groups.standalone.forEach(add);\n  items.forEach(add);\n  return output;\n};\n`
    )
    .replace(
      'const { unzipSync, zipSync, strFromU8, strToU8 } = await import("fflate");',
      "const { unzipSync, zipSync, strFromU8, strToU8 } = globalThis.__bioplexTestFflate;"
    );
  globalThis.__bioplexTestFflate = fflate;
  const encoded = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

const { createTemplateInventoryFromBytes } = await loadTemplateBuilder();

function record(items, links = []) {
  return {
    count: { id: 7, counted_on: "2026-09-18", customers: { customer_name: "Example Medical Center" } },
    items: items.map((item, index) => ({
      id: item.id ?? index + 1,
      material_type: "kit",
      quantity: null,
      lot_number: "",
      expiry_date: null,
      product_name_snapshot: "Material",
      assay_name_snapshot: "",
      display_order: index,
      ...item,
    })),
    links,
  };
}
function worksheet(bytes) { return strFromU8(unzipSync(bytes)["xl/worksheets/sheet1.xml"]); }
function cellXml(xml, reference) {
  const start = `<c\\b(?=[^>]*\\br="${reference}")[^>]*`;
  return xml.match(new RegExp(`${start}\\/>|${start}>[\\s\\S]*?<\\/c>`))?.[0] ?? "";
}

test("template export fills customer, collection date, and two stock sets", async () => {
  const output = await createTemplateInventoryFromBytes(record([
    { product_code_snapshot: "6652250", product_name_snapshot: "Celiac IgG pack", quantity: 0, lot_number: "00123", expiry_date: "2027-01-31" },
    { product_code_snapshot: "6652250", product_name_snapshot: "Celiac IgG pack", quantity: 2, lot_number: "301999", expiry_date: "2027-06-30" },
  ]), templateBytes);
  const xml = worksheet(output);
  assert.match(cellXml(xml, "G1"), /Example Medical Center/);
  assert.match(cellXml(xml, "G2"), /18\/09\/2026/);
  assert.match(cellXml(xml, "C4"), /<v>0<\/v>/);
  assert.match(cellXml(xml, "D4"), /00123/);
  assert.match(cellXml(xml, "E4"), /31\/01\/2027/);
  assert.match(cellXml(xml, "F4"), /<v>2<\/v>/);
  assert.match(cellXml(xml, "G4"), /301999/);
  assert.match(cellXml(xml, "H4"), /30\/06\/2027/);
});

test("template export preserves blank quantity and maps product-code suffixes", async () => {
  const output = await createTemplateInventoryFromBytes(record([
    { product_code_snapshot: "6632000 (MC)", product_name_snapshot: "APLS IgM calibrator", material_type: "calibrator", quantity: null, lot_number: "CAL-01", expiry_date: null },
  ]), templateBytes);
  const xml = worksheet(output);
  assert.match(cellXml(xml, "C17"), /inlineStr/);
  assert.doesNotMatch(cellXml(xml, "C17"), /<v>/);
  assert.match(cellXml(xml, "D17"), /CAL-01/);
  assert.doesNotMatch(cellXml(xml, "E17"), /<v>/);
});

test("template export maps fixed consumables with no stored product code", async () => {
  const output = await createTemplateInventoryFromBytes(record([
    { product_code_snapshot: null, product_name_snapshot: "Detector Calibrator", material_type: "consumable", quantity: 3 },
  ]), templateBytes);
  assert.match(cellXml(worksheet(output), "C59"), /<v>3<\/v>/);
});

test("template export rejects unmapped materials", async () => {
  await assert.rejects(
    createTemplateInventoryFromBytes(record([{ product_code_snapshot: "9999999", product_name_snapshot: "Unknown product" }]), templateBytes),
    /no row for: Unknown product/
  );
});

test("template export adds horizontal sets and aligns matching calibrators", async () => {
  const items = [
    { id: 1, product_code_snapshot: null, assay_name_snapshot: "Celiac IgA", product_name_snapshot: "Celiac IgA kit", material_type: "kit", quantity: 1, lot_number: "R-1" },
    { id: 2, product_code_snapshot: null, assay_name_snapshot: "Celiac IgA", product_name_snapshot: "Celiac IgA calibrator", material_type: "calibrator", quantity: 11, lot_number: "C-1" },
    { id: 3, product_code_snapshot: null, assay_name_snapshot: "Celiac IgA", product_name_snapshot: "Celiac IgA kit", material_type: "kit", quantity: 2, lot_number: "R-2" },
    { id: 4, product_code_snapshot: null, assay_name_snapshot: "Celiac IgA", product_name_snapshot: "Celiac IgA calibrator", material_type: "calibrator", quantity: 12, lot_number: "C-2" },
    { id: 5, product_code_snapshot: null, assay_name_snapshot: "Celiac IgA", product_name_snapshot: "Celiac IgA kit", material_type: "kit", quantity: 3, lot_number: "R-3" },
    { id: 6, product_code_snapshot: null, assay_name_snapshot: "Celiac IgA", product_name_snapshot: "Celiac IgA calibrator", material_type: "calibrator", quantity: 13, lot_number: "C-3" },
  ];
  const links = [
    { parent_item_id: 1, child_item_id: 2 },
    { parent_item_id: 3, child_item_id: 4 },
    { parent_item_id: 5, child_item_id: 6 },
  ];
  const xml = worksheet(await createTemplateInventoryFromBytes(record(items, links), templateBytes));
  assert.match(xml, /<dimension ref="A1:N61"\/>/);
  assert.doesNotMatch(cellXml(xml, "I2"), /QTY/i);
  assert.match(cellXml(xml, "I3"), /t="s"/);
  assert.match(cellXml(xml, "J3"), /t="s"/);
  assert.match(cellXml(xml, "K3"), /t="s"/);
  assert.match(cellXml(xml, "I8"), /<v>3<\/v>/);
  assert.match(cellXml(xml, "J8"), /R-3/);
  assert.match(cellXml(xml, "I9"), /<v>13<\/v>/);
  assert.match(cellXml(xml, "J9"), /C-3/);
});

test("template export adds a fifth set to the right with assay-row headers", async () => {
  const items = [1, 2, 3, 4, 5].map((quantity) => ({
    id: quantity,
    product_code_snapshot: "6652250",
    product_name_snapshot: "Celiac IgG pack",
    material_type: "kit",
    quantity,
    lot_number: `R-${quantity}`,
  }));
  const xml = worksheet(await createTemplateInventoryFromBytes(record(items), templateBytes));
  assert.match(xml, /<dimension ref="A1:Q61"\/>/);
  assert.match(cellXml(xml, "O3"), /Qty/i);
  assert.match(cellXml(xml, "P3"), /Lot/i);
  assert.match(cellXml(xml, "Q3"), /Expiry/i);
  assert.match(cellXml(xml, "O4"), /<v>5<\/v>/);
  assert.match(cellXml(xml, "P4"), /R-5/);
});
