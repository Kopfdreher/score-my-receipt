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
            {{ receiptDate || $t('score.ui.eyebrow') }}
          </p>
          <h1>{{ $t('score.ui.title') }}</h1>
        </div>
        <div class="score__heading-tools">
          <v-btn variant="text" color="#007aff" prepend-icon="mdi-history" :to="{ name: 'history' }">
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
        <p v-if="detailsStatus === 'loading'" class="score__status">
          <v-progress-circular indeterminate size="14" width="2" />{{ $t('score.detailsLoading') }}
        </p>
        <p v-else-if="detailsStatus === 'partial'" class="score__status">
          {{ $t('score.detailsPartial') }} <button type="button" @click="retryDetails">
            {{ $t('score.retry') }}
          </button>
        </p>

        <ScoreRings :charts="charts" :titles="ringTitles" :previous="previousCharts" :previous-date="previousDate" :open-kind="ringDetail" @details="kind => ringDetail = ringDetail === kind ? null : kind" />
        <v-expand-transition>
          <div v-if="ringDetail" class="score__ring-detail">
            <CategoryChart :kind="ringDetail" :title="ringTitles[ringDetail]" :info="$t(`score.ui.info.${ringDetail}`)" :chart="charts[ringDetail]" :sources="ringDetail === 'nova' ? novaSources : ringDetail === 'greenScore' ? greenSources : offSources" open-details />
          </div>
        </v-expand-transition>

        <!-- Rows of key figures, like the Summary list of Apple Health; a tap unfolds the details in place -->
        <section class="score__glance" :aria-label="$t('score.ui.glance.title')">
          <h2>{{ $t('score.ui.glance.title') }}</h2>
          <div class="score__glance-grid">
            <template v-for="row in glance" :key="row.key">
              <button type="button" class="score__glance-row" :class="{ 'score__glance-row--open': openGlance === row.key }" :style="{ '--accent': row.color }" :aria-expanded="openGlance === row.key" :aria-controls="`glance-${row.key}`" @click="openGlance = openGlance === row.key ? null : row.key">
                <span class="score__glance-head">
                  <v-icon :icon="row.icon" size="18" /><span class="score__glance-label">{{ $t(`score.ui.glance.${row.key}`) }}</span>
                  <span class="score__glance-meta">{{ $t('score.ui.glance.coverage', { known: row.known, total: products.length }) }}</span>
                  <v-icon icon="mdi-chevron-down" size="20" class="score__glance-chevron" />
                </span>
                <span class="score__glance-value"><strong>{{ row.value }}</strong><span>{{ row.unit }}</span></span>
              </button>
              <v-expand-transition>
                <div v-if="openGlance === row.key" :id="`glance-${row.key}`" class="score__glance-detail" :style="{ '--accent': row.color }">
                  <template v-if="row.key === 'additives'">
                    <p class="score__coverage">
                      {{ $t('score.ui.breakdown.additives') }}
                    </p>
                    <details v-for="additive in additives.list" :key="additive.tag" class="score__nested">
                      <summary>{{ additiveName(additive.tag) }} <span class="score__muted">· {{ $t('score.ui.productsCount', additive.items.length) }}</span></summary>
                      <AnalysisProductList :products="additive.items" />
                    </details>
                  </template>
                  <ScoreBreakdown v-else v-bind="glanceDetail" :color="row.color" />
                </div>
              </v-expand-transition>
            </template>
          </div>
        </section>

        <details class="score__card score__view">
          <summary class="score__view-summary">
            <v-icon icon="mdi-tune-variant" size="18" />{{ $t('score.ui.view.title') }}
            <span class="score__view-current">{{ $t(`score.ui.view.presets.${currentPreset}`) }}</span>
            <span class="score__muted">{{ $t('score.ui.view.shown', { shown: shownCount, total: allSectionKeys.length }) }}</span>
          </summary>
          <p class="score__coverage">
            {{ $t('score.ui.view.hint') }}
          </p>
          <!-- Quick choices: one click shows a ready-made set of sections -->
          <div class="score__view-presets" role="group" :aria-label="$t('score.ui.view.quick')">
            <button v-for="preset in presetKeys" :key="preset" type="button" class="score__view-preset" :aria-pressed="currentPreset === preset" @click="applyPreset(preset)">
              <v-icon :icon="presetIcons[preset]" size="18" />
              <span>
                <strong>{{ $t(`score.ui.view.presets.${preset}`) }}</strong>
                <small>{{ $t(`score.ui.view.presetHints.${preset}`) }}</small>
              </span>
            </button>
          </div>
          <!-- Or one switch per section, with what it shows -->
          <div v-for="group in viewSections" :key="group.key" class="score__view-group">
            <h3>{{ $t(group.key === 'more' ? 'score.ui.view.more' : `score.ui.${group.key}`) }}</h3>
            <ul class="score__view-list">
              <li v-for="key in group.sections" :key="key">
                <v-switch :model-value="shows(key)" color="#34c759" density="compact" hide-details inset :aria-describedby="`view-hint-${key}`" @update:model-value="toggleSection(key)">
                  <template #label>
                    <span class="score__view-label">
                      <strong>{{ $t(`score.ui.view.sections.${key}`) }}</strong>
                      <small :id="`view-hint-${key}`">{{ $t(`score.ui.view.sectionHints.${key}`) }}</small>
                    </span>
                  </template>
                </v-switch>
              </li>
            </ul>
          </div>
        </details>

        <div v-if="visiblePillars" class="score__pillars" :class="{ 'score__pillars--single': visiblePillars === 1 }">
          <section v-if="showsAny('health')" class="score__pillar score__pillar--health">
            <h2><v-icon icon="mdi-heart-outline" size="22" />{{ $t('score.ui.health') }}</h2>
            <CategoryChart v-if="shows('nutriscore')" id="section-nutriscore" kind="nutriscore" :title="$t('score.nutriscore')" :info="$t('score.ui.info.nutriscore')" :chart="charts.nutriscore" :sources="offSources" />
            <CategoryChart v-if="shows('nova')" id="section-nova" kind="nova" :title="$t('score.ui.processing')" :info="$t('score.ui.info.nova')" :chart="charts.nova" :sources="novaSources" />
            <section v-if="shows('additives')" id="section-additives" class="score__card">
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
            <details v-if="shows('nutrients')" id="section-nutrients" class="score__card">
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
          <section v-if="showsAny('environment')" class="score__pillar score__pillar--environment">
            <h2><v-icon icon="mdi-leaf" size="22" />{{ $t('score.ui.environment') }}</h2>
            <CategoryChart v-if="shows('greenScore')" id="section-greenScore" kind="greenScore" :title="$t('score.greenScore')" :info="$t('score.ui.info.greenScore')" :chart="charts.greenScore" :sources="greenSources" />
            <section v-if="shows('co2')" id="section-co2" class="score__card">
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
            <CategoryChart v-if="shows('forest')" id="section-forest" kind="forest" :title="$t('score.ui.forest')" :info="$t('score.ui.info.forest')" :chart="charts.forest" :sources="forestSources" />
          </section>
        </div>

        <details v-if="shows('labels')" id="section-labels" class="score__card score__section">
          <summary>{{ $t('score.ui.labels') }}</summary>
          <div class="score__card-heading score__spaced">
            <span class="score__muted">{{ coverage(labelsKnown) }}</span><InfoTip :title="$t('score.ui.labels')" :text="$t('score.ui.info.labels')" :sources="offSources" />
          </div>
          <details v-for="label in labelGroups" :key="label.key" class="score__nested">
            <summary>{{ $t(`score.${label.key}`) }} · {{ $t('score.ui.productsCount', label.items.length) }}</summary>
            <AnalysisProductList :products="label.items" />
          </details>
        </details>

        <section v-if="shows('checks') || shows('highlights')" class="score__section">
          <h2>{{ $t('score.ui.closerLook') }}</h2>
          <!-- Plain sentences about the basket, most important first (like Apple Health highlights) -->
          <ul v-if="shows('highlights') && insights.length" class="score__insights">
            <li v-for="insight in insights" :key="insight.key" class="score__card score__insight-item" :class="`score__insight--${insight.tone}`">
              <button type="button" class="score__insight" :aria-expanded="openInsight === insight.key" :aria-controls="`insight-${insight.key}`" @click="openInsight = openInsight === insight.key ? null : insight.key">
                <v-icon :icon="insight.icon" size="22" />
                <p>{{ insight.text }}</p>
                <v-icon icon="mdi-chevron-down" size="20" class="score__glance-chevron" />
              </button>
              <v-expand-transition>
                <div v-if="openInsight === insight.key" :id="`insight-${insight.key}`" class="score__insight-detail">
                  <ScoreBreakdown :items="insight.items" :note="insight.note" :color="insight.color" />
                </div>
              </v-expand-transition>
            </li>
          </ul>
          <details v-if="shows('checks')" class="score__card score__filters">
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
          <section v-if="shows('checks') && selectedAllergens.length" class="score__card score__section">
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

          <section v-if="shows('highlights')" class="score__card score__section">
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

        <details v-if="shows('products')" id="section-products" class="score__card score__section score__shopping">
          <summary class="score__shopping-summary">
            <span class="score__shopping-title">{{ $t('score.ui.shoppingSummary') }}</span>
            <span class="score__muted">{{ $t('score.ui.productsCount', products.length) }}</span>
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
import receiptHistoryDb from '@/services/receiptHistoryDb'
import ADDITIVES from '@/utils/additives.json'
import CategoryChart from '@/components/CategoryChart.vue'
import ScoreRings from '@/components/ScoreRings.vue'
import ScoreBreakdown from '@/components/ScoreBreakdown.vue'
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
// Sections the user can show or hide, by column
const VIEW_SECTIONS = [
  { key: 'health', sections: ['nutriscore', 'nova', 'additives', 'nutrients'] },
  { key: 'environment', sections: ['greenScore', 'co2', 'forest'] },
  { key: 'more', sections: ['labels', 'checks', 'highlights', 'products'] }
]
const SECTION_KEYS = VIEW_SECTIONS.flatMap(group => group.sections)
// Ready-made views, as the sections they hide. Every new receipt starts on 'essentials':
// no section that repeats a ring or an "At a glance" row (they stay one switch away).
const VIEW_VERSION = 3 // bump when the presets change, so old saved views are dropped
const PRESETS = {
  essentials: ['nutriscore', 'nova', 'greenScore', 'additives', 'nutrients', 'co2', 'labels'],
  health: ['greenScore', 'co2', 'forest', 'labels'],
  environment: ['nutriscore', 'nova', 'additives', 'nutrients', 'checks'],
  all: []
}
const PRESET_ICONS = { essentials: 'mdi-star-outline', health: 'mdi-heart-outline', environment: 'mdi-leaf', all: 'mdi-view-grid-outline' }
function preferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    return {
      allergens: Array.isArray(saved.allergens) ? saved.allergens.filter(a => ALLERGENS.includes(a)) : [],
      nutrients: Array.isArray(saved.nutrients) ? saved.nutrients.filter(n => ['sugars', 'salt', 'fat'].includes(n)) : [],
      sort: saved.sort in SORTS ? saved.sort : 'receipt',
      reverse: saved.reverse === true,
      // The custom view only applies to the receipt it was chosen for
      view: saved.view && saved.view.v === VIEW_VERSION && typeof saved.view.receipt === 'string' && Array.isArray(saved.view.hidden)
        ? { v: VIEW_VERSION, receipt: saved.view.receipt, hidden: saved.view.hidden.filter(key => SECTION_KEYS.includes(key)) }
        : null
    }
  } catch { return { allergens: [], nutrients: [], sort: 'receipt', reverse: false, view: null } }
}
export default {
  name: 'Score',
  components: { CategoryChart, ScoreRings, ScoreBreakdown, InfoTip, AnalysisProductList },
  data() {
    const prefs = preferences()
    return {
      fetched: {}, detailsStatus: 'idle', requestId: 0,
      storageError: false, initializing: true, previous: null, openGlance: null, openInsight: null, ringDetail: null,
      selectedAllergens: prefs.allergens, selectedNutrients: prefs.nutrients,
      productSort: prefs.sort, sortReverse: prefs.reverse,
      hiddenSections: [], savedView: prefs.view, viewSections: VIEW_SECTIONS, presetKeys: Object.keys(PRESETS), presetIcons: PRESET_ICONS, allSectionKeys: SECTION_KEYS, sortOptions: SORT_OPTIONS,
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
    // Receipt date as the line above the title, like the date above "Summary" in Apple Health
    receiptDate() {
      const date = new Date(`${this.receipt.date}T00:00:00`)
      return this.receipt.date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat(this.$i18n.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date) : null
    },
    // Key figures for the rows under the rings: value and unit apart, like Apple Health
    glance() {
      const grams = (value) => value === null ? { value: '—', unit: '' } : value >= 1000 ? { value: this.formatNumber(value / 1000, 2), unit: 'kg' } : { value: this.formatNumber(value, value < 10 ? 1 : 0), unit: 'g' }
      const count = (n, unit) => ({ value: this.formatNumber(n), unit: this.$t(`score.ui.glance.units.${unit}`, n) })
      // No product known for a row: show a dash, never a misleading 0
      const rows = [
        { key: 'spending', icon: 'mdi-cart-outline', color: '#007aff', target: 'products', known: this.pricedProducts.length, value: this.pricedProducts.length ? this.formatMoney(this.totalSpent) : '—', unit: '' },
        { key: 'weight', icon: 'mdi-weight', color: '#af52de', target: 'weight', known: this.weight.known, ...grams(this.weight.grams) },
        { key: 'sugars', icon: 'mdi-cube-outline', color: '#ff2d55', target: 'nutrients', known: this.nutrients.sugars.known, ...grams(this.nutrients.sugars.grams) },
        { key: 'salt', icon: 'mdi-shaker-outline', color: '#ff2d55', target: 'nutrients', known: this.nutrients.salt.known, ...grams(this.nutrients.salt.grams) },
        { key: 'fat', icon: 'mdi-water-outline', color: '#ff2d55', target: 'nutrients', known: this.nutrients.fat.known, ...grams(this.nutrients.fat.grams) },
        { key: 'additives', icon: 'mdi-flask-outline', color: '#ff9500', target: 'additives', known: this.additives.known, ...count(this.additives.list.length, 'additives') },
        { key: 'co2', icon: 'mdi-molecule-co2', color: '#248a3d', target: 'co2', known: this.carbon.known, value: this.carbon.kg === null ? '—' : this.formatNumber(this.carbon.kg, 2), unit: this.carbon.kg === null ? '' : 'kg CO₂e' },
        { key: 'organic', icon: 'mdi-sprout-outline', color: '#248a3d', target: 'labels', known: this.labelsKnown, ...count(this.labelGroups[0].items.length, 'products') }
      ]
      return rows.map(row => row.known ? row : { ...row, value: '—', unit: '' })
    },
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
        case 'fat': return { note: this.$t('score.ui.breakdown.nutrient', { total: this.formatGrams(this.nutrients[this.openGlance].grams) }), items: this.contributions(this.nutrients[this.openGlance].items), missing: total - this.nutrients[this.openGlance].known }
        case 'co2': return { note: this.$t('score.ui.breakdown.co2'), items: ranked(this.carbon.items, p => p.co2Kg, p => this.$t('score.co2Value', { kg: this.formatNumber(p.co2Kg, 2) })), missing: total - this.carbon.known }
        case 'organic': return { note: this.$t('score.ui.breakdown.organic'), items: this.labelGroups[0].items, missing: total - this.labelsKnown }
        default: return { items: [] }
      }
    },
    // Charts of the last saved receipt, for the trend under each ring
    previousCharts() {
      if (!this.previous) return null
      return Object.fromEntries(['nutriscore', 'nova', 'greenScore'].map(kind => [kind, distribution(this.previous.products, kind)]))
    },
    previousDate() {
      const date = new Date(`${this.previous?.date}T00:00:00`)
      return this.previous?.date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat(this.$i18n.locale, { day: 'numeric', month: 'short' }).format(date) : this.$t('score.ui.rings.lastReceipt')
    },
    // Up to 4 plain-language facts, only from data we have (never invented)
    insights() {
      const list = []
      const count = (filter) => this.products.filter(filter).length
      for (const allergen of this.selectedAllergens) {
        const n = this.allergenResults[allergen]?.contains.length || 0
        const name = this.$t(`score.ui.allergens.${allergen}`).toLowerCase()
        if (n) list.push({ key: `allergen-${allergen}`, tone: 'alert', color: '#d70015', icon: 'mdi-alert-octagon-outline', text: this.$t('score.ui.insights.allergen', { n, allergen: name }, n), note: this.$t('score.ui.insightsMore.allergen', { allergen: name }), items: this.allergenResults[allergen].contains })
      }
      const ultra = count(p => p.nova === '4')
      if (ultra) list.push({ key: 'ultra', tone: 'warning', color: '#ff9500', icon: 'mdi-factory', text: this.$t('score.ui.insights.ultraProcessed', { n: ultra }, ultra), note: this.$t('score.ui.insightsMore.ultra'), items: this.products.filter(p => p.nova === '4') })
      const sugar = this.nutrients.sugars
      const top = sugar.items[0]
      if (top && sugar.items.length > 1 && top.share >= 0.3) list.push({ key: 'sugar', tone: 'warning', color: '#ff2d55', icon: 'mdi-cube-outline', text: this.$t('score.ui.insights.sugarSource', { name: top.name, percent: this.formatPercent(top.share) }), note: this.$t('score.ui.insightsMore.sugar', { total: this.formatGrams(sugar.grams) }), items: this.contributions(sugar.items) })
      const poor = count(p => ['d', 'e'].includes(p.nutriscore))
      const graded = (grades) => this.products.filter(p => grades.includes(p.nutriscore)).map(p => ({ ...p, value: `${this.$t('score.nutriscore')} ${p.nutriscore.toUpperCase()} · ${this.$t(`score.meaning.nutriscore.${p.nutriscore}`)}` }))
      if (poor) list.push({ key: 'poor', tone: 'warning', color: '#ff9500', icon: 'mdi-heart-broken-outline', text: this.$t('score.ui.insights.poorNutriscore', { n: poor }, poor), note: this.$t('score.ui.insightsMore.poor'), items: graded(['d', 'e']) })
      const rated = this.charts.nutriscore.known
      const good = count(p => ['a', 'b'].includes(p.nutriscore))
      if (rated && good / rated >= 0.5) list.push({ key: 'good', tone: 'good', color: '#248a3d', icon: 'mdi-check-circle-outline', text: this.$t('score.ui.insights.goodNutriscore', { percent: this.formatPercent(good / rated) }), note: this.$t('score.ui.insightsMore.good'), items: graded(['a', 'b']) })
      return list.slice(0, 4)
    },
    ringTitles() { return { nutriscore: this.$t('score.nutriscore'), nova: this.$t('score.ui.processing'), greenScore: this.$t('score.greenScore') } },
    receiptKey() { return String(this.receipt.proofId || receiptSignature(this.receipt)) },
    currentPreset() {
      const hidden = [...this.hiddenSections].sort().join()
      return Object.keys(PRESETS).find(key => [...this.presetHidden(key)].sort().join() === hidden) || 'custom'
    },
    shownCount() { return SECTION_KEYS.length - this.hiddenSections.length },
    visiblePillars() { return ['health', 'environment'].filter(this.showsAny).length },
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
    sortReverse: 'savePreferences',
    hiddenSections: { handler: 'saveView', deep: true },
    // A new receipt starts again on the essentials; the same receipt keeps its custom view
    receiptKey: {
      immediate: true,
      handler(key) {
        this.hiddenSections = this.savedView?.receipt === key ? this.savedView.hidden : this.presetHidden('essentials')
        this.loadPrevious()
      }
    }
  },
  mounted() {
    if (this.$route.query.mock === '1' || !this.items.length) this.appStore.loadMockReceipt()
    this.initializing = false
    this.loadDetails()
  },
  unmounted() { this.requestId += 1 },
  methods: {
    // Most recent other scored receipt in the history, if any
    loadPrevious() {
      const { historyId, proofId } = this.receipt
      receiptHistoryDb.list()
        .then(rows => {
          const row = rows.find(r => r.status === 'scored' && r.id !== historyId && !(proofId && r.proofId === proofId))
          return row ? receiptHistoryDb.get(row.id) : null
        })
        .then(record => { this.previous = record?.analysisSnapshot ? { date: record.date, products: record.analysisSnapshot.products } : null })
        .catch(() => { this.previous = null })
    },
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
    shows(key) { return !this.hiddenSections.includes(key) },
    showsAny(group) { return VIEW_SECTIONS.find(g => g.key === group).sections.some(this.shows) },
    // Allergen checks stay visible in every view once the user has chosen allergens
    presetHidden(preset) { return PRESETS[preset].filter(key => !(key === 'checks' && this.selectedAllergens.length)) },
    // "See details" on a ring: show that chart if it is hidden, then scroll to it
    // Nutrient contributors as breakdown rows: grams brought and share of the basket total
    contributions(items) { return items.map(p => ({ ...p, value: this.$t('score.ui.contribution', { grams: this.formatGrams(p.contribution), percent: this.formatPercent(p.share) }) })) },
    applyPreset(preset) { this.hiddenSections = this.presetHidden(preset) },
    toggleSection(key) {
      this.hiddenSections = this.shows(key) ? [...this.hiddenSections, key] : this.hiddenSections.filter(k => k !== key)
    },
    saveView() {
      this.savedView = { v: VIEW_VERSION, receipt: this.receiptKey, hidden: this.hiddenSections }
      this.savePreferences()
    },
    savePreferences() { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ allergens: this.selectedAllergens, nutrients: this.selectedNutrients, sort: this.productSort, reverse: this.sortReverse, view: this.savedView })) } catch { /* Browsing with storage disabled still supports session filters. */ } },
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
.score { min-height: 100dvh; padding: 1.5rem; color: #000000; background: #f2f2f7; }

.score__content { width: min(68rem, 100%); margin: auto; }
.score__header, .score__heading, .score__card-heading, .score__actions { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
.score__header { flex-wrap: wrap; margin-bottom: 2rem; }
.score__brand { font: 700 1.35rem inherit; }
h1, h2 { font-family: inherit; }
h1 { font-size: clamp(1.9rem, 5vw, 2.8rem); margin: 0.3rem 0 1rem; line-height: 1.15; }
h2 { display: flex; align-items: center; gap: 0.6rem; font-size: 1.5rem; margin: 0 0 0.5rem; }
h3 { font-size: 1rem; font-weight: 600; }
.score__eyebrow { font-size: 0.7rem; color: #6e6e73; letter-spacing: 0.12em; text-transform: uppercase; }
.score__alert { margin-bottom: 1rem; }
.score__pillars { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; }
.score__pillars--single { grid-template-columns: 1fr; }
.score__view { margin-bottom: 1.5rem; }
.score__view-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.score__view-current { padding: 0.1rem 0.6rem; border: 1px solid #007aff; border-radius: 1rem; color: #007aff; font-size: 0.75rem; }
.score__view-summary .score__muted { margin-left: auto; font-weight: 400; }
.score__view-presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: 0.6rem; margin-top: 0.85rem; }
.score__view-preset { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.7rem 0.8rem; border: 1px solid #00000014; border-radius: 0.75rem; text-align: left; transition: background 0.15s ease, border-color 0.15s ease; }
.score__view-preset:hover { background: #00000008; }
.score__view-preset[aria-pressed="true"] { background: #007aff1f; border-color: #007aff; }
.score__view-preset span, .score__view-label { display: flex; flex-direction: column; gap: 0.15rem; }
.score__view-preset small, .score__view-label small { color: #6e6e73; font-size: 0.75rem; font-weight: 400; line-height: 1.3; }
.score__view-preset strong, .score__view-label strong { font-size: 0.9rem; font-weight: 600; }
.score__view-group { margin-top: 1.25rem; }
.score__view-group h3 { font-size: 0.75rem; color: #6e6e73; text-transform: uppercase; letter-spacing: 0.08em; }
.score__view-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: 0.25rem 1rem; margin: 0.35rem 0 0; padding: 0; list-style: none; }
.score__view-list :deep(.v-label) { opacity: 1; padding-left: 0.5rem; }
.score__pillar { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
.score__card { padding: 1.25rem; border: 1px solid #0000000a; border-radius: 1.25rem; background: #00000005; }
.score__card-heading { margin-bottom: 0.5rem; }
.score__stat { font: 700 clamp(1.3rem, 3vw, 1.85rem) inherit; margin: 0.5rem 0; }
.score__coverage, .score__muted, .score__status, .score__product-meta { font-size: 0.8rem; color: #6e6e73; }
.score__coverage { margin: 0.45rem 0; }
.score__status { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; }
.score__status button { text-decoration: underline; }
.score__estimate { font-size: 0.75rem; border: 1px solid #e5e5ea; padding: 0.15rem 0.45rem; border-radius: 1rem; color: #6e6e73; }
.score__section { margin-top: 1.25rem; }
.score__section > h2 { margin-bottom: 0.85rem; }
summary { cursor: pointer; font-weight: 600; }
summary:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid #007aff; outline-offset: 3px; }
.score__card > details { margin-top: 0.85rem; font-size: 0.85rem; }
.score__nested { padding: 0.65rem 0; border-bottom: 1px solid #e5e5ea; }
.score__nested:last-child { border-bottom: 0; }
.score__metric-summary { display: flex; align-items: center; gap: 0.6rem; }
.score__metric-summary > strong { margin-left: auto; }
.score__metric-summary::before { content: '+'; color: #6e6e73; }
details[open] > .score__metric-summary::before { content: '−'; }
.score__spaced { margin-top: 1rem; }
.score__heading-tools { display: flex; align-items: center; gap: 0.75rem; margin-left: auto; flex-shrink: 0; }
.score__shopping-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem 1.5rem; list-style: none; }
.score__shopping-summary::-webkit-details-marker { display: none; }
.score__shopping-title { font-family: inherit; font-size: 1.15rem; }
.score__shopping-total { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; }
.score__shopping-total strong { font-size: 1.1rem; }
.score__shopping-toggle { display: inline-flex; align-items: center; gap: 0.35rem; margin-left: auto; color: #007aff; font-size: 0.85rem; }
.score__hide-products { display: none; }
.score__shopping[open] .score__show-products { display: none; }
.score__shopping[open] .score__hide-products { display: inline; }
.score__shopping[open] .score__shopping-toggle .v-icon { transform: rotate(180deg); }
.score__list-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-top: 1.25rem; }
.score__spending-coverage { display: flex; align-items: center; gap: 0.5rem; }
.score__sort { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; width: min(100%, 28rem); }
.score__sort > .v-select { min-width: 13rem; flex: 1; }
.score__sort-order { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.6rem; border: 1px solid #e5e5ea; border-radius: 0.5rem; color: #007aff; font-size: 0.75rem; }
.score__sort-order:hover { background: #007aff14; }
.score__product-grades { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.35rem 0.75rem; }
.score__product-grades .score__product-grade { display: flex; align-items: center; gap: 0.4rem; }
.score__product-grades strong { color: #000000; }
.score__shopping .score__product-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; margin: 0; }
.score__shopping .score__product-meta strong { color: #000000; font-size: 0.9rem; }
.score__contribution { display: grid; grid-template-columns: minmax(3rem, 6rem) 1fr; align-items: center; gap: 0.6rem; }
.score__contribution-bar { height: 0.4rem; border-radius: 1rem; background: #e5e5ea; overflow: hidden; }
.score__contribution-bar span { display: block; height: 100%; background: #007aff; }
.score__choices { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
.score__choices label { display: flex; align-items: center; gap: 0.45rem; padding: 0.4rem 0.65rem; font-size: 0.85rem; border: 1px solid #00000014; border-radius: 1rem; cursor: pointer; }
.score__choices label:has(input:checked) { background: #007aff26; border-color: #007aff; }
input { accent-color: #92c76d; }
.score__reasons { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.5rem; }
.score__reason { background: #ee81002b; color: #ffe0b4; border: 1px solid #ee810052; border-radius: 1rem; font-size: 0.75rem; padding: 0.2rem 0.55rem; }
.score__product-grade { color: #6e6e73; font-size: 0.75rem; padding-right: 0.6rem; }
.score__product-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.35rem; }
.score__actions { flex-wrap: wrap; margin-top: 2rem; }
.score__state { text-align: center; padding: 3rem; }
/* Apple Health-like theme: black background, grey cards without borders, system font,
   one accent color per category (pink health, green planet, blue actions) */
.score { --card: #ffffff; --card-raised: #f2f2f7; --separator: #e5e5ea; --muted: #6e6e73; --blue: #007aff; --pink: #ff2d55; --green: #248a3d; --orange: #ff9500;
  background: #f2f2f7; color: #000; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }
.score__brand { font-size: 1rem; font-weight: 600; color: var(--muted); }
h1 { font-size: clamp(2rem, 5vw, 2.6rem); font-weight: 700; letter-spacing: -0.02em; }
h2 { font-size: 1.35rem; font-weight: 700; letter-spacing: -0.01em; }
h3 { font-size: 0.95rem; font-weight: 600; }
.score__eyebrow { color: var(--muted); font-weight: 600; letter-spacing: 0.04em; }
.score__card { padding: 1rem 1.1rem; border: 0; border-radius: 14px; background: var(--card); }
.score__pillars { gap: 1.25rem; }
.score__pillar { gap: 0.75rem; }
.score__pillar--health > h2, .score__pillar--health h3, .score__pillar--health :deep(.category-chart h3) { color: var(--pink); }
.score__pillar--environment > h2, .score__pillar--environment h3, .score__pillar--environment :deep(.category-chart h3) { color: var(--green); }
.score__stat { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; letter-spacing: -0.01em; }
.score__coverage, .score__muted, .score__status, .score__product-meta { color: var(--muted); }
.score__estimate { border: 0; background: var(--card-raised); color: var(--muted); }
.score__reason { border: 0; background: #ff950026; color: #c93400; }
.score__shopping-title { font-weight: 700; }
.score__view-current { border: 0; background: #007aff1f; color: var(--blue); }
.score__view-preset { border: 0; background: var(--card-raised); }
.score__view-preset[aria-pressed="true"] { background: #007aff1f; box-shadow: inset 0 0 0 1.5px var(--blue); }
.score__choices label { border: 0; background: var(--card-raised); }
.score__choices label:has(input:checked) { background: #007aff26; box-shadow: inset 0 0 0 1.5px var(--blue); }
.score__contribution-bar span { background: var(--pink); }
.score__sort-order { border: 0; background: var(--card-raised); }
.score__glance { margin: 0 0 1.5rem; }
.score__glance > h2 { margin-bottom: 0.75rem; }
.score__glance-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); gap: 0.6rem; }
.score__glance-row { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.85rem 1rem; border-radius: 14px; background: var(--card); color: inherit; text-align: left; font: inherit; }
button.score__glance-row { cursor: pointer; transition: background 0.15s ease; }
button.score__glance-row:hover { background: #fafafa; }
.score__glance-head { display: flex; align-items: center; gap: 0.4rem; min-height: 1.5rem; }
.score__glance-head > .v-icon:first-child, .score__glance-label { color: var(--accent); }
.score__glance-label { font-size: 0.95rem; font-weight: 600; }
.score__glance-meta { margin-left: auto; color: var(--muted); font-size: 0.8rem; }
.score__glance-chevron { color: #c7c7cc; margin-right: -0.3rem; }
.score__glance-value { display: flex; align-items: baseline; gap: 0.3rem; }
.score__glance-value strong { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
.score__glance-value span { color: var(--muted); font-size: 0.95rem; font-weight: 600; }
.score__glance-grid { grid-auto-flow: row dense; }
.score__glance-row--open { box-shadow: inset 0 0 0 2px var(--accent); }
.score__glance-chevron { transition: transform 0.2s ease; }
.score__glance-row--open .score__glance-chevron, .score__insight[aria-expanded="true"] .score__glance-chevron { transform: rotate(180deg); }
.score__glance-detail { grid-column: 1 / -1; padding: 0.85rem 1rem 1rem; border-radius: 14px; background: var(--card); }
.score__ring-detail { max-width: 34rem; margin: -1rem auto 2rem; }
.score__insight-item { padding: 0; }
.score__insight { display: flex; align-items: center; gap: 0.85rem; width: 100%; min-height: 2.75rem; padding: 1rem 1.1rem; color: inherit; text-align: left; font: inherit; cursor: pointer; }
.score__insight .score__glance-chevron { margin-left: auto; flex: none; }
.score__insight-detail { padding: 0 1.1rem 1rem 3.2rem; }
.score__insights { display: grid; gap: 0.6rem; margin: 0 0 1rem; padding: 0; list-style: none; }
.score__insight p { margin: 0; font-size: 0.95rem; font-weight: 500; line-height: 1.35; }
.score__insight--alert .v-icon { color: #d70015; }
.score__insight--warning .v-icon { color: var(--orange); }
.score__insight--good .v-icon { color: var(--green); }
/* Expandable rows end with a chevron, like the disclosure rows of iOS */
.score details > summary { display: flex; align-items: center; gap: 0.5rem; min-height: 2.75rem; list-style: none; }
.score details > summary::-webkit-details-marker { display: none; }
.score details > summary:not(.score__metric-summary):not(.score__shopping-summary)::after { content: ''; flex: none; width: 0.5rem; height: 0.5rem; margin-left: auto; border-right: 2px solid var(--muted); border-bottom: 2px solid var(--muted); transform: rotate(-45deg); transition: transform 0.2s ease; }
.score details[open] > summary:not(.score__metric-summary):not(.score__shopping-summary)::after { transform: rotate(45deg); }
.score__view-summary .score__muted { margin-left: auto; }
.score__view-summary::after { margin-left: 0.75rem !important; }
@media (prefers-reduced-motion: reduce) { .score * { transition: none !important; } }
input { accent-color: var(--blue); }
@media (max-width: 760px) { .score__heading { flex-wrap: wrap; } .score__heading-tools { margin-bottom: 1rem; }
.score__shopping-summary { gap: 0.5rem 1rem; } .score__shopping-title { flex-basis: 100%; }
.score__list-toolbar { align-items: stretch; } .score__sort { width: 100%; }
.score__shopping .score__product-meta { flex-direction: row; justify-content: flex-start; flex-wrap: wrap; gap: 0.5rem; } .score { padding: 1rem; }
.score__pillars { grid-template-columns: 1fr; gap: 1.5rem; } }
</style>
