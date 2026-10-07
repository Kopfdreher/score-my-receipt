<template>
  <section class="category-chart">
    <header class="category-chart__header">
      <h3 class="category-chart__title">
        {{ title }}
      </h3>
      <div
        class="category-chart__scale"
        role="img"
        :aria-label="scaleLabel"
        :title="scaleLabel"
      >
        <span
          v-for="step in scaleSteps"
          :key="step.key"
          class="category-chart__step"
          :class="{ 'category-chart__step--active': step.active }"
          :style="{ background: step.color, color: textOn(step.color) }"
        >
          {{ step.label }}
        </span>
      </div>
    </header>
    <p
      v-if="info"
      class="category-chart__info"
    >
      {{ info }}
    </p>

    <div class="category-chart__body">
      <div
        class="category-chart__donut-wrap"
        @mouseleave="hovered = null"
      >
        <svg
          class="category-chart__donut"
          viewBox="0 0 42 42"
          role="group"
          :aria-label="description"
        >
          <circle
            cx="21"
            cy="21"
            :r="radius"
            fill="none"
            stroke="rgba(247, 251, 244, 0.12)"
            stroke-width="6"
          />
          <circle
            v-for="arc in arcs"
            :key="arc.key"
            class="category-chart__arc"
            :class="{ 'category-chart__arc--dim': hovered !== null && hovered !== arc.key }"
            cx="21"
            cy="21"
            :r="radius"
            fill="none"
            :stroke="arc.color"
            :stroke-width="hovered === arc.key ? 8 : 6"
            :stroke-dasharray="arc.dash"
            :stroke-dashoffset="arc.offset"
            tabindex="0"
            role="button"
            :aria-label="tooltipLabel(arc.segment)"
            @mouseenter="hovered = arc.key"
            @focus="hovered = arc.key"
            @blur="hovered = null"
            @click="hovered = hovered === arc.key ? null : arc.key"
          />
          <text
            x="21"
            y="22"
            text-anchor="middle"
            class="category-chart__center"
          >
            {{ centerValue }}
          </text>
          <text
            x="21"
            y="27.5"
            text-anchor="middle"
            class="category-chart__center-unit"
          >
            {{ centerUnit }}
          </text>
        </svg>

        <!-- Info bubble for the hovered part of the donut -->
        <div
          v-if="hoveredSegment"
          class="category-chart__tooltip"
          role="status"
        >
          <div class="category-chart__tooltip-head">
            <ScoreBadge
              :kind="kind"
              :value="hoveredSegment.key === 'unknown' ? null : hoveredSegment.key"
            />
            <span>{{ meaningOf(hoveredSegment) }}</span>
          </div>
          <p class="category-chart__tooltip-value">
            {{ formatValue(hoveredSegment) }} · {{ formatPercent(hoveredSegment[shareKey]) }}
          </p>
          <ul class="category-chart__tooltip-list">
            <li
              v-for="item in hoveredSegment.items"
              :key="item.id"
            >
              {{ item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name }}
            </li>
          </ul>
        </div>
      </div>

      <ul class="category-chart__legend">
        <li
          v-for="segment in visibleSegments"
          :key="segment.key"
          class="category-chart__row"
          :class="{ 'category-chart__row--active': hovered === segment.key, 'category-chart__row--dim': hovered !== null && hovered !== segment.key }"
          @mouseenter="hovered = segment.key"
          @mouseleave="hovered = null"
        >
          <ScoreBadge
            :kind="kind"
            :value="segment.key === 'unknown' ? null : segment.key"
          />
          <div class="category-chart__row-main">
            <div class="category-chart__row-top">
              <span class="category-chart__bar">
                <span :style="{ width: `${segment[shareKey] * 100}%`, background: segment.color }" />
              </span>
              <span class="category-chart__value">{{ formatValue(segment) }}</span>
              <span class="category-chart__share">{{ formatPercent(segment[shareKey]) }}</span>
            </div>
            <span class="category-chart__products">
              <span
                v-for="item in shownItems(segment)"
                :key="item.id"
                class="category-chart__chip"
              >
                {{ item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name }}
              </span>
              <button
                v-if="segment.items.length > maxNames"
                type="button"
                class="category-chart__more"
                :aria-expanded="isExpanded(segment)"
                @click="toggle(segment)"
              >
                {{ isExpanded(segment) ? $t('score.showLess') : $t('score.showMore', { count: segment.items.length - maxNames }) }}
              </button>
            </span>
          </div>
        </li>
      </ul>
    </div>

    <section
      class="category-chart__key"
      :aria-label="$t('score.legend')"
    >
      <h4 class="category-chart__key-title">
        {{ $t('score.legend') }}
      </h4>
      <ul class="category-chart__key-list">
        <li
          v-for="step in legendSteps"
          :key="step.key"
        >
          <ScoreBadge
            :kind="kind"
            :value="step.key === 'unknown' ? null : step.key"
          />
          <span>{{ meaningOf(step) }}</span>
        </li>
      </ul>
    </section>

    <p class="category-chart__summary">
      {{ summary }}
    </p>

    <p class="category-chart__coverage">
      {{ $t('score.chartCoverage', { scored: chart.scoredUnits, total: chart.totalUnits }) }}
    </p>
  </section>
</template>

<script>
import ScoreBadge from '@/components/ScoreBadge.vue'

// r so that the circumference is 100: dash lengths are then percentages
const RADIUS = 15.9155
const LIGHT_COLORS = ['#fecb02', '#ffcc00', '#85bb2f']

export default {
  name: 'CategoryChart',
  components: {
    ScoreBadge
  },
  props: {
    // 'nutriscore', 'nova' or 'greenScore'
    kind: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    info: {
      type: String,
      default: null
    },
    // one entry of computeScore().categories
    chart: {
      type: Object,
      required: true
    },
    // 'units' (items bought) or 'spend' (money)
    mode: {
      type: String,
      default: 'units'
    },
    currency: {
      type: String,
      default: 'EUR'
    }
  },
  data() {
    return {
      radius: RADIUS,
      maxNames: 3, // product names shown per grade before "+N more"
      hovered: null, // key of the grade under the mouse (or focused / tapped)
      expanded: [] // grades whose full product list is open
    }
  },
  computed: {
    shareKey() {
      return this.mode === 'spend' ? 'spendShare' : 'share'
    },
    // Grades bought, plus 'unknown' only when some items have no grade
    visibleSegments() {
      return this.chart.segments.filter((segment) => segment.units > 0)
    },
    arcs() {
      let offset = 25 // start at 12 o'clock
      return this.visibleSegments
        .filter((segment) => segment[this.shareKey] > 0)
        .map((segment) => {
          const length = segment[this.shareKey] * 100
          const arc = { key: segment.key, color: segment.color, dash: `${length} ${100 - length}`, offset, segment }
          offset -= length
          return arc
        })
    },
    // Every grade of the scale (A to E...), the basket average one highlighted
    scaleSteps() {
      return this.chart.segments
        .filter((segment) => segment.key !== 'unknown')
        .map((segment) => ({
          key: segment.key,
          label: segment.label,
          color: segment.color,
          active: this.chart.letter !== null && String(segment.key) === String(this.chart.letter)
        }))
    },
    // The whole scale for the legend, even grades not in the basket
    legendSteps() {
      return [...this.scaleSteps, { key: 'unknown' }]
    },
    scaleLabel() {
      const active = this.scaleSteps.find((step) => step.active)
      return active
        ? this.$t('score.scaleLabel', { title: this.title, grade: active.label, meaning: this.meaningOf(active).toLowerCase() })
        : this.$t('score.scaleNone', { title: this.title })
    },
    // The biggest rated grade, in words (works without seeing the colors)
    summary() {
      const rated = this.chart.segments.filter((segment) => segment.key !== 'unknown' && segment[this.shareKey] > 0)
      if (!rated.length) return this.$t('score.summary.none')
      const top = rated.reduce((best, segment) => (segment[this.shareKey] > best[this.shareKey] ? segment : best))
      return this.$t(`score.summary.${this.mode === 'spend' ? 'spend' : 'units'}`, {
        grade: `${this.title} ${top.label}`,
        meaning: this.meaningOf(top).toLowerCase(),
        percent: this.formatPercent(top[this.shareKey])
      })
    },
    // Full text version of the donut for screen readers
    description() {
      const details = this.visibleSegments
        .map((segment) => `${segment.label === null ? this.$t('score.unknown') : segment.label}, ${this.formatValue(segment)}, ${this.formatPercent(segment[this.shareKey])}`)
        .join('; ')
      return this.$t('score.chartDescription', { title: this.title, details })
    },
    hoveredSegment() {
      return this.visibleSegments.find((segment) => segment.key === this.hovered) || null
    },
    // Center of the donut: the hovered grade, otherwise the number of rated items
    centerValue() {
      if (this.hoveredSegment) return this.hoveredSegment.label === null ? '?' : this.hoveredSegment.label
      return this.chart.scoredUnits
    },
    centerUnit() {
      if (this.hoveredSegment) return this.formatPercent(this.hoveredSegment[this.shareKey])
      return this.$t('score.rated')
    }
  },
  methods: {
    isExpanded(segment) {
      return this.expanded.includes(segment.key)
    },
    toggle(segment) {
      this.expanded = this.isExpanded(segment)
        ? this.expanded.filter((key) => key !== segment.key)
        : [...this.expanded, segment.key]
    },
    // One sentence for screen readers: "C, Average nutritional quality, 4 items, 36%: Yogurt plain ×4"
    tooltipLabel(segment) {
      const grade = segment.label === null ? this.$t('score.unknown') : segment.label
      const products = segment.items.map((item) => item.name).join(', ')
      return `${grade}, ${this.meaningOf(segment)}, ${this.formatValue(segment)}, ${this.formatPercent(segment[this.shareKey])}: ${products}`
    },
    // First products only, unless the grade is expanded
    shownItems(segment) {
      return this.isExpanded(segment) ? segment.items : segment.items.slice(0, this.maxNames)
    },
    // Dark text on light colors (yellow, light green), white otherwise
    textOn(color) {
      return LIGHT_COLORS.includes(color) ? '#0E241C' : '#FFFFFF'
    },
    meaningOf(segment) {
      if (segment.key === 'unknown') return this.$t('score.meaning.unknown')
      const key = segment.key === 'a-plus' ? 'aPlus' : String(segment.key)
      return this.$t(`score.meaning.${this.kind}.${key}`)
    },
    formatValue(segment) {
      if (this.mode === 'spend') {
        return new Intl.NumberFormat(this.$i18n.locale, { style: 'currency', currency: this.currency }).format(segment.spend)
      }
      return this.$t('score.itemsCount', segment.units)
    },
    formatPercent(value) {
      return new Intl.NumberFormat(this.$i18n.locale, { style: 'percent', maximumFractionDigits: 0 }).format(value)
    }
  }
}
</script>

<style scoped>
.category-chart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  padding: 1.25rem;
  border: 1px solid rgba(247, 251, 244, 0.12);
  border-radius: 1rem;
  background: rgba(14, 36, 28, 0.55);
}

.category-chart__header {
  display: flex;
  flex-wrap: wrap; /* the scale goes under the title when the card is narrow */
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.category-chart__title {
  margin: 0;
  white-space: nowrap;
  font-size: 1.05rem;
  font-weight: 600;
}

.category-chart__info {
  margin: -0.4rem 0 0;
  color: rgba(247, 251, 244, 0.6);
  font-size: 0.8rem;
}

.category-chart__body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
}

.category-chart__donut-wrap {
  position: relative;
  flex: none;
}

.category-chart__arc {
  cursor: pointer;
  outline: none;
  transition: stroke-width 0.15s ease, opacity 0.15s ease;
}

.category-chart__arc--dim {
  opacity: 0.3;
}

.category-chart__tooltip {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 50%;
  z-index: 5;
  width: max-content;
  max-width: 15rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid rgba(247, 251, 244, 0.2);
  border-radius: 0.6rem;
  background: #0E241C;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  transform: translateX(-50%);
  font-size: 0.8rem;
}

.category-chart__tooltip-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.category-chart__tooltip-value {
  margin: 0.35rem 0 0.25rem;
  color: rgba(247, 251, 244, 0.75);
}

.category-chart__tooltip-list {
  margin: 0;
  padding-left: 1rem;
}

.category-chart__row--active {
  border-radius: 0.4rem;
  background: rgba(247, 251, 244, 0.06);
}

.category-chart__row--dim {
  opacity: 0.45;
}

.category-chart__donut {
  flex: none;
  width: 8.5rem;
  height: 8.5rem;
}

.category-chart__center,
.category-chart__center-unit {
  pointer-events: none; /* let the mouse reach the donut parts */
}

.category-chart__center {
  fill: currentColor;
  font-family: var(--font-display, Georgia, serif);
  font-size: 9px;
  font-weight: 700;
}

.category-chart__center-unit {
  fill: rgba(247, 251, 244, 0.65);
  font-size: 3.5px;
}

.category-chart__legend {
  flex: 1 1 16rem; /* wraps under the donut on narrow cards */
  margin: 0;
  padding: 0;
  list-style: none;
}

.category-chart__row {
  transition: opacity 0.15s ease, background 0.15s ease;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 0.6rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(247, 251, 244, 0.08);
}

.category-chart__row:last-child {
  border-bottom: 0;
}

.category-chart__row-main {
  min-width: 0;
}

.category-chart__row-top {
  display: grid;
  grid-template-columns: 1fr auto 2.5rem;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.category-chart__bar {
  height: 0.6rem;
  border-radius: 0.3rem;
  background: rgba(247, 251, 244, 0.1);
  overflow: hidden;
}

.category-chart__bar span {
  display: block;
  height: 100%;
  border-radius: 0.3rem;
}

.category-chart__chip {
  display: inline-block;
  margin: 0.25rem 0.25rem 0 0;
  padding: 0.1rem 0.5rem;
  border-radius: 1rem;
  background: rgba(247, 251, 244, 0.1);
  font-size: 0.75rem;
}

.category-chart__scale {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem;
  border-radius: 0.5rem;
  background: rgba(247, 251, 244, 0.1);
}

.category-chart__step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 0.2rem;
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0.55;
}

.category-chart__step:first-child {
  border-radius: 0.35rem 0 0 0.35rem;
}

.category-chart__step:last-child {
  border-radius: 0 0.35rem 0.35rem 0;
}

.category-chart__step--active {
  z-index: 1;
  min-width: 2rem;
  height: 2rem;
  margin: -0.3rem 0.1rem;
  border-radius: 0.45rem !important;
  box-shadow: 0 0 0 2px #F7FBF4;
  font-size: 1.05rem;
  opacity: 1;
}

.category-chart__products {
  display: block;
  color: rgba(247, 251, 244, 0.9);
  line-height: 1.35;
}

.category-chart__more {
  margin: 0.25rem 0 0 0.25rem;
  font-size: 0.75rem;
  padding: 0;
  border: 0;
  background: none;
  color: #C8E6C0;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.category-chart__key {
  padding-top: 0.75rem;
  border-top: 1px solid rgba(247, 251, 244, 0.12);
}

.category-chart__key-title {
  margin: 0 0 0.4rem;
  color: rgba(247, 251, 244, 0.6);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.category-chart__key-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: 0.35rem 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.category-chart__key-list li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: rgba(247, 251, 244, 0.75);
  font-size: 0.75rem;
  line-height: 1.25;
}

.category-chart__summary {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.category-chart__value {
  color: rgba(247, 251, 244, 0.75);
}

.category-chart__share {
  text-align: right;
  color: rgba(247, 251, 244, 0.6);
}

.category-chart__coverage {
  margin: auto 0 0;
  color: rgba(247, 251, 244, 0.6);
  font-size: 0.8rem;
}
</style>
