import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCaseListQuery, normalizeCasePageResult } from "../src/utils/caseListQuery.js";

test("Case list parameters are bounded and normalized", () => {
  const query = normalizeCaseListQuery({ status: "Unknown", sort: "bad", page: -4, pageSize: 900, query: "  BioPlex  " });
  assert.deepEqual(query, { query: "BioPlex", status: "Active", escalatedOnly: false, overdueOnly: false, sort: "priority", page: 1, pageSize: 100, referenceDate: null });
});

test("Case page results retain server counts and safe pagination", () => {
  const result = normalizeCasePageResult({ rows: [{ databaseId: 1 }], filtered_count: 21, total_count: 119, page: 2, page_size: 20, page_count: 2 }, 2);
  assert.equal(result.rows.length, 1);
  assert.equal(result.filteredCount, 21);
  assert.equal(result.totalCount, 119);
  assert.equal(result.page, 2);
  assert.equal(result.pageCount, 2);
});
