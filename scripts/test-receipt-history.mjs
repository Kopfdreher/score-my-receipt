import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { Buffer } from 'node:buffer'
const bundled = await build({ entryPoints: ['src/services/receiptHistoryDb.js'], bundle: true, write: false, platform: 'node', format: 'esm' })
const { default: db } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const signatureBundle = await build({ entryPoints: ['src/services/receiptHistory.js'], bundle: true, write: false, platform: 'node', format: 'esm' })
const { receiptSignature } = await import(`data:text/javascript;base64,${Buffer.from(signatureBundle.outputFiles[0].text).toString('base64')}`)
const receipt = { date: '2026-10-07', currency: 'EUR', items: [{ id: '1', name: 'Apples', categoryTag: 'en:apples', weight: 1, weightUnit: 'kg', price: 2, quantity: 1, verified: true }] }
const snapshot = { signature: receiptSignature(receipt), savedAt: '2026-10-07', products: [{ name: 'Apples', lineTotal: 2 }] }
const record = db.buildRecord({ id: 'receipt-1', status: 'scored', receipt, items: receipt.items, analysisSnapshot: snapshot })
assert.equal(record.status, 'scored')
assert.deepEqual(record.analysisSnapshot, snapshot)
assert.equal(record.items[0].weight, 1)
assert.equal(record.items[0].weightUnit, 'kg')
assert.equal(receiptSignature({ ...receipt, items: record.items }), snapshot.signature, 'restored item defaults do not invalidate snapshot')
assert.equal(db.summarize(record).totalSpent, 2)
assert.equal(db.summarize(record).itemCount, 1)
const checking = db.buildRecord({ status: 'scored', receipt, items: receipt.items })
assert.equal(checking.status, 'draft', 'not scored until analysis exists')
receipt.items[0].verified = false
receipt.items[0].priceSent = true
assert.equal(receiptSignature(receipt), snapshot.signature, 'review flags do not alter the analysis')
receipt.items[0].quantity = 2
const changed = db.buildRecord({ id: record.id, status: 'scored', receipt, items: receipt.items, analysisSnapshot: snapshot })
assert.equal(changed.analysisSnapshot, null, 'correction invalidates old analysis')
assert.equal(changed.status, 'draft')
assert.equal(changed.id, record.id)
assert.equal(db.summarize(changed).totalSpent, 4)
console.log('History record checks passed: snapshot restoration, statuses, correction invalidation, identity, weight and totals.')
