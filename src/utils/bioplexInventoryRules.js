export function isBlankBioplexQuantity(value) {
  return value === "" || value === null || value === undefined;
}
export function normalizeBioplexQuantity(value) {
  if (isBlankBioplexQuantity(value)) return null;
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error("Quantities must be whole numbers of zero or greater.");
  return quantity;
}
export function getBioplexDirectIncrement(value) {
  return isBlankBioplexQuantity(value) ? 1 : normalizeBioplexQuantity(value);
}
export function shouldPersistBioplexItem(item) {
  return item.materialType !== "consumable" || !isBlankBioplexQuantity(item.quantity);
}
export function buildBioplexItemPayload(item, index) {
  return { clientKey:item.clientKey, assayId:item.assayId||null, productId:item.productId||null, referenceLotId:item.referenceLotId||null, materialType:item.materialType, lotNumber:String(item.lotNumber??"").trim(), quantity:normalizeBioplexQuantity(item.quantity), expiryDate:item.expiryDate||null, verificationStatus:item.verificationStatus==="Manual"?"Manually Entered":item.verificationStatus||"Matched", assayName:String(item.assayName??"").trim(), productCode:String(item.productCode??"").trim()||null, productName:String(item.productName??"").trim(), matchingImportId:item.matchingImportId||null, notes:String(item.notes??"").trim()||null, displayOrder:index };
}
export function buildBioplexSaveItems(items = []) { return items.filter(shouldPersistBioplexItem).map(buildBioplexItemPayload); }
