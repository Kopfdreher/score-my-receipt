import constants from '../constants'

// Only reviewed categories identifying a plain, single-ingredient food are supported.
const INGREDIENTS = {
  apples: 'Apple', strawberries: 'Strawberry', grapes: 'Grape', bananas: 'Banana',
  peppers: 'Bell pepper', mushrooms: 'Mushroom', broccoli: 'Broccoli', carrots: 'Carrot',
  cauliflowers: 'Cauliflower', cucumbers: 'Cucumber', lettuces: 'Lettuce', onions: 'Onion',
  'sweet-potatoes': 'Sweet potato', tomatoes: 'Tomato'
}

export function categoryEstimateIngredient(categoryTag) {
  if (!categoryTag?.startsWith('en:')) return null
  return INGREDIENTS[categoryTag.slice(3).replace(/^fresh-/, '')] || null
}

export default {
  getCategoryEstimate(categoryTag, originTag = null) {
    const ingredient = categoryEstimateIngredient(categoryTag)
    if (!ingredient) return Promise.resolve(null)
    const origin = originTag || null
    const productInput = { categories_tags: [categoryTag], ingredients_text_en: ingredient }
    if (origin) productInput.origins_tags = [origin]
    // The special "test" code analyses input without creating or updating an OFF product.
    const url = constants.OFF_API_URL.replace('/api/v2/product', '/api/v3/product/test')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
    return fetch(url, {
      method: 'PATCH',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lc: 'en', cc: 'fr', tags_lc: 'en',
        fields: 'nutriscore_grade,nova_group,nutrient_levels,environmental_score_grade,environmental_score_data,ecoscore_grade,ecoscore_data',
        product: productInput
      })
    }).then(response => {
      if (!response.ok) throw new Error(`OFF category estimate failed (${response.status})`)
      return response.json()
    }).then(data => {
      if (!data.product || data.errors?.length) throw new Error('OFF category estimate could not be calculated')
      // Never treat inferred ingredients, labels or allergen absence as purchase-specific facts.
      const product = data.product
      return {
        nutriscore_grade: product.nutriscore_grade,
        nova_group: product.nova_group,
        nutrient_levels: product.nutrient_levels || {},
        environmental_score_grade: product.environmental_score_grade,
        environmental_score_data: product.environmental_score_data,
        ecoscore_grade: product.ecoscore_grade,
        ecoscore_data: product.ecoscore_data,
        ingredient, categoryTag, originTag: origin, country: 'fr', estimatedAt: new Date().toISOString()
      }
    }).finally(() => clearTimeout(timeout))
  }
}
