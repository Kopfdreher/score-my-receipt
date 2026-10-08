// Category prices are per kg; barcode (product) prices are per package.
export function isCategoryPriced(item) {
  return Boolean(item && !item.barcode && item.categoryTag)
}

export function quantityUnitKey(item) {
  return isCategoryPriced(item) ? 'review.unitKg' : 'review.unitPackage'
}

export function quantityStep(item) {
  return isCategoryPriced(item) ? '0.001' : '1'
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
