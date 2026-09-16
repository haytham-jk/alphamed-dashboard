import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIsoDate,
  formatDateOnly,
  getDateUrgency,
  getLocalDateOnly,
  parseDisplayDateOnly,
  parseIsoDateOnly,
} from "../src/utils/dates.js";
import { dateCell, formatBioplexDate, localDateOnly } from "../src/utils/bioplexDates.js";
import { parseStrictDisplayDate } from "../src/utils/bioplexStrictDate.js";
import {
  calculateDaysRemaining,
  calculateNextDueDate,
  formatFrequency,
  formatRemainingPeriod,
  getLinearityDueStatus,
} from "../src/utils/linearityDates.js";

test("strict ISO parsing validates calendar dates", () => {
  assert.deepEqual(parseIsoDateOnly("2024-02-29", { strict: true }), { year: 2024, month: 2, day: 29 });
  assert.equal(parseIsoDateOnly("2023-02-29", { strict: true }), null);
  assert.equal(parseIsoDateOnly("2024-13-01", { strict: true }), null);
  assert.equal(parseIsoDateOnly("2024-01-01T12:00:00Z", { strict: true }), null);
  assert.deepEqual(parseIsoDateOnly("2024-01-01T12:00:00Z"), { year: 2024, month: 1, day: 1 });
});

test("display date parsing and formatting preserve DD/MM/YYYY", () => {
  assert.equal(parseDisplayDateOnly("29/02/2024"), "2024-02-29");
  assert.equal(parseDisplayDateOnly("29/02/2023"), null);
  assert.equal(formatDateOnly("2024-02-29"), "29/02/2024");
  assert.equal(formatDateOnly("2023-02-29", "Invalid"), "Invalid");
});

test("local date helpers accept a reference date", () => {
  const date = new Date(2026, 8, 15, 23, 30);
  assert.equal(getLocalDateOnly(date), "2026-09-15");
  assert.equal(localDateOnly(date), "2026-09-15");
});

test("BioPlex date cells reject rollover dates", () => {
  const valid = dateCell("2024-02-29");
  assert.ok(valid instanceof Date);
  assert.equal(valid.getFullYear(), 2024);
  assert.equal(valid.getMonth(), 1);
  assert.equal(valid.getDate(), 29);
  assert.equal(dateCell("2023-02-29"), null);
  assert.equal(dateCell("2024-02-29T00:00:00Z"), null);
  assert.equal(formatBioplexDate("2024-02-29"), "29/02/2024");
  assert.equal(formatBioplexDate("2023-02-29"), "");
});

test("strict BioPlex display parser preserves error contracts", () => {
  assert.deepEqual(parseStrictDisplayDate("1/1/2024"), { value: null, error: "Use DD/MM/YYYY." });
  assert.deepEqual(parseStrictDisplayDate("31/02/2024"), { value: null, error: "Enter a valid calendar date in DD/MM/YYYY." });
  assert.deepEqual(parseStrictDisplayDate("29/02/2024"), { value: "2024-02-29", error: "" });
});

test("linearity scheduling clamps month-end and leap dates", () => {
  assert.equal(calculateNextDueDate("2024-08-31", 6), "2025-02-28");
  assert.equal(calculateNextDueDate("2024-02-29", 12), "2025-02-28");
  assert.equal(calculateNextDueDate("2023-02-29", 6), null);
  assert.equal(calculateNextDueDate("2024-01-31", 5), null);
});

test("linearity remaining days are deterministic", () => {
  const reference = new Date(2025, 1, 27, 23, 30);
  assert.equal(calculateDaysRemaining("2024-08-31", 6, reference), 1);
  assert.equal(calculateDaysRemaining("not-a-date", 6, reference), null);
  assert.equal(getLinearityDueStatus(-1), "Overdue");
  assert.equal(getLinearityDueStatus(0), "Due today");
  assert.equal(getLinearityDueStatus(30), "Due soon");
  assert.equal(getLinearityDueStatus(31), "On schedule");
  assert.equal(formatFrequency(12), "1 Year");
  assert.equal(formatRemainingPeriod(-2), "2 days overdue");
});

test("follow-up urgency uses a deterministic local reference day", () => {
  const reference = new Date(2026, 8, 15, 23, 30);
  assert.deepEqual(getDateUrgency("2026-09-14", 7, reference), {
    label: "1d overdue",
    className: "border-red-900 bg-red-950 text-red-300",
    rank: 0,
  });
  assert.equal(getDateUrgency("2026-09-15", 7, reference).label, "Due today");
  assert.equal(getDateUrgency("2026-09-18", 7, reference).label, "Due in 3d");
  assert.equal(getDateUrgency("invalid", 7, reference).label, "No follow-up");
});

test("ISO builder rejects impossible dates", () => {
  assert.equal(buildIsoDate(2024, 2, 29), "2024-02-29");
  assert.equal(buildIsoDate(2024, 2, 30), null);
});
