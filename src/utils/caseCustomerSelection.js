export function removeSelectedCustomer(selectedIds, primaryId, customerId) {
  const nextIds = selectedIds.filter((id) => id !== customerId);
  return {
    customerIds: nextIds,
    primaryCustomerId: primaryId === customerId ? nextIds[0] || "" : primaryId,
  };
}

export function addSelectedCustomer(selectedIds, primaryId, customerId) {
  if (!customerId || selectedIds.includes(customerId)) {
    return { customerIds: selectedIds, primaryCustomerId: primaryId };
  }
  return {
    customerIds: [...selectedIds, customerId],
    primaryCustomerId: primaryId || customerId,
  };
}
