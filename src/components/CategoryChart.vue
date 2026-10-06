<template>
  <section class="category-chart">
    <header class="category-chart__header">
      <h3 class="category-chart__title">
        {{ title }}
      </h3>
      <ScoreBadge
        :kind="kind"
        :value="chart.letter"
      />
    </header>
    <p
      v-if="info"
      class="category-chart__info"
    >
      {{ info }}
    </p>

    <div class="category-chart__body">
      <svg
        class="category-chart__donut"
        viewBox="0 0 42 42"
        role="img"
        :aria-label="title"
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
          cx="21"
          cy="21"
          :r="radius"
          fill="none"
          :stroke="arc.color"
          stroke-width="6"
          :stroke-dasharray="arc.dash"
          :stroke-dashoffset="arc.offset"
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

      <ul class="category-chart__legend">
        <li
          v-for="segment in visibleSegments"
          :key="segment.key"
          class="category-chart__row"
        >
          <span
            class="category-chart__dot"
            :style="{ background: segment.color }"
          />
          <span class="category-chart__label">
            {{ segment.label === null ? $t('score.unknown') : segment.label }}
          </span>
          <span class="category-chart__value">
            {{ formatValue(segment) }}
          </span>
          <span class="category-chart__share">
            {{ formatPercent(mode === 'spend' ? segment.spendShare : segment.share) }}
          </span>
        </li>
      </ul>
    </div>

    <p class="category-chart__coverage">
      {{ $t('score.chartCoverage', { scored: chart.scoredUnits, total: chart.totalUnits }) }}
    </p>
  </section>
</template>

<script>
import ScoreBadge from '@/components/ScoreBadge.vue'

// r so that the circumference is 100: dash lengths are then percentages
const RADIUS = 15.9155

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
      radius: RADIUS
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
          const arc = { key: segment.key, color: segment.color, dash: `${length} ${100 - length}`, offset }
          offset -= length
          return arc
        })
    },
    centerValue() {
      return this.chart.scoredUnits
    },
    centerUnit() {
      return this.$t('score.rated')
    }
  },
  methods: {
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
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.category-chart__title {
  margin: 0;
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

.category-chart__donut {
  flex: none;
  width: 8.5rem;
  height: 8.5rem;
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
  flex: 1 1 10rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.category-chart__row {
  display: grid;
  grid-template-columns: 0.75rem 1fr auto 2.75rem;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0;
  font-size: 0.9rem;
}

.category-chart__dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

.category-chart__label {
  font-weight: 600;
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
