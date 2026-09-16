export const CASE_CONFLICT_MESSAGE =
  "This case was updated by another user after you opened it. Reload the case and review the latest changes before saving again.";
export function expectedCaseTimestamp(value) {
  const timestamp = String(value ?? "").trim();
  if (!timestamp) throw new Error("This case edit is missing its version timestamp. Reload the case and try again.");
  return timestamp;
}
export function caseConcurrencyError(error) {
  if (error?.code === "PT409") return new Error(CASE_CONFLICT_MESSAGE);
  return error;
}
