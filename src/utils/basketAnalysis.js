import PRODUCE from '@/data/produceReference.json'
import { COLORS } from './score'

export const ALLERGENS = ['gluten', 'milk', 'eggs', 'nuts', 'peanuts', 'soybeans', 'sesame-seeds', 'fish', 'crustaceans', 'molluscs', 'celery', 'mustard', 'lupin', 'sulphur-dioxide-and-sulphites']
export const NUTRIENTS = { carbohydrates: 'carbohydrates_100g', proteins: 'proteins_100g', sugars: 'sugars_100g', salt: 'salt_100g', fat: 'fat_100g', saturatedFat: 'saturated-fat_100g' }
export const REFERENCE_SOURCES = [
  { label: 'Open Food Facts', url: 'https://world.openfoodfacts.org/data' },
  { label: 'CIQUAL 2020 · ANSES', url: 'https://github.com/openfoodfacts/openfoodfacts-server/blob/main/external-data/ciqual/ciqual/CIQUAL2020_ENG_2020_07_07.csv' },
  { label: 'AGRIBALYSE 3.2 · ADEME', url: 'https://agribalyse.ademe.fr/' }
]
const MASS = { g: 1, kg: 1000, mg: 0.001 }
const VOLUME = { ml: 1, cl: 10, l: 1000 }
const grade = (value, allowed) => allowed.includes(String(value).toLowerCase()) ? String(value).toLowerCase() : null
const positive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0
const numeric = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0

export function sourceUrl(item) {
  if (item.barcode) return `https://world.openfoodfacts.org/product/${encodeURIComponent(item.barcode)}`
  if (item.categoryTag) return `https://world.openfoodfacts.org/category/${encodeURIComponent(item.categoryTag)}`
  return null
}

// Explicit receipt weight is the TOTAL purchased weight for the line, never unit count.
function amountFor(item, product, quantity) {
  if (positive(item.weight) && MASS[item.weightUnit]) {
    return { grams: item.weight * MASS[item.weightUnit], ml: null, estimated: false }
  }
  if (!product) return { grams: null, ml: null, estimated: false }
  let value = product.product_quantity
  let unit = String(product.product_quantity_unit || '').toLowerCase()
  if (!positive(value) || !(MASS[unit] || VOLUME[unit])) {
    const match = /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|cl|l)\b/i.exec(product.quantity || '')
    value = match ? Number(match[1].replace(',', '.')) : null
    unit = match ? match[2].toLowerCase() : null
  }
  return {
    grams: positive(value) && MASS[unit] ? value * MASS[unit] * quantity : null,
    ml: positive(value) && VOLUME[unit] ? value * VOLUME[unit] * quantity : null,
    estimated: false
  }
}

export function analyseProducts(items, fetched = {}, categoryEstimates = {}) {
  const groups = new Map()
  items.forEach((line, index) => {
    const quantity = positive(line.quantity) ? line.quantity : 1
    const barcode = /^\d{8,14}$/.test(String(line.barcode || '')) ? String(line.barcode) : null
    const reference = !barcode ? PRODUCE[line.categoryTag] : null
    const estimate = !barcode ? categoryEstimates[line.categoryTag] : null
    const product = barcode ? (Object.prototype.hasOwnProperty.call(fetched, barcode) ? fetched[barcode] || {} : line.off || {}) : { ...line.off, ...estimate }
    const amount = amountFor(line, barcode ? product : null, quantity)
    const nutrients = reference?.nutriments || product.nutriments || {}
    const nutriscore = grade(product.nutriscore_grade, ['a', 'b', 'c', 'd', 'e'])
    const nova = grade(product.nova_group, ['1', '2', '3', '4'])
    const greenScore = grade(product.environmental_score_grade || product.ecoscore_grade, ['a-plus', 'a', 'b', 'c', 'd', 'e', 'f'])
    const greenScoreStatus = (product.environmental_score_grade || product.ecoscore_grade) === 'not-applicable' ? 'not-applicable' : null
    const co2PerKg = reference?.co2PerKg ?? product.environmental_score_data?.agribalyse?.co2_total ?? product.ecoscore_data?.agribalyse?.co2_total
    // For category estimates merge only the SAME reference and analysis data.
    const key = barcode ? `barcode:${barcode}` : reference
      ? `reference:${reference.referenceId}:${JSON.stringify({ nutriscore, nova, greenScore, greenScoreStatus, nutrients, labels: product.labels_tags, levels: product.nutrient_levels, allergens: product.allergens_tags, traces: product.traces_tags, ingredients: product.ingredients_text, additives: product.additives_tags })}`
      : `line:${line.id || index}`
    const entry = {
      id: key, itemId: line.id, name: barcode ? product.product_name || line.name || '' : line.name || '', barcode, categoryTag: line.categoryTag || null,
      quantity, lineCount: 1, sourceUrl: sourceUrl({ barcode, categoryTag: line.categoryTag }),
      sourceLinks: reference ? [REFERENCE_SOURCES[0], REFERENCE_SOURCES[1], { label: 'AGRIBALYSE 3.2 · ADEME', url: reference.agribalyseCode ? `https://agribalyse.ademe.fr/app/aliments/${encodeURIComponent(reference.agribalyseCode)}` : REFERENCE_SOURCES[2].url }] : REFERENCE_SOURCES.slice(0, 1),
      estimated: Boolean(reference || estimate), referenceName: reference?.referenceName || estimate?.ingredient,
      categoryEstimate: estimate ? { ingredient: estimate.ingredient, categoryTag: estimate.categoryTag, country: estimate.country, estimatedAt: estimate.estimatedAt } : null,
      nutriscore, nova, greenScore, greenScoreStatus, nutrients,
      nutrientLevels: product.nutrient_levels || {},
      additives: Array.isArray(product.additives_tags) ? product.additives_tags : null,
      labels: Array.isArray(product.labels_tags) ? product.labels_tags : null,
      allergens: Array.isArray(product.allergens_tags) ? product.allergens_tags : null,
      traces: Array.isArray(product.traces_tags) ? product.traces_tags : null,
      ingredientsKnown: Boolean(product.ingredients_text?.trim()) || (Array.isArray(product.ingredients) && product.ingredients.length > 0),
      grams: amount.grams, ml: amount.ml,
      co2Kg: amount.grams !== null && numeric(co2PerKg) ? amount.grams / 1000 * co2PerKg : null,
      lineTotal: numeric(line.price) ? line.price * quantity : null,
      names: [barcode ? product.product_name || line.name || '' : line.name || ''],
      receiptNames: [line.name || ''],
      categoryTags: line.categoryTag ? [line.categoryTag] : [],
      missingWeight: amount.grams === null
    }
    const existing = groups.get(key)
    if (!existing) groups.set(key, entry)
    else {
      existing.receiptNames = [...new Set([...existing.receiptNames, ...entry.receiptNames])]
      existing.quantity += quantity
      existing.lineCount += 1
      existing.names = [...new Set([...existing.names, ...entry.names])]
      existing.categoryTags = [...new Set([...existing.categoryTags, ...entry.categoryTags])]
      for (const field of ['grams', 'ml', 'co2Kg', 'lineTotal']) {
        // An incomplete merged total stays incomplete; do not silently omit a duplicate.
        existing[field] = existing[field] === null || entry[field] === null ? null : existing[field] + entry[field]
      }
    }
  })
  return [...groups.values()]
}

export function distribution(products, kind) {
  const colors = COLORS[kind]
  const keys = Object.keys(colors)
  const segments = [...keys, ...(kind === 'greenScore' ? ['not-applicable'] : []), 'unknown'].map((key) => {
    const items = products.filter((p) => key === 'not-applicable' ? p.greenScoreStatus === key : key === 'unknown' ? p[kind] === null && !(kind === 'greenScore' && p.greenScoreStatus === 'not-applicable') : String(p[kind]) === key)
    return { key, label: key === 'unknown' ? null : key === 'a-plus' ? 'A+' : key.toUpperCase(), color: colors[key] || COLORS.unknown, items, count: items.length, share: products.length ? items.length / products.length : 0 }
  })
  return { segments, known: products.filter((p) => p[kind] !== null).length, total: products.length }
}

export function macronutrientProportions(products) {
  const keys = ['carbohydrates', 'fat', 'proteins']
  const factors = { carbohydrates: 4, fat: 9, proteins: 4 }
  const energy = product => positive(product.nutrients['energy-kcal_100g']) ? product.nutrients['energy-kcal_100g'] : positive(product.nutrients['energy-kj_100g']) ? product.nutrients['energy-kj_100g'] / 4.184 : null
  const withEnergy = products.filter(product => (positive(product.grams) || positive(product.ml)) && energy(product) !== null)
  // 4 kcal/g applies to carbohydrates other than polyols. Keep known polyol products out of this estimate.
  const included = withEnergy.filter(product => keys.every(key => numeric(product.nutrients[NUTRIENTS[key]])) && !positive(product.nutrients.polyols_100g))
  const totalEnergy = list => list.reduce((total, product) => total + energy(product) * (product.grams ?? product.ml) / 100, 0)
  const kcal = totalEnergy(included)
  const segments = keys.map(key => {
    const grams = nutrientTotal(included, key).grams
    const share = kcal ? grams * factors[key] / kcal : null
    return { key, grams, share: share !== null && share <= 1 ? share : null }
  })
  const saturated = withEnergy.filter(product => numeric(product.nutrients['saturated-fat_100g']))
  const saturatedEnergy = totalEnergy(saturated)
  const saturatedShare = saturatedEnergy ? nutrientTotal(saturated, 'saturatedFat').grams * 9 / saturatedEnergy : null
  return { known: included.length, items: included, segments, saturatedFat: { known: saturated.length, share: saturatedShare !== null && saturatedShare <= 1 ? saturatedShare : null } }
}

export function nutrientTotal(products, key) {
  const field = NUTRIENTS[key]
  const known = products.filter((p) => numeric(p.nutrients[field]) && (p.grams !== null || p.ml !== null))
  const withGrams = known.map((p) => ({ ...p, contribution: p.nutrients[field] * (p.grams ?? p.ml) / 100 }))
  const grams = known.length ? withGrams.reduce((sum, p) => sum + p.contribution, 0) : null
  // Biggest contributors first, with their share of the basket total
  const items = withGrams
    .map((p) => ({ ...p, share: grams ? p.contribution / grams : 0 }))
    .sort((a, b) => b.contribution - a.contribution)
  return { items, known: known.length, grams }
}

export function carbonTotal(products) {
  const known = products.filter((p) => p.co2Kg !== null)
  const kg = known.length ? known.reduce((sum, p) => sum + p.co2Kg, 0) : null
  const items = known.map(p => ({ ...p, share: kg ? p.co2Kg / kg : 0 })).sort((a, b) => b.co2Kg - a.co2Kg)
  return { items, known: known.length, kg }
}

export function additiveSummary(products) {
  const known = products.filter((p) => p.additives !== null)
  const withAdditives = known.filter((p) => p.additives.length)
  const tags = [...new Set(known.flatMap((p) => p.additives))]
  return { known: known.length, products: withAdditives.length, without: known.length - withAdditives.length, unknown: products.length - known.length, list: tags.map((tag) => ({ tag, items: withAdditives.filter((p) => p.additives.includes(tag)) })) }
}

export function allergenGroups(products, allergen) {
  const groups = { contains: [], mayContain: [], unknown: [], notListed: [] }
  const tag = `en:${allergen}`
  products.forEach((p) => {
    if (p.allergens?.includes(tag)) groups.contains.push(p)
    else if (p.traces?.includes(tag)) groups.mayContain.push(p)
    else if (p.ingredientsKnown && p.allergens !== null && p.traces !== null) groups.notListed.push(p)
    else groups.unknown.push(p)
  })
  return groups
}

// Sort orders for the product list: each one returns a number, smaller = shown first
// (grades needing attention, biggest amount...). Products without the value always go last.
const GRADE_ORDER = {
  nutriscore: ['a', 'b', 'c', 'd', 'e'],
  nova: ['1', '2', '3', '4'],
  greenScore: ['a-plus', 'a', 'b', 'c', 'd', 'e', 'f']
}
const gradeRank = (kind) => (p) => p[kind] == null ? null : -GRADE_ORDER[kind].indexOf(p[kind])
const largestFirst = (value) => (p) => value(p) === null ? null : -value(p)
export const SORTS = {
  receipt: () => 0,
  name: () => 0,
  review: (p, selected) => -improvementReasons(p, selected).length,
  nutriscore: gradeRank('nutriscore'),
  nova: gradeRank('nova'),
  greenScore: gradeRank('greenScore'),
  salt: largestFirst((p) => numeric(p.nutrients?.salt_100g) ? p.nutrients.salt_100g : null),
  sugars: largestFirst((p) => numeric(p.nutrients?.sugars_100g) ? p.nutrients.sugars_100g : null),
  fat: largestFirst((p) => numeric(p.nutrients?.fat_100g) ? p.nutrients.fat_100g : null),
  co2: largestFirst((p) => p.co2Kg),
  price: largestFirst((p) => p.lineTotal),
  unitPrice: largestFirst((p) => numeric(p.lineTotal) && positive(p.quantity) ? p.lineTotal / p.quantity : null),
  weight: largestFirst((p) => p.grams ?? p.ml)
}

export function sortProducts(products, sort = 'receipt', reverse = false, selected = []) {
  const rank = SORTS[sort] || SORTS.receipt
  const ranked = products.map((p, index) => ({ p, index, value: rank(p, selected) }))
  const known = ranked.filter((r) => r.value !== null)
  const unknown = ranked.filter((r) => r.value === null)
  known.sort((a, b) => (sort === 'name' ? a.p.name.localeCompare(b.p.name) : a.value - b.value) || a.index - b.index)
  if (reverse) known.reverse()
  return [...known, ...unknown].map((r) => r.p)
}

export function improvementReasons(product, selected = []) {
  const reasons = []
  if (['d', 'e'].includes(product.nutriscore)) reasons.push(`nutriscore:${product.nutriscore.toUpperCase()}`)
  if (product.nova === '4') reasons.push('nova:4')
  if (['d', 'e', 'f'].includes(product.greenScore)) reasons.push(`greenScore:${product.greenScore.toUpperCase()}`)
  selected.forEach((key) => { if (product.nutrientLevels[key] === 'high') reasons.push(`high:${key}`) })
  return reasons
}
