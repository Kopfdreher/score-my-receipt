import originTagsEn from '@/data/origins/en.json'

/**
 * Open Food Facts origin tags accepted by Open Prices (`origins_tags`).
 * Source: open-prices-frontend src/data/origins/en.json (OFF origins taxonomy).
 * Kept as plain (non-reactive) module data.
 */
const ORIGIN_OPTIONS = Object.freeze(
  originTagsEn.map((entry) => Object.freeze({
    title: entry.name,
    value: entry.id,
    searchText: `${entry.name} ${entry.id}`.toLowerCase()
  }))
)

const ORIGIN_BY_ID = new Map(
  originTagsEn.map((entry) => [entry.id, entry.name])
)

export default {
  getOriginOptions() {
    return ORIGIN_OPTIONS
  },

  getOriginName(originId) {
    if (!originId) return null
    return ORIGIN_BY_ID.get(originId) || String(originId).replace(/^en:/, '')
  },

  filterOriginOptions(query, limit = 40) {
    const needle = String(query || '').trim().toLowerCase()
    if (!needle) return ORIGIN_OPTIONS.slice(0, limit)
    const startsWith = []
    const contains = []
    for (const item of ORIGIN_OPTIONS) {
      if (item.title.toLowerCase().startsWith(needle)) {
        startsWith.push(item)
      } else if (item.searchText.includes(needle)) {
        contains.push(item)
      }
    }
    return startsWith.concat(contains).slice(0, limit)
  }
}
