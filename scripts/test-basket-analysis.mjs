import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { build } from 'esbuild'
const bundled = await build({ entryPoints: ['src/utils/basketAnalysis.js'], bundle: true, write: false, platform: 'node', format: 'esm', alias: { '@': './src' } })
const analysis = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const { analyseProducts, distribution, nutrientTotal, macronutrientProportions, carbonTotal, additiveSummary, allergenGroups, improvementReasons, sortProducts } = analysis
const code = '12345678'
const off = {
  quantity: '500 g', nutriscore_grade: 'e', nova_group: 4, ecoscore_grade: 'f',
  nutriments: { carbohydrates_100g: 20, proteins_100g: 0, sugars_100g: 10, salt_100g: 0 }, nutrient_levels: { sugars: 'high' },
  additives_tags: ['en:e100', 'en:e100'], ingredients_text: 'Wheat flour',
  allergens_tags: ['en:gluten'], traces_tags: ['en:milk'], labels_tags: [],
  ecoscore_data: { agribalyse: { co2_total: 2 } }
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
assert.equal(products[1].nova, null, 'NOVA stays unknown until OFF provides an estimate')
assert.equal(distribution(products, 'nutriscore').known, 1)
assert.equal(distribution(products, 'nutriscore').segments.find(s => s.key === 'e').count, 1)
assert.equal(distribution(products, 'nutriscore').segments.find(s => s.key === 'unknown').count, 2)
assert.equal(nutrientTotal(products, 'sugars').known, 2)
assert.equal(nutrientTotal(products, 'carbohydrates').grams, 300, 'carbohydrates use the combined purchased weight')
assert.equal(nutrientTotal(products, 'carbohydrates').known, 1, 'missing carbohydrate data stays excluded')
assert.equal(nutrientTotal(products, 'proteins').grams, 0, 'a published zero protein value is included')
assert.equal(nutrientTotal(products, 'proteins').known, 1)
const macroSample = [
  { grams: 200, ml: null, nutrients: { 'energy-kcal_100g': 250, carbohydrates_100g: 30, fat_100g: 10, proteins_100g: 10, 'saturated-fat_100g': 4 } },
  { grams: 100, ml: null, nutrients: { 'energy-kcal_100g': 400, carbohydrates_100g: 100 } },
  { grams: null, ml: null, nutrients: { 'energy-kcal_100g': 250, carbohydrates_100g: 30, fat_100g: 10, proteins_100g: 10 } }
]
const proportions = macronutrientProportions(macroSample)
assert.equal(proportions.known, 1, 'proportions compare the same products with all three values and a purchased amount')
assert.deepEqual(proportions.segments.map(segment => segment.share), [0.48, 0.36, 0.16], 'energy uses 4/9/4 factors and published calories')
assert.equal(proportions.saturatedFat.known, 1)
assert.equal(proportions.saturatedFat.share, 0.144, 'saturated fat is a part of fat, not a fourth part of the three-ring total')
const kjProduct = { ...macroSample[0], nutrients: { ...macroSample[0].nutrients, 'energy-kcal_100g': undefined, 'energy-kj_100g': 1046 } }
assert.deepEqual(macronutrientProportions([kjProduct]).segments.map(segment => segment.share), [0.48, 0.36, 0.16], 'explicit kJ can be converted to kcal')
assert.equal(macronutrientProportions([{ ...macroSample[0], nutrients: { ...macroSample[0].nutrients, polyols_100g: 5 } }]).known, 0, 'known polyols are not treated as 4 kcal/g carbohydrates')
assert.equal(macronutrientProportions([{ ...macroSample[0], nutrients: { ...macroSample[0].nutrients, 'energy-kcal_100g': 0 } }]).known, 0, 'zero energy cannot be a denominator')
const withFibreEnergy = { ...macroSample[0], nutrients: { ...macroSample[0].nutrients, 'energy-kcal_100g': 300 } }
assert.ok(macronutrientProportions([withFibreEnergy]).segments.reduce((sum, segment) => sum + segment.share, 0) < 1, 'shares are not normalised to hide energy from other nutrients')
assert.equal(macronutrientProportions([]).segments[0].share, null, 'missing data does not become a percentage')
assert.equal(macronutrientProportions([{ grams: 100, ml: null, nutrients: { carbohydrates_100g: 0, fat_100g: 0, proteins_100g: 0 } }]).segments[0].share, null, 'zero totals have no proportions')
assert.equal(nutrientTotal(products, 'salt').grams, products[1].nutrients.salt_100g * 15, 'real zero is included')
const sugars = nutrientTotal(products, 'sugars')
assert.equal(sugars.items[0].contribution, 150, 'biggest contributor first')
assert.ok(sugars.items[0].contribution >= sugars.items[1].contribution)
assert.ok(Math.abs(sugars.items.reduce((sum, p) => sum + p.share, 0) - 1) < 1e-9, 'shares add up to 100 %')
assert.equal(carbonTotal(products).known, 2)
const sample = [{ name: 'B', nutriscore: 'e', lineTotal: 2 }, { name: 'A', nutriscore: null, lineTotal: 5 }, { name: 'C', nutriscore: 'a', lineTotal: null }]
assert.deepEqual(sortProducts(sample, 'nutriscore').map(p => p.name), ['B', 'C', 'A'], 'grades needing attention first, unknown last')
assert.deepEqual(sortProducts(sample, 'nutriscore', true).map(p => p.name), ['C', 'B', 'A'], 'reversed, unknown still last')
assert.deepEqual(sortProducts(sample, 'price').map(p => p.name), ['A', 'B', 'C'])
const priceSample = [
  { name: 'Multipack purchase', lineTotal: 12, quantity: 4 },
  { name: 'Single item', lineTotal: 5, quantity: 1 },
  { name: 'Unknown', lineTotal: null, quantity: 2 },
  { name: 'Free', lineTotal: 0, quantity: 1 }
]
assert.deepEqual(sortProducts(priceSample, 'price').map(p => p.name), ['Multipack purchase', 'Single item', 'Free', 'Unknown'])
assert.deepEqual(sortProducts(priceSample, 'unitPrice').map(p => p.name), ['Single item', 'Multipack purchase', 'Free', 'Unknown'])
assert.deepEqual(sortProducts(priceSample, 'unitPrice', true).map(p => p.name), ['Free', 'Multipack purchase', 'Single item', 'Unknown'])
assert.equal(sortProducts([{ name: 'Invalid quantity', lineTotal: 5, quantity: 0 }, products[0]], 'unitPrice')[0], products[0], 'merged purchases use total divided by quantity; invalid quantities stay last')
assert.deepEqual(sortProducts(sample, 'name').map(p => p.name), ['A', 'B', 'C'])
assert.deepEqual(sortProducts(sample, 'receipt').map(p => p.name), ['B', 'A', 'C'])
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

assert.equal(analyseProducts([{ barcode: code, off }], { [code]: { nutriscore_grade: 'unknown', nova_group: null, ecoscore_grade: 'unknown' } })[0].nutriscore, null, 'unknown fetched grade does not fall back to stale session grade')
assert.equal(analyseProducts([{ categoryTag: 'en:apples', off: { allergens_tags: ['en:milk'] } }, { categoryTag: 'en:fresh-apples' }]).length, 2, 'different analysis data is not merged')

const corrected = analyseProducts([{ id: 'yogurt', name: 'Yogurt plain', barcode: code, off: { nutriscore_grade: 'c', nova_group: 3, ecoscore_grade: 'c' } }], { [code]: { product_name: 'Nutella', nutriscore_grade: 'e', nova_group: 4, ecoscore_grade: 'd' } })[0]
assert.equal(corrected.name, 'Nutella')
assert.deepEqual(corrected.names, ['Nutella'])
assert.deepEqual(corrected.receiptNames, ['Yogurt plain'])
assert.equal(corrected.itemId, 'yogurt')
assert.equal(corrected.nutriscore, 'e')
assert.equal(corrected.nova, '4')
assert.equal(corrected.greenScore, 'd')
assert.equal(analyseProducts([{ barcode: code, off }], { [code]: null })[0].nutriscore, null, 'not-found OFF response does not keep stale grades')
for (const key of ['salt', 'sugars', 'fat']) {
  const field = key + '_100g'
  const sorted = sortProducts([{ name: 'Missing', nutrients: {} }, { name: 'Zero', nutrients: { [field]: 0 } }, { name: 'High', nutrients: { [field]: 20 } }], key)
  assert.deepEqual(sorted.map(p => p.name), ['High', 'Zero', 'Missing'])
}

const carbonProducts = [{ id: 'small', co2Kg: 2 }, { id: 'unknown', co2Kg: null }, { id: 'large', co2Kg: 8 }, { id: 'zero', co2Kg: 0 }]
const carbon = carbonTotal(carbonProducts)
assert.equal(carbon.kg, 10)
assert.equal(carbon.known, 3)
assert.deepEqual(carbon.items.map(p => p.id), ['large', 'small', 'zero'])
assert.equal(carbon.items[0].share, 0.8)
assert.equal(carbon.items.reduce((sum, p) => sum + p.share, 0), 1)
assert.equal(carbonTotal([{ co2Kg: 0 }]).items[0].share, 0, 'zero total has a finite contribution')
assert.deepEqual(carbonProducts.map(p => p.id), ['small', 'unknown', 'large', 'zero'], 'source products are not reordered')
