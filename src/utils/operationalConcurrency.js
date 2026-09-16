export const TRAINING_CONFLICT_MESSAGE =
  "This training record was updated by another user after you opened it. Reload the record and review the latest changes before saving again.";
export const LINEARITY_CONFLICT_MESSAGE =
  "This linearity record was updated by another user after you opened it. Reload the record and review the latest changes before saving again.";
export const EQAS_CONFLICT_MESSAGE =
  "This EQAS Online record was updated by another user after you opened it. Reload the record and review the latest changes before saving again.";

export function expectedOperationalTimestamp(value, recordLabel) {
  const timestamp = String(value ?? "").trim();
  if (!timestamp) {
    throw new Error(
      `This ${recordLabel} edit is missing its version timestamp. Reload the record and try again.`
    );
  }
  return timestamp;
}

export function operationalMutationError(error, conflictMessage) {
  if (error?.code === "PT409") return new Error(conflictMessage);
  if (error?.code === "42501") {
    return new Error("You do not have permission to update this record.");
  }
  return error;
}
