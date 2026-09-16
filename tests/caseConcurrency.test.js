import test from "node:test";
import assert from "node:assert/strict";
import {
  CASE_CONFLICT_MESSAGE,
  caseConcurrencyError,
  expectedCaseTimestamp,
} from "../src/utils/caseConcurrency.js";

test("case edits require the loaded timestamp", () => {
  const timestamp = "2026-09-15T12:34:56.789+00:00";
  assert.equal(expectedCaseTimestamp(timestamp), timestamp);
  assert.throws(() => expectedCaseTimestamp(""), /missing its version timestamp/i);
});

test("case PT409 conflicts receive a stable user-facing message", () => {
  assert.equal(
    caseConcurrencyError({ code: "PT409" }).message,
    CASE_CONFLICT_MESSAGE
  );
});

test("40001 remains an unrelated serialization error", () => {
  const error = { code: "40001", message: "serialization failure" };
  assert.equal(caseConcurrencyError(error), error);
});

test("other errors remain available to existing translators", () => {
  const error = { code: "23503", message: "foreign key" };
  assert.equal(caseConcurrencyError(error), error);
});
