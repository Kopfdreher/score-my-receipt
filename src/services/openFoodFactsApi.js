import constants from '../constants'

const OP_DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
}

function buildFieldsParam(extraFields = []) {
  const fields = new Set([
    ...constants.OFF_PRODUCT_FIELDS.split(','),
    ...extraFields
  ])
  return Array.from(fields).filter(Boolean).join(',')
}

export default {
  openfoodfactsProductSearch(code) {
    const fields = buildFieldsParam()
    const url = `${constants.OFF_API_URL}/${encodeURIComponent(code)}.json?fields=${fields}`
    return fetch(url, {
      method: 'GET',
      headers: OP_DEFAULT_HEADERS
    })
      .then((response) => response.json())
  },

  /**
   * Fetch several products in one call:
   * GET /products/{code1}+{code2}.json?fields=...
   */
  openfoodfactsProductsSearch(codes = []) {
    const uniqueCodes = Array.from(new Set(
      codes
        .map((code) => String(code || '').trim())
        .filter(Boolean)
    ))

    if (!uniqueCodes.length) {
      return Promise.resolve({ count: 0, products: [] })
    }

    const path = uniqueCodes.map((code) => encodeURIComponent(code)).join('+')
    const fields = buildFieldsParam()
    const url = `${constants.OFF_PRODUCTS_URL}/${path}.json?fields=${fields}`

    return fetch(url, {
      method: 'GET',
      headers: OP_DEFAULT_HEADERS
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`OFF multi lookup failed (${response.status})`)
        }
        return response.json()
      })
  }
}
