<template>
  <main class="score">
    <div class="score__content">
      <div class="score__heading">
        <div>
          <p class="score__eyebrow">
            <time v-if="receipt.date" :datetime="receipt.date">{{ receiptFullDate }}</time>
            <span v-else>{{ $t('score.ui.unknownReceiptDate') }}</span>
          </p>
          <h1>{{ receiptTitle }}</h1>
        </div>
        <div class="score__heading-tools">
          <InfoTip :title="receiptTitle" :text="$t('score.ui.basketInfo')" :sources="referenceSources" />
        </div>
      </div>
      <v-alert v-if="storageError" type="warning" color="#703b12" variant="tonal">
        {{ $t('score.ui.history.error') }}
      </v-alert>
      <v-alert v-if="isMock" class="score__alert" type="info" color="#174f78" variant="tonal" density="compact">
        {{ $t('score.mockBanner') }}
      </v-alert>
      <div v-if="isLoading" class="score__state">
        <v-progress-circular indeterminate /><p>{{ $t('score.loading') }}</p>
      </div>
      <v-alert v-else-if="receipt.status === 'error'" type="error" color="#962e25" :title="$t('score.errorTitle')" :text="receipt.errorMessage || ''" />
      <template v-else-if="items.length">
        <p v-if="detailsStatus === 'loading'" class="score__status">
          <v-progress-circular indeterminate size="14" width="2" />{{ $t('score.detailsLoading') }}
        </p>
        <p v-else-if="detailsStatus === 'partial'" class="score__status">
          {{ $t('score.detailsPartial') }} <button type="button" @click="retryDetails">
            {{ $t('score.retry') }}
          </button>
        </p>

        <ScoreRings :charts="charts" :titles="ringTitles" :open-kind="ringDetail" @details="kind => ringDetail = ringDetail === kind ? null : kind" />
        <v-expand-transition>
          <div v-if="ringDetail" class="score__ring-detail">
            <CategoryChart :key="ringDetail" :kind="ringDetail" :title="ringTitles[ringDetail]" :info="$t(`score.ui.info.${ringDetail}`)" :chart="charts[ringDetail]" :sources="ringDetail === 'nova' ? novaSources : ringDetail === 'greenScore' ? greenSources : ringDetail === 'forest' ? forestSources : offSources" open-details />
          </div>
        </v-expand-transition>

        <!-- Rows of key figures, like the Summary list of Apple Health; a tap unfolds the details in place -->
        <section class="score__glance" :aria-label="$t('score.ui.glance.title')">
          <div class="score__glance-heading">
            <v-menu :close-on-content-click="false" location="bottom end">
              <template #activator="{ props }">
                <v-btn v-bind="props" icon="mdi-cog-outline" size="small" variant="text" :aria-label="$t('score.ui.glance.settings')" />
              </template>
              <div class="score__settings-panel">
                <h3>{{ $t('score.ui.glance.settings') }}</h3>
                <div class="score__choices">
                  <label v-for="row in glance" :key="row.key"><input type="checkbox" :checked="!hiddenGlance.includes(row.key)" @change="toggleGlance(row.key)">{{ $t(`score.ui.glance.${row.key}`) }}</label>
                </div>
              </div>
            </v-menu>
          </div>
          <div class="score__glance-grid">
            <template v-for="row in visibleGlance" :key="row.key">
              <button type="button" class="score__glance-row" :class="{ 'score__glance-row--open': openGlance === row.key, [`score__glance-row--${row.tone}`]: row.tone }" :style="{ '--accent': row.color }" :title="row.status || undefined" :aria-expanded="openGlance === row.key" :aria-controls="`glance-${row.key}`" @click="openGlance = openGlance === row.key ? null : row.key">
                <span class="score__glance-head">
                  <v-icon :icon="row.icon" size="18" /><span class="score__glance-label">{{ $t(`score.ui.glance.${row.key}`) }}</span>
                  <v-icon v-if="row.tone" :icon="row.tone === 'good' ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline'" size="16" :aria-label="row.status" role="img" />
                  <span class="score__glance-meta">{{ $t('score.ui.glance.coverage', { known: row.known, total: products.length }) }}</span>
                  <v-icon icon="mdi-chevron-down" size="20" class="score__glance-chevron" />
                </span>
                <span class="score__glance-value"><strong>{{ row.value }}</strong><span>{{ row.unit }}</span></span>
              </button>
              <v-expand-transition>
                <div v-if="openGlance === row.key" :id="`glance-${row.key}`" class="score__glance-detail" :style="{ '--accent': row.color }">
                  <template v-if="row.key === 'additives'">
                    <div class="score__card-heading">
                      <p>{{ $t('score.ui.additivesFoundIn', additives.products) }}</p>
                      <InfoTip :title="$t('score.additivesTitle')" :text="$t('score.ui.info.additives')" :sources="offSources" />
                    </div>
                    <AnalysisProductList :products="products.filter(product => product.additives?.length)">
                      <template #default="{ product }">
                        <p class="score__product-additives">
                          {{ [...new Set(product.additives)].map(tag => additiveName(tag)).join(', ') }}
                        </p>
                      </template>
                    </AnalysisProductList>
                    <p class="score__coverage">
                      {{ coverage(additives.known) }} · {{ $t('score.ui.withoutAdditives', { count: additives.without }) }}
                    </p>
                    <details v-if="additives.unknown" class="score__nested">
                      <summary>{{ $t('score.ui.unknownAdditives', { count: additives.unknown }) }}</summary>
                      <AnalysisProductList :products="products.filter(product => product.additives === null)" />
                    </details>
                  </template>
                  <template v-else-if="row.key === 'highlights'">
                    <div class="score__settings-heading">
                      <span class="score__muted">{{ coverage(highlightKnown) }}</span>
                      <v-menu :close-on-content-click="false" location="bottom end">
                        <template #activator="{ props }">
                          <v-btn v-bind="props" icon="mdi-cog-outline" size="small" variant="text" :aria-label="$t('score.ui.nutrientSettings')" @click.stop @keydown.stop />
                        </template>
                        <div class="score__settings-panel">
                          <div class="score__card-heading">
                            <h3>{{ $t('score.ui.nutrientFilters') }}</h3>
                            <InfoTip :title="$t('score.ui.nutrientFilters')" :text="$t('score.ui.info.highNutrients')" :sources="nutrientSources" />
                          </div>
                          <div class="score__choices">
                            <label v-for="key in ['sugars', 'salt', 'fat']" :key="key"><input v-model="selectedNutrients" type="checkbox" :value="key">{{ $t(`score.ui.high.${key}`) }}</label>
                          </div>
                          <p v-for="key in selectedNutrients" :key="key" class="score__coverage">
                            {{ $t(`score.ui.high.${key}`) }} · {{ coverage(products.filter(p => ['low', 'moderate', 'high'].includes(p.nutrientLevels[key])).length) }}
                          </p>
                          <p class="score__coverage">
                            {{ $t('score.ui.remembered') }}
                          </p>
                        </div>
                      </v-menu>
                    </div>
                    <div class="score__card-heading score__spaced">
                      <p class="score__coverage">
                        {{ $t('score.ui.highlightCount', { count: improvements.length, total: products.length }) }} · {{ coverage(highlightKnown) }}
                      </p>
                      <InfoTip :title="$t('score.ui.highlights')" :text="highlightInfo" :sources="offSources" />
                    </div>
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
                  </template>
                  <template v-else-if="row.key === 'co2'">
                    <div class="score__card-heading">
                      <h3>{{ $t('score.co2Title') }}</h3>
                      <InfoTip :title="$t('score.co2Title')" :text="$t('score.ui.info.carbon') + ' ' + $t('score.ui.carbonReferenceInfo')" :sources="[...referenceSources, { label: 'ADEME · Nos Gestes Climat', url: 'https://nosgestesclimat.fr/questions-frequentes' }]" />
                    </div>
                    <template v-if="carbon.kg !== null">
                      <div class="score__carbon-metrics">
                        <div>
                          <strong>{{ formatNumber(carbon.kg, 2) }}</strong>
                          <span>{{ $t('score.ui.carbonBasketUnit') }}</span>
                        </div>
                        <div>
                          <strong>{{ formatCarbonReference(carbon.kg / weeklyCarbonReference) }}</strong>
                          <span>{{ $t('score.ui.carbonRelativeLabel') }}</span>
                        </div>
                      </div>
                      <div class="score__carbon-bar score__carbon-reference-bar" aria-hidden="true">
                        <span :style="{ width: `${Math.min(carbon.kg / weeklyCarbonReference, 1) * 100}%` }" />
                      </div>
                      <p class="score__carbon-reference-value">
                        {{ $t('score.ui.carbonWeekly', { kg: formatNumber(weeklyCarbonReference, 1) }) }}
                      </p>
                      <p class="score__carbon-reference-note">
                        {{ $t('score.ui.carbonReferenceNote') }}
                      </p>
                    </template>
                    <p v-else class="score__carbon-total">
                      {{ $t('score.noData') }}
                    </p>
                    <p class="score__coverage">
                      {{ $t('score.ui.estimated') }} · {{ coverage(carbon.known) }}
                    </p>
                    <details v-if="carbon.items.length" class="score__carbon-breakdown">
                      <summary>{{ $t('score.ui.carbonBreakdown') }}</summary>
                      <ul class="score__carbon-products">
                        <li v-for="product in carbon.items" :key="product.id">
                          <div class="score__carbon-row">
                            <span class="score__carbon-name">
                              <template v-for="(name, index) in product.names" :key="`${name}-${index}`">
                                <span v-if="index"> / </span>
                                <a v-if="product.sourceUrl" :href="product.barcode || !product.categoryTags[index] ? product.sourceUrl : `https://world.openfoodfacts.org/category/${encodeURIComponent(product.categoryTags[index])}`" target="_blank" rel="noopener noreferrer">{{ name }} ↗</a>
                                <span v-else>{{ name }}</span>
                              </template>
                            </span>
                            <strong>{{ $t('score.co2Value', { kg: formatNumber(product.co2Kg, 2) }) }}</strong>
                          </div>
                          <div class="score__carbon-bar" aria-hidden="true">
                            <span :style="{ width: `${product.share * 100}%` }" />
                          </div>
                        </li>
                      </ul>
                    </details>
                  </template>
                  <template v-else>
                    <div v-if="['sugars', 'salt', 'fat', 'saturatedFat'].includes(row.key)" class="score__card-heading">
                      <span class="score__muted">{{ $t('score.ui.wholeBasket') }}</span>
                      <InfoTip :title="$t(`score.nutrients.${row.key}`)" :text="$t('score.ui.info.nutrients')" :sources="referenceSources" />
                    </div>
                    <div v-else-if="['organic', 'fairTrade'].includes(row.key)" class="score__card-heading">
                      <span class="score__muted">{{ coverage(labelsKnown) }}</span>
                      <InfoTip :title="$t(`score.${row.key}`)" :text="$t('score.ui.info.labels')" :sources="offSources" />
                    </div>
                    <ScoreBreakdown v-bind="glanceDetail" :color="row.color" />
                  </template>
                </div>
              </v-expand-transition>
            </template>
          </div>
        </section>

        <details class="score__card score__section score__shopping" open>
          <summary class="score__shopping-summary">
            <span class="score__shopping-title score__section-title">{{ $t('score.ui.shoppingSummary') }}</span>
            <span class="score__shopping-controls">
              <span class="score__sort">
                <v-menu location="bottom end" max-height="420">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" variant="text" class="score__sort-button" append-icon="mdi-chevron-down" :aria-label="`${$t('score.ui.sortBy')}: ${$t(`score.ui.sorts.${productSort}`)}`" :title="productSort === 'price' || productSort === 'unitPrice' ? $t(`score.ui.priceSortInfo.${productSort}`) : undefined" @click.stop @keydown.stop>
                      <span class="score__sort-label">{{ $t('score.ui.sortBy') }}:</span>
                      {{ $t(`score.ui.sorts.${productSort}`) }}
                    </v-btn>
                  </template>
                  <v-list class="score__sort-menu" density="compact" role="menu">
                    <template v-for="(option, index) in sortOptions" :key="option.key">
                      <v-list-subheader v-if="index === 0 || option.group !== sortOptions[index - 1].group">
                        {{ $t(`score.ui.sortGroups.${option.group}`) }}
                      </v-list-subheader>
                      <v-list-item :title="$t(`score.ui.sorts.${option.key}`)" :active="productSort === option.key" role="menuitemradio" :aria-checked="productSort === option.key" @click="productSort = option.key">
                        <template #append>
                          <v-icon v-if="productSort === option.key" icon="mdi-check" size="18" />
                        </template>
                      </v-list-item>
                    </template>
                  </v-list>
                </v-menu>
                <v-btn v-if="productSort !== 'receipt'" icon="mdi-swap-vertical" size="small" variant="text" :aria-label="$t('score.ui.reverseOrder')" :title="$t(`score.ui.sortOrder.${productSort}.${sortReverse ? 'reversed' : 'normal'}`)" @click.stop="sortReverse = !sortReverse" @keydown.stop />
              </span>
              <v-menu :close-on-content-click="false" location="bottom end">
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-cog-outline" size="small" variant="text" :aria-label="$t('score.ui.allergenSettings')" :class="{ 'score__settings-active': selectedAllergens.length }" @click.stop @keydown.stop />
                </template>
                <div class="score__settings-panel">
                  <div class="score__card-heading">
                    <h3>{{ $t('score.ui.allergenCheck') }}</h3>
                    <InfoTip :title="$t('score.ui.allergenCheck')" :text="$t('score.ui.info.allergens')" :sources="offSources" />
                  </div>
                  <p class="score__coverage">{{ $t('score.ui.allergenChooseHint') }}</p>
                  <div class="score__allergen-choices">
                    <label v-for="allergen in allergenKeys" :key="allergen">
                      <input v-model="selectedAllergens" type="checkbox" :value="allergen">
                      <span>{{ $t(`score.ui.allergens.${allergen}`) }}</span>
                    </label>
                  </div>
                  <div class="score__allergen-key">
                    <span v-for="status in allergenStatuses.slice(0, 3)" :key="status.key">
                      <v-icon :icon="status.icon" size="16" />{{ $t(`score.ui.allergenRowStatus.${status.key}`) }}
                    </span>
                  </div>
                  <p class="score__coverage">
                    {{ $t('score.ui.remembered') }}
                  </p>
                </div>
              </v-menu>
              <span class="score__shopping-toggle">
                <v-icon icon="mdi-chevron-down" size="18" />
              </span>
            </span>
          </summary>
          <div class="score__receipt-meta">
            <div class="score__receipt-place">
              <h3>{{ receipt.locationName || $t('score.ui.unknownShop') }}</h3>
              <p>{{ receiptDateLabel }}</p>
            </div>
            <div class="score__receipt-totals">
              <span class="score__receipt-count">{{ $t('score.ui.productsCount', products.length) }}</span>
              <dl class="score__receipt-amount">
                <dt>
                  {{ $t(pricedProducts.length === products.length ? 'score.ui.totalSpent' : 'score.ui.knownSpending') }}
                  <InfoTip :title="$t('score.ui.totalSpent')" :text="$t('score.ui.priceCoverage', { known: pricedProducts.length, total: products.length }) + '. ' + $t('score.ui.info.spending')" />
                </dt>
                <dd>{{ pricedProducts.length ? formatMoney(totalSpent) : $t('score.noData') }}</dd>
              </dl>
            </div>
            <p v-if="pricedProducts.length !== products.length" class="score__coverage score__receipt-incomplete">
              {{ $t('score.ui.priceCoverage', { known: pricedProducts.length, total: products.length }) }}
            </p>
          </div>
          <AnalysisProductList :products="sortedProducts" show-receipt-names horizontal>
            <template #default="{ product }">
              <div class="score__product-grades">
                <img v-for="badge in productBadges(product)" :key="badge.kind" class="score__product-badge" :src="badge.src" :alt="badge.label" :title="badge.label" loading="lazy">
                <div v-if="selectedAllergens.length" class="score__product-allergens">
                  <span v-for="group in productAllergenGroups(product)" :key="group.key" class="score__allergen-mark" :class="`score__allergen-mark--${group.key}`">
                    <v-icon :icon="group.icon" size="16" aria-hidden="true" />
                    <span><strong>{{ $t(`score.ui.allergenRowStatus.${group.key}`) }}:</strong> {{ group.names }}</span>
                  </span>
                  <span v-if="selectedAllergens.includes('gluten') && product.labels?.includes('en:gluten-free')" class="score__allergen-mark"><v-icon icon="mdi-label-outline" size="16" aria-hidden="true" />{{ $t('score.ui.glutenFreeLabel') }}</span>
                </div>
              </div>
              <div class="score__product-meta">
                <span>{{ $t('score.ui.purchased', { quantity: product.quantity }) }}</span>
                <span v-if="product.grams !== null">{{ formatGrams(product.grams) }}</span>
                <span v-else-if="product.ml !== null">{{ formatMl(product.ml) }}</span>
                <strong>{{ product.lineTotal !== null ? formatMoney(product.lineTotal) : $t('score.noData') }}</strong>
              </div>
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
import ScoreRings from '@/components/ScoreRings.vue'
import ScoreBreakdown from '@/components/ScoreBreakdown.vue'
import InfoTip from '@/components/InfoTip.vue'
import AnalysisProductList from '@/components/AnalysisProductList.vue'

const SORT_OPTIONS = [
  { key: 'receipt', group: 'shopping' },
  { key: 'name', group: 'shopping' },
  { key: 'review', group: 'shopping' },
  { key: 'price', group: 'shopping' },
  { key: 'unitPrice', group: 'shopping' },
  { key: 'weight', group: 'shopping' },
  { key: 'nutriscore', group: 'health' },
  { key: 'nova', group: 'health' },
  { key: 'sugars', group: 'health' },
  { key: 'salt', group: 'health' },
  { key: 'fat', group: 'health' },
  { key: 'greenScore', group: 'environment' },
  { key: 'forest', group: 'environment' },
  { key: 'co2', group: 'environment' }
]
const PREFS_KEY = 'score-my-receipt:analysis-preferences:v1'
function preferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    return {
      allergens: Array.isArray(saved.allergens) ? saved.allergens.filter(a => ALLERGENS.includes(a)) : [],
      nutrients: Array.isArray(saved.nutrients) ? saved.nutrients.filter(n => ['sugars', 'salt', 'fat'].includes(n)) : [],
      sort: saved.sort in SORTS ? saved.sort : 'receipt',
      reverse: saved.reverse === true,
      hiddenGlance: Array.isArray(saved.hiddenGlance) ? saved.hiddenGlance.filter(key => typeof key === 'string') : []
    }
  } catch { return { allergens: [], nutrients: [], sort: 'receipt', reverse: false, hiddenGlance: [] } }
}
export default {
  name: 'Score',
  components: { CategoryChart, ScoreRings, ScoreBreakdown, InfoTip, AnalysisProductList },
  data() {
    const prefs = preferences()
    return {
      fetched: {}, detailsStatus: 'idle', requestId: 0,
      storageError: false, initializing: true, openGlance: null, ringDetail: null,
      weeklyCarbonReference: 2000 / 52,
      selectedAllergens: prefs.allergens, selectedNutrients: prefs.nutrients,
      hiddenGlance: prefs.hiddenGlance,
      productSort: prefs.sort, sortReverse: prefs.reverse, sortOptions: SORT_OPTIONS,
      allergenKeys: ALLERGENS,
      allergenStatuses: [
        { key: 'contains', icon: 'mdi-alert-circle' },
        { key: 'mayContain', icon: 'mdi-alert-outline' },
        { key: 'unknown', icon: 'mdi-help-circle-outline' },
        { key: 'notListed', icon: 'mdi-text-box-search-outline' }
      ],
      referenceSources: REFERENCE_SOURCES,
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
    receiptTitle() {
      const shop = this.receipt.locationName?.trim()
      return shop ? this.$t('score.ui.shopOverview', { shop }) : this.$t('score.ui.title')
    },
    receiptFullDate() {
      if (!this.receipt.date) return this.$t('score.ui.unknownReceiptDate')
      const date = new Date(`${this.receipt.date}T12:00:00`)
      return Number.isNaN(date.getTime()) ? this.$t('score.ui.unknownReceiptDate') : new Intl.DateTimeFormat(this.$i18n.locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
    },
    receiptDateLabel() {
      if (!this.receipt.date) return this.$t('score.ui.unknownReceiptDate')
      const date = new Date(`${this.receipt.date}T12:00:00`)
      return Number.isNaN(date.getTime()) ? this.receipt.date : new Intl.DateTimeFormat(this.$i18n.locale, { dateStyle: 'medium' }).format(date)
    },
    items() { return this.appStore.getItems },
    isMock() { return this.$route.query.mock === '1' || String(this.receipt.proofId || '').startsWith('mock') },
    isLoading() { return ['uploading', 'extracting'].includes(this.receipt.status) },
    barcodes() { return [...new Set(this.items.map(i => String(i.barcode || '')).filter(code => /^\d{8,14}$/.test(code)))] },
    snapshotMatches() { return this.receipt.analysisSnapshot?.signature === receiptSignature(this.receipt) },
    products() { return this.snapshotMatches ? this.receipt.analysisSnapshot.products : analyseProducts(this.items, this.fetched) },
    glance() {
      const grams = (value) => value === null ? { value: '—', unit: '' } : value >= 1000 ? { value: this.formatNumber(value / 1000, 2), unit: 'kg' } : { value: this.formatNumber(value, value < 10 ? 1 : 0), unit: 'g' }
      const count = (n, unit) => ({ value: this.formatNumber(n), unit: this.$t(`score.ui.glance.units.${unit}`, n) })
      // No product known for a row: show a dash, never a misleading 0
      const rows = [
        { key: 'highlights', icon: 'mdi-magnify', color: '#703b12', known: this.highlightKnown, ...count(this.improvements.length, 'products') },
        { key: 'spending', icon: 'mdi-cart-outline', color: '#174f78', target: 'products', known: this.pricedProducts.length, value: this.pricedProducts.length ? this.formatMoney(this.totalSpent) : '—', unit: '' },
        { key: 'weight', icon: 'mdi-weight', color: '#526156', target: 'weight', known: this.weight.known, ...grams(this.weight.grams) },
        { key: 'sugars', icon: 'mdi-cube-outline', color: '#68452d', target: 'nutrients', known: this.nutrients.sugars.known, ...grams(this.nutrients.sugars.grams) },
        { key: 'salt', icon: 'mdi-shaker-outline', color: '#68452d', target: 'nutrients', known: this.nutrients.salt.known, ...grams(this.nutrients.salt.grams) },
        { key: 'fat', icon: 'mdi-water-outline', color: '#68452d', target: 'nutrients', known: this.nutrients.fat.known, ...grams(this.nutrients.fat.grams) },
        { key: 'saturatedFat', icon: 'mdi-water-outline', color: '#68452d', target: 'nutrients', known: this.nutrients.saturatedFat.known, ...grams(this.nutrients.saturatedFat.grams) },
        { key: 'additives', icon: 'mdi-flask-outline', color: '#703b12', target: 'additives', known: this.additives.known, ...count(this.additives.list.length, 'additives') },
        { key: 'co2', icon: 'mdi-molecule-co2', color: '#245b3f', target: 'co2', known: this.carbon.known, value: this.carbon.kg === null ? '—' : this.formatNumber(this.carbon.kg, 2), unit: this.carbon.kg === null ? '' : 'kg CO₂e' },
        { key: 'organic', icon: 'mdi-sprout-outline', color: '#245b3f', target: 'labels', known: this.labelsKnown, ...count(this.labelGroups[0].items.length, 'products') },
        { key: 'fairTrade', icon: 'mdi-handshake-outline', color: '#245b3f', target: 'labels', known: this.labelsKnown, ...count(this.labelGroups[1].items.length, 'products') }
      ]
      return rows.map(row => ({ ...(row.known ? row : { ...row, value: '—', unit: '' }), ...this.glanceStatus(row.key) }))
    },
    visibleGlance() { return this.glance.filter(row => !this.hiddenGlance.includes(row.key)) },
    // What unfolds under the open "At a glance" row: products with their value and share
    glanceDetail() {
      const total = this.products.length
      const ranked = (list, amount, format) => {
        const sum = list.reduce((acc, p) => acc + amount(p), 0)
        return [...list].sort((a, b) => amount(b) - amount(a)).map(p => ({ ...p, value: format(p), share: sum ? amount(p) / sum : 0 }))
      }
      switch (this.openGlance) {
        case 'spending': return { note: this.$t('score.ui.breakdown.spending'), items: ranked(this.pricedProducts, p => p.lineTotal, p => this.formatMoney(p.lineTotal)), missing: total - this.pricedProducts.length }
        case 'weight': return { note: this.$t('score.ui.breakdown.weight'), items: ranked(this.weight.items, p => p.grams ?? p.ml, p => p.grams !== null ? this.formatGrams(p.grams) : this.formatMl(p.ml)), missing: total - this.weight.known }
        case 'sugars':
        case 'salt':
        case 'fat':
        case 'saturatedFat': return { note: this.$t('score.ui.breakdown.nutrient', { total: this.formatGrams(this.nutrients[this.openGlance].grams) }), items: this.contributions(this.nutrients[this.openGlance].items), missing: total - this.nutrients[this.openGlance].known }
        case 'organic': return { note: this.$t('score.ui.breakdown.organic'), items: this.labelGroups[0].items, missing: total - this.labelsKnown }
        case 'fairTrade': return { note: this.$t('score.ui.breakdown.fairTrade'), items: this.labelGroups[1].items, missing: total - this.labelsKnown }
        default: return { items: [] }
      }
    },
    ringTitles() { return { nutriscore: this.$t('score.nutriscore'), nova: this.$t('score.ui.processing'), greenScore: this.$t('score.greenScore'), forest: this.$t('score.ui.forest') } },
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
    allergenMarks() {
      const marks = Object.fromEntries(this.products.map(product => [product.id, []]))
      Object.entries(this.allergenResults).forEach(([allergen, groups]) => {
        Object.entries(groups).forEach(([status, products]) => {
          products.forEach(product => marks[product.id].push({ allergen, status }))
        })
      })
      return marks
    }
  },
  watch: {
    items: { handler() { if (!this.initializing) this.loadDetails() }, deep: true },
    selectedAllergens: { handler: 'savePreferences', deep: true },
    selectedNutrients: { handler: 'savePreferences', deep: true },
    hiddenGlance: { handler() { if (this.hiddenGlance.includes(this.openGlance)) this.openGlance = null; this.savePreferences() }, deep: true },
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
    glanceStatus(key) {
      const nutrient = key === 'saturatedFat' ? 'saturated-fat' : key
      if (['sugars', 'salt', 'fat', 'saturatedFat'].includes(key)) {
        const high = this.products.filter(product => product.nutrientLevels[nutrient] === 'high').length
        if (high) return { tone: 'warning', status: this.$t('score.ui.glance.highNutrient', { count: high }), color: '#8a3028' }
        if (this.products.length && this.products.every(product => product.nutrientLevels[nutrient] === 'low')) return { tone: 'good', status: this.$t('score.ui.glance.lowNutrient'), color: '#245b3f' }
      }
      if (key === 'co2' && this.carbon.kg !== null) {
        const share = this.carbon.kg / this.weeklyCarbonReference
        if (share >= 1) return { tone: 'warning', status: this.$t('score.ui.glance.carbonFull'), color: '#8a3028' }
        if (share >= 0.5) return { tone: 'caution', status: this.$t('score.ui.glance.carbonHalf'), color: '#794d16' }
      }
      return {}
    },
    productAllergenGroups(product) {
      const marks = this.allergenMarks[product.id] || []
      return this.allergenStatuses.map(status => ({
        ...status,
        names: marks.filter(mark => mark.status === status.key).map(mark => this.$t(`score.ui.allergens.${mark.allergen}`)).join(', ')
      })).filter(group => group.names)
    },
    productBadges(product) {
      const types = [
        { kind: 'nutriscore', prefix: 'nutriscore', grades: ['a', 'b', 'c', 'd', 'e'] },
        { kind: 'nova', prefix: 'nova-group', grades: ['1', '2', '3', '4'] },
        { kind: 'greenScore', prefix: 'green-score', grades: ['a-plus', 'a', 'b', 'c', 'd', 'e', 'f'] },
        { kind: 'forest', prefix: 'forest-footprint-2026-simple', grades: ['a', 'b', 'c', 'd'] }
      ]
      return types.filter(type => type.grades.includes(product[type.kind])).map(type => ({
        kind: type.kind,
        src: `${import.meta.env.BASE_URL}score-badges/${type.prefix}-${product[type.kind]}.svg`,
        label: `${this.$t(type.kind === 'forest' ? 'score.ui.forest' : `score.${type.kind}`)} ${product[type.kind] === 'a-plus' ? 'A+' : product[type.kind].toUpperCase()}`
      }))
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
    toggleGlance(key) { this.hiddenGlance = this.hiddenGlance.includes(key) ? this.hiddenGlance.filter(hidden => hidden !== key) : [...this.hiddenGlance, key] },
    savePreferences() { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ allergens: this.selectedAllergens, nutrients: this.selectedNutrients, sort: this.productSort, reverse: this.sortReverse, hiddenGlance: this.hiddenGlance })) } catch { /* Browsing with storage disabled still supports session filters. */ } },
    contributions(items) { return items.map(p => ({ ...p, value: this.$t('score.ui.contribution', { grams: this.formatGrams(p.contribution), percent: this.formatPercent(p.share) }) })) },
    coverage(known) { return this.$t('score.ui.coverage', { known, total: this.products.length }) },
    formatNumber(value, digits = 0) { return new Intl.NumberFormat(this.$i18n.locale, { maximumFractionDigits: digits }).format(value) },
    formatMoney(value) { return new Intl.NumberFormat(this.$i18n.locale, { style: 'currency', currency: this.receipt.currency || 'EUR' }).format(value) },
    formatCarbonReference(value) {
      const format = new Intl.NumberFormat(this.$i18n.locale, { style: 'percent', maximumFractionDigits: 1 })
      return value > 0 && value < 0.001 ? this.$t('score.ui.carbonLessThan', { percent: format.format(0.001) }) : format.format(value)
    },
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
.score {
  --score-ink: #17382a;
  --score-muted: #526156;
  --score-surface: #fffdf8;
  --score-border: #b7c0b3;
  --score-rule: #d8ded2;
  --score-accent: #245b3f;
  --score-tint: #e8efe3;
  --score-focus: #174f78;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased;
  min-height: 100dvh; padding: 1.5rem; color: var(--score-ink); background: #f4f1e9;
}

.score :deep(.v-btn:focus-visible), .score :deep(.v-field:focus-within) { outline: 3px solid var(--score-focus); outline-offset: 3px; }
.score__content { width: min(68rem, 100%); margin: auto; }
.score__heading, .score__card-heading, .score__actions { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
h1, h2 { font-family: inherit; }
h1 { overflow-wrap: anywhere; font-size: clamp(1.9rem, 5vw, 2.8rem); margin: 0.3rem 0 1rem; line-height: 1.15; }
h2 { display: flex; align-items: center; gap: 0.6rem; font-size: 1.5rem; margin: 0 0 0.5rem; }
h3 { font-size: 1rem; font-weight: 600; }
.score__eyebrow { margin: 0 0 0.4rem; font-size: clamp(0.85rem, 1.2vw, 1rem); line-height: 1.5; color: var(--score-muted); letter-spacing: normal; overflow-wrap: anywhere; }
.score__alert { margin-bottom: 1rem; }
.score__glance { margin: 0 0 1.5rem; }
.score__glance-heading { display: flex; align-items: center; justify-content: flex-end; gap: 1rem; margin-bottom: 0.75rem; }
.score__glance-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); gap: 0.6rem; }
.score__glance-row { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.85rem 1rem; border-radius: 14px; background: var(--score-surface); color: inherit; text-align: left; font: inherit; }
button.score__glance-row { cursor: pointer; transition: background 0.15s ease; }
button.score__glance-row:hover { background: #e9e9e6; }
.score__glance-row--warning { background: #f8e9e5; }
.score__glance-row--caution { background: #faf0da; }
.score__glance-row--good { background: #e8f0e4; }
.score__glance-head { display: flex; align-items: center; gap: 0.4rem; min-height: 1.5rem; }
.score__glance-head > .v-icon:first-child, .score__glance-label { color: var(--accent); }
.score__glance-label { font-size: 0.95rem; font-weight: 600; }
.score__glance-meta { margin-left: auto; color: var(--score-muted); font-size: 0.8rem; }
.score__glance-chevron { color: var(--score-muted); margin-right: -0.3rem; }
.score__glance-value { display: flex; align-items: baseline; gap: 0.3rem; }
.score__glance-value strong { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
.score__glance-value span { color: var(--score-muted); font-size: 0.95rem; font-weight: 600; }
.score__glance-grid { grid-auto-flow: row dense; }
.score__glance-row--open { box-shadow: inset 0 0 0 2px var(--accent); }
.score__glance-chevron { transition: transform 0.2s ease; }
.score__glance-detail { grid-column: 1 / -1; padding: 0.85rem 1rem 1rem; border-radius: 14px; background: var(--score-surface); }
.score__ring-detail { max-width: 34rem; margin: -1rem auto 2rem; }
.score__glance-row--open .score__glance-chevron { transform: rotate(180deg); }

.score__ring-detail { margin-bottom: 1.5rem; }

.score__pillars { display: grid; grid-template-columns: 1fr; gap: 1rem; }
.score__pillar { min-width: 0; border: 1px solid var(--score-border); border-radius: 0.75rem; background: var(--score-surface); }
.score__pillar--environment { --score-surface: #eff4ea; --score-tint: #dfead6; background: var(--score-surface); }
.score__pillar--environment > .score__pillar-heading { color: #245b3f; }
.score__pillar-heading { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem; border-radius: 0.7rem; background: var(--score-tint); list-style: none; }
.score__pillar-heading::-webkit-details-marker { display: none; }
.score__pillar-heading h2 { margin: 0; }
.score__pillar[open] > .score__pillar-heading > .v-icon { transform: rotate(180deg); }
.score__pillar[open] > .score__pillar-heading { border-radius: 0.7rem 0.7rem 0 0; border-bottom: 1px solid var(--score-rule); }
.score__pillar-body { display: flex; flex-direction: column; padding: 0 1.1rem; }
.score__pillar-body > .score__card, .score__pillar-body > :deep(.category-chart) { padding: 1.25rem 0; border: 0; border-radius: 0; background: transparent; }
.score__pillar-body > .score__card:not(:first-child), .score__pillar-body > :deep(.category-chart:not(:first-child)) { border-top: 1px solid var(--score-rule); }
.score__card { padding: 1.1rem; border: 1px solid var(--score-border); border-radius: 0.75rem; background: var(--score-surface); }
.score__card-heading { margin-bottom: 0.5rem; }
.score__stat { font-size: clamp(1.3rem, 3vw, 1.85rem); font-weight: 700; margin: 0.5rem 0; }
.score__coverage, .score__muted, .score__status, .score__product-meta { font-size: 0.8rem; color: var(--score-muted); }
.score__coverage { margin: 0.45rem 0; }
.score__status { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; }
.score__status button { text-decoration: underline; }
.score__estimate { font-size: 0.75rem; border: 1px solid #71836f; padding: 0.15rem 0.45rem; border-radius: 1rem; color: var(--score-muted); }
.score__section { margin-top: 1.25rem; }
.score__section > h2 { margin-bottom: 0.85rem; }
summary { cursor: pointer; font-weight: 600; }
summary:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid var(--score-focus); outline-offset: 3px; }
.score__card > details { margin-top: 0.85rem; font-size: 0.85rem; }
.score__nested { padding: 0.65rem 0; border-bottom: 1px solid var(--score-rule); }
.score__nested:last-child { border-bottom: 0; }
.score__spaced { margin-top: 1rem; }
.score__heading-tools { display: flex; align-items: center; gap: 0.75rem; margin-left: auto; flex-shrink: 0; }
.score__shopping-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem 1.5rem; list-style: none; }
.score__shopping-summary::-webkit-details-marker { display: none; }
.score__receipt-meta { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem 1.5rem; margin: 1rem 0 0; padding: 1rem 0; border-top: 1px solid var(--score-rule); border-bottom: 1px solid var(--score-rule); }
.score__receipt-place { min-width: 0; flex: 1; }
.score__receipt-place h3 { margin: 0; font-size: 1rem; font-weight: 600; overflow-wrap: anywhere; }
.score__receipt-place p { margin: 0.25rem 0 0; font-size: 0.8rem; color: var(--score-muted); }
.score__receipt-totals { display: flex; align-items: center; gap: 1.5rem; }
.score__receipt-count { font-size: 0.85rem; color: var(--score-muted); white-space: nowrap; }
.score__receipt-amount { padding-left: 1.5rem; border-left: 1px solid var(--score-rule); text-align: right; }
.score__receipt-amount dt { display: flex; align-items: center; justify-content: flex-end; gap: 0.35rem; font-size: 0.75rem; color: var(--score-muted); }
.score__receipt-amount dd { margin: 0.15rem 0 0; font-size: 1.4rem; font-weight: 600; line-height: 1.2; font-variant-numeric: tabular-nums; }
.score__receipt-incomplete { flex-basis: 100%; margin: 0; }
.score__section-title { font-family: inherit; font-size: clamp(1.125rem, 1.5vw, 1.25rem); font-weight: 600; line-height: 1.3; letter-spacing: normal; text-transform: none; }
.score__shopping-toggle { display: inline-flex; align-items: center; gap: 0.35rem; color: var(--score-accent); font-size: 0.85rem; }
.score__shopping[open] .score__shopping-toggle .v-icon { transform: rotate(180deg); }
.score__shopping-controls { display: inline-flex; align-items: center; gap: 0.25rem; margin-left: auto; max-width: 100%; color: var(--score-accent); }
.score__spending-coverage { display: flex; align-items: center; gap: 0.5rem; }
.score__sort { display: flex; align-items: center; gap: 0.15rem; color: var(--score-accent); min-width: 0; }
.score__sort-button { min-width: 0; max-width: 100%; }
.score__sort-button :deep(.v-btn__content) { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.score__sort-button { color: var(--score-accent); text-transform: none; letter-spacing: normal; font-weight: 500; }
.score__sort-label { color: var(--score-muted); margin-right: 0.5rem; font-weight: 400; }
.score__sort-menu { background: #fffdf8; color: #17382a; min-width: 16rem; border: 1px solid #b7c0b3; border-radius: 0.5rem; }
.score__sort-menu :deep(.v-list-subheader) { color: #526156; }
.score__product-grades { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
.score__product-badge { display: block; height: 2.5rem; width: auto; max-width: 100%; object-fit: contain; }
.score__shopping .score__product-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; margin: 0; }
.score__shopping .score__product-meta strong { color: var(--score-ink); font-size: 0.9rem; }
.score__carbon-total { margin: 0.75rem 0 0.25rem; font-size: 1.85rem; font-weight: 700; }
.score__carbon-products { list-style: none; padding: 0; margin: 1.25rem 0 0; }
.score__carbon-products li + li { margin-top: 1rem; }
.score__carbon-row { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; margin-bottom: 0.4rem; font-size: 0.85rem; }
.score__carbon-name { min-width: 0; overflow-wrap: anywhere; }
.score__carbon-row strong { flex-shrink: 0; font-size: 0.8rem; }
.score__carbon-row a { color: inherit; text-decoration-color: var(--score-muted); text-underline-offset: 3px; }
.score__carbon-row a:focus-visible { outline: 3px solid var(--score-focus); outline-offset: 3px; }
.score__carbon-bar { height: 0.35rem; border-radius: 0.1rem; background: var(--score-rule); overflow: hidden; }
.score__carbon-bar > span { display: block; height: 100%; background: var(--score-accent); }
.score__carbon-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin: 1rem 0; }
.score__carbon-metrics strong { display: block; font-size: 1.85rem; font-weight: 700; overflow-wrap: anywhere; }
.score__carbon-metrics span { display: block; margin-top: 0.25rem; font-size: 0.8rem; color: var(--score-muted); }
.score__carbon-reference-bar { height: 0.6rem; }
.score__carbon-reference-value { margin: 0.65rem 0 0; font-size: 0.8rem; color: var(--score-muted); }
.score__carbon-reference-note { margin: 0.3rem 0 1rem; color: var(--score-muted); font-size: 0.75rem; }
.score__carbon-breakdown { border-top: 1px solid var(--score-rule); padding-top: 0.85rem; }
.score__carbon-breakdown summary { font-weight: 500; }
.score__settings-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; list-style: none; }
.score__settings-heading::-webkit-details-marker { display: none; }
.score__settings-heading > span { display: flex; align-items: center; gap: 0.4rem; }
details[open] > .score__settings-heading .score__expand-icon { transform: rotate(90deg); }
.score__settings-panel { --score-ink: #17382a; --score-muted: #526156; --score-accent: #245b3f; --score-tint: #e8efe3; --score-focus: #174f78; color: var(--score-ink); background: #fffdf8; padding: 1rem; width: min(24rem, calc(100vw - 2rem)); max-height: 70vh; overflow-y: auto; border: 1px solid #b7c0b3; border-radius: 0.75rem; }
.score__product-additives { margin: 0.3rem 0 0; font-size: 0.85rem; line-height: 1.5; color: var(--score-muted); }
.score__product-allergens { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.25rem; }
.score__settings-panel, .score__sort-menu { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
.score__allergen-mark { display: inline-flex; align-items: flex-start; gap: 0.35rem; font-size: 0.75rem; font-weight: 400; padding: 0.2rem 0.5rem; border-radius: 0.3rem; background: #eef0ed; color: #435046; }
.score__allergen-mark--contains { background: #f9e5df; color: #803022; }
.score__allergen-mark--mayContain { background: #fff0dc; color: #703b12; }
.score__allergen-mark strong { font-weight: 600; }
.score__allergen-mark > .v-icon { flex-shrink: 0; margin-top: 0.1rem; }
.score__settings-active { background: var(--score-tint); color: var(--score-accent); }
.score__allergen-choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.3rem 0.5rem; margin: 0.75rem 0; }
.score__allergen-choices label { display: flex; align-items: center; gap: 0.55rem; padding: 0.55rem; font-size: 0.85rem; border-radius: 0.3rem; cursor: pointer; }
.score__allergen-choices label:hover { background: #f2f3ee; }
.score__allergen-choices label:has(input:checked) { background: var(--score-tint); font-weight: 600; }
.score__allergen-choices input { width: 1rem; height: 1rem; flex-shrink: 0; }
.score__allergen-key { display: flex; flex-wrap: wrap; gap: 0.4rem 0.75rem; border-top: 1px solid #d8ded2; padding-top: 0.65rem; }
.score__allergen-key span { display: inline-flex; align-items: center; gap: 0.3rem; color: var(--score-muted); font-size: 0.75rem; }
.score__choices { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
.score__choices label { display: flex; align-items: center; gap: 0.45rem; padding: 0.4rem 0.65rem; font-size: 0.85rem; border: 1px solid #71836f; border-radius: 1rem; cursor: pointer; }
.score__choices label:has(input:checked) { background: var(--score-tint); border-color: var(--score-accent); }
input { accent-color: var(--score-accent); }
.score__reasons { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.5rem; }
.score__reason { background: #fff0dc; color: #703b12; border: 1px solid #a97438; border-radius: 1rem; font-size: 0.75rem; padding: 0.2rem 0.55rem; }
.score__product-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.35rem; }
.score__actions { flex-wrap: wrap; margin-top: 2rem; }
.score__state { text-align: center; padding: 3rem; }
@media (max-width: 760px) { .score__heading { flex-wrap: wrap; } .score__heading-tools { margin-bottom: 1rem; }
.score__receipt-place { flex-basis: 100%; }
.score__receipt-totals { width: 100%; justify-content: space-between; }
.score__shopping-summary { gap: 0.5rem 1rem; } .score__shopping-title { flex-basis: 100%; }
.score__sort-button { font-size: 0.8rem; }
.score__shopping .score__product-meta { flex-direction: row; justify-content: flex-start; flex-wrap: wrap; gap: 0.5rem; } .score { padding: 1rem; }
}
</style>
