import constants from '../constants'

const OP_DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
const LOCATION_SEARCH_LIMIT = 10

function withUserAgent(headers = {}) {
  return {
    ...headers,
    'User-Agent': constants.APP_USER_AGENT
  }
}

export default {
  /**
   * Nominatim search by query
   * @param {string} q search query
   */
  openstreetmapNominatimSearch(q) {
    const url = `${constants.OSM_NOMINATIM_SEARCH_URL}?q=${encodeURIComponent(q)}&addressdetails=1&format=json&limit=${LOCATION_SEARCH_LIMIT}`
    return fetch(url, {
      method: 'GET',
      headers: withUserAgent(OP_DEFAULT_HEADERS)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Nominatim search failed (${response.status})`)
        }
        return response.json()
      })
      .then((data) => data.filter((location) => (
        !constants.NOMINATIM_RESULT_TYPE_EXCLUDE_LIST.includes(location.type)
      )))
  },

  /**
   * Nominatim lookup by OSM ID
   * @param {string|number} id OSM ID (without prefix)
   */
  openstreetmapNominatimLookup(id) {
    const url = `${constants.OSM_NOMINATIM_LOOKUP_URL}?osm_ids=N${id},W${id},R${id}&addressdetails=1&format=json`
    return fetch(url, {
      method: 'GET',
      headers: withUserAgent(OP_DEFAULT_HEADERS)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Nominatim lookup failed (${response.status})`)
        }
        return response.json()
      })
  },

  /**
   * Photon search by query
   * @param {string} q search query
   * @param {boolean} restrictToShop restrict the search to shops
   * @param {boolean} filterResultsOnProperties filter out results based on osm_value
   */
  openstreetmapPhotonSearch(q, restrictToShop = true, filterResultsOnProperties = true) {
    let url = `${constants.OSM_PHOTON_SEARCH_URL}?q=${encodeURIComponent(q)}&limit=${LOCATION_SEARCH_LIMIT}`
    if (restrictToShop) {
      url += '&osm_tag=shop'
    }
    return fetch(url, {
      method: 'GET',
      headers: withUserAgent(OP_DEFAULT_HEADERS)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Photon search failed (${response.status})`)
        }
        return response.json()
      })
      .then((data) => data.features || [])
      .then((data) => data.filter((location) => {
        const properties = location.properties || {}
        if (restrictToShop && properties.osm_key !== 'shop') return false
        if (!filterResultsOnProperties) return true
        return !constants.NOMINATIM_RESULT_TYPE_EXCLUDE_LIST.includes(properties.osm_value)
      }))
  },

  /**
   * OpenStreetMap search by query
   * @param {string} q search query
   * @param {'nominatim'|'photon'} source search backend
   */
  openstreetmapSearch(q, source = 'nominatim') {
    if (source === 'photon') {
      return this.openstreetmapPhotonSearch(q)
    }
    return this.openstreetmapNominatimSearch(q)
  }
}
