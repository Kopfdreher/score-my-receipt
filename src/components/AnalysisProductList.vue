<template>
  <ul class="product-list" :class="{ 'product-list--horizontal': horizontal }">
    <li v-for="product in products" :key="product.id">
      <div class="product-list__identity">
        <div class="product-list__name">
          <template v-for="(name, index) in product.names" :key="`${name}-${index}`">
            <span v-if="index" aria-hidden="true"> / </span>
            <a v-if="urlFor(product, index)" :href="urlFor(product, index)" target="_blank" rel="noopener noreferrer">{{ name }} ↗</a>
            <span v-else>{{ name }}</span>
          </template>
          <span v-if="product.estimated" class="product-list__estimate">{{ $t('score.ui.estimated') }}</span>
          <InfoTip v-if="product.estimated" :title="$t('score.ui.estimated')" :text="(product.categoryEstimate ? $t('score.ui.categoryEstimateInfo', { ingredient: product.categoryEstimate.ingredient }) + ' ' : '') + $t('score.ui.referenceInfo', { name: product.referenceName })" :sources="product.sourceLinks" />
        </div>
        <p v-if="showReceiptNames && product.receiptNames?.some(name => !product.names.includes(name))" class="product-list__unknown">
          {{ product.receiptNames.join(' / ') }}
        </p>
        <span v-if="!product.sourceUrl" class="product-list__unknown">{{ $t('score.ui.noSource') }}</span>
      </div>
      <slot :product="product" />
    </li>
  </ul>
</template>
<script>
import InfoTip from './InfoTip.vue'
export default {
  name: 'AnalysisProductList',
  components: { InfoTip },
  props: { products: { type: Array, required: true }, showReceiptNames: Boolean, horizontal: Boolean },
  methods: {
    urlFor(product, index) {
      if (product.barcode || !product.categoryTags[index]) return product.sourceUrl
      return `https://world.openfoodfacts.org/category/${encodeURIComponent(product.categoryTags[index])}`
    }
  }
}
</script>
<style scoped>
.product-list { list-style: none; padding: 0; margin: 0.5rem 0 0; }
.product-list li { padding: 0.65rem 0; border-bottom: 1px solid var(--score-rule, #d8ded2); }
.product-list li:last-child { border-bottom: 0; }
.product-list__name { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; font-size: 0.9rem; }
.product-list__identity { min-width: 0; overflow-wrap: anywhere; }
.product-list__identity p { margin: 0.25rem 0 0; }
.product-list--horizontal li { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.5fr) minmax(7rem, 0.65fr); align-items: center; gap: 1.25rem; padding: 1rem 0; }
@media (max-width: 960px) { .product-list--horizontal li { grid-template-columns: minmax(0, 1fr) auto; gap: 0.75rem; } .product-list--horizontal .product-list__identity, .product-list--horizontal li > :nth-child(2) { grid-column: 1 / -1; } .product-list--horizontal li > :last-child { grid-column: 1 / -1; justify-self: stretch; } }
a { color: inherit; text-underline-offset: 3px; text-decoration-color: currentColor; }
a:hover { color: var(--score-accent, #245b3f); }
a:focus-visible { outline: 3px solid var(--score-focus, #174f78); outline-offset: 3px; }
.product-list__estimate, .product-list__unknown { color: var(--score-muted, #526156); font-size: 0.75rem; }
.product-list__estimate { border: 1px solid #71836f; border-radius: 1rem; padding: 0.1rem 0.4rem; }
</style>
