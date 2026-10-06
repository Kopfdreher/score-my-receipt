<template>
  <span
    class="score-badge"
    :class="`score-badge--${size}`"
    :style="{ background: color, color: textColor }"
    :aria-label="ariaLabel"
  >
    {{ label }}
  </span>
</template>

<script>
import { COLORS } from '@/utils/score'

// Light backgrounds need dark text to stay readable
const LIGHT_COLORS = ['#fecb02', '#ffcc00', '#85bb2f']

export default {
  name: 'ScoreBadge',
  props: {
    // 'nutriscore', 'nova', 'greenScore' or 'global'
    kind: {
      type: String,
      required: true
    },
    value: {
      type: [String, Number],
      default: null
    },
    size: {
      type: String,
      default: 'small'
    }
  },
  computed: {
    palette() {
      return this.kind === 'global' ? COLORS.nutriscore : COLORS[this.kind]
    },
    color() {
      return this.value === null ? COLORS.unknown : this.palette[this.value] || COLORS.unknown
    },
    textColor() {
      return LIGHT_COLORS.includes(this.color) ? '#0E241C' : '#FFFFFF'
    },
    label() {
      if (this.value === null) return '?'
      return this.value === 'a-plus' ? 'A+' : String(this.value).toUpperCase()
    },
    ariaLabel() {
      return `${this.$t(`score.${this.kind}`)} ${this.label}`
    }
  }
}
</script>

<style scoped>
.score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
  font-weight: 700;
  line-height: 1;
}

.score-badge--small {
  min-width: 1.75rem;
  height: 1.5rem;
  padding: 0 0.35rem;
  font-size: 0.8rem;
}

.score-badge--large {
  min-width: 3.5rem;
  height: 3.5rem;
  padding: 0 0.6rem;
  border-radius: 0.8rem;
  font-family: var(--font-display, Georgia, serif);
  font-size: 2rem;
}
</style>
