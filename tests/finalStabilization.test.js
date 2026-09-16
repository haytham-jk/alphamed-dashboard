import test from "node:test";
import assert from "node:assert/strict";
import { CASE_CONFLICT_MESSAGE, caseConcurrencyError } from "../src/utils/caseConcurrency.js";
import { CUSTOMER_CONFLICT_MESSAGE, customerMutationError } from "../src/utils/customerConcurrency.js";

test("PT409 is classified as an optimistic concurrency conflict", () => {
  assert.equal(caseConcurrencyError({ code: "PT409" }).message, CASE_CONFLICT_MESSAGE);
  assert.equal(customerMutationError({ code: "PT409" }).message, CUSTOMER_CONFLICT_MESSAGE);
});

test("40001 remains an unrelated serialization error", () => {
  const caseError = { code: "40001", message: "serialization failure" };
  const customerError = { code: "40001", message: "serialization failure" };
  assert.equal(caseConcurrencyError(caseError), caseError);
  assert.equal(customerMutationError(customerError), customerError);
});
