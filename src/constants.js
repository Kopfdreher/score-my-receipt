const PROOF_TYPE_RECEIPT = 'RECEIPT'

export default {
  APP_NAME: 'Score My Receipt',
  APP_USER_AGENT: 'Score My Receipt Web App',
  APP_URL: import.meta.env.VITE_OPEN_PRICES_APP_URL,
  APP_API_URL: `${import.meta.env.VITE_OPEN_PRICES_APP_URL}/api/docs`,
  OFF_API_URL: 'https://world.openfoodfacts.org/api/v2/product',
  PROOF_TYPE_RECEIPT
}
