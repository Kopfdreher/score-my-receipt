// Pure functions for the Score screen (Pair C): no store, no API, no Vue.

import ADDITIVES from './additives.json'

export const NUTRISCORE_GRADES = ['a', 'b', 'c', 'd', 'e']
export const GREEN_SCORE_GRADES = ['a-plus', 'a', 'b', 'c', 'd', 'e', 'f']
export const NOVA_GROUPS = [1, 2, 3, 4]

/**
 * Return the grade in lowercase if it is in the allowed list, otherwise null
 * (drops 'unknown', 'not-applicable', '', undefined...).
 */
function validGrade(value, allowed) {
  const grade = typeof value === 'string' ? value.toLowerCase() : value
  return allowed.includes(grade) ? grade : null
}

/**
 * Clean one session item (getItems) into what the score calculations need.
 * Never modifies the input: the item belongs to the Pinia session.
 * Assumes item.price is the unit price (to confirm with Pair A).
 */
export function cleanItem(item) {
  const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1
  const unitPrice = Number.isFinite(item.price) ? item.price : null
  const nutriscore = validGrade(item.off?.nutriscore_grade, NUTRISCORE_GRADES)
  const nova = validGrade(Number(item.off?.nova_group), NOVA_GROUPS)
  const greenScore = validGrade(item.off?.ecoscore_grade, GREEN_SCORE_GRADES)

  return {
    id: item.id,
    name: item.name,
    quantity,
    unitPrice,
    lineTotal: unitPrice === null ? null : unitPrice * quantity,
    nutriscore,
    nova,
    greenScore,
    hasScore: nutriscore !== null || nova !== null || greenScore !== null
  }
}

export function cleanItems(items) {
  return Array.isArray(items) ? items.map(cleanItem) : []
}

// Official colors, used by the charts and badges (grey for items without a grade)
export const COLORS = {
  nutriscore: { a: '#038141', b: '#85bb2f', c: '#fecb02', d: '#ee8100', e: '#e63e11' },
  nova: { 1: '#00aa00', 2: '#ffcc00', 3: '#ff6600', 4: '#ff0000' },
  greenScore: { 'a-plus': '#00602f', a: '#038141', b: '#85bb2f', c: '#fecb02', d: '#ee8100', e: '#e63e11', f: '#a50e0e' },
  unknown: '#9e9e9e'
}

// Letters -> numbers, so we average numbers and never letters
const NUTRISCORE_VALUES = { a: 5, b: 4, c: 3, d: 2, e: 1 }
const GREEN_SCORE_VALUES = { 'a-plus': 6, a: 5, b: 4, c: 3, d: 2, e: 1, f: 0 }

// Global mark: weights and letter thresholds (Pair C proposal, to validate with the team)
const GLOBAL_WEIGHTS = { nutriscore: 0.5, nova: 0.25, greenScore: 0.25 }
const GLOBAL_LETTERS = [[80, 'a'], [60, 'b'], [40, 'c'], [20, 'd'], [0, 'e']]

const BEST_WORST_MAX = 3

function sum(items, getValue) {
  return items.reduce((total, item) => total + getValue(item), 0)
}

function ratio(part, total) {
  return total > 0 ? part / total : 0
}

function gradeLabel(grade) {
  return grade === 'a-plus' ? 'A+' : String(grade).toUpperCase()
}

// Average of a grade, weighted by quantity, on the items that have it
function weightedAverage(items, key, toValue) {
  const known = items.filter((item) => item[key] !== null)
  const units = sum(known, (item) => item.quantity)
  return units > 0 ? sum(known, (item) => toValue(item[key]) * item.quantity) / units : null
}

function letterFromAverage(average, values) {
  if (average === null) return null
  const rounded = Math.round(average)
  return Object.keys(values).find((grade) => values[grade] === rounded) || null
}

/**
 * Mark from 0 (worst) to 100 (best) from the averages that are known.
 * Missing parts are left out and the remaining weights are rescaled.
 */
function globalScore({ nutriscore, nova, greenScore }) {
  const parts = []
  if (nutriscore !== null) parts.push([(nutriscore - 1) / 4, GLOBAL_WEIGHTS.nutriscore])
  if (nova !== null) parts.push([(4 - nova) / 3, GLOBAL_WEIGHTS.nova])
  if (greenScore !== null) parts.push([greenScore / 6, GLOBAL_WEIGHTS.greenScore])
  const weights = sum(parts, ([, weight]) => weight)
  if (weights === 0) return { value: null, letter: null }
  const value = (100 * sum(parts, ([part, weight]) => part * weight)) / weights
  const letter = GLOBAL_LETTERS.find(([min]) => value >= min)[1]
  return { value, letter }
}

function itemScore(item) {
  return globalScore({
    nutriscore: item.nutriscore === null ? null : NUTRISCORE_VALUES[item.nutriscore],
    nova: item.nova,
    greenScore: item.greenScore === null ? null : GREEN_SCORE_VALUES[item.greenScore]
  }).value
}

/**
 * Chart data for one category (Nutri-Score, NOVA or Green-Score): one segment per grade,
 * plus an 'unknown' segment for items without that grade (label null: translate it in the UI).
 * units = items bought (weighted by quantity), spend = euros spent.
 */
function categoryChart(items, grades, key, colors) {
  const totalUnits = sum(items, (item) => item.quantity)
  const priced = items.filter((item) => item.lineTotal !== null)
  const totalSpend = sum(priced, (item) => item.lineTotal)

  const segment = (gradeKey, label, color, matches) => {
    const units = sum(items.filter(matches), (item) => item.quantity)
    const spend = sum(priced.filter(matches), (item) => item.lineTotal)
    return { key: gradeKey, label, color, units, share: ratio(units, totalUnits), spend, spendShare: ratio(spend, totalSpend) }
  }

  const segments = grades.map((grade) => segment(grade, gradeLabel(grade), colors[grade], (item) => item[key] === grade))
  segments.push(segment('unknown', null, COLORS.unknown, (item) => item[key] === null))

  const scoredUnits = totalUnits - segments[segments.length - 1].units
  return { segments, scoredUnits, totalUnits, coverage: ratio(scoredUnits, totalUnits) }
}

/**
 * Every number of the Score screen, from the session items (getItems).
 * Recompute it in a computed property: never store the result.
 */
export function computeScore(items, currency = 'EUR') {
  const cleaned = cleanItems(items)
  const priced = cleaned.filter((item) => item.lineTotal !== null)
  const scored = cleaned.filter((item) => item.hasScore)
  const itemCount = sum(cleaned, (item) => item.quantity)
  const scoredCount = sum(scored, (item) => item.quantity)
  const novaPriced = priced.filter((item) => item.nova !== null)

  const nutriscoreAverage = weightedAverage(cleaned, 'nutriscore', (grade) => NUTRISCORE_VALUES[grade])
  const novaAverage = weightedAverage(cleaned, 'nova', (group) => group)
  const greenScoreAverage = weightedAverage(cleaned, 'greenScore', (grade) => GREEN_SCORE_VALUES[grade])

  // Best / worst: rank the scored items and split them, so the two lists never overlap
  const ranked = scored
    .map((item) => ({ ...item, score: itemScore(item) }))
    .sort((a, b) => b.score - a.score)
  const listSize = Math.min(BEST_WORST_MAX, Math.ceil(ranked.length / 2))

  return {
    itemCount,
    scoredCount,
    coverage: ratio(scoredCount, itemCount),
    totalSpend: sum(priced, (item) => item.lineTotal),
    unpricedCount: cleaned.length - priced.length,
    currency,
    global: globalScore({ nutriscore: nutriscoreAverage, nova: novaAverage, greenScore: greenScoreAverage }),
    categories: {
      nutriscore: {
        ...categoryChart(cleaned, NUTRISCORE_GRADES, 'nutriscore', COLORS.nutriscore),
        average: nutriscoreAverage,
        letter: letterFromAverage(nutriscoreAverage, NUTRISCORE_VALUES)
      },
      nova: {
        ...categoryChart(cleaned, NOVA_GROUPS, 'nova', COLORS.nova),
        average: novaAverage,
        letter: novaAverage === null ? null : Math.round(novaAverage)
      },
      greenScore: {
        ...categoryChart(cleaned, GREEN_SCORE_GRADES, 'greenScore', COLORS.greenScore),
        average: greenScoreAverage,
        letter: letterFromAverage(greenScoreAverage, GREEN_SCORE_VALUES)
      }
    },
    // share of the money spent on ultra-processed food (NOVA 4), among items with a NOVA group
    ultraProcessedShare: ratio(
      sum(novaPriced.filter((item) => item.nova === 4), (item) => item.lineTotal),
      sum(novaPriced, (item) => item.lineTotal)
    ),
    best: ranked.slice(0, listSize),
    worst: ranked.slice(listSize).reverse().slice(0, BEST_WORST_MAX)
  }
}

// ---------------------------------------------------------------------------
// Basket details from Open Food Facts products (nutrients, additives, CO₂...)
// ---------------------------------------------------------------------------

const TO_GRAMS = { g: 1, kg: 1000, mg: 0.001, ml: 1, cl: 10, l: 1000 }
const NUTRIENTS = { sugars: 'sugars_100g', salt: 'salt_100g', fat: 'fat_100g', saturatedFat: 'saturated-fat_100g' }
const CO2_PARTS = ['agriculture', 'processing', 'packaging', 'transportation', 'distribution', 'consumption']
const ADDITIVE_RISK_ORDER = { high: 0, moderate: 1, no: 2, unknown: 3 }
const TOP_ADDITIVES = 5

// Package weight in grams: product_quantity, or the 'quantity' text ("400 g", "1 L") as a fallback
function packageGrams(product) {
  const factor = TO_GRAMS[String(product.product_quantity_unit || 'g').toLowerCase()]
  const value = Number(product.product_quantity)
  if (factor && value > 0) return value * factor
  const match = /([\d.,]+)\s*(kg|mg|g|cl|ml|l)\b/i.exec(product.quantity || '')
  return match ? Number(match[1].replace(',', '.')) * TO_GRAMS[match[2].toLowerCase()] : null
}

// Weight bought for one item: package weight x number of packages (null if unknown)
function gramsOf(item, product) {
  const grams = packageGrams(product)
  return grams ? grams * item.quantity : null
}

function hasLabel(product, matches) {
  return (product.labels_tags || []).some(matches)
}

/**
 * @param {Array} items     session items (getItems)
 * @param {Object} products { [barcode]: Open Food Facts product, or null if unknown }
 * Every total comes with how many items it was computed on: never present a partial total as complete.
 */
export function computeBasketDetails(items, products = {}) {
  const lines = cleanItems(items)
    .map((item, index) => ({ item, product: products[items[index].barcode] || null }))
    .filter(({ product }) => product)
    .map(({ item, product }) => ({ item, product, grams: gramsOf(item, product) }))
  const itemCount = sum(cleanItems(items), (item) => item.quantity)
  const unitsOf = (list) => sum(list, ({ item }) => item.quantity)

  // Nutrients: grams in the whole basket = value per 100 g x grams bought / 100
  const nutrients = {}
  for (const [key, field] of Object.entries(NUTRIENTS)) {
    const known = lines.filter(({ grams, product }) => grams !== null && Number.isFinite(product.nutriments?.[field]))
    nutrients[key] = {
      grams: known.length ? sum(known, ({ grams, product }) => (product.nutriments[field] * grams) / 100) : null,
      knownItems: unitsOf(known)
    }
  }

  // Additives: distinct additives of the basket, riskiest and most frequent first
  const additiveCounts = {}
  for (const { product } of lines) {
    for (const tag of new Set(product.additives_tags || [])) additiveCounts[tag] = (additiveCounts[tag] || 0) + 1
  }
  const additives = Object.entries(additiveCounts)
    .map(([tag, products]) => ({
      tag,
      name: ADDITIVES[tag]?.name || tag.replace(/^en:/, '').toUpperCase(),
      risk: ADDITIVES[tag]?.risk || 'unknown',
      products
    }))
    .sort((a, b) => ADDITIVE_RISK_ORDER[a.risk] - ADDITIVE_RISK_ORDER[b.risk] || b.products - a.products)

  // CO₂: kg CO₂e per kg (Agribalyse) x kg bought, with its breakdown by step
  const withCo2 = lines.filter(({ grams, product }) => grams !== null && Number.isFinite(product.ecoscore_data?.agribalyse?.co2_total))
  const co2Breakdown = Object.fromEntries(CO2_PARTS.map((part) => [
    part,
    sum(withCo2, ({ grams, product }) => (product.ecoscore_data.agribalyse[`co2_${part}`] || 0) * grams / 1000)
  ]))

  // Forest: m² of forest per kg (Open Food Facts forest footprint) x kg bought,
  // plus products flagged for deforestation risk (palm oil, threatened species)
  const withForest = lines.filter(({ grams, product }) => grams !== null && Number.isFinite(product.forest_footprint_data?.footprint_per_kg))
  const deforestationRisk = lines.filter(({ product }) => product.ecoscore_data?.adjustments?.threatened_species?.ingredient)

  const organic = lines.filter(({ product }) => hasLabel(product, (label) => label === 'en:organic' || label.startsWith('en:eu-organic')))
  const fairTrade = lines.filter(({ product }) => hasLabel(product, (label) => label.includes('fair-trade')))

  return {
    itemCount,
    knownItems: unitsOf(lines), // items found on Open Food Facts
    nutrients,
    additives: {
      total: additives.length,
      high: additives.filter((a) => a.risk === 'high').length,
      moderate: additives.filter((a) => a.risk === 'moderate').length,
      top: additives.slice(0, TOP_ADDITIVES)
    },
    co2: {
      kg: withCo2.length ? sum(withCo2, ({ grams, product }) => product.ecoscore_data.agribalyse.co2_total * grams / 1000) : null,
      breakdown: co2Breakdown,
      knownItems: unitsOf(withCo2)
    },
    forest: {
      squareMeters: withForest.length ? sum(withForest, ({ grams, product }) => product.forest_footprint_data.footprint_per_kg * grams / 1000) : null,
      knownItems: unitsOf(withForest),
      riskItems: unitsOf(deforestationRisk)
    },
    organic: { items: unitsOf(organic), share: ratio(unitsOf(organic), unitsOf(lines)) },
    fairTrade: { items: unitsOf(fairTrade), share: ratio(unitsOf(fairTrade), unitsOf(lines)) }
  }
}
