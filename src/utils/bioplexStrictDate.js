import { parseDisplayDateOnly } from "./dates.js";

export function parseStrictDisplayDate(value) {
  const raw = String(value ?? "").trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return { value: null, error: "Use DD/MM/YYYY." };
  }
  const parsed = parseDisplayDateOnly(raw);
  if (!parsed) {
    return {
      value: null,
      error: "Enter a valid calendar date in DD/MM/YYYY.",
    };
  }
  return { value: parsed, error: "" };
}
