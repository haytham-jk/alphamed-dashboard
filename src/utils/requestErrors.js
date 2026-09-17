export function isExpectedAbortError(error) {
  if (!error) return false;
  if (error.name === "AbortError") return true;
  const message = String(error.message ?? error).toLowerCase();
  return message.includes("signal is aborted") || message.includes("aborted without reason") || message.includes("request was aborted");
}
