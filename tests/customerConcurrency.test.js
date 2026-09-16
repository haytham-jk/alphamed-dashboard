import test from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOMER_CONFLICT_MESSAGE,
  customerMutationError,
  expectedCustomerTimestamp,
} from "../src/utils/customerConcurrency.js";

test("new customers send no concurrency timestamp", () => {
  assert.equal(expectedCustomerTimestamp(null, ""), null);
});

test("existing customer edits require and retain the loaded timestamp", () => {
  const timestamp = "2026-09-15T12:34:56.789+00:00";
  assert.equal(expectedCustomerTimestamp(42, timestamp), timestamp);
  assert.throws(
    () => expectedCustomerTimestamp(42, ""),
    /missing its version timestamp/i
  );
});

test("customer PT409 conflicts receive a stable user-facing message", () => {
  const result = customerMutationError({ code: "PT409", message: "technical" });
  assert.equal(result.message, CUSTOMER_CONFLICT_MESSAGE);
});

test("40001 remains an unrelated serialization error", () => {
  const error = { code: "40001", message: "serialization failure" };
  assert.equal(customerMutationError(error), error);
});

test("permission failures remain clear", () => {
  assert.equal(
    customerMutationError({ code: "42501" }).message,
    "You do not have permission to save this customer."
  );
});
