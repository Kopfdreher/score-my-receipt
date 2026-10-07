<template>
  <main class="score">
    <header class="score__header">
      <p class="score__brand">
        {{ $t('app.name') }}
      </p>
    </header>
    <div class="score__content">
      <div class="score__heading">
        <div>
          <p class="score__eyebrow">
            {{ $t('score.ui.eyebrow') }}
          </p>
          <h1>{{ $t('score.ui.title') }}</h1>
        </div>
        <div class="score__heading-tools">
          <v-btn variant="outlined" :to="{ name: 'history' }">
            {{ $t('score.ui.history.title') }}
          </v-btn>
          <InfoTip :title="$t('score.ui.title')" :text="$t('score.ui.basketInfo')" :sources="referenceSources" />
        </div>
      </div>
      <v-alert v-if="storageError" type="warning" variant="tonal">
        {{ $t('score.ui.history.error') }}
      </v-alert>
      <v-alert v-if="isMock" class="score__alert" type="info" variant="tonal" density="compact">
        {{ $t('score.mockBanner') }}
      </v-alert>
      <div v-if="isLoading" class="score__state">
        <v-progress-circular indeterminate /><p>{{ $t('score.loading') }}</p>
      </div>
      <v-alert v-else-if="receipt.status === 'error'" type="error" :title="$t('score.errorTitle')" :text="receipt.errorMessage || ''" />
      <template v-else-if="items.length">
        <div class="score__basket-meta">
          <span>{{ $t('score.ui.productsCount', products.length) }}</span>
          <details class="score__weight-detail">
            <summary>{{ $t('score.ui.weight', { weight: formatGrams(weight.grams) }) }} · {{ coverage(weight.known) }}</summary>
            <AnalysisProductList :products="weight.items">
              <template #default="{ product }">
                <span class="score__coverage">{{ product.grams !== null ? formatGrams(product.grams) : $t('score.ui.liquidWeight', { volume: formatMl(product.ml) }) }}</span>
              </template>
            </AnalysisProductList>
          </details>
          <InfoTip :title="$t('score.ui.shoppingWeight')" :text="$t('score.ui.weightInfo', { known: weight.known, total: products.length })" />
        </div>
        <p v-if="detailsStatus === 'loading'" class="score__status">
          <v-progress-circular indeterminate size="14" width="2" />{{ $t('score.detailsLoading') }}
        </p>
        <p v-else-if="detailsStatus === 'partial'" class="score__status">
          {{ $t('score.detailsPartial') }} <button type="button" @click="retryDetails">
            {{ $t('score.retry') }}
          </button>
        </p>

        <div class="score__pillars">
          <section class="score__pillar">
            <h2><v-icon icon="mdi-heart-outline" size="22" />{{ $t('score.ui.health') }}</h2>
            <CategoryChart kind="nutriscore" :title="$t('score.nutriscore')" :info="$t('score.ui.info.nutriscore')" :chart="charts.nutriscore" :sources="offSources" />
            <CategoryChart kind="nova" :title="$t('score.ui.processing')" :info="$t('score.ui.info.nova')" :chart="charts.nova" :sources="novaSources" />
            <section class="score__card">
              <div class="score__card-heading">
                <h3>{{ $t('score.additivesTitle') }}</h3><InfoTip :title="$t('score.additivesTitle')" :text="$t('score.ui.info.additives')" :sources="offSources" />
              </div>
              <p class="score__stat">
                {{ additives.known ? $t('score.ui.additives', { additives: $t('score.ui.additivesCount', additives.list.length), products: $t('score.ui.productsCount', additives.products) }) : $t('score.noData') }}
              </p>
              <p class="score__coverage">
                {{ coverage(additives.known) }}
              </p>
              <p class="score__coverage">
                {{ $t('score.ui.withoutAdditives', { count: additives.without }) }}
              </p>
              <details v-if="additives.unknown" class="score__nested">
                <summary>{{ $t('score.ui.unknownAdditives', { count: additives.unknown }) }}</summary>
                <AnalysisProductList :products="products.filter(product => product.additives === null)" />
              </details>
              <details v-if="additives.list.length">
                <summary>{{ $t('score.ui.viewAdditives') }}</summary>
                <details v-for="additive in additives.list" :key="additive.tag" class="score__nested">
                  <summary>{{ additiveName(additive.tag) }} <span class="score__muted">· {{ $t('score.ui.productsCount', additive.items.length) }}</span></summary>
                  <AnalysisProductList :products="additive.items" />
                </details>
              </details>
            </section>
            <details class="score__card">
              <summary>{{ $t('score.ui.nutritionDetails') }}</summary>
              <div class="score__card-heading score__spaced">
                <span class="score__muted">{{ $t('score.ui.wholeBasket') }}</span><InfoTip :title="$t('score.ui.nutritionDetails')" :text="$t('score.ui.info.nutrients')" :sources="referenceSources" />
              </div>
              <details v-for="(nutrient, key) in nutrients" :key="key" class="score__nested">
                <summary class="score__metric-summary">
                  <span>{{ $t(`score.nutrients.${key}`) }}</span><strong>{{ formatGrams(nutrient.grams) }}</strong>
                </summary>
                <p class="score__coverage">
                  {{ coverage(nutrient.known) }}
                </p>
                <AnalysisProductList :products="nutrient.items">
                  <template #default="{ product }">
                    <div class="score__contribution">
                      <span class="score__contribution-bar"><span :style="{ width: `${product.share * 100}%` }" /></span>
                      <span class="score__coverage">{{ $t('score.ui.contribution', { grams: formatGrams(product.contribution), percent: formatPercent(product.share) }) }}</span>
                    </div>
                  </template>
                </AnalysisProductList>
              </details>
            </details>
          </section>
          <section class="score__pillar">
            <h2><v-icon icon="mdi-leaf" size="22" />{{ $t('score.ui.environment') }}</h2>
            <CategoryChart kind="greenScore" :title="$t('score.greenScore')" :info="$t('score.ui.info.greenScore')" :chart="charts.greenScore" :sources="greenSources" />
            <section class="score__card">
              <div class="score__card-heading">
                <h3>{{ $t('score.co2Title') }}</h3><InfoTip :title="$t('score.co2Title')" :text="$t('score.ui.info.carbon')" :sources="referenceSources" />
              </div>
              <p class="score__stat">
                {{ carbon.kg === null ? $t('score.noData') : $t('score.co2Value', { kg: formatNumber(carbon.kg, 2) }) }}
              </p>
              <span class="score__estimate">{{ $t('score.ui.estimated') }}</span>
              <p class="score__coverage">
                {{ coverage(carbon.known) }}
              </p>
              <details v-if="carbon.items.length">
                <summary>{{ $t('score.ui.contributingProducts') }}</summary>
                <AnalysisProductList :products="carbon.items">
                  <template #default="{ product }">
                    <span class="score__coverage">{{ $t('score.co2Value', { kg: formatNumber(product.co2Kg, 2) }) }}</span>
                  </template>
                </AnalysisProductList>
              </details>
            </section>
            <CategoryChart kind="forest" :title="$t('score.ui.forest')" :info="$t('score.ui.info.forest')" :chart="charts.forest" :sources="forestSources" />
          </section>
        </div>

        <details class="score__card score__section">
          <summary>{{ $t('score.ui.labels') }}</summary>
          <div class="score__card-heading score__spaced">
            <span class="score__muted">{{ coverage(labelsKnown) }}</span><InfoTip :title="$t('score.ui.labels')" :text="$t('score.ui.info.labels')" :sources="offSources" />
          </div>
          <details v-for="label in labelGroups" :key="label.key" class="score__nested">
            <summary>{{ $t(`score.${label.key}`) }} · {{ $t('score.ui.productsCount', label.items.length) }}</summary>
            <AnalysisProductList :products="label.items" />
          </details>
        </details>

        <section class="score__section">
          <h2>{{ $t('score.ui.closerLook') }}</h2>
          <details class="score__card score__filters">
            <summary>{{ $t('score.ui.personalise') }}</summary>
            <p class="score__coverage">
              {{ $t('score.ui.remembered') }}
            </p>
            <h3 class="score__spaced">
              {{ $t('score.ui.allergenCheck') }}
            </h3>
            <div class="score__choices">
              <label v-for="allergen in allergenKeys" :key="allergen"><input v-model="selectedAllergens" type="checkbox" :value="allergen">{{ $t(`score.ui.allergens.${allergen}`) }}</label>
            </div>
            <div class="score__card-heading score__spaced">
              <h3>{{ $t('score.ui.nutrientFilters') }}</h3><InfoTip :title="$t('score.ui.nutrientFilters')" :text="$t('score.ui.info.highNutrients')" :sources="nutrientSources" />
            </div>
            <div class="score__choices">
              <label v-for="key in ['sugars', 'salt', 'fat']" :key="key"><input v-model="selectedNutrients" type="checkbox" :value="key">{{ $t(`score.ui.high.${key}`) }}</label>
            </div>
            <p v-for="key in selectedNutrients" :key="key" class="score__coverage">
              {{ $t(`score.ui.high.${key}`) }} · {{ coverage(products.filter(p => ['low', 'moderate', 'high'].includes(p.nutrientLevels[key])).length) }}
            </p>
          </details>

          <!-- Allergen results come first in the product results list. -->
          <section v-if="selectedAllergens.length" class="score__card score__section">
            <div class="score__card-heading">
              <h3>{{ $t('score.ui.allergenResults') }}</h3><InfoTip :title="$t('score.ui.allergenResults')" :text="$t('score.ui.info.allergens')" :sources="offSources" />
            </div>
            <details v-for="allergen in selectedAllergens" :key="allergen" class="score__nested" open>
              <summary>{{ $t(`score.ui.allergens.${allergen}`) }}</summary>
              <details v-for="(group, key) in allergenResults[allergen]" :key="key" class="score__nested">
                <summary>{{ $t(`score.ui.allergenStatus.${key}`) }} · {{ $t('score.ui.productsCount', group.length) }}</summary>
                <AnalysisProductList :products="group">
                  <template #default="{ product }">
                    <span v-if="allergen === 'gluten' && product.labels?.includes('en:gluten-free')" class="score__estimate">{{ $t('score.ui.glutenFreeLabel') }}</span>
                  </template>
                </AnalysisProductList>
              </details>
              <p v-if="allergen === 'gluten'" class="score__coverage">
                {{ $t('score.ui.glutenFreeLabels', { count: glutenFreeNotListed }) }}
              </p>
            </details>
          </section>

          <section class="score__card score__section">
            <div class="score__card-heading">
              <h3>{{ $t('score.ui.highlights') }}</h3><InfoTip :title="$t('score.ui.highlights')" :text="highlightInfo" :sources="offSources" />
            </div>
            <p class="score__coverage">
              {{ $t('score.ui.highlightCount', { count: improvements.length, total: products.length }) }} · {{ coverage(highlightKnown) }}
            </p>
            <p v-if="!improvements.length" class="score__muted">
              {{ $t('score.ui.noHighlights') }}
            </p>
            <AnalysisProductList :products="improvements">
              <template #default="{ product }">
                <div class="score__reasons">
                  <span v-for="reason in product.reasons" :key="reason" class="score__reason">{{ reasonLabel(reason) }}</span>
                </div>
              </template>
            </AnalysisProductList>
          </section>
        </section>

        <details class="score__card score__section score__shopping">
          <summary class="score__shopping-summary">
            <span class="score__shopping-title">{{ $t('score.ui.shoppingSummary') }}</span>
            <span class="score__muted">{{ $t('score.ui.productsCount', products.length) }}</span>
            <span class="score__shopping-total">
              <span class="score__muted">{{ $t(pricedProducts.length === products.length ? 'score.ui.totalSpent' : 'score.ui.knownSpending') }}</span>
              <strong>{{ pricedProducts.length ? formatMoney(totalSpent) : $t('score.noData') }}</strong>
            </span>
            <span class="score__shopping-toggle">
              <span class="score__show-products">{{ $t('score.ui.viewProducts') }}</span>
              <span class="score__hide-products">{{ $t('score.ui.hideProducts') }}</span>
              <v-icon icon="mdi-chevron-down" size="18" />
            </span>
          </summary>
          <div class="score__list-toolbar">
            <div class="score__spending-coverage">
              <span class="score__coverage">{{ $t('score.ui.priceCoverage', { known: pricedProducts.length, total: products.length }) }}</span>
              <InfoTip :title="$t('score.ui.totalSpent')" :text="$t('score.ui.info.spending')" />
            </div>
            <div class="score__sort">
              <v-select v-model="productSort" :label="$t('score.ui.sortBy')" :items="sortOptions.map(option => ({ value: option.key, title: $t(`score.ui.sorts.${option.key}`) }))" variant="outlined" density="compact" hide-details />
              <button v-if="productSort !== 'receipt'" type="button" class="score__sort-order" :aria-label="$t('score.ui.reverseOrder')" @click="sortReverse = !sortReverse">
                <v-icon icon="mdi-swap-vertical" size="16" />{{ $t(`score.ui.sortOrder.${productSort}.${sortReverse ? 'reversed' : 'normal'}`) }}
              </button>
            </div>
          </div>
          <AnalysisProductList :products="sortedProducts" show-receipt-names horizontal>
            <template #default="{ product }">
              <div class="score__product-grades">
                <span v-for="kind in ['nutriscore', 'nova', 'greenScore', 'forest']" :key="kind" class="score__product-grade">
                  {{ $t(kind === 'forest' ? 'score.ui.forest' : `score.${kind}`) }}
                  <strong>{{ product[kind] === null ? '?' : product[kind] === 'a-plus' ? 'A+' : product[kind].toUpperCase() }}</strong>
                </span>
              </div>
              <div class="score__product-meta">
                <span>{{ $t('score.ui.purchased', { quantity: product.quantity }) }}</span>
                <span v-if="product.grams !== null">{{ formatGrams(product.grams) }}</span>
                <span v-else-if="product.ml !== null">{{ formatMl(product.ml) }}</span>
                <strong>{{ product.lineTotal !== null ? formatMoney(product.lineTotal) : $t('score.noData') }}</strong>
              </div>
              <v-btn size="small" variant="text" @click="editProduct(product)">
                {{ $t('score.ui.edit') }}
              </v-btn>
            </template>
          </AnalysisProductList>
        </details>
      </template>
      <p v-else>
        {{ $t('score.empty') }}
      </p>
      <div class="score__actions">
        <v-btn variant="outlined" prepend-icon="mdi-arrow-left" @click="$router.push({ name: 'review' })">
          {{ $t('score.back') }}
        </v-btn><v-btn color="primary" prepend-icon="mdi-line-scan" @click="$router.push({ name: 'upload' })">
          {{ $t('score.scanAnother') }}
        </v-btn>
      </div>
    </div>
  </main>
</template>

<script>
import { mapStores } from 'pinia'
import { useAppStore } from '@/store'
import openFoodFactsApi from '@/services/openFoodFactsApi'
import { ALLERGENS, NUTRIENTS, REFERENCE_SOURCES, analyseProducts, distribution, nutrientTotal, carbonTotal, additiveSummary, allergenGroups, improvementReasons, sortProducts, SORTS } from '@/utils/basketAnalysis'
import { receiptSignature } from '@/services/receiptHistory'
import ADDITIVES from '@/utils/additives.json'
import CategoryChart from '@/components/CategoryChart.vue'
import InfoTip from '@/components/InfoTip.vue'
import AnalysisProductList from '@/components/AnalysisProductList.vue'

const SORT_OPTIONS = [
  { key: 'receipt', icon: 'mdi-receipt-text-outline' },
  { key: 'review', icon: 'mdi-alert-circle-outline' },
  { key: 'nutriscore', icon: 'mdi-heart-outline' },
  { key: 'nova', icon: 'mdi-factory' },
  { key: 'greenScore', icon: 'mdi-leaf' },
  { key: 'forest', icon: 'mdi-pine-tree' },
  { key: 'co2', icon: 'mdi-molecule-co2' },
  { key: 'price', icon: 'mdi-currency-eur' },
  { key: 'weight', icon: 'mdi-weight' },
  { key: 'name', icon: 'mdi-sort-alphabetical-ascending' },
  { key: 'salt', icon: 'mdi-shaker-outline' },
  { key: 'sugars', icon: 'mdi-cube-outline' },
  { key: 'fat', icon: 'mdi-water-outline' }
]
const PREFS_KEY = 'score-my-receipt:analysis-preferences:v1'
function preferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    return {
      allergens: Array.isArray(saved.allergens) ? saved.allergens.filter(a => ALLERGENS.includes(a)) : [],
      nutrients: Array.isArray(saved.nutrients) ? saved.nutrients.filter(n => ['sugars', 'salt', 'fat'].includes(n)) : [],
      sort: saved.sort in SORTS ? saved.sort : 'receipt',
      reverse: saved.reverse === true
    }
  } catch { return { allergens: [], nutrients: [], sort: 'receipt', reverse: false } }
}
export default {
  name: 'Score',
  components: { CategoryChart, InfoTip, AnalysisProductList },
  data() {
    const prefs = preferences()
    return {
      fetched: {}, detailsStatus: 'idle', requestId: 0,
      storageError: false, initializing: true,
      selectedAllergens: prefs.allergens, selectedNutrients: prefs.nutrients,
      productSort: prefs.sort, sortReverse: prefs.reverse, sortOptions: SORT_OPTIONS,
      allergenKeys: ALLERGENS, referenceSources: REFERENCE_SOURCES,
      offSources: [{ label: 'Open Food Facts', url: 'https://world.openfoodfacts.org/data' }],
      novaSources: [{ label: 'Open Food Facts · NOVA', url: 'https://world.openfoodfacts.org/nova' }],
      greenSources: [{ label: 'Open Food Facts · Green-Score', url: 'https://world.openfoodfacts.org/green-score' }],
      forestSources: [{ label: 'Open Food Facts · Forest footprint', url: 'https://openfoodfacts.github.io/openfoodfacts-server/dev/ref-perl-pod/ProductOpener/ForestFootprint2026.html' }],
      nutrientSources: [{ label: 'Open Food Facts · Nutrient levels', url: 'https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/explain-product-attributes/' }]
    }
  },
  computed: {
    ...mapStores(useAppStore),
    receipt() { return this.appStore.getReceipt },
    items() { return this.appStore.getItems },
    isMock() { return this.$route.query.mock === '1' || String(this.receipt.proofId || '').startsWith('mock') },
    isLoading() { return ['uploading', 'extracting'].includes(this.receipt.status) },
    barcodes() { return [...new Set(this.items.map(i => String(i.barcode || '')).filter(code => /^\d{8,14}$/.test(code)))] },
    snapshotMatches() { return this.receipt.analysisSnapshot?.signature === receiptSignature(this.receipt) },
    products() { return this.snapshotMatches ? this.receipt.analysisSnapshot.products : analyseProducts(this.items, this.fetched) },
    charts() { return Object.fromEntries(['nutriscore', 'nova', 'greenScore', 'forest'].map(kind => [kind, distribution(this.products, kind)])) },
    nutrients() { return Object.fromEntries(Object.keys(NUTRIENTS).map(key => [key, nutrientTotal(this.products, key)])) },
    // Drinks sold by volume are counted as 1 ml ≈ 1 g
    weight() {
      const known = this.products.filter(p => p.grams !== null || p.ml !== null)
      return { items: known, known: known.length, grams: known.length ? known.reduce((sum, p) => sum + (p.grams ?? p.ml), 0) : null }
    },
    carbon() { return carbonTotal(this.products) },
    additives() { return additiveSummary(this.products) },
    labelsKnown() { return this.products.filter(p => p.labels !== null).length },
    labelGroups() {
      return [
        { key: 'organic', items: this.products.filter(p => p.labels?.some(l => l === 'en:organic' || l.startsWith('en:eu-organic'))) },
        { key: 'fairTrade', items: this.products.filter(p => p.labels?.some(l => l.includes('fair-trade'))) }
      ]
    },
    sortedProducts() { return sortProducts(this.products, this.productSort, this.sortReverse, this.selectedNutrients) },
    pricedProducts() { return this.products.filter(p => p.lineTotal !== null) },
    totalSpent() { return this.pricedProducts.reduce((sum, p) => sum + p.lineTotal, 0) },
    improvements() { return this.products.map(p => ({ ...p, reasons: improvementReasons(p, this.selectedNutrients) })).filter(p => p.reasons.length) },
    highlightKnown() { return this.products.filter(p => p.nutriscore !== null || p.nova !== null || p.greenScore !== null || this.selectedNutrients.some(key => ['low', 'moderate', 'high'].includes(p.nutrientLevels[key]))).length },
    highlightInfo() { return this.$t('score.ui.info.highlights') + ' ' + ['nutriscore', 'nova', 'greenScore'].map(kind => `${this.$t(`score.${kind}`)}: ${this.coverage(this.charts[kind].known)}`).join('. ') },
    allergenResults() { return Object.fromEntries(this.selectedAllergens.map(a => [a, allergenGroups(this.products, a)])) },
    glutenFreeNotListed() { return (this.allergenResults.gluten?.notListed || []).filter(p => p.labels?.includes('en:gluten-free')).length }
  },
  watch: {
    items: { handler() { if (!this.initializing) this.loadDetails() }, deep: true },
    selectedAllergens: { handler: 'savePreferences', deep: true },
    selectedNutrients: { handler: 'savePreferences', deep: true },
    productSort: 'savePreferences',
    sortReverse: 'savePreferences'
  },
  mounted() {
    if (this.$route.query.mock === '1' || !this.items.length) this.appStore.loadMockReceipt()
    this.initializing = false
    this.loadDetails()
  },
  unmounted() { this.requestId += 1 },
  methods: {
    editProduct(product) {
      this.$router.push({ name: 'review', query: { edit: product.itemId } })
    },
    saveAnalysis() {
      if (!this.items.length || this.snapshotMatches) return
      const snapshot = { signature: receiptSignature(this.receipt), products: JSON.parse(JSON.stringify(this.products)), savedAt: new Date().toISOString() }
      this.appStore.saveReceiptToHistory('scored', snapshot)
        .then(() => { this.storageError = false })
        .catch(() => { this.storageError = true })
    },
    retryDetails() {
      this.appStore.setAnalysisSnapshot(null)
      this.loadDetails()
    },
    loadDetails() {
      if (this.snapshotMatches) { this.detailsStatus = 'done'; return }
      const requestId = ++this.requestId
      const missing = this.barcodes.filter(code => !(code in this.fetched))
      if (!missing.length) { this.detailsStatus = 'done'; this.saveAnalysis(); return }
      this.detailsStatus = 'loading'
      let failed = false
      missing.reduce((chain, code) => chain.then(() => {
        if (requestId !== this.requestId) return
        return openFoodFactsApi.getProductDetails(code).then(product => {
          if (requestId === this.requestId) this.fetched = { ...this.fetched, [code]: product }
        }).catch(() => { failed = true })
      }), Promise.resolve()).then(() => {
        if (requestId === this.requestId) {
          this.detailsStatus = failed ? 'partial' : 'done'
          this.saveAnalysis()
        }
      })
    },
    savePreferences() { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ allergens: this.selectedAllergens, nutrients: this.selectedNutrients, sort: this.productSort, reverse: this.sortReverse })) } catch { /* Browsing with storage disabled still supports session filters. */ } },
    coverage(known) { return this.$t('score.ui.coverage', { known, total: this.products.length }) },
    formatNumber(value, digits = 0) { return new Intl.NumberFormat(this.$i18n.locale, { maximumFractionDigits: digits }).format(value) },
    formatMoney(value) { return new Intl.NumberFormat(this.$i18n.locale, { style: 'currency', currency: this.receipt.currency || 'EUR' }).format(value) },
    formatPercent(value) { return new Intl.NumberFormat(this.$i18n.locale, { style: 'percent', maximumFractionDigits: 0 }).format(value) },
    formatMl(value) { return value >= 1000 ? `${this.formatNumber(value / 1000, 2)} L` : `${this.formatNumber(value, 0)} ml` },
    formatGrams(value) { return value === null ? this.$t('score.noData') : value >= 1000 ? `${this.formatNumber(value / 1000, 2)} kg` : `${this.formatNumber(value, 1)} g` },
    additiveName(tag) { return ADDITIVES[tag]?.name || tag.replace(/^en:/, '').toUpperCase() },
    reasonLabel(reason) {
      const [kind, value] = reason.split(':')
      return kind === 'high' ? this.$t(`score.ui.high.${value}`) : `${this.$t(`score.${kind}`)} ${value}`
    }
  }
}
</script>

<style scoped>
.score { min-height: 100dvh; padding: 1.5rem; color: #f7fbf4; background: #16382a; }

.score__content { width: min(68rem, 100%); margin: auto; }
.score__header, .score__heading, .score__card-heading, .score__actions { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
.score__header { flex-wrap: wrap; margin-bottom: 2rem; }
.score__brand { font: 700 1.35rem var(--font-display, Georgia, serif); }
h1, h2 { font-family: var(--font-display, Georgia, serif); }
h1 { font-size: clamp(1.9rem, 5vw, 2.8rem); margin: 0.3rem 0 1rem; line-height: 1.15; }
h2 { display: flex; align-items: center; gap: 0.6rem; font-size: 1.5rem; margin: 0 0 0.5rem; }
h3 { font-size: 1rem; font-weight: 600; }
.score__eyebrow { font-size: 0.7rem; color: #bdcebe; letter-spacing: 0.12em; text-transform: uppercase; }
.score__alert { margin-bottom: 1rem; }
.score__basket-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem 1.25rem; margin: 0.5rem 0 1.5rem; color: #bdcebe; font-size: 0.85rem; }
.score__weight-detail { font-size: 0.85rem; }
.score__weight-detail[open] { flex-basis: 100%; }
.score__pillars { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; }
.score__pillar { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
.score__card { padding: 1.1rem; border: 1px solid #f7fbf41c; border-radius: 1rem; background: #0e241c60; }
.score__card-heading { margin-bottom: 0.5rem; }
.score__stat { font: 700 clamp(1.3rem, 3vw, 1.85rem) var(--font-display, Georgia, serif); margin: 0.5rem 0; }
.score__coverage, .score__muted, .score__status, .score__product-meta { font-size: 0.8rem; color: #bdcebe; }
.score__coverage { margin: 0.45rem 0; }
.score__status { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; }
.score__status button { text-decoration: underline; }
.score__estimate { font-size: 0.75rem; border: 1px solid #b9cdbd44; padding: 0.15rem 0.45rem; border-radius: 1rem; color: #bdcebe; }
.score__section { margin-top: 1.25rem; }
.score__section > h2 { margin-bottom: 0.85rem; }
summary { cursor: pointer; font-weight: 600; }
summary:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid #c9e88e; outline-offset: 3px; }
.score__card > details { margin-top: 0.85rem; font-size: 0.85rem; }
.score__nested { padding: 0.65rem 0; border-bottom: 1px solid #f7fbf414; }
.score__nested:last-child { border-bottom: 0; }
.score__metric-summary { display: flex; align-items: center; gap: 0.6rem; }
.score__metric-summary > strong { margin-left: auto; }
.score__metric-summary::before { content: '+'; color: #bdcebe; }
details[open] > .score__metric-summary::before { content: '−'; }
.score__spaced { margin-top: 1rem; }
.score__heading-tools { display: flex; align-items: center; gap: 0.75rem; margin-left: auto; flex-shrink: 0; }
.score__shopping-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem 1.5rem; list-style: none; }
.score__shopping-summary::-webkit-details-marker { display: none; }
.score__shopping-title { font-family: var(--font-display, Georgia, serif); font-size: 1.15rem; }
.score__shopping-total { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; }
.score__shopping-total strong { font-size: 1.1rem; }
.score__shopping-toggle { display: inline-flex; align-items: center; gap: 0.35rem; margin-left: auto; color: #c9e88e; font-size: 0.85rem; }
.score__hide-products { display: none; }
.score__shopping[open] .score__show-products { display: none; }
.score__shopping[open] .score__hide-products { display: inline; }
.score__shopping[open] .score__shopping-toggle .v-icon { transform: rotate(180deg); }
.score__list-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-top: 1.25rem; }
.score__spending-coverage { display: flex; align-items: center; gap: 0.5rem; }
.score__sort { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; width: min(100%, 28rem); }
.score__sort > .v-select { min-width: 13rem; flex: 1; }
.score__sort-order { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.6rem; border: 1px solid #b9cdbd44; border-radius: 0.5rem; color: #c9e88e; font-size: 0.75rem; }
.score__sort-order:hover { background: #c9e88e14; }
.score__product-grades { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.35rem 0.75rem; }
.score__product-grades .score__product-grade { display: flex; align-items: center; gap: 0.4rem; }
.score__product-grades strong { color: #f7fbf4; }
.score__shopping .score__product-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; margin: 0; }
.score__shopping .score__product-meta strong { color: #f7fbf4; font-size: 0.9rem; }
.score__contribution { display: grid; grid-template-columns: minmax(3rem, 6rem) 1fr; align-items: center; gap: 0.6rem; }
.score__contribution-bar { height: 0.4rem; border-radius: 1rem; background: #f7fbf414; overflow: hidden; }
.score__contribution-bar span { display: block; height: 100%; background: #c9e88e; }
.score__choices { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
.score__choices label { display: flex; align-items: center; gap: 0.45rem; padding: 0.4rem 0.65rem; font-size: 0.85rem; border: 1px solid #f7fbf426; border-radius: 1rem; cursor: pointer; }
.score__choices label:has(input:checked) { background: #c9e88e20; border-color: #c9e88e; }
input { accent-color: #92c76d; }
.score__reasons { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.5rem; }
.score__reason { background: #ee81002b; color: #ffe0b4; border: 1px solid #ee810052; border-radius: 1rem; font-size: 0.75rem; padding: 0.2rem 0.55rem; }
.score__product-grade { color: #bdcebe; font-size: 0.75rem; padding-right: 0.6rem; }
.score__product-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.35rem; }
.score__actions { flex-wrap: wrap; margin-top: 2rem; }
.score__state { text-align: center; padding: 3rem; }
@media (max-width: 760px) { .score__heading { flex-wrap: wrap; } .score__heading-tools { margin-bottom: 1rem; }
.score__shopping-summary { gap: 0.5rem 1rem; } .score__shopping-title { flex-basis: 100%; }
.score__list-toolbar { align-items: stretch; } .score__sort { width: 100%; }
.score__shopping .score__product-meta { flex-direction: row; justify-content: flex-start; flex-wrap: wrap; gap: 0.5rem; } .score { padding: 1rem; } .score__weight-detail { font-size: 0.85rem; }
.score__weight-detail[open] { flex-basis: 100%; }
.score__pillars { grid-template-columns: 1fr; gap: 1.5rem; } }
</style>
