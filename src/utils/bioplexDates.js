import { formatDateOnly, getLocalDateOnly, parseIsoDateOnly } from "./dates.js";

export function formatBioplexDate(value) {
  return formatDateOnly(value, "");
}

export function dateCell(value) {
  const parts = parseIsoDateOnly(value, { strict: true });
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day, 12);
}

export function localDateOnly(date = new Date()) {
  return getLocalDateOnly(date);
}
