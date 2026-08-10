function normalized(value) {
  return String(value ?? "").trim().toUpperCase();
}

function materialKey(assay, materialType, lotNumber) {
  return [normalized(assay), normalized(materialType), normalized(lotNumber)].join("|");
}

function relationshipKey(assay, fromType, fromLot, toType, toLot) {
  return [normalized(assay), normalized(fromType), normalized(fromLot), normalized(toType), normalized(toLot)].join("|");
}

function directionFor(row) {
  const materialType = normalized(row.materialType ?? row.material_type).toLowerCase();
  const relatedType = normalized(row.relatedMaterialType ?? row.related_material_type).toLowerCase();
  const lot = normalized(row.lotNumberNormalized ?? row.lot_number_normalized);
  const relatedLot = normalized(row.relatedLotNormalized ?? row.related_lot_normalized);
  if (!relatedLot || !relatedType) return null;
  if (materialType === "kit") return { fromType: "kit", fromLot: lot, toType: relatedType, toLot: relatedLot };
  if (relatedType === "kit") return { fromType: "kit", fromLot: relatedLot, toType: materialType, toLot: lot };
  return { fromType: materialType, fromLot: lot, toType: relatedType, toLot: relatedLot };
}

export function buildParsedReviewModel(rows, snapshot = { lots: [], relationships: [] }) {
  const activeLots = new Map((snapshot.lots ?? []).map((lot) => [materialKey(lot.assay_name, lot.material_type, lot.normalized_lot_number), lot]));
  const activeRelationships = new Set((snapshot.relationships ?? []).map((item) => relationshipKey(item.assay_name, item.from_material_type, item.from_lot_number, item.to_material_type, item.to_lot_number)));
  const materials = new Map();
  const relationships = new Map();

  for (const row of rows ?? []) {
    const assay = row.assayNameNormalized ?? row.assay_name_normalized;
    const materialType = row.materialType ?? row.material_type;
    const lotNumber = row.lotNumberNormalized ?? row.lot_number_normalized;
    const inherited = row.sourceValues?.inheritedMergedCells ?? row.source_values?.inheritedMergedCells ?? [];
    const source = `${row.sheetName ?? row.sheet_name}:${row.sourceRowNumber ?? row.source_row_number}`;
    if (lotNumber) {
      const key = materialKey(assay, materialType, lotNumber);
      const existing = activeLots.get(key);
      const current = materials.get(key) ?? { key, assay, materialType, lotNumber, sources: [], inheritedMergedCells: [], classification: existing ? "Existing material" : "New material" };
      current.sources.push(source);
      current.inheritedMergedCells.push(...inherited);
      materials.set(key, current);
    }
    const direction = directionFor(row);
    if (!direction) continue;
    const key = relationshipKey(assay, direction.fromType, direction.fromLot, direction.toType, direction.toLot);
    const exists = activeRelationships.has(key);
    if (!relationships.has(key)) {
      const bothMaterialsExist = activeLots.has(materialKey(assay, direction.fromType, direction.fromLot)) && activeLots.has(materialKey(assay, direction.toType, direction.toLot));
      relationships.set(key, { key, assay, ...direction, sources: [source], inheritedMergedCells: [...inherited], classification: exists ? "Existing relationship" : bothMaterialsExist ? "Existing materials, new relationship" : "New relationship" });
    } else {
      const current = relationships.get(key);
      current.sources.push(source);
      current.inheritedMergedCells.push(...inherited);
    }
  }
  return { materials: [...materials.values()], relationships: [...relationships.values()] };
}

export function summarizeImportImpact(model, snapshot, mode) {
  const importedMaterials = new Set(model.materials.map((item) => item.key));
  const importedRelationships = new Set(model.relationships.map((item) => item.key));
  const activeAssays = new Set((snapshot.lots ?? []).map((lot) => normalized(lot.assay_name)));
  const importedAssays = new Set(model.materials.map((item) => normalized(item.assay)));
  return {
    mode,
    newMaterials: model.materials.filter((item) => item.classification === "New material").length,
    existingMaterials: model.materials.filter((item) => item.classification === "Existing material").length,
    newRelationships: model.relationships.filter((item) => item.classification !== "Existing relationship").length,
    existingRelationships: model.relationships.filter((item) => item.classification === "Existing relationship").length,
    deactivateLots: mode === "Replace" ? (snapshot.lots ?? []).filter((lot) => !importedMaterials.has(materialKey(lot.assay_name, lot.material_type, lot.normalized_lot_number))).length : 0,
    deactivateRelationships: mode === "Replace" ? (snapshot.relationships ?? []).filter((item) => !importedRelationships.has(relationshipKey(item.assay_name, item.from_material_type, item.from_lot_number, item.to_material_type, item.to_lot_number))).length : 0,
    omittedAssays: mode === "Replace" ? [...activeAssays].filter((assay) => !importedAssays.has(assay)).sort() : [],
  };
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function classifyParsedImportRows(rows, snapshot, currentDate = todayIso()) {
  const activeLots = new Set((snapshot.lots ?? []).map((lot) => materialKey(lot.assay_name, lot.material_type, lot.normalized_lot_number)));
  const activeRelationships = new Set((snapshot.relationships ?? []).map((item) => relationshipKey(item.assay_name, item.from_material_type, item.from_lot_number, item.to_material_type, item.to_lot_number)));
  const activeKitAssays = new Set((snapshot.lots ?? []).filter((lot) => lot.material_type === "kit").map((lot) => normalized(lot.assay_name)));
  const workbook = buildParsedReviewModel(rows, { lots: [], relationships: [] });
  const workbookRelationships = new Set(workbook.relationships.map((item) => item.key));
  const newKitAssays = new Set(workbook.materials.filter((item) => item.materialType === "kit").map((item) => normalized(item.assay)));

  return rows.map((row) => {
    const assay = row.assayNameNormalized;
    const type = row.materialType;
    const lot = row.lotNumberNormalized;
    const issues = new Set(row.issueCodes ?? []);
    const materialExists = activeLots.has(materialKey(assay, type, lot));
    const direction = directionFor(row);
    const relKey = direction ? relationshipKey(assay, direction.fromType, direction.fromLot, direction.toType, direction.toLot) : "";
    const relationshipExists = relKey && activeRelationships.has(relKey);

    if (!row.expiryDate) issues.add("MISSING_EXPIRY");
    if (row.expiryDate && row.expiryDate < currentDate) issues.add("EXPIRED_LOT");
    if (type === "kit" && !row.relatedLotNormalized) issues.add("MISSING_CALIBRATOR");
    if (type === "calibrator") {
      const hasRelationship = [...workbookRelationships].some((key) => key.startsWith(`${normalized(assay)}|KIT|`) && key.includes(`|CALIBRATOR|${normalized(lot)}`));
      if (!hasRelationship) issues.add("MISSING_REAGENT");
    }
    if (type === "qc" && !activeKitAssays.has(normalized(assay)) && !newKitAssays.has(normalized(assay))) issues.add("MISSING_COMPATIBLE_KIT");

    if (issues.has("EXPIRED_LOT")) return { ...row, issueCodes: [...issues], reviewStatus: "Excluded", proposedAction: "Exclude", reviewMessage: "Expired lot, not eligible for import." };
    if (materialExists && (!direction || relationshipExists)) return { ...row, issueCodes: [...issues, "EXISTING_IN_DATABASE"], reviewStatus: "Exact Duplicate", proposedAction: "Skip Duplicate", reviewMessage: "Material and relationship already exist. Not imported." };
    const mandatory = ["MISSING_EXPIRY", "MISSING_CALIBRATOR", "MISSING_REAGENT", "MISSING_COMPATIBLE_KIT", "INVALID_DATE"];
    if (mandatory.some((code) => issues.has(code))) return { ...row, issueCodes: [...issues], reviewStatus: "Invalid", proposedAction: "Review", reviewMessage: [...issues].join(", ") };
    if (materialExists && direction && !relationshipExists) return { ...row, issueCodes: [...issues, "NEW_RELATIONSHIP"], reviewStatus: "Valid", proposedAction: "Keep Existing", reviewMessage: "Existing material with a new relationship." };
    return { ...row, issueCodes: [...issues], reviewStatus: row.reviewStatus === "Exact Duplicate" ? row.reviewStatus : "Valid", proposedAction: row.reviewStatus === "Exact Duplicate" ? "Skip Duplicate" : "Create" };
  });
}
