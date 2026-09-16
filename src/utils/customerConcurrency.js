export const CUSTOMER_CONFLICT_MESSAGE =
  "This customer was updated by another user after you opened it. Reload the customer and review the latest changes before saving again.";
export function expectedCustomerTimestamp(customerId, value) {
  if (!customerId) return null;
  const timestamp = String(value ?? "").trim();
  if (!timestamp) throw new Error("This customer edit is missing its version timestamp. Reload the customer and try again.");
  return timestamp;
}
export function customerMutationError(error) {
  if (error?.code === "PT409") return new Error(CUSTOMER_CONFLICT_MESSAGE);
  if (error?.code === "42501") return new Error("You do not have permission to save this customer.");
  return error;
}
