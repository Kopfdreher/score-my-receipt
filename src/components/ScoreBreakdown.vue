<template>
  <div class="score-breakdown">
    <p v-if="note" class="score-breakdown__note">
      {{ note }}
    </p>
    <AnalysisProductList v-if="items.length" :products="items">
      <template #default="{ product }">
        <div v-if="product.value || product.share != null" class="score-breakdown__value" :class="{ 'score-breakdown__value--no-share': product.share == null }">
          <span v-if="product.share != null" class="score-breakdown__bar"><span :style="{ width: `${product.share * 100}%`, background: color }" /></span>
          <div class="score-breakdown__figures">
            <span>{{ product.value }}</span>
            <span v-if="product.per100Value" class="score-breakdown__per100">{{ product.per100Value }}</span>
          </div>
        </div>
      </template>
    </AnalysisProductList>
    <p v-else class="score-breakdown__note">
      {{ $t('score.ui.breakdown.none') }}
    </p>
    <p v-if="missing" class="score-breakdown__missing">
      {{ $t('score.ui.breakdown.missing', { n: missing }, missing) }}
    </p>
  </div>
</template>

<script>
import AnalysisProductList from './AnalysisProductList.vue'

// The details that unfold in place under a figure or a highlight:
// a short explanation, then each product with its value (and its share as a bar)
export default {
  name: 'ScoreBreakdown',
  components: { AnalysisProductList },
  props: {
    // products from analyseProducts, each with an optional `value` (text) and `share` (0 to 1)
    items: { type: Array, required: true },
    note: { type: String, default: '' },
    // number of products for which this figure is unknown
    missing: { type: Number, default: 0 },
    color: { type: String, default: '#245b3f' }
  }
}
</script>

<style scoped>
.score-breakdown { padding: 0.25rem 0 0; }
.score-breakdown__note { margin: 0 0 0.25rem; color: var(--score-ink, #17382a); font-size: 0.9rem; line-height: 1.4; }
.score-breakdown__value { display: grid; grid-template-columns: minmax(3rem, 7rem) auto; align-items: center; gap: 0.6rem; margin-top: 0.3rem; color: var(--score-muted, #52605a); font-size: 0.85rem; }
.score-breakdown__figures { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; }
.score-breakdown__value--no-share { grid-template-columns: 1fr; }
.score-breakdown__per100 { font-weight: 500; }
.score-breakdown__bar { height: 0.4rem; border-radius: 1rem; background: var(--score-rule, #d8dedb); overflow: hidden; }
.score-breakdown__bar span { display: block; height: 100%; }
.score-breakdown__missing { margin: 0.5rem 0 0; color: var(--score-muted, #52605a); font-size: 0.8rem; }
</style>
