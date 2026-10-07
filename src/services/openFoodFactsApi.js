import constants from '../constants'

const OP_DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
}
const SEARCH_URL = import.meta.env.DEV
  ? '/search-api/search'
  : 'https://search.openfoodfacts.org/search'
const TAXONOMY_SUGGEST_URL = 'https://world.openfoodfacts.org/api/v3/taxonomy_suggestions'
const SEARCH_PAGE_SIZE = 8
const MAX_EXTRA_TOKENS = 1
const NOISE_TOKENS = new Set([
  'sort', 'sorte', 'stk', 'stueck', 'pack', 'und', 'mit', 'von', 'the', 'and'
])
const BROAD_CATEGORY_TAGS = new Set([
  'en:groceries',
  'en:plant-based-foods',
  'en:plant-based-foods-and-beverages'
])

function searchLang() {
  const locale = typeof navigator !== 'undefined' ? navigator.language : ''
  return (locale || 'en').split('-')[0] || 'en'
}

function nameTokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => (
      token.length >= 4
      && !/\d/.test(token)
      && !NOISE_TOKENS.has(token)
    ))
}

function tokensMatch(left, right) {
  if (left === right) return true
  const shorter = left.length <= right.length ? left : right
  const longer = left.length <= right.length ? right : left
  return shorter.length >= 5 && longer.startsWith(shorter)
}

function tokenMatches(receiptToken, productTokens) {
  return productTokens.some((productToken) => tokensMatch(receiptToken, productToken))
}

function nameOverlap(query, productName) {
  const receiptTokens = nameTokens(query)
  const productTokens = nameTokens(productName)
  if (!receiptTokens.length) return null
  const matched = receiptTokens.filter((token) => tokenMatches(token, productTokens))
  const extra = productTokens.filter((token) => !tokenMatches(token, receiptTokens)).length
  const full = matched.length === receiptTokens.length
  const tight = receiptTokens.length === 1 ? extra === 0 : extra <= MAX_EXTRA_TOKENS
  return {
    confident: full && tight,
    extra,
    categoryRank: matched.reduce((total, token) => total + token.length, 0)
  }
}

function categoryTagFromHit(hit) {
  const tags = hit && Array.isArray(hit.categories_tags) ? hit.categories_tags : []
  const specific = tags.filter((tag) => (
    tag.startsWith('en:')
    && tag !== 'en:other'
    && !BROAD_CATEGORY_TAGS.has(tag.toLowerCase())
  ))
  return specific.length ? specific[specific.length - 1] : null
}

function labelToCategoryTag(label) {
  const slug = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug ? `en:${slug}` : null
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
  },

  /**
   * Look up many barcodes in one Search-a-licious request.
   * Returns the codes that exist, plus each code with leading zeros removed.
   */
  searchProductsByCodes(codes = []) {
    const uniqueCodes = Array.from(new Set(
      codes
        .map((code) => String(code || '').trim())
        .filter((code) => /^\d+$/.test(code))
    ))
    if (!uniqueCodes.length) return Promise.resolve(new Set())

    const params = new URLSearchParams({
      q: `code:(${uniqueCodes.join(' OR ')})`,
      page_size: String(uniqueCodes.length),
      fields: 'code'
    })

    return fetch(`${SEARCH_URL}?${params}`, {
      method: 'GET'
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Search-a-licious code lookup failed (${response.status})`)
        }
        return response.json()
      })
      .then((data) => {
        const found = new Set()
        const hits = (data && data.hits) || []
        hits.forEach((hit) => {
          const code = String((hit && hit.code) || '').trim()
          if (!/^\d+$/.test(code)) return
          found.add(code)
          found.add(code.replace(/^0+/, '') || '0')
        })
        return found
      })
  },

  /**
   * Match a receipt line title to a product code via Search-a-licious.
   * A barcode is kept only when the receipt words appear in that product name.
   * Otherwise categoryTag comes from the closest hit.
   */
  searchProductByName(name) {
    const query = String(name || '').trim()
    if (!query) return Promise.resolve(null)

    const params = new URLSearchParams({
      q: query,
      page_size: String(SEARCH_PAGE_SIZE),
      langs: searchLang(),
      fields: 'code,product_name,categories_tags'
    })

    return fetch(`${SEARCH_URL}?${params}`, {
      method: 'GET'
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Search-a-licious failed (${response.status})`)
        }
        return response.json()
      })
      .then((data) => {
        const hits = ((data && data.hits) || []).filter((hit) => hit && hit.code)
        if (!hits.length) return null

        const ranked = hits.map((hit) => ({
          hit,
          overlap: nameOverlap(query, hit.product_name)
        })).filter((entry) => entry.overlap)

        const confident = ranked
          .filter((entry) => entry.overlap.confident)
          .sort((a, b) => a.overlap.extra - b.overlap.extra)[0]
        const closest = ranked
          .filter((entry) => entry.overlap.categoryRank > 0)
          .sort((a, b) => b.overlap.categoryRank - a.overlap.categoryRank)[0]
        const chosen = confident || closest
        if (!chosen) {
          return { code: null, confident: false, categoryTag: null }
        }

        return {
          code: confident ? String(confident.hit.code) : null,
          confident: Boolean(confident),
          categoryTag: categoryTagFromHit(chosen.hit)
        }
      })
  },

  suggestCategoryTag(name) {
    const query = String(name || '').trim()
    if (!query) return Promise.resolve(null)

    const params = new URLSearchParams({
      tagtype: 'categories',
      lc: 'en',
      string: query
    })

    return fetch(`${TAXONOMY_SUGGEST_URL}?${params}`, {
      method: 'GET',
      headers: OP_DEFAULT_HEADERS
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Category suggest failed (${response.status})`)
        }
        return response.json()
      })
      .then((data) => {
        const label = data && data.suggestions && data.suggestions[0]
        return labelToCategoryTag(label)
      })
  }
}
