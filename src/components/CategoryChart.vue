<template>
  <section class="category-chart">
    <header>
      <h3>{{ title }}</h3>
      <InfoTip :title="title" :text="info" :sources="sources" />
    </header>
    <div class="category-chart__overview">
      <!-- Hover (mouse), tap (touch) or Tab (keyboard) on a part of the donut opens its info bubble -->
      <div class="category-chart__donut-wrap" @pointerleave="onPointerLeave">
        <svg viewBox="0 0 42 42" class="category-chart__donut" role="group" :aria-label="description">
          <circle cx="21" cy="21" :r="radius" fill="none" stroke="#38383a" stroke-width="6" />
          <circle v-for="arc in arcs" :key="arc.key" class="category-chart__arc" :class="{ 'category-chart__arc--dim': hovered !== null && hovered !== arc.key }" cx="21" cy="21" :r="radius" fill="none" :stroke="arc.color" :stroke-width="hovered === arc.key ? 8 : 6" :stroke-dasharray="arc.dash" :stroke-dashoffset="arc.offset" tabindex="0" role="button" :aria-label="segmentDescription(arc)" @pointerenter="onPointerEnter($event, arc.key)" @focus="onFocus($event, arc.key)" @blur="hovered = null" @click="onArcClick($event, arc.key)" />
          <template v-if="hoveredSegment">
            <text x="21" y="22" text-anchor="middle" class="category-chart__number">{{ hoveredSegment.label || '?' }}</text>
            <text x="21" y="27.5" text-anchor="middle" class="category-chart__unit">{{ formatPercent(hoveredSegment.share) }}</text>
          </template>
          <text v-else x="21" y="24.2" text-anchor="middle" class="category-chart__number">{{ chart.known }}</text>
        </svg>
        <div v-if="hoveredSegment" class="category-chart__tooltip" role="status">
          <div class="category-chart__tooltip-head">
            <span class="category-chart__grade" :style="gradeStyle(hoveredSegment)">{{ hoveredSegment.label || '?' }}</span>
            <span>{{ meaning(hoveredSegment) }}</span>
          </div>
          <p class="category-chart__tooltip-value">
            {{ $t('score.ui.productsCount', hoveredSegment.count) }} · {{ formatPercent(hoveredSegment.share) }}
          </p>
          <ul class="category-chart__tooltip-list">
            <li v-for="product in hoveredSegment.items" :key="product.id">
              {{ product.quantity > 1 ? `${product.name} ×${product.quantity}` : product.name }}
            </li>
          </ul>
        </div>
      </div>
      <div class="category-chart__counts">
        <button v-for="segment in chart.segments" :key="segment.key" type="button" :class="{ 'category-chart__count--dim': hovered !== null && hovered !== segment.key }" :disabled="!segment.count" :aria-expanded="selected === segment.key" :aria-label="segmentDescription(segment)" @mouseenter="hovered = segment.count ? segment.key : null" @mouseleave="hovered = null" @click="select(segment.key)">
          <span class="category-chart__grade" :style="gradeStyle(segment)">{{ segment.label || '?' }}</span>
          <strong>{{ segment.count }}</strong>
        </button>
      </div>
    </div>
    <p class="category-chart__coverage">
      {{ $t('score.ui.coverage', { known: chart.known, total: chart.total }) }}
    </p>
    <details :open="expanded || selected !== null" class="category-chart__details" @toggle="onToggle">
      <summary>{{ $t('score.ui.productsByGrade') }}</summary>
      <div v-for="segment in chart.segments" :key="segment.key" class="category-chart__group">
        <button type="button" :disabled="!segment.count" :aria-expanded="selected === segment.key" @click="select(segment.key)">
          <span>{{ segment.label || $t('score.unknown') }}</span>
          <span class="category-chart__bar"><span :style="{ width: `${segment.share * 100}%`, background: segment.color }" /></span>
          <span>{{ segment.count }}</span>
          <span aria-hidden="true">{{ selected === segment.key ? '−' : '+' }}</span>
        </button>
        <template v-if="selected === segment.key">
          <p class="category-chart__meaning">
            {{ meaning(segment) }}
          </p>
          <AnalysisProductList :products="segment.items" />
        </template>
      </div>
    </details>
  </section>
</template>
<script>
import InfoTip from './InfoTip.vue'
import AnalysisProductList from './AnalysisProductList.vue'
export default {
  name: 'CategoryChart',
  components: { InfoTip, AnalysisProductList },
  props: {
    kind: { type: String, required: true }, title: { type: String, required: true },
    info: { type: String, required: true }, chart: { type: Object, required: true },
    sources: { type: Array, default: () => [] },
    // start with the products by grade unfolded (when opened from a ring)
    openDetails: { type: Boolean, default: false }
  },
  data() { return { radius: 15.9155, selected: null, hovered: null, expanded: this.openDetails } },
  computed: {
    arcs() {
      let offset = 25
      return this.chart.segments.filter((s) => s.count).map((s) => {
        const length = s.share * 100
        const arc = { ...s, dash: `${length} ${100 - length}`, offset }
        offset -= length
        return arc
      })
    },
    description() { return this.chart.segments.map(this.segmentDescription).join('; ') },
    hoveredSegment() { return this.chart.segments.find((s) => s.key === this.hovered && s.count) || null }
  },
  methods: {
    select(key) { this.selected = this.selected === key ? null : key },
    // Mouse: hovering shows the bubble. Touch: handled by the tap (onArcClick).
    onPointerEnter(event, key) { if (event.pointerType === 'mouse') this.hovered = key },
    onPointerLeave(event) { if (event.pointerType === 'mouse') this.hovered = null },
    // Keyboard (Tab) only: a tap also focuses the arc, and the tap is handled by onArcClick
    onFocus(event, key) { if (event.target.matches(':focus-visible')) this.hovered = key },
    // Tap (or Enter): open this part's bubble, or close it if it is already open
    onArcClick(event, key) { this.hovered = event.pointerType === 'mouse' || this.hovered !== key ? key : null },
    gradeStyle(segment) { return { background: segment.color, color: ['b', 'c', '2'].includes(segment.key) ? '#102b20' : '#fff' } },
    formatPercent(value) { return new Intl.NumberFormat(this.$i18n.locale, { style: 'percent', maximumFractionDigits: 0 }).format(value) },
    onToggle(event) {
      this.expanded = event.target.open
      if (!event.target.open) this.selected = null
    },
    meaning(segment) {
      if (segment.key === 'unknown') return this.$t('score.meaning.unknown')
      return this.$t(`score.meaning.${this.kind}.${segment.key === 'a-plus' ? 'aPlus' : segment.key}`)
    },
    segmentDescription(segment) { return `${this.title}: ${this.meaning(segment)}, ${this.$t('score.ui.productsCount', segment.count)}` }
  }
}
</script>
<style scoped>
.category-chart { padding: 1rem 1.1rem; border-radius: 14px; background: #ffffff; scroll-margin-top: 1rem; }
header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
h3 { font-size: 1rem; font-weight: 600; margin: 0; }
.category-chart__overview { display: flex; align-items: center; gap: 1rem; margin-top: 0.75rem; }
.category-chart__donut { width: 7.5rem; height: 7.5rem; flex: none; }
.category-chart__donut-wrap { position: relative; flex: none; }
.category-chart__arc { cursor: pointer; outline: none; transition: stroke-width 0.15s ease, opacity 0.15s ease; }
.category-chart__arc--dim, .category-chart__count--dim { opacity: 0.35; }
.category-chart__tooltip { position: absolute; top: calc(100% + 0.5rem); left: 0; z-index: 5; width: max-content; max-width: 15rem; padding: 0.65rem 0.75rem; border: 0; border-radius: 12px; background: #ffffff; box-shadow: 0 8px 24px #0000002e; font-size: 0.8rem; }
.category-chart__tooltip-head { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
.category-chart__tooltip-value { color: #6e6e73; margin: 0.35rem 0 0.25rem; }
.category-chart__tooltip-list { margin: 0; padding-left: 1rem; }
.category-chart__number { fill: currentColor; font: 700 9px -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
.category-chart__unit { fill: #6e6e73; font-size: 3px; }
.category-chart__counts { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.category-chart__counts button { display: flex; flex-direction: column; gap: 0.35rem; align-items: center; padding: 0.25rem; border-radius: 0.4rem; }
.category-chart__grade { min-width: 1.8rem; padding: 0.25rem; border-radius: 0.3rem; font-size: 0.75rem; font-weight: 700; }
button { color: inherit; cursor: pointer; }
button:disabled { opacity: 0.4; cursor: default; }
button:focus-visible, summary:focus-visible { outline: 2px solid #007aff; outline-offset: 3px; }
button[aria-expanded="true"] { background: #e5e5ea; }
.category-chart__coverage, .category-chart__meaning { color: #6e6e73; font-size: 0.8rem; margin: 0.5rem 0; }
.category-chart__details { margin-top: 0.85rem; font-size: 0.85rem; }
summary { display: flex; align-items: center; min-height: 2.75rem; cursor: pointer; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary::after { content: ''; width: 0.5rem; height: 0.5rem; margin-left: auto; border-right: 2px solid #6e6e73; border-bottom: 2px solid #6e6e73; transform: rotate(-45deg); transition: transform 0.2s ease; }
details[open] > summary::after { transform: rotate(45deg); }
@media (prefers-reduced-motion: reduce) { .category-chart * { transition: none !important; } }
.category-chart__group > button { display: grid; width: 100%; grid-template-columns: 4rem 1fr 1.5rem 1rem; align-items: center; gap: 0.5rem; padding: 0.6rem 0; text-align: left; }
.category-chart__bar { height: 0.4rem; border-radius: 1rem; background: #e5e5ea; overflow: hidden; }
.category-chart__bar span { display: block; height: 100%; }
@media (max-width: 420px) { .category-chart__overview { gap: 0.5rem; } .category-chart__donut { width: 6rem; height: 6rem; } }
</style>
