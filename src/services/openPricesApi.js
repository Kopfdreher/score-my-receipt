import { useAppStore } from '../store'
import constants from '../constants'

const OP_DEFAULT_PAGE_SIZE = 25
const OP_DEFAULT_PARAMS = {
  app_name: constants.APP_USER_AGENT
}

function buildURLParams(params = {}) {
  const allParams = { ...OP_DEFAULT_PARAMS, ...params }
  return new URLSearchParams(allParams)
}

/**
 * Error rejected by fetchOpenPrices when the API answers with a non-2xx status.
 */
export class OpenPricesApiError extends Error {
  constructor(response, data) {
    const detail = data && data.detail
    super(typeof detail === 'string' ? detail : (data ? JSON.stringify(data) : `${response.status} ${response.statusText}`))
    this.name = 'OpenPricesApiError'
    this.status = response.status
    this.data = data
  }
}

/**
 * Wrapper around fetch, matching open-prices-frontend:
 * 1. prepend VITE_OPEN_PRICES_API_URL
 * 2. set Authorization and Content-Type
 * 3. omit cookies (token auth only)
 * 4. reject non-2xx with OpenPricesApiError
 */
function fetchOpenPrices(endpointWithParams, options, withToken = false) {
  const URLWithParams = `${import.meta.env.VITE_OPEN_PRICES_API_URL}${endpointWithParams}`
  const headers = options.headers || {}
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (withToken) {
    const store = useAppStore()
    headers['Authorization'] = `Bearer ${store.user.token}`
  }
  return fetch(URLWithParams, {
    ...options,
    headers,
    credentials: 'omit'
  })
    .then((response) => {
      if (response.ok) return response
      return response.json()
        .catch(() => null)
        .then((data) => { throw new OpenPricesApiError(response, data) })
    })
}

export default {
  signIn(username, password) {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    const endpointWithParams = `/auth?${buildURLParams()}`
    return fetchOpenPrices(endpointWithParams, {
      method: 'POST',
      body: formData
    })
      .then((response) => response.json())
  },

  getStatus() {
    const endpointWithParams = `/status?${buildURLParams()}`
    return fetchOpenPrices(endpointWithParams, {
      method: 'GET'
    })
      .then((response) => response.json())
  },

  createProof(image, inputData = {}, source = null) {
    const formData = new FormData()
    formData.append('file', image, image.name)
    formData.append('type', inputData.type || constants.PROOF_TYPE_RECEIPT)
    if (inputData.location_id) {
      formData.append('location_id', inputData.location_id)
    }
    if (inputData.location_osm_id && inputData.location_osm_type) {
      formData.append('location_osm_id', inputData.location_osm_id)
      formData.append('location_osm_type', inputData.location_osm_type)
    }
    formData.append('date', inputData.date ? inputData.date : '')
    formData.append('currency', inputData.currency ? inputData.currency : '')
    const extra = source ? { app_page: source } : {}
    const endpointWithParams = `/proofs/upload?${buildURLParams(extra)}`
    return fetchOpenPrices(endpointWithParams, {
      method: 'POST',
      body: formData
    }, true)
      .then((response) => response.json())
  },

  updateProof(proofId, inputData = {}) {
    const endpointWithParams = `/proofs/${proofId}?${buildURLParams()}`
    return fetchOpenPrices(endpointWithParams, {
      method: 'PATCH',
      body: JSON.stringify(inputData)
    }, true)
      .then((response) => response.json())
  },

  getReceiptItems(params = {}) {
    const defaultParams = { page: 1, size: OP_DEFAULT_PAGE_SIZE }
    const endpointWithParams = `/receipt-items?${buildURLParams({ ...defaultParams, ...params })}`
    return fetchOpenPrices(endpointWithParams, {
      method: 'GET'
    }, true)
      .then((response) => response.json())
  },

  createReceiptItem(inputData) {
    const endpointWithParams = `/receipt-items?${buildURLParams()}`
    return fetchOpenPrices(endpointWithParams, {
      method: 'POST',
      body: JSON.stringify(inputData)
    }, true)
      .then((response) => response.json())
  },

  updateReceiptItem(receiptItemId, inputData = {}) {
    const endpointWithParams = `/receipt-items/${receiptItemId}?${buildURLParams()}`
    return fetchOpenPrices(endpointWithParams, {
      method: 'PATCH',
      body: JSON.stringify(inputData)
    }, true)
      .then((response) => response.json())
  },

  createPrice(inputData, source = null) {
    const extra = source ? { app_page: source } : {}
    const endpointWithParams = `/prices?${buildURLParams(extra)}`
    return fetchOpenPrices(endpointWithParams, {
      method: 'POST',
      body: JSON.stringify(inputData)
    }, true)
      .then((response) => response.json())
  }
}
