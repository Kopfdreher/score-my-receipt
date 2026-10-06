# Roadmap — Pair C (Score)

Our screen: **`/score`** (`src/views/Score.vue`). It shows the receipt in the session: a **global mark out of 100**, **one chart per category** (Nutri-Score, NOVA, Green-Score), spending, best / worst items and the item list.

Rules from [`AGENTS.md`](AGENTS.md) we must follow:

- **Read only** from the Pinia session: `getReceipt` / `getItems`. Do not call upload APIs, do not implement `/upload` or `/review`.
- Do **not rename** `receipt` / item fields in `src/store.js` (Pair A owns them).
- Before Capture writes real items, `/score` uses `src/data/mockReceipt.js` (empty session or `?mock=1`). No other demo data (`.cursor/rules/no-demo-data.mdc`).
- If `item.off` is already set, do not depend on live Open Food Facts.
- Vue 3 **Options API** (order: `components`, `props`, `data()`, `computed`, `watch`, `mounted()`, `unmounted()`, `methods`), `.then()` over `async`/`await`, `$t('score.*')` for every string, `yarn lint` with **0 warnings**.
- Branch: `feat/score`. High-conflict files: `src/store.js`, `src/router.js`, `src/i18n/locales/en.json` (we only add keys under `score`).

## What we get from the session

```js
receipt: { proofId, imagePreviewUrl, locationOsmId, locationOsmType, date, currency, status, errorMessage, items }

item: {
  id, name, price, quantity, barcode, categoryTag,
  off: { nutriscore_grade, nova_group, ecoscore_grade } | null
}
```

What this means for the calculations:

- `off` can be `null` (loose fruit, unknown item): count it in spending, exclude it from scores, show the **coverage** ("scored on 4 of 7 items").
- Grades can be `'unknown'` / `'not-applicable'`: treat them like `null`.
- There is **no product weight**: weight scores by **quantity** (items bought) or by **spending** (€), not by grams.
- There is **no history**: one receipt at a time, no "previous period".

## Split inside the pair

- **Person C1 — score logic**: pure functions, no Vue, no network (`src/utils/score.js`)
- **Person C2 — score screen**: `Score.vue`, components, responsive, texts

Agree first on what `computeScore(items)` returns (30 min), so C2 can build the screen on `mockReceipt.js` while C1 writes the logic:

```js
{
  itemCount, scoredCount, coverage,       // coverage = share of items with a usable score
  totalSpend, unpricedCount, currency,
  categories: {                            // one chart per category
    nutriscore: { segments, scoredUnits, totalUnits, coverage },
    nova:       { segments, scoredUnits, totalUnits, coverage },
    greenScore: { segments, scoredUnits, totalUnits, coverage }
  },
  ultraProcessedShare,                     // share of € spent on NOVA 4
  global: { value, letter },               // mark out of 100 + letter
  best: [items], worst: [items]            // each with its own score
}
// each category also has { average, letter }

// one segment per grade, plus 'unknown' (label null: translate it with $t)
segment: { key: 'a', label: 'A', color: '#038141', units, share, spend, spendShare }
}
```

---

//we need if its fruits or some do a special category sation bc there are no bare code and nutriscore ect//

## 👤 Person C1 — score logic (`src/utils/score.js`)

| # | Task | Status |
|---|---|---|
| C1.1 | Clean an item: valid grade or `null` (drop `unknown` / `not-applicable`), `lineTotal = price × quantity` (confirm with Pair A that `price` is per unit) | ✅ done |
| C1.2 | Distributions: number of items per Nutri-Score, NOVA, Green-Score (weighted by `quantity`), plus `unknown` count | ✅ done |
| C1.3 | Averages per category: letters → numbers (A=5 … E=1), weighted average, back to a letter. **Never average letters directly** | ✅ done |
| C1.4 | Spending: total, € per Nutri-Score grade, share of ultra-processed (NOVA 4) in € | ✅ done |
| C1.5 | Coverage: share of items with a usable score, on every number | ✅ done |
| C1.6 | Chart data per category: one segment per grade + 'unknown', with official color, units, share, € spent and share of € | ✅ done |
| C1.7 | Best and worst items of the receipt (ranked by their own mark, the two lists never overlap) | ✅ done |
| C1.9 | Global mark out of 100 + letter: 50 % Nutri-Score, 25 % NOVA, 25 % Green-Score, missing parts left out. **"Score formula" is out of scope in `AGENTS.md` until a pair takes it: announce to the team that Pair C takes it** | ✅ done — formula to validate with the team |
| C1.8 | Edge cases: empty receipt, all `off: null`, `quantity` 0 or missing, `price` null | ✅ done |

**How C1 checks**: run `computeScore` on `mockReceipt.js` and compare with a calculation done by hand (7 items, 3 without `off`).

---

## 👤 Person C2 — score screen (`src/views/Score.vue`, `src/components/`)

| # | Task | Status |
|---|---|---|
| C2.1 | Read the session in `computed` (`getReceipt`, `getItems`), keep the existing `ensureReceipt()` mock loading | ✅ done |
| C2.2 | `ScoreBadge.vue`: A–E, 1–4, A+–F badge with the official colors | ✅ done |
| C2.3 | `CategoryChart.vue`: draws one category from its `segments` (donut or stacked bar + legend), toggle units / €, grey 'unknown' segment, coverage under the chart | ✅ done |
| C2.4 | Stat cards (total spent, ultra-processed share): done inline in `Score.vue`, no separate `StatCard.vue` | ✅ done |
| C2.5 | Page layout: one chart per category — Nutrition (Nutri-Score, NOVA), Environment (Green-Score) — then Spending (total, ultra-processed share), then the item list with badges | ✅ done |
| C2.6 | States: `status` `uploading` / `extracting` (loading), `error` (`errorMessage`), no items, items without score ("not enough data"), mock banner when `?mock=1` | ✅ done |
| C2.7 | Responsive: mobile first, 2 cards per row on phones, list of cards instead of a table, test with F12 → Ctrl+Shift+M | ✅ done |
| C2.8 | All texts in `en.json` under `score.*` only (high-conflict file: pull before editing) | ✅ done |
| C2.9 | Navigation: "Back" to `/review`, "Scan another receipt" goes to `/upload` (does **not** call `resetReceipt`: Pair C only reads the session) | ✅ done |

**How C2 checks**: `yarn dev`, open `/score?mock=1` on desktop and in phone mode.

---

## 🤝 Together

| # | Task | Status |
|---|---|---|
| T1 | Plug `computeScore(getItems)` into `Score.vue` computed properties | to do |
| T2 | Test with a real receipt once Pair A writes items via `setReceiptFromCapture` | to do |
| T3 | `yarn lint` (0 warnings) + `yarn build`, open the PR from `feat/score` to `main` | to do |

## Week schedule

| Day | Person C1 (logic) | Person C2 (screen) |
|---|---|---|
| 1 | agree on the `computeScore` shape, C1.1 → C1.3 | agree on the shape, C2.1 → C2.4 |
| 2 | C1.4 → C1.6 | C2.5, C2.6 (on `mockReceipt.js`) |
| 3 | C1.7, C1.8 | C2.7, C2.8, C2.9 |
| 4 | T1, T2 together | T1, T2 together |
| 5 | fixes, T3 | fixes, demo |

---

## Questions for the other pairs

**Pair A (owns the item shape and `mockReceipt.js`)**

1. Is `item.price` the **unit price** or the **line total**? (`price: 1.29, quantity: 2` → 2.58 € or 1.29 €?)
2. Can `off` also include `product_quantity` + `product_quantity_unit`? Without weight we cannot weight scores by grams.
3. `mockReceipt.js`: `mock-4` "Yogurt plain" uses barcode `3017620422003`, which is Nutella on Open Food Facts (Nutri-Score E, NOVA 4, not C / 3).
4. `ecoscore_grade` is the old name; Open Food Facts now also sends `environmental_score_grade`. Which one fills `off`?

**Pair B**

5. Who fills `item.off` when an item is corrected (new barcode)? `AGENTS.md` says B or A.

---

## Stretch goals (only if the team agrees to extend Pair C)

These go beyond "read `getItems` only", so discuss them with the team and update `AGENTS.md` first.

| # | Idea | Needs |
|---|---|---|
| S1 | **History**: scores of all past receipts of the user, evolution over time | read functions `getPrices`, `getProofs`, `getProofById` — already written and tested on branch `feat/score-read-api` |
| S2 | **Nutrition details**: salt, sugars, fat (FSA levels), additives (EFSA risk), allergens | more fields in `off` (`nutriments`, `additives_tags`, `allergens_tags`) and product weight |
| S3 | **Environment details**: CO₂, palm oil, organic, fair trade | `ecoscore_data`, `labels_tags` |
| S4 | **"Did I pay a good price?"**: compare each price with other prices on Open Prices (median, quartiles, at least 5 prices) | `getPrices({ product_code })` |

## Things we found out about the APIs (useful for the stretch goals)

- Max **100 rows per page**; asking for a page past the last one returns an error (`Invalid page.`).
- Some filters are **silently ignored**: `proof__owner_consumption`, `location__osm_address_country_code`, `updated__gte`.
- On `/proofs` the receipt filter is `type=RECEIPT`; on `/prices` it is `proof__type=RECEIPT`.
- `receipt_price_total` is often empty on receipts.
- Open Food Facts search is rate limited (~10 requests/min): batch, retry on 429 / 5xx.
- `/prices/stats` only gives min / max / average, and one typo breaks the average: compute the median ourselves.


