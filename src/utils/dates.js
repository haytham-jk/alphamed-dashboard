const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const STRICT_ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function calendarPartsAreValid(year, month, day) {
  if (![year, month, day].every(Number.isInteger)) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function buildIsoDate(year, month, day) {
  if (!calendarPartsAreValid(year, month, day)) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIsoDateOnly(value, { strict = false } = {}) {
  const match = (strict ? STRICT_ISO_DATE_PATTERN : ISO_DATE_PATTERN).exec(String(value ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return buildIsoDate(year, month, day) ? { year, month, day } : null;
}

export function parseDisplayDateOnly(value) {
  const match = DISPLAY_DATE_PATTERN.exec(String(value ?? "").trim());
  if (!match) return null;
  return buildIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
}

export function getLocalDateOnly(date = new Date()) {
  return buildIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function formatDateOnly(value, fallback = "Not recorded") {
  const parts = parseIsoDateOnly(value);
  if (!parts) return fallback;
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
}

export function getDateUrgency(value, warningDays = 7, referenceDate = new Date()) {
  const parts = parseIsoDateOnly(value);
  if (!parts) return { label: "No follow-up", className: "border-slate-700 bg-slate-800 text-slate-400", rank: 4 };
  const todayUtc = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const targetUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const days = Math.round((targetUtc - todayUtc) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: "border-red-900 bg-red-950 text-red-300", rank: 0 };
  if (days === 0) return { label: "Due today", className: "border-red-900 bg-red-950 text-red-200", rank: 1 };
  if (days <= warningDays) return { label: `Due in ${days}d`, className: "border-amber-900 bg-amber-950 text-amber-300", rank: 2 };
  return { label: formatDateOnly(value), className: "border-emerald-900 bg-emerald-950 text-emerald-300", rank: 3 };
}
