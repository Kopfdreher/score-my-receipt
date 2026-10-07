# Score My Receipt

A Vue.js frontend for a receipt upload tool, aligned with the [Open Prices frontend](https://github.com/openfoodfacts/open-prices-frontend) stack so it can later be contributed upstream.

Three-screen app. Capture, Adjust, and Score can be built in parallel against a shared Pinia session. Adjust and Score load mock items until Capture writes a real receipt.

## Team ownership

| Pair | Screen | Route | Owns |
| --- | --- | --- | --- |
| A | Capture | `/upload` (`/` redirects to sign-in or upload) | Photo, auth, `createProof`, `getReceiptItems`, `setReceiptFromCapture` |
| B | Adjust | `/review` | Item editor, `updateItem` / `addItem` / `removeItem`, later `updateReceiptItem` / `createReceiptItem` / `createPrice` |
| C | Score | `/score` | Read `getItems` only; scoring UI. Do not call upload APIs |

Do not rename Pinia `receipt` / item fields in [`src/store.js`](src/store.js). Pair A owns those names.

Suggested branches: `feat/capture`, `feat/review`, `feat/score`. Watch conflicts in `store.js`, `router.js`, and `src/i18n/locales/en.json`.

If `items` is empty (or you open `/review?mock=1` / `/score?mock=1`), the app loads [`src/data/mockReceipt.js`](src/data/mockReceipt.js).

Staging only. Pair B will later persist corrections with `PATCH /receipt-items` and `POST /prices`.

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

GitHub Actions runs `yarn lint` and `yarn build` on pull requests and on push to `main`. Warnings fail lint (`--max-warnings=0`).

A Husky pre-commit hook runs `lint-staged`, which auto-fixes staged `.js`/`.vue` files with ESLint and rejects the commit if anything remains. After `yarn`, the hook is installed locally. CI still runs if someone skips the hook.

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

Client methods in `src/services/openPricesApi.js` (no UI calls yet except navigation):

- `createProof` — `POST /proofs/upload` (`type=RECEIPT`)
- `getReceiptItems` / `createReceiptItem` / `updateReceiptItem`
- `createPrice` — `POST /prices`

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

### Score analysis input and sources

The Score screen reads the existing session list without changing Capture or Review.
Each item keeps `id`, `name`, `price` (unit price), `quantity` (units bought),
`barcode`, `categoryTag`, and `off`. For loose produce, supply **`weight` and
`weightUnit` (`g`, `kg`, or `mg`) as the total purchased weight of that receipt
line**. Weight is never read from `quantity`. `setReceiptFromCapture` already
preserves extra fields; Pair B's `addItem` currently needs to preserve these
fields when wiring its editor. Extraction and that editor remain separate work.

Charts count distinct products, not quantities. Identical barcodes are merged;
produce entries are merged only when their reference and analysis data match.
Purchased quantities still contribute to nutrients, emissions and spending.
A missing amount or value stays unknown. Drinks measured by volume contribute
to nutrient totals, but not mass or carbon totals unless their mass is known.

The bundled `src/data/produceReference.json` is a limited raw-produce snapshot
from Open Food Facts' category mappings, ANSES CIQUAL 2020 and ADEME AGRIBALYSE
3.2. Unknown categories remain unknown; matching by receipt name is not attempted.
Grades are never fabricated. NOVA 1 for a matched raw food is a category-based
classification, visibly marked Estimated. Censored nutrient values (`< ...`)
are omitted rather than represented as exact values. Published means are per
100 g of edible food; gross receipt weight may include inedible parts.

Reference files (retrieved 2026-10-07) are in the
[Open Food Facts upstream repository](https://github.com/openfoodfacts/openfoodfacts-server):

- `taxonomies/food/categories.txt`
- `external-data/ciqual/ciqual/CIQUAL2020_ENG_2020_07_07.csv`
- `external-data/environmental_score/agribalyse/AGRIBALYSE_vf.csv.2`

CIQUAL and simplified AGRIBALYSE impact data are published under the French
Licence Ouverte; Open Food Facts taxonomy/data attribution follows its
[reuse terms](https://world.openfoodfacts.org/terms-of-use).
`scripts/build-produce-reference.py` regenerates the snapshot from those three
files downloaded to `/tmp/categories.txt`, `/tmp/ciqual2020.csv`, and
`/tmp/agribalyse-2.csv`. Generic bananas deliberately use the published raw-banana
reference `13005`, rather than the taxonomy's plantain proxy.

Run calculation checks with `node scripts/test-basket-analysis.mjs`.
Optional allergen/nutrient selections are stored on this device separately from
the receipt and user session. Missing allergen data is Unknown, not an assurance
of safety; gluten-free labels are not presented as verified certifications.

### Saved analyses

Opening an analysis automatically saves its corrected receipt and analysis snapshot
in this browser's local storage. The **Saved receipts** button shows the receipt
date, distinct product count and known amount spent, with Open and Delete actions.
Reopening a snapshot does not fetch updated OFF data. Editing a product opens that
product in Review; returning to Score recalculates and replaces the saved version.
Photos are omitted from saved history to keep browser storage small. History is
local to this browser and is removed when its site data is cleared.

Run history checks with `node scripts/test-receipt-history.mjs`.
