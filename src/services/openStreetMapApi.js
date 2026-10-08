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
   * Photon reverse search by coordinates
   * @param {number} lat latitude
   * @param {number} lon longitude
   */
  openstreetmapPhotonReverse(lat, lon) {
    const url = `${constants.OSM_PHOTON_REVERSE_URL}?lat=${lat}&lon=${lon}&limit=${LOCATION_SEARCH_LIMIT}&osm_tag=shop`
    return fetch(url, {
      method: 'GET',
      headers: withUserAgent(OP_DEFAULT_HEADERS)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Photon reverse failed (${response.status})`)
        }
        return response.json()
      })
      .then((data) => data.features || [])
      .then((data) => data.filter((location) => (
        !constants.NOMINATIM_RESULT_TYPE_EXCLUDE_LIST.includes(location.properties?.osm_value)
      )))
  },

  /**
   * OpenStreetMap shop search by query (Photon).
   * @param {string} q search query
   */
  openstreetmapSearch(q) {
    return this.openstreetmapPhotonSearch(q)
  }
}
