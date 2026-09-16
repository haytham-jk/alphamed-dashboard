import test from "node:test";
import assert from "node:assert/strict";
import { addSelectedCustomer, removeSelectedCustomer } from "../src/utils/caseCustomerSelection.js";

test("first added customer becomes primary", () => {
  assert.deepEqual(addSelectedCustomer([], "", 3), { customerIds: [3], primaryCustomerId: 3 });
});
test("additional customer preserves primary", () => {
  assert.deepEqual(addSelectedCustomer([3], 3, 7), { customerIds: [3, 7], primaryCustomerId: 3 });
});
test("removing primary falls back to first remaining customer", () => {
  assert.deepEqual(removeSelectedCustomer([3, 7], 3, 3), { customerIds: [7], primaryCustomerId: 7 });
});
