import { useAppStore } from '../store'
import constants from '../constants'

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
 *
 * Receipt endpoints to add later (do not call from UI yet):
 * - POST /proofs/drafts/upload then PATCH /proofs/drafts/{id}
 * - POST /proofs/upload with type=RECEIPT
 * - POST /proofs/drafts/{id}/anonymize
 * - POST /proofs/process-with-gemini
 * - /receipt-items CRUD
 * - POST /prices with proof_id, product_code, price, currency, date, OSM location
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
  }
}
