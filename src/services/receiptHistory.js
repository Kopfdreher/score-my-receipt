const KEY = 'score-my-receipt:receipts:v1'

export function receiptSignature(receipt) {
  return JSON.stringify({ items: receipt.items, date: receipt.date, currency: receipt.currency })
}

export function readReceipts() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(saved) ? saved.filter(entry => entry.id && entry.receipt && Array.isArray(entry.products)) : []
  } catch { return [] }
}

export function saveReceipt(receipt, products, id) {
  // Photos are not needed to reopen an analysis and can exceed browser storage limits.
  const metadata = { ...receipt }
  delete metadata.analysisSnapshot
  delete metadata.imagePreviewUrl
  const copy = { ...metadata, imagePreviewUrl: null, items: receipt.items.map(item => ({ ...item, userPhotoUrl: null })) }
  const entry = { id, savedAt: new Date().toISOString(), receipt: copy, products, signature: receiptSignature(copy) }
  localStorage.setItem(KEY, JSON.stringify([entry, ...readReceipts().filter(saved => saved.id !== id)]))
  return entry
}

export function deleteReceipt(id) {
  localStorage.setItem(KEY, JSON.stringify(readReceipts().filter(entry => entry.id !== id)))
}
