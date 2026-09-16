export const ASSET_CONFLICT_MESSAGE =
  "This asset was updated by another user after you opened it. Reload the asset and review the latest changes before saving again.";

export const UNITY_CONFLICT_MESSAGE =
  "This Unity Real Time installation was updated by another user after you opened it. Reload the installation and review the latest changes before saving again.";

export function expectedUpdateTimestamp(value, recordLabel) {
  const timestamp = String(value ?? "").trim();
  if (!timestamp) {
    throw new Error(
      `This ${recordLabel} edit is missing its version timestamp. Reload the ${recordLabel} and try again.`
    );
  }
  return timestamp;
}

export function assetMutationError(error) {
  if (error?.code === "PT409") return new Error(ASSET_CONFLICT_MESSAGE);
  if (error?.code === "42501") {
    return new Error("You do not have permission to update this asset.");
  }
  return error;
}

export function unityMutationError(error) {
  if (error?.code === "PT409") return new Error(UNITY_CONFLICT_MESSAGE);
  if (error?.code === "42501") {
    return new Error("You do not have permission to update this Unity Real Time installation.");
  }
  return error;
}
