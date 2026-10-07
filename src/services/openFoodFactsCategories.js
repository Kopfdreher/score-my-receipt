import categoryTagsEn from '@/data/categories/en.json'

/**
 * Open Food Facts category tags used by Open Prices for CATEGORY prices.
 * Source: OFF taxonomy via open-prices-frontend categories/en.json
 * Kept as plain (non-reactive) module data so Vue does not proxy ~2500 items.
 */
const CATEGORY_OPTIONS = Object.freeze(
  categoryTagsEn.map((entry) => Object.freeze({
    title: entry.name,
    value: entry.id,
    searchText: `${entry.name} ${entry.id}`.toLowerCase()
  }))
)

const CATEGORY_BY_ID = new Map(
  categoryTagsEn.map((entry) => [entry.id, entry.name])
)

export default {
  getCategoryOptions() {
    return CATEGORY_OPTIONS
  },

  getCategoryName(categoryId) {
    if (!categoryId) return null
    return CATEGORY_BY_ID.get(categoryId) || String(categoryId).replace(/^en:/, '')
  },

  optionsWithSelected(options, categoryId) {
    if (!categoryId || options.some((option) => option.value === categoryId)) {
      return options
    }
    const title = this.getCategoryName(categoryId)
    return [{
      title,
      value: categoryId,
      searchText: `${title} ${categoryId}`.toLowerCase()
    }, ...options]
  },

  /**
   * Filter OFF categories as the user types.
   */
  filterCategoryOptions(query, limit = 40) {
    const needle = String(query || '').trim().toLowerCase()
    if (!needle) {
      return CATEGORY_OPTIONS.slice(0, limit)
    }
    const startsWith = []
    const contains = []
    for (const item of CATEGORY_OPTIONS) {
      const haystack = item.searchText
      if (item.title.toLowerCase().startsWith(needle) || haystack.startsWith(needle)) {
        startsWith.push(item)
      } else if (haystack.includes(needle)) {
        contains.push(item)
      }
    }
    return startsWith.concat(contains).slice(0, limit)
  }
}
