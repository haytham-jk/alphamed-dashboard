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
