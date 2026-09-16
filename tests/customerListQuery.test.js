import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCustomerFilterOptions,
  normalizeCustomerListQuery,
  normalizeCustomerPageResult,
} from "../src/utils/customerListQuery.js";

test("Customer list parameters are normalized and bounded", () => {
  assert.deepEqual(
    normalizeCustomerListQuery({ query: "  lab  ", accreditation: "bad", status: "bad", page: -1, pageSize: 500 }),
    { query: "lab", accreditation: "All", emirate: "All", status: "Active", page: 1, pageSize: 100 }
  );
});

test("Customer page response preserves counts and pagination", () => {
  const result = normalizeCustomerPageResult({ rows: [{ id: 1 }], filtered_count: 21, total_count: 187, page: 2, page_size: 20, page_count: 2 }, 2);
  assert.equal(result.rows.length, 1);
  assert.equal(result.filteredCount, 21);
  assert.equal(result.totalCount, 187);
  assert.equal(result.page, 2);
  assert.equal(result.pageCount, 2);
});

test("Stored Emirate options are trimmed, unique, and sorted", () => {
  assert.deepEqual(normalizeCustomerFilterOptions({ emirates: ["UAE", " Dubai ", "UAE", ""] }), ["Dubai", "UAE"]);
});
