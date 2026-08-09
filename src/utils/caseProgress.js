export const CASE_PROGRESS_BY_STATUS = Object.freeze({
  New: 0,
  Pending: 25,
  "In Progress": 50,
  Escalated: 65,
  Unresolved: 75,
  Resolved: 100,
  Closed: 100,
  Cancelled: 0,
});

export function getCaseProgress(status) {
  return CASE_PROGRESS_BY_STATUS[status] ?? 0;
}
