import assert from 'node:assert/strict'
import { readReceipts, saveReceipt, deleteReceipt, receiptSignature } from '../src/services/receiptHistory.js'
const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
const receipt = { date: '2026-10-07', currency: 'EUR', imagePreviewUrl: 'photo', items: [{ id: '1', quantity: 1, userPhotoUrl: 'photo' }], analysisSnapshot: { products: [] } }
const first = saveReceipt(receipt, [{ name: 'Nutella', nutriscore: 'e' }], 'receipt-1')
assert.equal(readReceipts().length, 1)
assert.equal(first.receipt.imagePreviewUrl, null)
assert.equal(first.receipt.items[0].userPhotoUrl, null)
assert.equal(first.receipt.analysisSnapshot, undefined)
assert.equal(first.signature, receiptSignature(first.receipt))
receipt.items[0].quantity = 2
assert.notEqual(first.signature, receiptSignature(receipt))
saveReceipt(receipt, [{ name: 'Nutella', nutriscore: 'e', quantity: 2 }], 'receipt-1')
assert.equal(readReceipts().length, 1, 'correction replaces the old version')
assert.equal(readReceipts()[0].products[0].quantity, 2)
saveReceipt(receipt, [], 'receipt-2')
assert.equal(readReceipts().length, 2)
deleteReceipt('receipt-1')
assert.deepEqual(readReceipts().map(entry => entry.id), ['receipt-2'])
localStorage.setItem('score-my-receipt:receipts:v1', 'invalid json')
assert.deepEqual(readReceipts(), [])
console.log('Receipt history checks passed: snapshots, replacement, separate receipts, deletion, photo omission, invalid storage.')
