# Score My Receipt

A Vue.js frontend for a receipt upload tool, aligned with the [Open Prices frontend](https://github.com/openfoodfacts/open-prices-frontend) stack so it can later be contributed upstream.

This is an early scaffold: the app boots, but there is no receipt UI yet.

## Stack

Matches Open Prices:

- Vue 3 (Options API) + Vite + Yarn
- Vuetify 3 + Material Design Icons
- Vue Router, Pinia (persisted to `localStorage`), vue-i18n
- Plain JavaScript (no TypeScript)
- API clients in `src/services/`, auth/user state in `src/store.js`

Requires **Node.js 20+** and **Yarn** (not npm).

## Setup

```sh
yarn
yarn dev
```

The app runs at http://localhost:5173.

```sh
yarn lint
yarn build
```

## Environment

`.env` defaults to the Open Prices **staging** API. Do not point this hackathon work at production.

| Variable | Staging value |
| --- | --- |
| `VITE_OPEN_PRICES_ENV` | `staging` |
| `VITE_OPEN_PRICES_APP_URL` | `https://prices.openfoodfacts.net` |
| `VITE_OPEN_PRICES_API_URL` | `https://prices.openfoodfacts.net/api/v1` |
| `VITE_DEFAULT_LOCALE` | `en` |
| `VITE_FALLBACK_LOCALE` | `en` |

Override locally with a gitignored `.env.local` if needed.

## API access

### Open Prices

- Staging docs: https://prices.openfoodfacts.net/api/docs
- Production docs: https://prices.openfoodfacts.org/api/docs (do not use for hackathon testing)

Writes need an [Open Food Facts account](https://world.openfoodfacts.org). Exchange the username (OFF user id, not email) and password via `POST /auth` to get an `access_token`, then send `Authorization: Bearer <token>`.

The client in `src/services/openPricesApi.js` follows the Open Prices frontend pattern: prepend the env base URL, omit cookies (`credentials: 'omit'`), send JSON unless the body is `FormData`, and always include `app_name` as a query param.

Receipt-related endpoints (not wired to UI yet):

- `POST /proofs/drafts/upload` then `PATCH /proofs/drafts/{id}` (or `POST /proofs/upload`) with `type=RECEIPT`
- `POST /proofs/drafts/{id}/anonymize`
- `POST /proofs/process-with-gemini`
- `/receipt-items` CRUD
- `POST /prices` with `proof_id`, `product_code`, price, currency, date, and OSM location

### Open Food Facts

Product reads (no auth): `GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json`

See `src/services/openFoodFactsApi.js`. Browser clients cannot set a custom `User-Agent`; this app identifies itself to Open Prices via `app_name` instead.

Open Food Facts data is under the ODbL licence: mention the source, and do not mix in non-open data you cannot release.

## Mapping into open-prices-frontend later

Keep new work in the same places Open Prices already uses:

| This repo | Upstream |
| --- | --- |
| `src/services/openPricesApi.js` | `src/services/openPricesApi.js` |
| `src/services/openFoodFactsApi.js` | `src/services/openFoodFactsApi.js` |
| `src/store.js` | `src/store.js` |
| `src/views/` | `src/views/` |
| `src/constants.js` | `src/constants.js` |

Conventions to keep: Options API, `.then()` over `async`/`await`, `$t` for user-facing strings, Vuetify components, API logic in services.

This repo is MIT-licensed. Files contributed to Open Prices will be relicensed **AGPL-3.0**.
