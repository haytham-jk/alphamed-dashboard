import test from "node:test";
import assert from "node:assert/strict";
import { canOverrideSimilarCustomer, getDuplicateCheckKey, normalizeSimilarCustomerCandidates } from "../src/utils/customerDuplicateWorkflow.js";

test("similar customer candidates are validated and deduplicated", () => {
  const result = normalizeSimilarCustomerCandidates([
    { customer_id: 2, customer_name: " Ketone Lab ", match_reason: "Shared distinctive names: ketone" },
    { customer_id: 2, customer_name: "Duplicate row" },
    { customer_id: 0, customer_name: "Invalid" },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].customer_name, "Ketone Lab");
});

test("override is allowed only for the currently checked name and Emirate", () => {
  const checkedKey = getDuplicateCheckKey("Ketone Clinical Laboratory", "Dubai");
  assert.equal(canOverrideSimilarCustomer({ candidates: [{ customer_id: 1 }], checkedKey, currentKey: checkedKey }), true);
  assert.equal(canOverrideSimilarCustomer({ candidates: [{ customer_id: 1 }], checkedKey, currentKey: getDuplicateCheckKey("Ketone Lab", "Dubai") }), false);
});
