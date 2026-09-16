const GENERIC = new Set([
  "al", "and", "the", "medical", "clinical", "laboratory", "hospital",
  "clinic", "center", "specialty", "diagnostic", "health", "uae", "dubai",
  "abu", "dhabi", "sharjah", "ajman", "ain",
]);

export function normalizeCustomerName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\blabs?\b/g, " laboratory ")
    .replace(/\bcentre\b/g, " center ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function distinctiveCustomerTokens(value) {
  return normalizeCustomerName(value)
    .split(" ")
    .filter((token) => token.length > 2 && !GENERIC.has(token));
}

export function normalizeContactEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeContactPhone(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeCustomerContact(contact = {}) {
  return {
    ...contact,
    name: String(contact.name ?? "").trim(),
    designation: String(contact.designation ?? "").trim(),
    phoneNumber: String(contact.phoneNumber ?? "").trim(),
    email: normalizeContactEmail(contact.email),
  };
}

export function contactsShareIdentity(first = {}, second = {}) {
  const firstEmail = normalizeContactEmail(first.email);
  const secondEmail = normalizeContactEmail(second.email);
  if (firstEmail && secondEmail && firstEmail === secondEmail) return true;

  const firstPhone = normalizeContactPhone(first.phoneNumber);
  const secondPhone = normalizeContactPhone(second.phoneNumber);
  return Boolean(firstPhone && secondPhone && firstPhone === secondPhone);
}

export function contactFingerprint(contact) {
  return [normalizeContactEmail(contact?.email), normalizeContactPhone(contact?.phoneNumber)]
    .filter(Boolean)
    .join("|");
}
