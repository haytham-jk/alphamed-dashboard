export function isAbortError(error) {
  return error?.name === "AbortError" || error?.code === "ABORT_ERR";
}

export function getErrorMessage(error, fallback = "Something went wrong.") {
  if (isAbortError(error)) return "";
  const message = String(error?.message ?? "").trim();
  return message || fallback;
}
