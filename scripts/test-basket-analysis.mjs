import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { build } from 'esbuild'
const bundled = await build({ entryPoints: ['src/utils/basketAnalysis.js'], bundle: true, write: false, platform: 'node', format: 'esm', alias: { '@': './src' } })
const analysis = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const { analyseProducts, distribution, nutrientTotal, carbonTotal, additiveSummary, allergenGroups, improvementReasons } = analysis
const code = '12345678'
const off = {
  quantity: '500 g', nutriscore_grade: 'e', nova_group: 4, ecoscore_grade: 'f',
  nutriments: { sugars_100g: 10, salt_100g: 0 }, nutrient_levels: { sugars: 'high' },
  additives_tags: ['en:e100', 'en:e100'], ingredients_text: 'Wheat flour',
  allergens_tags: ['en:gluten'], traces_tags: ['en:milk'], labels_tags: [],
  ecoscore_data: { agribalyse: { co2_total: 2 } }, forest_footprint_2026: { grade: 'd' }
}
const lines = [
  { id: '1', name: 'Repeated food', barcode: code, quantity: 2, price: 3, off },
  { id: '2', name: 'Repeated food', barcode: code, quantity: 1, price: 4, off },
  { id: '3', name: 'Apples', categoryTag: 'en:apples', weight: 1, weightUnit: 'kg', quantity: 1 },
  { id: '4', name: 'Fresh apples', categoryTag: 'en:fresh-apples', weight: 500, weightUnit: 'g', quantity: 1 },
  { id: '5', name: 'Unknown food', quantity: 1 }
]
const products = analyseProducts(lines)
assert.equal(products.length, 3, 'duplicates and identical produce references count once')
assert.equal(products[0].quantity, 3)
assert.equal(products[0].grams, 1500)
assert.equal(products[0].co2Kg, 3)
assert.equal(products[0].lineTotal, 10)
assert.equal(products[1].grams, 1500)
assert.equal(products[1].estimated, true)
assert.equal(products[1].nutriscore, null, 'no grade invented for produce')
assert.equal(products[1].greenScore, null)
assert.equal(products[1].nova, '1')
assert.equal(distribution(products, 'nutriscore').known, 1)
assert.equal(distribution(products, 'nutriscore').segments.find(s => s.key === 'e').count, 1)
assert.equal(distribution(products, 'forest').segments.find(s => s.key === 'd').count, 1)
assert.equal(distribution(products, 'nutriscore').segments.find(s => s.key === 'unknown').count, 2)
assert.equal(nutrientTotal(products, 'sugars').known, 2)
assert.equal(nutrientTotal(products, 'salt').grams, products[1].nutrients.salt_100g * 15, 'real zero is included')
assert.equal(carbonTotal(products).known, 2)
assert.equal(additiveSummary(products).list.length, 1)
assert.equal(additiveSummary(products).products, 1)
assert.equal(additiveSummary(products).unknown, 2)
assert.equal(allergenGroups(products, 'gluten').contains.length, 1)
assert.equal(allergenGroups(products, 'milk').mayContain.length, 1)
assert.equal(allergenGroups(products, 'gluten').unknown.length, 2)
assert.deepEqual(improvementReasons(products[0], ['sugars']), ['nutriscore:E', 'nova:4', 'greenScore:F', 'high:sugars'])
assert.equal(products[1].sourceUrl, 'https://world.openfoodfacts.org/category/en%3Aapples')
assert.equal(products[0].sourceUrl, 'https://world.openfoodfacts.org/product/12345678')
const liquid = analyseProducts([{ id: 'drink', barcode: code, quantity: 2, off: { quantity: '1 L', nutriments: { sugars_100g: 10 }, ecoscore_data: { agribalyse: { co2_total: 2 } } } }])[0]
assert.equal(liquid.grams, null, 'volume is never reported as mass')
assert.equal(liquid.ml, 2000)
assert.equal(liquid.co2Kg, null)
assert.equal(nutrientTotal([liquid], 'sugars').grams, 200)
const missingAmount = analyseProducts([{ name: 'Apples', categoryTag: 'en:apples' }])[0]
assert.equal(missingAmount.grams, null)
assert.equal(missingAmount.co2Kg, null)
assert.equal(nutrientTotal([missingAmount], 'sugars').grams, null)
const unlisted = analyseProducts([{ barcode: code, off: { ingredients_text: 'Rice', allergens_tags: [], traces_tags: [], labels_tags: ['en:gluten-free'] } }])
assert.equal(allergenGroups(unlisted, 'gluten').notListed.length, 1)
assert.equal(allergenGroups(analyseProducts([{ barcode: code, off: { allergens_tags: [], traces_tags: [] } }]), 'gluten').unknown.length, 1)
assert.equal(distribution([], 'nova').known, 0)
assert.equal(carbonTotal([]).kg, null)
console.log('Basket analysis checks passed: deduplication, amount totals, category estimates, unknowns, allergens, sources and highlight reasons.')

assert.equal(analyseProducts([{ barcode: code, off }], { [code]: { nutriscore_grade: 'unknown', nova_group: null, ecoscore_grade: 'unknown' } })[0].nutriscore, 'e', 'session grades work independently of detail fetches')
assert.equal(analyseProducts([{ categoryTag: 'en:apples', off: { allergens_tags: ['en:milk'] } }, { categoryTag: 'en:fresh-apples' }]).length, 2, 'different analysis data is not merged')
