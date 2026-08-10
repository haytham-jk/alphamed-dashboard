const GENERIC = new Set(["al", "and", "the", "medical", "clinical", "laboratory", "hospital", "clinic", "center", "specialty", "diagnostic", "health", "uae", "dubai", "abu", "dhabi", "sharjah", "ajman", "ain"]);
export function normalizeCustomerName(value) {
  return String(value ?? "").toLowerCase().replace(/&/g, " and ").replace(/\blabs?\b/g, " laboratory ").replace(/\bcentre\b/g, " center ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
export function distinctiveCustomerTokens(value) {
  return normalizeCustomerName(value).split(" ").filter((token) => token.length > 2 && !GENERIC.has(token));
}
export function contactFingerprint(contact) {
  return [String(contact.email ?? "").trim().toLowerCase(), String(contact.phoneNumber ?? "").replace(/\D/g, "")].filter(Boolean).join("|");
}
