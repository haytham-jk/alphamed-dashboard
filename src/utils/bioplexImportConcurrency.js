export const BIOPLEX_IMPORT_CONFLICT_MESSAGE =
  "This BioPlex import review changed after you opened it. Reload the review and check the latest row decisions before continuing.";

export function bioplexImportConflictError(error) {
  if (error?.code === "PT409") return new Error(BIOPLEX_IMPORT_CONFLICT_MESSAGE);
  return error;
}

export function expectedImportVersion(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    throw new Error("This import review is missing its version. Reload the review and try again.");
  }
  const version = Number(value);
  if (!Number.isInteger(version) || version < 0) {
    throw new Error("This import review is missing its version. Reload the review and try again.");
  }
  return version;
}
