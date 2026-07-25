export function toId(value) {
  return value === null || value === undefined || value === "" ? "" : String(value);
}

export function toIdList(values) {
  return [...new Set((values ?? []).map(toId).filter(Boolean))];
}

export function toNullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function parseCommaList(value) {
  return [...new Set(String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean))];
}
