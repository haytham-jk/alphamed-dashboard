const ACCREDITATION_FILTERS = new Set(["All", "ISO/EIAC", "CAP", "Both"]);
const STATUS_FILTERS = new Set(["All", "Active", "Inactive"]);

export function normalizeCustomerListQuery(values = {}) {
  const page = Math.max(1, Number.parseInt(values.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(values.pageSize, 10) || 20));
  return {
    query: String(values.query ?? "").trim(),
    accreditation: ACCREDITATION_FILTERS.has(values.accreditation) ? values.accreditation : "All",
    emirate: String(values.emirate ?? "").trim() || "All",
    status: STATUS_FILTERS.has(values.status) ? values.status : "Active",
    page,
    pageSize,
  };
}

export function normalizeCustomerPageResult(payload, requestedPage = 1) {
  const result = payload && typeof payload === "object" ? payload : {};
  return {
    rows: Array.isArray(result.rows) ? result.rows : [],
    filteredCount: Math.max(0, Number(result.filtered_count) || 0),
    totalCount: Math.max(0, Number(result.total_count) || 0),
    page: Math.max(1, Number(result.page) || requestedPage || 1),
    pageSize: Math.max(1, Number(result.page_size) || 20),
    pageCount: Math.max(1, Number(result.page_count) || 1),
  };
}

export function normalizeCustomerFilterOptions(payload) {
  const emirates = Array.isArray(payload?.emirates) ? payload.emirates : [];
  return [...new Set(emirates.map((value) => String(value ?? "").trim()).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second));
}
