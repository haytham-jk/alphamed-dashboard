export const CASE_STATUS_COLORS = {
  New: "border-slate-700 bg-slate-800 text-slate-200",
  Pending: "border-cyan-900 bg-cyan-950 text-cyan-300",
  "In Progress": "border-blue-900 bg-blue-950 text-blue-300",
  Escalated: "border-red-900 bg-red-950 text-red-300",
  Unresolved: "border-orange-900 bg-orange-950 text-orange-300",
  Resolved: "border-emerald-900 bg-emerald-950 text-emerald-300",
  Closed: "border-emerald-900 bg-emerald-950 text-emerald-300",
  Cancelled: "border-slate-700 bg-slate-800 text-slate-400",
};

export const CASE_PRIORITY_COLORS = {
  Critical: "border-red-900 bg-red-950 text-red-200",
  High: "border-red-900 bg-red-950 text-red-300",
  Medium: "border-amber-900 bg-amber-950 text-amber-300",
  Low: "border-emerald-900 bg-emerald-950 text-emerald-300",
};

export const CASE_BADGE_CLASS =
  "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium leading-none";

export function getCaseStatusClass(status) {
  return CASE_STATUS_COLORS[status] || CASE_STATUS_COLORS.New;
}

export function getCasePriorityClass(priority) {
  return CASE_PRIORITY_COLORS[priority] || "border-slate-700 bg-slate-800 text-slate-300";
}
