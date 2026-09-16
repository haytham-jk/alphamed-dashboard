import test from "node:test";
import assert from "node:assert/strict";
import {
  customerMutationError,
  CUSTOMER_CONFLICT_MESSAGE,
} from "../src/utils/customerConcurrency.js";
import {
  caseConcurrencyError,
  CASE_CONFLICT_MESSAGE,
} from "../src/utils/caseConcurrency.js";

test("Customer PT409 maps to the conflict message", () => {
  assert.equal(
    customerMutationError({ code: "PT409" }).message,
    CUSTOMER_CONFLICT_MESSAGE
  );
});

test("Case PT409 maps to the conflict message", () => {
  assert.equal(
    caseConcurrencyError({ code: "PT409" }).message,
    CASE_CONFLICT_MESSAGE
  );
});

test("legacy 40001 is not reclassified as an optimistic conflict", () => {
  const customerError = { code: "40001", message: "customer serialization" };
  const caseError = { code: "40001", message: "case serialization" };
  assert.equal(customerMutationError(customerError), customerError);
  assert.equal(caseConcurrencyError(caseError), caseError);
});
