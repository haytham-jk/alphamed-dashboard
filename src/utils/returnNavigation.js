export function safeReturnPath(value, fallback, allowedPrefix) {
  const candidate = String(value ?? "").trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  if (allowedPrefix && candidate !== allowedPrefix && !candidate.startsWith(`${allowedPrefix}?`)) return fallback;
  return candidate;
}
export function buildFocusState(focusKey, focusId, message) {
  const state = {};
  const numericId = Number(focusId);
  if (focusKey && Number.isSafeInteger(numericId) && numericId > 0) state[focusKey] = numericId;
  if (message) state.message = message;
  return state;
}
