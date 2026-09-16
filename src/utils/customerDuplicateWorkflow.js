export function normalizeSimilarCustomerCandidates(payload) {
  if (!Array.isArray(payload)) return [];

  const seen = new Set();
  return payload
    .map((candidate) => ({
      customer_id: Number(candidate?.customer_id),
      customer_name: String(candidate?.customer_name ?? "").trim(),
      emirate: String(candidate?.emirate ?? "").trim() || null,
      is_active: Boolean(candidate?.is_active),
      match_strength: String(
        candidate?.match_strength ?? "Possible match"
      ).trim(),
      match_reason: String(
        candidate?.match_reason ?? "Similar customer name"
      ).trim(),
      shared_tokens: Array.isArray(candidate?.shared_tokens)
        ? candidate.shared_tokens
            .map((token) => String(token).trim())
            .filter(Boolean)
        : [],
    }))
    .filter((candidate) => {
      if (
        !Number.isSafeInteger(candidate.customer_id) ||
        candidate.customer_id <= 0
      ) {
        return false;
      }
      if (!candidate.customer_name || seen.has(candidate.customer_id)) {
        return false;
      }
      seen.add(candidate.customer_id);
      return true;
    });
}

export function getDuplicateCheckKey(customerName, emirate) {
  return `${String(customerName ?? "").trim().toLowerCase()}|${String(
    emirate ?? ""
  )
    .trim()
    .toLowerCase()}`;
}

export function canOverrideSimilarCustomer({
  candidates,
  checkedKey,
  currentKey,
}) {
  return (
    Array.isArray(candidates) &&
    candidates.length > 0 &&
    checkedKey === currentKey
  );
}
