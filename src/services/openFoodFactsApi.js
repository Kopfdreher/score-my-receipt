import constants from '../constants'

const OP_DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
}

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
].join(',')
const OFF_MAX_RETRIES = 2
const OFF_RETRY_DELAY_MS = 3000

class TemporaryError extends Error {
  constructor(status) {
    super(`Open Food Facts ${status}`)
    this.status = status
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default {
  openfoodfactsProductSearch(code) {
    const url = `${constants.OFF_API_URL}/${code}.json`
    return fetch(url, {
      method: 'GET',
      headers: OP_DEFAULT_HEADERS
    })
      .then((response) => response.json())
  },

  /**
   * Details used by the Score page (nutrients, additives, CO₂, forest, labels, weight).
   * Resolves with the product, or null if Open Food Facts does not know the barcode.
   */
  getProductDetails(code, attempt = 0) {
    const url = `${constants.OFF_API_URL}/${code}?fields=${OFF_DETAIL_FIELDS}`
    return fetch(url, { method: 'GET' })
      .then((response) => {
        if (response.status === 404) return null
        if (response.status === 429 || response.status >= 500) throw new TemporaryError(response.status)
        if (!response.ok) throw new Error(`Open Food Facts ${response.status}`)
        return response.json().then((data) => (data.status === 1 ? data.product : null))
      })
      .catch((error) => {
        // Rate limited, server error, or network error. A 429 from OFF has no CORS header,
        // so the browser only shows it as a network error (TypeError). Wait and try again.
        const temporary = error instanceof TemporaryError || error instanceof TypeError
        if (temporary && attempt < OFF_MAX_RETRIES) {
          return wait(OFF_RETRY_DELAY_MS * (attempt + 1)).then(() => this.getProductDetails(code, attempt + 1))
        }
        throw error
      })
  }
}
