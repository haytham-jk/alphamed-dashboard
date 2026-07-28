export function getLocalDateOnly(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateOnly(value, fallback = "Not recorded", locale = "en-AE") {
  if (!value) return fallback;
  const parts = String(value).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return String(value);
  const [year, month, day] = parts;
  if (!year || !month || !day) return String(value);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function getDateUrgency(value, warningDays = 7) {
  if (!value) return { label: "No follow-up", className: "border-slate-700 bg-slate-800 text-slate-400", rank: 4 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const days = Math.round((target - today) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: "border-red-900 bg-red-950 text-red-300", rank: 0 };
  if (days === 0) return { label: "Due today", className: "border-red-900 bg-red-950 text-red-200", rank: 1 };
  if (days <= warningDays) return { label: `Due in ${days}d`, className: "border-amber-900 bg-amber-950 text-amber-300", rank: 2 };
  return { label: formatDateOnly(value), className: "border-emerald-900 bg-emerald-950 text-emerald-300", rank: 3 };
}
