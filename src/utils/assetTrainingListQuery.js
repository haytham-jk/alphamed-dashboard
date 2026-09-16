const ASSET_STATUSES = new Set(["All", "Active", "Inactive"]);
const TRAINING_SORTS = new Set(["newest", "oldest", "customer"]);

function boundedPage(value) {
  return Math.max(1, Number.parseInt(value, 10) || 1);
}

function boundedPageSize(value) {
  return Math.min(100, Math.max(1, Number.parseInt(value, 10) || 20));
}

export function normalizeAssetListQuery(values = {}) {
  return {
    query: String(values.query ?? "").trim(),
    status: ASSET_STATUSES.has(values.status) ? values.status : "Active",
    page: boundedPage(values.page),
    pageSize: boundedPageSize(values.pageSize),
  };
}

export function normalizeTrainingListQuery(values = {}) {
  return {
    query: String(values.query ?? "").trim(),
    sort: TRAINING_SORTS.has(values.sort) ? values.sort : "newest",
    page: boundedPage(values.page),
    pageSize: boundedPageSize(values.pageSize),
  };
}

function normalizePage(payload, requestedPage = 1) {
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

export function normalizeAssetPageResult(payload, requestedPage = 1) {
  const page = normalizePage(payload, requestedPage);
  return {
    ...page,
    inactiveCount: Math.max(0, Number(payload?.inactive_count) || 0),
    filteredInstrumentTypeCount: Math.max(
      0,
      Number(payload?.filtered_instrument_type_count) || 0
    ),
  };
}

export function normalizeTrainingPageResult(payload, requestedPage = 1) {
  return normalizePage(payload, requestedPage);
}
