const PROOF_TYPE_RECEIPT = 'RECEIPT'

export default {
  APP_NAME: 'Score My Receipt',
  APP_USER_AGENT: 'Score My Receipt Web App',
  APP_URL: import.meta.env.VITE_OPEN_PRICES_APP_URL,
  APP_API_URL: `${import.meta.env.VITE_OPEN_PRICES_APP_URL}/api/docs`,
  OFF_API_URL: 'https://world.openfoodfacts.org/api/v2/product',
  OFF_PRODUCTS_URL: 'https://world.openfoodfacts.org/products',
  OFF_SEARCH_URL: 'https://world.openfoodfacts.org/api/v2/search',
  OFF_PRODUCT_FIELDS: [
    'code',
    'product_name',
    'brands',
    'quantity',
    'image_front_small_url',
    'image_front_url',
    'nutriscore_grade',
    'ecoscore_grade',
    'nova_group'
  ].join(','),
  OFF_SIGN_UP_URL: 'https://world.openfoodfacts.org/cgi/user.pl',
  PROOF_TYPE_RECEIPT,
  PRICE_TYPE_PRODUCT: 'PRODUCT',
  PRICE_TYPE_CATEGORY: 'CATEGORY',
  // Fallback when Intl.supportedValuesOf('currency') is unavailable.
  CURRENCY_OPTIONS: [
    'EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'ISK', 'PLN', 'CZK', 'HUF',
    'RON', 'BGN', 'RSD', 'UAH', 'TRY', 'RUB', 'ALL', 'MKD', 'BAM', 'MDL', 'GEL',
    'CAD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'BOB', 'PYG', 'CRC',
    'AUD', 'NZD', 'JPY', 'CNY', 'KRW', 'INR', 'IDR', 'THB', 'VND', 'MYR', 'SGD',
    'PHP', 'HKD', 'TWD', 'PKR', 'BDT', 'LKR', 'NPR', 'KHR', 'LAK', 'MMK',
    'ZAR', 'EGP', 'NGN', 'KES', 'GHS', 'MAD', 'TND', 'DZD', 'XOF', 'XAF', 'ETB',
    'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'ILS', 'JOD', 'LBP', 'IQD', 'IRR'
  ],
  OSM_NAME: 'OpenStreetMap',
  OSM_URL: 'https://www.openstreetmap.org',
  OSM_NOMINATIM_URL: 'https://nominatim.openstreetmap.org',
  OSM_NOMINATIM_SEARCH_URL: 'https://nominatim.openstreetmap.org/search',
  OSM_NOMINATIM_LOOKUP_URL: 'https://nominatim.openstreetmap.org/lookup',
  OSM_PHOTON_URL: 'https://photon.komoot.io',
  OSM_PHOTON_SEARCH_URL: 'https://photon.komoot.io/api/',
  // Skip broad place / highway results so shop search stays useful.
  NOMINATIM_RESULT_TYPE_EXCLUDE_LIST: [
    'country', 'state', 'region', 'province', 'district', 'county', 'municipality', 'city',
    'borough', 'suburb', 'quarter', 'neighbourhood', 'block', 'city_block', 'plot', 'town',
    'village', 'hamlet', 'isolated_dwelling', 'allotments', 'continent', 'archipelago',
    'island', 'islet', 'square', 'locality', 'polder', 'sea', 'ocean', 'administrative',
    'state_district', 'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified',
    'residential', 'living_street', 'service', 'pedestrian', 'track', 'road', 'footway',
    'apartments', 'barracks', 'bungalow', 'cabin', 'detached', 'dormitory', 'ger', 'house',
    'houseboat', 'fuel', 'gas', 'casino', 'parking', 'parking_space', 'charging_station',
    'atm', 'car_sharing', 'yes'
  ]
}
