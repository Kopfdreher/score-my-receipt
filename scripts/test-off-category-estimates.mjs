import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { build } from 'esbuild'

const bundled = await build({
  stdin: {
    contents: "export { default as api, categoryEstimateIngredient } from './src/services/openFoodFactsEstimates.js'; export { analyseProducts, distribution, allergenGroups, additiveSummary } from './src/utils/basketAnalysis.js'",
    resolveDir: process.cwd()
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  alias: { '@': './src' }, define: { 'import.meta.env': '{}' }
})
const { api, categoryEstimateIngredient, analyseProducts, distribution, allergenGroups, additiveSummary } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const originalFetch = globalThis.fetch
const calls = []
globalThis.fetch = (url, options) => {
  const body = JSON.parse(options.body)
  calls.push({ url, options, body })
  const fresh = body.product.categories_tags[0] === 'en:fresh-apples'
  return Promise.resolve({ ok: true, json: () => Promise.resolve({
    errors: [], product: {
      nutriscore_grade: 'a', nova_group: 1, ecoscore_grade: fresh ? 'not-applicable' : 'a',
      nutrient_levels: { sugars: 'moderate', salt: 'low', fat: 'low' },
      labels_tags: [], allergens_tags: [], traces_tags: [], additives_tags: [], ingredients_text: 'Apple'
    }
  }) })
}

try {
  assert.equal(categoryEstimateIngredient('en:fresh-apples'), 'Apple')
  assert.equal(categoryEstimateIngredient('en:apple-desserts'), null)
  assert.equal(await api.getCategoryEstimate('en:apple-desserts'), null)
  assert.equal(calls.length, 0, 'unsupported categories never call OFF')
  const estimates = { 'en:apples': await api.getCategoryEstimate('en:apples'), 'en:fresh-apples': await api.getCategoryEstimate('en:fresh-apples') }
  assert.equal(calls[0].url, 'https://world.openfoodfacts.org/api/v3/product/test', 'only the non-saving test endpoint is used')
  assert.equal(calls[0].options.method, 'PATCH')
  assert.deepEqual(calls[0].body.product, { categories_tags: ['en:apples'], ingredients_text_en: 'Apple' })
  assert.equal(calls[0].body.cc, 'fr')
  assert.equal(estimates['en:apples'].allergens_tags, undefined, 'synthetic allergen absence is discarded')
  const products = analyseProducts([
    { id: 'apple', name: 'Apples', categoryTag: 'en:apples', weight: 1, weightUnit: 'kg' },
    { id: 'fresh', name: 'Fresh apples', categoryTag: 'en:fresh-apples' },
    { id: 'barcode', name: 'Packaged food', barcode: '12345678', categoryTag: 'en:apples', off: { nutriscore_grade: 'e' } }
  ], {}, estimates)
  assert.equal(products.length, 3, 'different published applicability keeps category entries separate')
  assert.equal(products[0].nutriscore, 'a')
  assert.equal(products[0].nova, '1')
  assert.equal(products[0].greenScore, 'a')
  assert.equal(products[0].categoryEstimate.ingredient, 'Apple')
  assert.equal(products[0].co2Kg, 0.408, 'existing weight-based reference total is retained')
  assert.equal(products[1].greenScoreStatus, 'not-applicable')
  assert.equal(products[1].co2Kg, null, 'scores do not invent purchased weight')
  assert.equal(products[2].nutriscore, 'e', 'category estimates never override barcode products')
  const chart = distribution(products, 'greenScore')
  assert.equal(chart.known, 1)
  assert.equal(chart.segments.find(segment => segment.key === 'not-applicable').count, 1)
  assert.equal(chart.segments.find(segment => segment.key === 'unknown').count, 1)
  assert.equal(allergenGroups(products, 'gluten').unknown.length, 3)
  assert.equal(additiveSummary(products).unknown, 3)
  globalThis.fetch = () => Promise.resolve({ ok: false, status: 503 })
  await assert.rejects(api.getCategoryEstimate('en:apples'), /503/)
  assert.equal(analyseProducts([{ categoryTag: 'en:apples' }])[0].nova, null, 'a failed request does not guess NOVA')
  console.log('OFF category estimate checks passed: non-saving requests, eligibility, provenance, applicability, unknowns and barcode isolation.')
} finally {
  globalThis.fetch = originalFetch
}
