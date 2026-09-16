import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAssetListQuery,
  normalizeAssetPageResult,
  normalizeTrainingListQuery,
  normalizeTrainingPageResult,
} from "../src/utils/assetTrainingListQuery.js";

test("Asset and Training list parameters are bounded", () => {
  assert.deepEqual(normalizeAssetListQuery({ query: "  D10 ", status: "bad", page: -2, pageSize: 500 }), {
    query: "D10", status: "Active", page: 1, pageSize: 100,
  });
  assert.deepEqual(normalizeTrainingListQuery({ query: "  Ali ", sort: "bad", page: 0, pageSize: 0 }), {
    query: "Ali", sort: "newest", page: 1, pageSize: 20,
  });
});

test("Asset response preserves summary metrics", () => {
  const result = normalizeAssetPageResult({ rows: [{ id: 1 }], filtered_count: 21, total_count: 69, inactive_count: 5, filtered_instrument_type_count: 7, page: 2, page_size: 20, page_count: 2 }, 2);
  assert.equal(result.filteredCount, 21);
  assert.equal(result.totalCount, 69);
  assert.equal(result.inactiveCount, 5);
  assert.equal(result.filteredInstrumentTypeCount, 7);
  assert.equal(result.page, 2);
});

test("Training response preserves server pagination", () => {
  const result = normalizeTrainingPageResult({ rows: [{ id: 4 }], filtered_count: 12, total_count: 12, page: 1, page_size: 20, page_count: 1 }, 1);
  assert.equal(result.rows.length, 1);
  assert.equal(result.filteredCount, 12);
  assert.equal(result.totalCount, 12);
  assert.equal(result.pageCount, 1);
});
