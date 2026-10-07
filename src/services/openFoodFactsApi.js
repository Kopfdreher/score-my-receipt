import constants from '../constants'

// No custom headers on these GET requests: a Content-Type header makes the browser send a
// CORS preflight, which Open Food Facts rejects, so every product lookup failed.

// 'quantity' must stay in the list: without it, asking for 'nutriments' drops product_quantity
const OFF_DETAIL_FIELDS = [
  'quantity',
  'product_quantity',
  'product_quantity_unit',
  'nutriments',
  'nutrient_levels',
  'nutriscore_grade',
  'nova_group',
  'ecoscore_grade',
  'environmental_score_grade',
  'environmental_score_data',
  'allergens_tags',
  'traces_tags',
  'ingredients_text',
  'ingredients',
  'forest_footprint_2026',
  'additives_tags',
  'labels_tags',
  'ecoscore_data',
  'forest_footprint_data'
]
const OFF_MAX_RETRIES = 2
const OFF_RETRY_DELAY_MS = 3000

class TemporaryError extends Error {
  constructor(status) {
    super(`Open Food Facts ${status}`)
    this.status = status
  }
}

function buildFieldsParam(extraFields = []) {
  const fields = new Set([
    ...constants.OFF_PRODUCT_FIELDS.split(','),
    ...OFF_DETAIL_FIELDS,
    ...extraFields
  ])
  return Array.from(fields).filter(Boolean).join(',')
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Shared by single and batch lookups. Keep each method's existing response shape.
function fetchProducts(url, attempt = 0) {
  return fetch(url, { method: 'GET' })
    .then((response) => {
      if (response.status === 404) return null
      if (response.status === 429 || response.status >= 500) throw new TemporaryError(response.status)
      if (!response.ok) throw new Error(`Open Food Facts ${response.status}`)
      return response.json()
    })
    .catch((error) => {
      // Some CORS failures appear as TypeError rather than exposing the HTTP status.
      const temporary = error instanceof TemporaryError || error instanceof TypeError
      if (temporary && attempt < OFF_MAX_RETRIES) {
        return wait(OFF_RETRY_DELAY_MS * (attempt + 1)).then(() => fetchProducts(url, attempt + 1))
      }
      throw error
    })
}

export default {
  openfoodfactsProductSearch(code) {
    const fields = buildFieldsParam()
    const url = `${constants.OFF_API_URL}/${encodeURIComponent(code)}.json?fields=${fields}`
    return fetchProducts(url).then((data) => data || { status: 0, product: null })
  },

  /** Product details for Score; null when the barcode is not found. */
  getProductDetails(code) {
    return this.openfoodfactsProductSearch(code)
      .then((data) => data.status === 1 ? data.product : null)
  },

  /** Fetch several products, preserving Review's batch-response contract. */
  openfoodfactsProductsSearch(codes = []) {
    const uniqueCodes = Array.from(new Set(
      codes.map((code) => String(code || '').trim()).filter(Boolean)
    ))
    if (!uniqueCodes.length) return Promise.resolve({ count: 0, products: [] })

    const path = uniqueCodes.map((code) => encodeURIComponent(code)).join('+')
    const fields = buildFieldsParam()
    const url = `${constants.OFF_PRODUCTS_URL}/${path}.json?fields=${fields}`
    return fetchProducts(url).then((data) => data || { count: 0, products: [] })
  },

  /**
   * Find a representative product image for an OFF category tag (e.g. en:apples).
   */
  openfoodfactsCategoryImageSearch(categoryTag) {
    const tag = String(categoryTag || '').trim()
    if (!tag) {
      return Promise.resolve(null)
    }

    const params = new URLSearchParams({
      categories_tags: tag,
      fields: 'code,product_name,image_front_small_url,image_front_url',
      page_size: '12',
      page: '1'
    })
    const url = `${constants.OFF_SEARCH_URL}?${params.toString()}`

    return fetch(url, { method: 'GET' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`OFF category search failed (${response.status})`)
        }
        return response.json()
      })
      .then((data) => {
        const products = (data && data.products) || []
        const withImage = products.find((product) => (
          product.image_front_small_url || product.image_front_url
        ))
        if (!withImage) return null
        return {
          product_name: withImage.product_name || null,
          image_front_small_url: withImage.image_front_small_url || null,
          image_front_url: withImage.image_front_url || withImage.image_front_small_url || null
        }
      })
  }
}
