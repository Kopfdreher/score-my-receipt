// Category prices are per kg; barcode (product) prices are per package.
export function isCategoryPriced(item) {
  return Boolean(item && !item.barcode && item.categoryTag)
}

export function quantityUnitKey(item) {
  if (item && item.barcodeEntry) return 'review.unitPackage'
  if (item && item.barcode && !item.noBarcodeAvailable) return 'review.unitPackage'
  return 'review.unitKg'
}

export function quantityStep(item) {
  return quantityUnitKey(item) === 'review.unitKg' ? '0.001' : '1'
}

export function parseOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseQuantity(value) {
  const parsed = parseOptionalNumber(value)
  if (parsed === null || parsed <= 0) return 1
  return parsed
}
