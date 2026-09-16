const LINEARITY_DUE = new Set(["All", "Overdue", "Due today", "Due soon", "On schedule", "Not scheduled", "Not required"]);
const UNITY_LICENSE = new Set(["All", "Expired", "Expiring in 30 days", "Valid", "Expiry not recorded"]);
const UNITY_CONNECTIVITY = new Set(["All", "None", "UnityConnect 1", "UnityConnect 2"]);
const UNITY_SERVICE_PACK = new Set(["All", "Latest service pack", "Behind latest service pack", "Version not recorded"]);
const UNITY_CARD = new Set(["All", "Expired", "Expiring30", "UC30"]);
const page = (value) => Math.max(1, Number.parseInt(value, 10) || 1);
const pageSize = (value) => Math.min(100, Math.max(1, Number.parseInt(value, 10) || 20));
const text = (value) => String(value ?? "").trim();
export function normalizeLinearityQuery(v = {}) { return { query: text(v.query), dueStatus: LINEARITY_DUE.has(v.dueStatus) ? v.dueStatus : "All", page: page(v.page), pageSize: pageSize(v.pageSize), referenceDate: text(v.referenceDate) || null }; }
export function normalizeEqasQuery(v = {}) { return { query: text(v.query), customerId: Math.max(0, Number.parseInt(v.customerId, 10) || 0), page: page(v.page), pageSize: pageSize(v.pageSize) }; }
export function normalizeUnityQuery(v = {}) { return { query: text(v.query), licenseStatus: UNITY_LICENSE.has(v.licenseStatus) ? v.licenseStatus : "All", connectivity: UNITY_CONNECTIVITY.has(v.connectivity) ? v.connectivity : "All", servicePackStatus: UNITY_SERVICE_PACK.has(v.servicePackStatus) ? v.servicePackStatus : "All", customerId: Math.max(0, Number.parseInt(v.customerId, 10) || 0), cardFilter: UNITY_CARD.has(v.cardFilter) ? v.cardFilter : "All", page: page(v.page), pageSize: pageSize(v.pageSize) }; }
export function normalizePage(payload, requestedPage = 1) { const r = payload && typeof payload === "object" ? payload : {}; return { ...r, rows: Array.isArray(r.rows) ? r.rows : [], filteredCount: Math.max(0, Number(r.filtered_count) || 0), totalCount: Math.max(0, Number(r.total_count) || 0), page: Math.max(1, Number(r.page) || requestedPage), pageSize: Math.max(1, Number(r.page_size) || 20), pageCount: Math.max(1, Number(r.page_count) || 1) }; }
export function normalizeOptions(payload) { return Array.isArray(payload?.customers) ? payload.customers : []; }
