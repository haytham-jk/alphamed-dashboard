export const BIOPLEX_COUNT_CONFLICT_MESSAGE =
  "This BioPlex count was updated by another user after you opened it. Reload the count and review the latest changes before saving again.";
export const BIOPLEX_LOT_CONFLICT_MESSAGE =
  "This BioPlex lot was corrected by another administrator after you opened it. Reload the lot and review the latest correction before saving again.";

export function expectedBioplexTimestamp(value, label, required = true) {
  const timestamp = String(value ?? "").trim();
  if (!timestamp && required) {
    throw new Error(`This ${label} edit is missing its version timestamp. Reload and try again.`);
  }
  return timestamp || null;
}

export function bioplexConflictError(error, message) {
  if (error?.code === "PT409") return new Error(message);
  return error;
}
