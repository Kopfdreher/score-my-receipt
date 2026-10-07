<template>
  <main class="score">
    <header class="score__header">
      <p class="score__brand">
        {{ $t('app.name') }}
      </p>
      <UserSessionBar />
    </header>

    <div class="score__content">
      <h1 class="score__title">
        {{ $t('score.title') }}
      </h1>

      <v-alert
        v-if="isMock"
        class="score__alert"
        type="info"
        variant="tonal"
        density="compact"
      >
        {{ $t('score.mockBanner') }}
      </v-alert>

      <div
        v-if="isLoading"
        class="score__state"
      >
        <v-progress-circular
          indeterminate
          color="secondary"
        />
        <p>{{ $t('score.loading') }}</p>
      </div>

      <v-alert
        v-else-if="hasError"
        class="score__alert"
        type="error"
        variant="tonal"
        :title="$t('score.errorTitle')"
        :text="receipt.errorMessage || ''"
      />

      <div
        v-else-if="!items.length"
        class="score__state"
      >
        <p class="score__state-title">
          {{ $t('score.empty') }}
        </p>
        <p>{{ $t('score.emptyHint') }}</p>
        <v-btn
          color="primary"
          prepend-icon="mdi-line-scan"
          @click="scanAnother"
        >
          {{ $t('score.scanCta') }}
        </v-btn>
      </div>

      <template v-else>
        <!-- Top summary -->
        <section class="score__card score__global">
          <ScoreBadge
            kind="global"
            :value="score.global.letter"
            size="large"
          />
          <div class="score__global-text">
            <p class="score__global-label">
              {{ $t('score.globalTitle') }}
            </p>
            <p
              v-if="score.global.value !== null"
              class="score__global-value"
            >
              {{ Math.round(score.global.value) }}<span>{{ $t('score.outOf') }}</span>
            </p>
            <p
              v-else
              class="score__global-value score__global-value--empty"
            >
              {{ $t('score.notEnoughData') }}
            </p>
            <p class="score__message">
              {{ $t(`score.message.${score.global.letter || 'none'}`) }}
            </p>
            <p class="score__muted">
              {{ $t('score.coverage', { scored: score.scoredCount, total: score.itemCount }) }}
              · {{ $t('score.globalInfo') }}
            </p>
          </div>
        </section>

        <p
          v-if="detailsStatus === 'loading'"
          class="score__muted score__details-status"
        >
          <v-progress-circular
            indeterminate
            size="14"
            width="2"
          />
          {{ $t('score.detailsLoading') }}
        </p>
        <p
          v-else-if="detailsStatus === 'partial'"
          class="score__muted score__details-status"
        >
          {{ $t('score.detailsPartial') }}
          <v-btn
            size="small"
            variant="text"
            prepend-icon="mdi-refresh"
            @click="retryDetails"
          >
            {{ $t('score.retry') }}
          </v-btn>
        </p>

        <!-- Units / money toggle -->
        <div class="score__toolbar">
          <span class="score__muted">{{ $t('score.showBy') }}</span>
          <v-btn-toggle
            v-model="mode"
            mandatory
            density="compact"
            variant="outlined"
          >
            <v-btn value="units">
              {{ $t('score.byItems') }}
            </v-btn>
            <v-btn value="spend">
              {{ $t('score.bySpend') }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- Nutrition -->
        <h2 class="score__section-title">
          {{ $t('score.sections.nutrition') }}
        </h2>
        <div class="score__grid">
          <CategoryChart
            kind="nutriscore"
            :title="$t('score.nutriscore')"
            :info="$t('score.nutriscoreInfo')"
            :chart="score.categories.nutriscore"
            :mode="mode"
            :currency="score.currency"
          />
          <section class="score__card">
            <h3 class="score__card-title">
              {{ $t('score.nutrientsTitle') }}
            </h3>
            <ul class="score__rows">
              <li
                v-for="key in nutrientKeys"
                :key="key"
              >
                <span>{{ $t(`score.nutrients.${key}`) }}</span>
                <span class="score__row-value">{{ formatGrams(details.nutrients[key].grams) }}</span>
              </li>
            </ul>
            <p class="score__muted score__card-foot">
              {{ $t('score.knownOn', { known: details.nutrients.sugars.knownItems, total: details.itemCount }) }}
            </p>
          </section>
        </div>

        <!-- Processing / ingredients -->
        <h2 class="score__section-title">
          {{ $t('score.sections.processing') }}
        </h2>
        <div class="score__grid">
          <CategoryChart
            kind="nova"
            :title="$t('score.nova')"
            :info="$t('score.novaInfo')"
            :chart="score.categories.nova"
            :mode="mode"
            :currency="score.currency"
          />
          <AdditivesCard :additives="details.additives">
            <p class="score__muted score__card-foot">
              {{ $t('score.ultraProcessedLine', { share: formatPercent(score.ultraProcessedShare) }) }}
              · {{ $t('score.knownOn', { known: details.knownItems, total: details.itemCount }) }}
            </p>
          </AdditivesCard>
        </div>

        <!-- Environment -->
        <h2 class="score__section-title">
          {{ $t('score.sections.environment') }}
        </h2>
        <div class="score__grid">
          <CategoryChart
            kind="greenScore"
            :title="$t('score.greenScore')"
            :info="$t('score.greenScoreInfo')"
            :chart="score.categories.greenScore"
            :mode="mode"
            :currency="score.currency"
          />
          <section class="score__card">
            <h3 class="score__card-title">
              {{ $t('score.co2Title') }}
            </h3>
            <p class="score__stat">
              {{ details.co2.kg === null ? $t('score.noData') : $t('score.co2Value', { kg: formatNumber(details.co2.kg, 2) }) }}
            </p>
            <ul
              v-if="co2Parts.length"
              class="score__bars"
            >
              <li
                v-for="part in co2Parts"
                :key="part.key"
              >
                <span class="score__bar-label">{{ $t(`score.co2Parts.${part.key}`) }}</span>
                <span class="score__bar"><span :style="{ width: `${part.share * 100}%` }" /></span>
                <span class="score__bar-value">{{ formatNumber(part.kg, 2) }}</span>
              </li>
            </ul>
            <p class="score__muted score__card-foot">
              {{ $t('score.knownOn', { known: details.co2.knownItems, total: details.itemCount }) }}
            </p>
          </section>
          <section class="score__card">
            <h3 class="score__card-title">
              {{ $t('score.forestTitle') }}
            </h3>
            <p class="score__stat">
              {{ details.forest.squareMeters === null ? $t('score.noData') : $t('score.forestValue', { m2: formatNumber(details.forest.squareMeters, 2) }) }}
            </p>
            <p class="score__muted">
              {{ $t('score.forestRisk', details.forest.riskItems) }}
            </p>
            <p class="score__muted score__card-foot">
              {{ $t('score.forestInfo') }}
            </p>
          </section>
        </div>

        <!-- Labels / sourcing -->
        <h2 class="score__section-title">
          {{ $t('score.sections.labels') }}
        </h2>
        <div class="score__stats">
          <div class="score__card">
            <p class="score__muted">
              {{ $t('score.organic') }}
            </p>
            <p class="score__stat">
              {{ formatPercent(details.organic.share) }}
            </p>
            <p class="score__muted">
              {{ $t('score.labelCount', { count: details.organic.items, total: details.knownItems }) }}
            </p>
          </div>
          <div class="score__card">
            <p class="score__muted">
              {{ $t('score.fairTrade') }}
            </p>
            <p class="score__stat">
              {{ formatPercent(details.fairTrade.share) }}
            </p>
            <p class="score__muted">
              {{ $t('score.labelCount', { count: details.fairTrade.items, total: details.knownItems }) }}
            </p>
          </div>
        </div>

        <!-- Spending -->
        <h2 class="score__section-title">
          {{ $t('score.sections.spending') }}
        </h2>
        <div class="score__stats">
          <div class="score__card">
            <p class="score__muted">
              {{ $t('score.totalSpent') }}
            </p>
            <p class="score__stat">
              {{ formatMoney(score.totalSpend) }}
            </p>
            <p
              v-if="score.unpricedCount"
              class="score__muted"
            >
              {{ $t('score.unpriced', score.unpricedCount) }}
            </p>
          </div>
          <div class="score__card">
            <p class="score__muted">
              {{ $t('score.ultraProcessed') }}
            </p>
            <p class="score__stat">
              {{ formatPercent(score.ultraProcessedShare) }}
            </p>
            <p class="score__muted">
              {{ $t('score.ultraProcessedHint') }}
            </p>
          </div>
        </div>

        <!-- Best / worst -->
        <div
          v-if="score.best.length"
          class="score__grid"
        >
          <section class="score__card">
            <h2 class="score__list-title">
              {{ $t('score.best') }}
            </h2>
            <ul class="score__list">
              <li
                v-for="item in score.best"
                :key="item.id"
              >
                <span>{{ item.name }}</span>
                <ScoreBadge
                  kind="global"
                  :value="letterOf(item.score)"
                />
              </li>
            </ul>
          </section>
          <section
            v-if="score.worst.length"
            class="score__card"
          >
            <h2 class="score__list-title">
              {{ $t('score.worst') }}
            </h2>
            <ul class="score__list">
              <li
                v-for="item in score.worst"
                :key="item.id"
              >
                <span>{{ item.name }}</span>
                <ScoreBadge
                  kind="global"
                  :value="letterOf(item.score)"
                />
              </li>
            </ul>
          </section>
        </div>

        <!-- Items -->
        <h2 class="score__section-title">
          {{ $t('score.sections.items') }}
        </h2>
        <p class="score__muted score__items-legend">
          {{ $t('score.itemsLegend') }}
        </p>
        <ul class="score__items">
          <li
            v-for="item in cleanedItems"
            :key="item.id"
            class="score__item"
          >
            <div class="score__item-main">
              <span class="score__item-name">{{ item.name }}</span>
              <span class="score__item-price">
                {{ item.lineTotal === null ? $t('score.noPrice') : formatMoney(item.lineTotal) }}
              </span>
            </div>
            <div class="score__item-meta">
              <span
                v-if="item.quantity > 1 && item.unitPrice !== null"
                class="score__muted"
              >
                {{ $t('score.itemQuantity', { quantity: item.quantity, price: formatMoney(item.unitPrice) }) }}
              </span>
              <span class="score__item-badges">
                <ScoreBadge
                  kind="nutriscore"
                  :value="item.nutriscore"
                />
                <ScoreBadge
                  kind="nova"
                  :value="item.nova"
                />
                <ScoreBadge
                  kind="greenScore"
                  :value="item.greenScore"
                />
              </span>
            </div>
          </li>
        </ul>
      </template>

      <div class="score__actions">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-arrow-left"
          @click="goBack"
        >
          {{ $t('score.back') }}
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-line-scan"
          @click="scanAnother"
        >
          {{ $t('score.scanAnother') }}
        </v-btn>
      </div>
    </div>
  </main>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { mapStores } from 'pinia'
import { useAppStore } from '@/store'
import { cleanItems, computeBasketDetails, computeScore } from '@/utils/score'
import openFoodFactsApi from '@/services/openFoodFactsApi'
import ScoreBadge from '@/components/ScoreBadge.vue'
import CategoryChart from '@/components/CategoryChart.vue'
import AdditivesCard from '@/components/AdditivesCard.vue'

// Same thresholds as the global mark in utils/score.js
const LETTER_THRESHOLDS = [[80, 'a'], [60, 'b'], [40, 'c'], [20, 'd'], [0, 'e']]

export default {
  name: 'Score',
  components: {
    UserSessionBar: defineAsyncComponent(() => import('@/components/UserSessionBar.vue')),
    ScoreBadge,
    CategoryChart,
    AdditivesCard
  },
  data() {
    return {
      mode: 'units',
      nutrientKeys: ['sugars', 'salt', 'fat', 'saturatedFat'],
      // Open Food Facts details, kept in this page only: { [barcode]: product | null }
      products: {},
      detailsStatus: 'idle'
    }
  },
  computed: {
    ...mapStores(useAppStore),
    receipt() {
      return this.appStore.getReceipt
    },
    items() {
      return this.appStore.getItems
    },
    score() {
      return computeScore(this.items, this.receipt.currency || 'EUR')
    },
    cleanedItems() {
      return cleanItems(this.items)
    },
    isMock() {
      return this.$route.query.mock === '1' || String(this.receipt.proofId || '').startsWith('mock')
    },
    isLoading() {
      return ['uploading', 'extracting'].includes(this.receipt.status)
    },
    hasError() {
      return this.receipt.status === 'error'
    },
    barcodes() {
      return [...new Set(this.items.map((item) => item.barcode).filter(Boolean))]
    },
    details() {
      return computeBasketDetails(this.items, this.products)
    },
    co2Parts() {
      const total = this.details.co2.kg
      if (!total) return []
      return Object.entries(this.details.co2.breakdown)
        .filter(([, kg]) => kg > 0)
        .map(([key, kg]) => ({ key, kg, share: kg / total }))
        .sort((a, b) => b.kg - a.kg)
    }
  },
  watch: {
    barcodes: {
      handler: 'loadProductDetails',
      immediate: true
    }
  },
  mounted() {
    this.ensureReceipt()
  },
  methods: {
    ensureReceipt() {
      const store = useAppStore()
      if (this.$route.query.mock === '1' || store.getItems.length === 0) {
        store.loadMockReceipt()
      }
    },
    formatMoney(value) {
      return new Intl.NumberFormat(this.$i18n.locale, {
        style: 'currency',
        currency: this.receipt.currency || 'EUR'
      }).format(value)
    },
    // Fetch Open Food Facts details for barcodes we have not fetched yet
    loadProductDetails(barcodes) {
      const missing = barcodes.filter((code) => !(code in this.products))
      if (!missing.length) return
      this.detailsStatus = 'loading'
      let failed = 0
      // One request after the other, to stay under the Open Food Facts rate limit
      missing.reduce((chain, code) => chain
        .then(() => openFoodFactsApi.getProductDetails(code))
        .then((product) => { this.products = { ...this.products, [code]: product } })
        .catch(() => { failed += 1 }),
      Promise.resolve())
        .then(() => { this.detailsStatus = failed ? 'partial' : 'done' })
    },
    retryDetails() {
      this.loadProductDetails(this.barcodes)
    },
    formatNumber(value, digits = 0) {
      return new Intl.NumberFormat(this.$i18n.locale, { maximumFractionDigits: digits }).format(value)
    },
    formatGrams(grams) {
      if (grams === null) return this.$t('score.noData')
      return grams >= 1000
        ? `${this.formatNumber(grams / 1000, 2)} kg`
        : `${this.formatNumber(grams, 1)} g`
    },
    formatPercent(value) {
      return new Intl.NumberFormat(this.$i18n.locale, { style: 'percent', maximumFractionDigits: 0 }).format(value)
    },
    letterOf(value) {
      if (value === null || value === undefined) return null
      return LETTER_THRESHOLDS.find(([min]) => value >= min)[1]
    },
    goBack() {
      this.$router.push({ name: 'review' })
    },
    scanAnother() {
      this.$router.push({ name: 'upload' })
    }
  }
}
</script>

<style scoped>
.score {
  min-height: 100dvh;
  padding: 1.5rem;
  color: var(--smr-cream, #F7FBF4);
  background:
    radial-gradient(90% 70% at 80% 0%, rgba(31, 107, 74, 0.35), transparent 55%),
    linear-gradient(160deg, #16382A 0%, #0E241C 100%);
}

.score__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.score__brand {
  margin: 0;
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.35rem;
  font-weight: 700;
}

.score__content {
  width: min(64rem, 100%);
  margin: 0 auto;
}

.score__title {
  margin: 0 0 1.25rem;
  font-family: var(--font-display, Georgia, serif);
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 700;
  line-height: 1.1;
}

.score__alert {
  margin-bottom: 1.25rem;
}

.score__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
  text-align: center;
}

.score__state p {
  margin: 0;
}

.score__state-title {
  font-size: 1.2rem;
  font-weight: 600;
}

.score__card {
  padding: 1.25rem;
  border: 1px solid rgba(247, 251, 244, 0.12);
  border-radius: 1rem;
  background: rgba(14, 36, 28, 0.55);
}

.score__card p {
  margin: 0;
}

.score__global {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.score__global-label {
  font-weight: 600;
}

.score__global-value {
  font-family: var(--font-display, Georgia, serif);
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.1;
}

.score__global-value span {
  margin-left: 0.25rem;
  font-size: 1rem;
  color: rgba(247, 251, 244, 0.6);
}

.score__global-value--empty {
  font-size: 1.1rem;
}

.score__muted {
  color: rgba(247, 251, 244, 0.65);
  font-size: 0.85rem;
}

.score__message {
  margin-top: 0.25rem !important;
  font-weight: 500;
}

.score__details-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
}

.score__card-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
}

.score__card-foot {
  margin-top: 0.75rem !important;
}

.score__rows,
.score__bars {
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
}

.score__rows li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid rgba(247, 251, 244, 0.08);
}

.score__row-value {
  font-weight: 600;
  white-space: nowrap;
}





.score__bars li {
  display: grid;
  grid-template-columns: 6.5rem 1fr 2.75rem;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0;
  font-size: 0.85rem;
}

.score__bar {
  height: 0.5rem;
  border-radius: 0.25rem;
  background: rgba(247, 251, 244, 0.1);
  overflow: hidden;
}

.score__bar span {
  display: block;
  height: 100%;
  background: #85bb2f;
}

.score__bar-value {
  text-align: right;
  color: rgba(247, 251, 244, 0.75);
}

.score__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin: 1.25rem 0 0;
}

.score__toolbar :deep(.v-btn) {
  color: var(--smr-cream, #F7FBF4);
}

.score__toolbar :deep(.v-btn--active) {
  color: var(--smr-ink, #0E241C);
  background: var(--smr-mist, #E8F2E6);
}

.score__section-title {
  margin: 1.75rem 0 0.75rem;
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.35rem;
  font-weight: 700;
}

.score__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: 1rem;
}

.score__grid + .score__grid {
  margin-top: 1rem;
}

.score__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.score__stat {
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.75rem;
  font-weight: 700;
}

.score__list-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
}

.score__list,
.score__items {
  margin: 0;
  padding: 0;
  list-style: none;
}

.score__list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.35rem 0;
}

.score__items-legend {
  margin: 0 0 0.5rem;
}

.score__item {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(247, 251, 244, 0.1);
}

.score__item-main,
.score__item-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.score__item-name {
  font-weight: 600;
}

.score__item-price {
  font-weight: 600;
  white-space: nowrap;
}

.score__item-meta {
  margin-top: 0.35rem;
}

.score__item-badges {
  display: inline-flex;
  gap: 0.35rem;
  margin-left: auto;
}

.score__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 2rem;
}

@media (max-width: 600px) {
  .score {
    padding: 1rem;
  }

  .score__global-value {
    font-size: 2rem;
  }

  .score__stat {
    font-size: 1.35rem;
  }

  .score__toolbar {
    justify-content: flex-start;
  }
}
</style>
