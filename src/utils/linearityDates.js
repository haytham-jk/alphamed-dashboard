import { buildIsoDate, parseIsoDateOnly } from "./dates.js";

export function calculateNextDueDate(performedDate, frequencyMonths) {
  const frequency = Number(frequencyMonths);
  const source = parseIsoDateOnly(performedDate, { strict: true });
  if (!source || ![6, 12].includes(frequency)) return null;

  const targetMonthIndex = source.month - 1 + frequency;
  const targetYear = source.year + Math.floor(targetMonthIndex / 12);
  const targetMonthIndexNormalized = ((targetMonthIndex % 12) + 12) % 12;
  const targetMonth = targetMonthIndexNormalized + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return buildIsoDate(targetYear, targetMonth, Math.min(source.day, lastDay));
}

export function calculateDaysRemaining(
  performedDate,
  frequencyMonths,
  referenceDate = new Date()
) {
  const nextDueDate = calculateNextDueDate(performedDate, frequencyMonths);
  const due = parseIsoDateOnly(nextDueDate, { strict: true });
  if (!due) return null;
  const dueUtc = Date.UTC(due.year, due.month - 1, due.day);
  const todayUtc = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  return Math.ceil((dueUtc - todayUtc) / 86400000);
}

export function getLinearityDueStatus(daysRemaining) {
  if (daysRemaining === null) return "Not scheduled";
  if (daysRemaining < 0) return "Overdue";
  if (daysRemaining === 0) return "Due today";
  if (daysRemaining <= 30) return "Due soon";
  return "On schedule";
}

export function formatFrequency(value) {
  if (Number(value) === 6) return "6 Months";
  if (Number(value) === 12) return "1 Year";
  return "Not set";
}

export function formatRemainingPeriod(value) {
  if (value === null) return "Not scheduled";
  if (value < 0) return `${Math.abs(value)} days overdue`;
  if (value === 0) return "Due today";
  return `${value} days remaining`;
}
