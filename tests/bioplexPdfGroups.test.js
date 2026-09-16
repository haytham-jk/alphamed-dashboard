import test from "node:test";
import assert from "node:assert/strict";
import { buildBioplexPdfGroups } from "../src/utils/bioplexPdfGrouping.js";

const items = [
  { id: 1, material_type: "kit", lot_number: "R1", assay_name_snapshot: "Assay A", product_name_snapshot: "Kit" },
  { id: 2, material_type: "kit", lot_number: "R2", assay_name_snapshot: "Assay A", product_name_snapshot: "Kit" },
  { id: 3, material_type: "calibrator", lot_number: "C1", assay_name_snapshot: "Assay A", product_name_snapshot: "Cal" },
  { id: 4, material_type: "calibrator", lot_number: "C2", assay_name_snapshot: "Assay A", product_name_snapshot: "Standalone" },
];
const links = [
  { parent_item_id: 1, child_item_id: 3, relationship_type: "kit_calibrator" },
  { parent_item_id: 2, child_item_id: 3, relationship_type: "kit_calibrator" },
];

test("PDF groups identify shared calibrators and matching reagent lots", () => {
  const output = buildBioplexPdfGroups({ items, links });
  assert.equal(output.reagentGroups.length, 2);
  assert.deepEqual(output.reagentGroups[0].calibrators[0].matchingReagentLots, ["R1", "R2"]);
  assert.equal(output.standaloneCalibrators[0].lot_number, "C2");
});
