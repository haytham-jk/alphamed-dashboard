const CASE_SORTS = new Set(["priority", "followUp", "newest", "oldest", "customer"]);
const CASE_STATUSES = new Set([
  "All",
  "Active",
  "New",
  "Pending",
  "In Progress",
  "Escalated",
  "Unresolved",
  "Resolved",
  "Closed",
  "Cancelled",
]);

export function normalizeCaseListQuery(values = {}) {
  const page = Math.max(1, Number.parseInt(values.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(values.pageSize, 10) || 20));
  return {
    query: String(values.query ?? "").trim(),
    status: CASE_STATUSES.has(values.status) ? values.status : "Active",
    escalatedOnly: Boolean(values.escalatedOnly),
    overdueOnly: Boolean(values.overdueOnly),
    sort: CASE_SORTS.has(values.sort) ? values.sort : "priority",
    page,
    pageSize,
    referenceDate: String(values.referenceDate ?? "").trim() || null,
  };
}

export function normalizeCasePageResult(payload, requestedPage = 1) {
  const result = payload && typeof payload === "object" ? payload : {};
  const rows = Array.isArray(result.rows) ? result.rows : [];
  return {
    rows,
    filteredCount: Math.max(0, Number(result.filtered_count) || 0),
    totalCount: Math.max(0, Number(result.total_count) || 0),
    page: Math.max(1, Number(result.page) || requestedPage || 1),
    pageSize: Math.max(1, Number(result.page_size) || 20),
    pageCount: Math.max(1, Number(result.page_count) || 1),
  };
}
