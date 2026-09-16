import { buildBioplexInventoryGroups } from "./bioplexInventoryGrouping.js";

const text = (value) => String(value ?? "").trim();
const itemId = (item) => item?.id ?? item?.clientKey;
const materialType = (item) => item?.material_type ?? item?.materialType;
const itemLot = (item) => text(item?.lot_number ?? item?.lotNumber) || "Not recorded";
const assayName = (item) => text(item?.assay_name_snapshot ?? item?.assayName) || "Unassigned assay";

export function buildBioplexPdfGroups(record) {
  const grouped = buildBioplexInventoryGroups(record?.items ?? [], record?.links ?? []);
  const reagentGroups = grouped.reagentGroups.map((group, index) => ({
    number: index + 1,
    assay: assayName(group.root),
    reagent: group.root,
    calibrators: group.children.filter((entry) => materialType(entry.item) === "calibrator"),
    qc: group.children.filter((entry) => materialType(entry.item) === "qc"),
  }));
  const reagentLotsByChild = new Map();
  for (const group of reagentGroups) {
    for (const entry of group.calibrators) {
      const key = itemId(entry.item);
      const lots = reagentLotsByChild.get(key) ?? [];
      lots.push(itemLot(group.reagent));
      reagentLotsByChild.set(key, lots);
    }
  }
  reagentGroups.forEach((group) => {
    group.calibrators = group.calibrators.map((entry) => ({
      ...entry,
      matchingReagentLots: reagentLotsByChild.get(itemId(entry.item)) ?? [],
    }));
  });
  return {
    reagentGroups,
    standaloneCalibrators: grouped.standalone.filter((item) => materialType(item) === "calibrator"),
    standaloneQc: grouped.standalone.filter((item) => materialType(item) === "qc"),
    consumables: grouped.standalone.filter((item) => materialType(item) === "consumable"),
  };
}
