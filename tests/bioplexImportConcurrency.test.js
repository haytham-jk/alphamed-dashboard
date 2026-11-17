import test from "node:test";
import assert from "node:assert/strict";
import {
  BIOPLEX_IMPORT_CONFLICT_MESSAGE,
  bioplexImportConflictError,
  expectedImportVersion,
} from "../src/utils/bioplexImportConcurrency.js";

test("import review versions must be non-negative integers", () => {
  assert.equal(expectedImportVersion(0), 0);
  assert.equal(expectedImportVersion("12"), 12);
  assert.throws(() => expectedImportVersion(""));
  assert.throws(() => expectedImportVersion(-1));
});

test("PT409 maps to the import conflict message", () => {
  assert.equal(
    bioplexImportConflictError({ code: "PT409" }).message,
    BIOPLEX_IMPORT_CONFLICT_MESSAGE
  );
});

test("current import review removes expired rows and orphaned relationships", async () => {
  const { filterCurrentBioplexImportRows } = await import("../src/utils/bioplexImportReviewModel.js");
  const rows = [
    { assayNameNormalized: "ANA", materialType: "kit", lotNumberNormalized: "NEWKIT", relatedMaterialType: "calibrator", relatedLotNormalized: "NEWCAL", reviewStatus: "Valid" },
    { assayNameNormalized: "ANA", materialType: "calibrator", lotNumberNormalized: "NEWCAL", reviewStatus: "Excluded" },
    { assayNameNormalized: "ANA", materialType: "qc", lotNumberNormalized: "NEWQC", reviewStatus: "Valid" },
  ];
  assert.deepEqual(filterCurrentBioplexImportRows(rows).map((row) => row.lotNumberNormalized), ["NEWQC"]);
});

test("valid calibrator is excluded when every related reagent is expired", async () => {
  const { filterCurrentBioplexImportRows } = await import("../src/utils/bioplexImportReviewModel.js");
  const rows = [
    { assayNameNormalized: "TRC IGM", materialType: "kit", lotNumberNormalized: "301935", relatedMaterialType: "calibrator", relatedLotNormalized: "55256", reviewStatus: "Excluded" },
    { assayNameNormalized: "TRC IGM", materialType: "calibrator", lotNumberNormalized: "55256", reviewStatus: "Valid" },
  ];
  assert.deepEqual(filterCurrentBioplexImportRows(rows), []);
});

test("same calibrator remains eligible when a future current reagent references it", async () => {
  const { filterCurrentBioplexImportRows } = await import("../src/utils/bioplexImportReviewModel.js");
  const rows = [
    { assayNameNormalized: "TRC IGM", materialType: "kit", lotNumberNormalized: "302999", relatedMaterialType: "calibrator", relatedLotNormalized: "55256", reviewStatus: "Valid" },
    { assayNameNormalized: "TRC IGM", materialType: "calibrator", lotNumberNormalized: "55256", reviewStatus: "Valid" },
  ];
  assert.equal(filterCurrentBioplexImportRows(rows).length, 2);
});
