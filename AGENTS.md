# AI agent instructions for Score My Receipt

A three-screen Vue app that uploads a grocery receipt to the **Open Prices staging API**, lets the user correct line items, then shows Nutri-Score-style results. There is **no local backend**. Do not point at production (`prices.openfoodfacts.org`) during the hackathon.

Human setup lives in `README.md`. Follow this file for implementation contracts.

## Stack and conventions

- Vue 3 **Options API** (`export default {}`), order: `components`, `props`, `data()`, `computed`, `watch`, `mounted()`, `unmounted()`, `methods`
- Vite, Yarn (not npm), Vuetify 3, Vue Router, Pinia, vue-i18n
- `$t` for all user-facing strings (`signIn.*`, `upload.*`, `review.*`, `score.*` in `src/i18n/locales/en.json`)
- Prefer `.then()` over `async`/`await`
- Import page components with `defineAsyncComponent`
- API logic only in `src/services/`; session state in `src/store.js`
- `yarn lint` must pass with **0 warnings** (`eslint --max-warnings=0`). Pre-commit runs `lint-staged` (`eslint --fix` on staged files); CI runs `yarn lint` and `yarn build`.

## Routes and pair ownership

| Pair | Route | View | May edit |
| --- | --- | --- | --- |
| A Capture | `/upload` (`/` redirects) | `src/views/Upload.vue` | Sign-in is `/sign-in`. Capture UI, `createProof`, `getReceiptItems`, `setReceiptFromCapture` |
| B Review | `/review` | `src/views/Review.vue` | Item UI, `updateItem` / `addItem` / `removeItem`, `createReceiptItem` / `updateReceiptItem` / `createPrice` |
| C Score | `/score` | `src/views/Score.vue` | Score UI; **read** `getItems` / `getReceipt` only |

Do not implement another pair's screen. Suggested branches: `feat/capture`, `feat/review`, `feat/score`. High-conflict files: `src/store.js`, `src/router.js`, `src/i18n/locales/en.json`.

## Pinia contract (`src/store.js`)

Persist **user only** (`pick: ['user']`). Do **not rename** these keys (Pair A owns names).

`receipt`: `proofId`, `imagePreviewUrl`, `locationOsmId`, `locationOsmType`, `date`, `currency`, `status` (`idle` \| `uploading` \| `extracting` \| `ready` \| `error`), `errorMessage`, `items`.

Item: `id`, `name`, `price`, `quantity`, `barcode`, `categoryTag`, `off` (`nutriscore_grade`, `nova_group`, `ecoscore_grade` or `null`).

Actions: `setReceiptFromCapture` (A), `updateItem` / `addItem` / `removeItem` (B), `loadMockReceipt` / `resetReceipt`, getters `getReceipt` / `getItems`.

## Mock isolation

`src/data/mockReceipt.js`. Review and Score call `loadMockReceipt()` on mount if `items` is empty or `?mock=1`. Capture must later write the **same item shape** via `setReceiptFromCapture`.

## API (`src/services/openPricesApi.js`)

Staging base: `VITE_OPEN_PRICES_API_URL`. Token on writes. Pair A: `signIn`, `createProof`, `getReceiptItems`. Pair B: `createReceiptItem`, `updateReceiptItem`, `createPrice`. Product lookup: `src/services/openFoodFactsApi.js` `openfoodfactsProductSearch` (B or A filling `item.off`; C should not depend on live OFF if `off` is already set).

## Out of scope until a pair explicitly takes them

Keycloak, OSM map picker, camera polish, score formula, Cypress, a cloned Open Prices backend.
