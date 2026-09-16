import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDashboardLinearitySummary } from "../src/utils/dashboardLinearity.js";

test("Dashboard Linearity summary normalizes counts and lightweight rows", () => {
  const result = normalizeDashboardLinearitySummary({
    attention_count: 12,
    attention_records: [{
      id: 7,
      customer_name: "Example Lab",
      instrument_name: "BioPlex 2200",
      instrument_name_snapshot: "",
      performed_date: "2026-03-16",
      frequency_months: 6,
      next_due_date: "2026-09-16",
      days_remaining: 0,
      due_status: "Due today",
    }],
  });
  assert.equal(result.attentionCount, 12);
  assert.equal(result.attentionRecords.length, 1);
  assert.equal(result.attentionRecords[0].customerName, "Example Lab");
  assert.equal(result.attentionRecords[0].daysRemaining, 0);
  assert.equal(result.attentionRecords[0].dueStatus, "Due today");
});

test("Dashboard Linearity summary uses safe empty defaults", () => {
  assert.deepEqual(normalizeDashboardLinearitySummary(null), {
    attentionCount: 0,
    attentionRecords: [],
  });
});
