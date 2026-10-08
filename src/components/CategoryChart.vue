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
          <circle cx="21" cy="21" :r="radius" fill="none" stroke="var(--score-rule, #d8dedb)" stroke-width="6" />
          <circle v-for="arc in arcs" :key="arc.key" class="category-chart__arc" :class="{ 'category-chart__arc--dim': hovered !== null && hovered !== arc.key }" cx="21" cy="21" :r="radius" fill="none" :stroke="arc.color" :stroke-width="hovered === arc.key ? 8 : 6" :stroke-dasharray="arc.dash" :stroke-dashoffset="arc.offset" tabindex="0" role="button" :aria-label="segmentDescription(arc)" @pointerenter="onPointerEnter($event, arc.key)" @focus="onFocus($event, arc.key)" @blur="hovered = null" @click="onArcClick($event, arc.key)" @keydown.enter.prevent="select(arc.key)" @keydown.space.prevent="select(arc.key)" />
          <template v-if="hoveredSegment">
            <text x="21" y="22" text-anchor="middle" class="category-chart__number">{{ hoveredSegment.key === 'not-applicable' ? $t('score.ui.notApplicableShort') : hoveredSegment.label || '?' }}</text>
            <text x="21" y="27.5" text-anchor="middle" class="category-chart__unit">{{ formatPercent(hoveredSegment.share) }}</text>
          </template>
          <text v-else x="21" y="24.2" text-anchor="middle" class="category-chart__number">{{ chart.known }}</text>
        </svg>
        <div v-if="hoveredSegment" class="category-chart__tooltip" role="status">
          <div class="category-chart__tooltip-head">
            <span class="category-chart__grade" :style="gradeStyle(hoveredSegment)">{{ hoveredSegment.key === 'not-applicable' ? $t('score.ui.notApplicableShort') : hoveredSegment.label || '?' }}</span>
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
      <div class="category-chart__counts category-chart__counts--percent">
        <button v-for="segment in legendSegments" :key="segment.key" type="button" :class="{ 'category-chart__count--dim': hovered !== null && hovered !== segment.key }" :disabled="!segment.count" :aria-expanded="selected === segment.key" :aria-label="segmentDescription(segment)" @mouseenter="hovered = segment.count ? segment.key : null" @mouseleave="hovered = null" @click="select(segment.key)">
          <span class="category-chart__legend-heading">
            <span class="category-chart__dot" :style="{ background: segment.color }" aria-hidden="true" />
            <span class="category-chart__legend-label">{{ segment.key === 'not-applicable' ? $t('score.ui.notApplicable') : segment.label || $t('score.unknown') }}</span>
          </span>
          <strong class="category-chart__legend-percent">{{ formatPercent(segment.share) }}</strong>
          <span class="category-chart__product-count">{{ $t('score.ui.productsCount', segment.count) }}</span>
        </button>
      </div>
    </div>
    <p class="category-chart__coverage">
      {{ $t('score.ui.coverage', { known: chart.known, total: chart.total }) }}
    </p>
    <details :open="detailsOpen" class="category-chart__details" @toggle="onToggle">
      <summary>{{ $t('score.ui.productsByGrade') }}</summary>
      <div v-for="segment in legendSegments" :key="segment.key" class="category-chart__group" :class="{ 'category-chart__group--selected': selected === segment.key }">
        <div class="category-chart__group-info">
          <div class="category-chart__group-heading">
            <span class="category-chart__legend-heading">
              <span class="category-chart__dot" :style="{ background: segment.color }" aria-hidden="true" />
              <strong>{{ segment.key === 'not-applicable' ? $t('score.ui.notApplicable') : segment.label || $t('score.unknown') }}</strong>
              <span v-if="kind === 'nova' && segment.key !== 'unknown'" class="category-chart__nova-description">— {{ meaning(segment) }}</span>
            </span>
            <span>{{ formatPercent(segment.share) }} · {{ $t('score.ui.productsCount', segment.count) }}</span>
          </div>
          <span class="category-chart__bar" aria-hidden="true"><span :style="{ width: `${segment.share * 100}%`, background: segment.color }" /></span>
          <p v-if="kind !== 'nova' || segment.key === 'unknown'" class="category-chart__meaning">
            {{ meaning(segment) }}
          </p>
        </div>
        <AnalysisProductList :products="segment.items" />
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
    openDetails: Boolean
  },
  data() { return { radius: 15.9155, selected: null, hovered: null, detailsOpen: false } },
  computed: {
    legendSegments() { return this.chart.segments.filter(segment => segment.count > 0) },
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
  mounted() { this.detailsOpen = this.openDetails },
  methods: {
    select(key) {
      this.detailsOpen = !(this.detailsOpen && this.selected === key)
      this.selected = this.detailsOpen ? key : null
    },
    // Mouse: hovering shows the bubble. Touch: handled by the tap (onArcClick).
    onPointerEnter(event, key) { if (event.pointerType === 'mouse') this.hovered = key },
    onPointerLeave(event) { if (event.pointerType === 'mouse') this.hovered = null },
    // Keyboard (Tab) only: a tap also focuses the arc, and the tap is handled by onArcClick
    onFocus(event, key) { if (event.target.matches(':focus-visible')) this.hovered = key },
    // Tap (or Enter): open this part's bubble, or close it if it is already open
    onArcClick(event, key) { this.hovered = event.pointerType === 'mouse' || this.hovered !== key ? key : null },
    gradeStyle(segment) {
      const channels = segment.color.slice(1).match(/../g).map(hex => {
        const value = parseInt(hex, 16) / 255
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      })
      const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
      // Choose the higher-contrast label against each published grade colour.
      return { background: segment.color, color: luminance > 0.179 ? '#111111' : '#ffffff' }
    },
    formatPercent(value) { return new Intl.NumberFormat(this.$i18n.locale, { style: 'percent', maximumFractionDigits: 0 }).format(value) },
    onToggle(event) {
      this.detailsOpen = event.target.open
      if (!this.detailsOpen) this.selected = null
    },
    meaning(segment) {
      if (segment.key === 'not-applicable') return this.$t('score.ui.greenScoreNotApplicable')
      if (segment.key === 'unknown') return this.$t('score.meaning.unknown')
      return this.$t(`score.meaning.${this.kind}.${segment.key === 'a-plus' ? 'aPlus' : segment.key}`)
    },
    segmentDescription(segment) { return `${this.title}: ${this.meaning(segment)}, ${this.$t('score.ui.productsCount', segment.count)}` }
  }
}
</script>
<style scoped>
.category-chart { padding: 1.1rem; border: 0; border-radius: 0.75rem; background: var(--score-surface, #ffffff); }
header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
h3 { font-size: 1rem; font-weight: 600; margin: 0; }
.category-chart__overview { display: flex; align-items: center; gap: 1.5rem; margin-top: 0.75rem; }
.category-chart__donut { width: 7.5rem; height: 7.5rem; flex: none; }
.category-chart__donut-wrap { position: relative; flex: none; }
.category-chart__arc { cursor: pointer; outline: none; transition: stroke-width 0.15s ease, opacity 0.15s ease; }
.category-chart__arc--dim { opacity: 0.7; }
.category-chart__count--dim { background: transparent; }
.category-chart__arc:focus-visible { filter: drop-shadow(0 0 0.6px var(--score-focus, #174f78)); }
.category-chart__tooltip { position: absolute; top: calc(100% + 0.5rem); left: 0; z-index: 5; width: max-content; max-width: 15rem; padding: 0.65rem 0.75rem; border: 1px solid #71836f; border-radius: 0.6rem; background: var(--score-surface, #ffffff); box-shadow: 0 8px 24px #17382a24; font-size: 0.8rem; }
.category-chart__tooltip-head { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
.category-chart__tooltip-value { color: var(--score-muted, #52605a); margin: 0.35rem 0 0.25rem; }
.category-chart__tooltip-list { margin: 0; padding-left: 1rem; }
.category-chart__number { fill: currentColor; font-size: 9px; font-weight: 700; font-family: inherit; }
.category-chart__unit { fill: var(--score-muted, #52605a); font-size: 3px; }
.category-chart__counts { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.category-chart__counts button { display: flex; flex-direction: column; gap: 0.35rem; align-items: center; padding: 0.25rem; border-radius: 0.4rem; }

.category-chart__counts--percent { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; min-width: 0; }
.category-chart__counts--percent button { display: grid; grid-template-columns: auto auto; column-gap: 0.5rem; row-gap: 0.15rem; padding: 0.35rem; text-align: left; align-items: center; }
.category-chart__legend-heading { display: inline-flex; align-items: center; gap: 0.35rem; }
.category-chart__nova-description { font-size: 0.8rem; font-weight: 400; }
.category-chart__legend-label { font-size: 0.8rem; }
.category-chart__legend-percent { font-size: 0.9rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.category-chart__dot { width: 0.45rem; height: 0.45rem; border-radius: 50%; flex-shrink: 0; }
.category-chart__product-count { grid-column: 1 / -1; font-size: 0.75rem; line-height: 1.25; color: var(--score-muted, #52605a); }
.category-chart__grade { min-width: 1.8rem; padding: 0.25rem; border-radius: 0.3rem; font-size: 0.75rem; font-weight: 700; border: 1px solid #17382a; }
button { color: inherit; cursor: pointer; }
button:disabled { cursor: default; }
button:focus-visible, summary:focus-visible { outline: 3px solid var(--score-focus, #174f78); outline-offset: 3px; }
button[aria-expanded="true"] { background: var(--score-tint, #e7ebe9); }
.category-chart__coverage, .category-chart__meaning { color: var(--score-muted, #52605a); font-size: 0.8rem; margin: 0.5rem 0; }
.category-chart__details { margin-top: 0.85rem; font-size: 0.85rem; }
summary { cursor: pointer; }
.category-chart__group { display: grid; grid-template-columns: minmax(12rem, 0.8fr) minmax(0, 2fr); gap: 1.5rem; padding: 0.85rem 0; border-top: 1px solid var(--score-rule, #d8dedb); }
.category-chart__group:first-of-type { margin-top: 0.75rem; }
.category-chart__group-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
.category-chart__group-heading > span:last-child { font-size: 0.75rem; color: var(--score-muted, #52605a); }
.category-chart__group--selected .category-chart__group-heading strong { text-decoration: underline; text-underline-offset: 3px; }
.category-chart__group :deep(.product-list) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 1rem; margin: 0; align-content: start; }
.category-chart__group :deep(.product-list li) { padding: 0.4rem 0; border: 0; }
.category-chart__group :deep(.product-list__name) { font-size: 0.85rem; }
@media (max-width: 640px) { .category-chart__group { grid-template-columns: 1fr; gap: 0.15rem; } }
.category-chart__bar { display: block; height: 0.4rem; border-radius: 1rem; background: var(--score-tint, #e7ebe9); border: 1px solid #71836f; overflow: hidden; }
.category-chart__bar span { display: block; height: 100%; }
@media (max-width: 420px) { .category-chart__counts--percent { flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
.category-chart__counts--percent button { display: flex; flex-direction: column; align-items: flex-start; gap: 0.1rem; padding: 0.2rem; }
.category-chart__legend-heading { gap: 0.25rem; }
.category-chart__legend-label, .category-chart__product-count { font-size: 0.7rem; } .category-chart__overview { gap: 0.5rem; } .category-chart__donut { width: 6rem; height: 6rem; } }
</style>
