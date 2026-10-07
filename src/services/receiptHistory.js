// Only receipt fields that affect the analysis invalidate a saved snapshot.
export function receiptSignature(receipt) {
  return JSON.stringify({
    items: receipt.items.map(item => ({ id: item.id, name: item.name || '', price: item.price ?? null, quantity: item.quantity ?? 1, barcode: item.barcode ?? null, categoryTag: item.categoryTag ?? null, weight: item.weight ?? null, weightUnit: item.weightUnit ?? null, off: item.off ?? null })),
    date: receipt.date,
    currency: receipt.currency
  })
}
