<template>
  <section class="score-rings" aria-roledescription="carousel" :aria-label="$t('score.ui.rings.label')">
    <div
      ref="track"
      class="score-rings__track"
      :class="{ 'score-rings__track--dragging': dragging }"
      tabindex="0"
      @scroll.passive="onScroll"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <!-- A copy of the last ring before the first one and of the first after the last:
           sliding past either end lands on a copy, then jumps to the real ring (endless loop) -->
      <article
        v-for="(ring, index) in loopRings"
        :key="ring.loopKey"
        class="score-rings__slide"
        :inert="ring.clone ? '' : null"
        :aria-hidden="ring.clone ? 'true' : null"
        :style="{ '--accent': ring.accent }"
        role="group"
        aria-roledescription="slide"
        :aria-label="$t('score.ui.rings.slide', { index, total: rings.length, title: ring.title })"
      >
        <header class="score-rings__head">
          <v-icon :icon="ring.icon" size="20" />
          <div>
            <h2>{{ ring.title }}</h2>
            <p>{{ $t(`score.ui.rings.caption.${ring.kind}`) }}</p>
          </div>
          <InfoTip :title="ring.title" :text="$t('score.ui.rings.calculation')" />
        </header>

        <!-- One arc per grade, only for rated products; the center shows the share of good grades -->
        <svg class="score-rings__ring" viewBox="0 0 120 120" role="img" :aria-label="ringLabel(ring)">
          <circle cx="60" cy="60" :r="radius" class="score-rings__track-circle" />
          <circle
            v-for="arc in ring.arcs"
            :key="arc.key"
            cx="60"
            cy="60"
            :r="radius"
            class="score-rings__arc"
            transform="rotate(-90 60 60)"
            :stroke="arc.color"
            :stroke-dasharray="arc.dash"
            :stroke-dashoffset="arc.offset"
          />
          <text x="60" y="60" text-anchor="middle" class="score-rings__value">{{ ring.rated ? formatPercent(ring.goodShare) : '—' }}</text>
          <text x="60" y="76" text-anchor="middle" class="score-rings__unit">{{ ring.rated ? $t(`score.ui.rings.good.${ring.kind}`) : $t('score.ui.rings.noData') }}</text>
        </svg>

        <p class="score-rings__verdict">
          {{ ring.rated ? $t('score.ui.rings.verdict', { good: ring.good, rated: ring.rated }) : $t('score.ui.rings.noGrade') }}
        </p>
        <ul class="score-rings__grades">
          <li v-for="segment in ring.segments.filter(segment => segment.count)" :key="segment.key">
            <span :style="{ background: segment.color, color: gradeTextColor(segment.color) }">{{ segment.label }}</span>
            {{ segment.count }}
          </li>
        </ul>
        <p class="score-rings__coverage">
          {{ $t('score.ui.coverage', { known: ring.rated, total: ring.total }) }}
        </p>
        <button type="button" class="score-rings__details" :aria-expanded="openKind === ring.kind" @click="$emit('details', ring.kind)">
          {{ $t(openKind === ring.kind ? 'score.ui.rings.hideDetails' : 'score.ui.rings.details') }}<v-icon :icon="openKind === ring.kind ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="18" />
        </button>
      </article>
    </div>

    <nav class="score-rings__nav">
      <button type="button" class="score-rings__arrow" :aria-label="$t('score.ui.rings.previous')" @click="goTo(active - 1)">
        <v-icon icon="mdi-chevron-left" />
      </button>
      <div class="score-rings__dots">
        <button
          v-for="(ring, index) in rings"
          :key="ring.kind"
          type="button"
          :class="{ 'score-rings__dot--active': index === active }"
          :aria-label="ring.title"
          :aria-current="index === active"
          @click="goTo(index)"
        />
      </div>
      <button type="button" class="score-rings__arrow" :aria-label="$t('score.ui.rings.next')" @click="goTo(active + 1)">
        <v-icon icon="mdi-chevron-right" />
      </button>
    </nav>
  </section>
</template>

<script>
import InfoTip from './InfoTip.vue'
const RADIUS = 50
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3 // space between two arcs, in the same unit as the circumference
// Grades counted as "good" in the center of each ring
const GOOD = { nutriscore: ['a', 'b'], nova: ['1', '2'], greenScore: ['a-plus', 'a', 'b'] }
const ACCENTS = { nutriscore: '#245b3f', nova: '#703b12', greenScore: '#245b3f' }
const ICONS = { nutriscore: 'mdi-heart-outline', nova: 'mdi-factory', greenScore: 'mdi-leaf' }

export default {
  name: 'ScoreRings',
  components: { InfoTip },
  props: {
    // { nutriscore, nova, greenScore }: results of distribution() from basketAnalysis
    charts: { type: Object, required: true },
    titles: { type: Object, required: true },
    // ring whose details are unfolded under the carousel
    openKind: { type: String, default: null }
  },
  emits: ['details', 'slide-change'],
  data() {
    return { radius: RADIUS, active: 0, settleTimer: null, dragging: false, dragStart: null }
  },
  computed: {
    loopRings() {
      const rings = this.rings.map((ring) => ({ ...ring, loopKey: ring.kind }))
      if (rings.length < 2) return rings
      return [
        { ...rings[rings.length - 1], loopKey: 'clone-end', clone: true },
        ...rings,
        { ...rings[0], loopKey: 'clone-start', clone: true }
      ]
    },
    rings() {
      return Object.keys(GOOD).map((kind) => {
        const chart = this.charts[kind]
        const segments = chart.segments.filter((s) => !['unknown', 'not-applicable'].includes(s.key))
        const rated = segments.reduce((sum, s) => sum + s.count, 0)
        const good = segments.filter((s) => GOOD[kind].includes(s.key)).reduce((sum, s) => sum + s.count, 0)
        const goodShare = rated ? good / rated : 0
        return { kind, title: this.titles[kind], icon: ICONS[kind], accent: ACCENTS[kind], segments, rated, good, goodShare, total: chart.total, arcs: this.arcsOf(segments, rated) }
      })
    }
  },
  watch: {
    active() { this.$emit('slide-change') }
  },
  mounted() {
    // Start on the first real ring (position 1, after the copy of the last one)
    this.$nextTick(() => this.jumpTo(1))
    window.addEventListener('resize', this.onResize)
  },
  unmounted() {
    window.removeEventListener('resize', this.onResize)
    clearTimeout(this.settleTimer)
  },
  methods: {
    // Arcs start at 12 o'clock and go clockwise, best grade first
    arcsOf(segments, rated) {
      const shown = segments.filter((s) => s.count)
      const gap = shown.length > 1 ? GAP : 0
      let start = 0
      return shown.map((s) => {
        const length = (s.count / rated) * CIRCUMFERENCE
        const arc = { key: s.key, color: s.color, dash: `${Math.max(length - gap, 0.01)} ${CIRCUMFERENCE}`, offset: -start }
        start += length
        return arc
      })
    },
    ringLabel(ring) {
      if (!ring.rated) return `${ring.title}: ${this.$t('score.ui.rings.noGrade')}`
      const grades = ring.segments.filter((s) => s.count).map((s) => `${s.label} ${s.count}`).join(', ')
      return `${ring.title}: ${this.formatPercent(ring.goodShare)} ${this.$t(`score.ui.rings.good.${ring.kind}`)}. ${grades}`
    },
    gradeTextColor(color) {
      const rgb = color.slice(1).match(/../g).map(hex => {
        const value = parseInt(hex, 16) / 255
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      })
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? '#111111' : '#ffffff'
    },
    formatPercent(value) { return new Intl.NumberFormat(this.$i18n.locale, { style: 'percent', maximumFractionDigits: 0 }).format(value) },
    slideWidth() {
      const slide = this.$refs.track?.firstElementChild
      return slide ? slide.getBoundingClientRect().width + parseFloat(getComputedStyle(this.$refs.track).columnGap || 0) : 1
    },
    // Position in the track: 0 = copy of the last ring, 1..n = real rings, n + 1 = copy of the first
    position() { return Math.round(this.$refs.track.scrollLeft / this.slideWidth()) },
    jumpTo(position) { if (this.$refs.track) this.$refs.track.scrollLeft = position * this.slideWidth() },
    onScroll() {
      const n = this.rings.length
      this.active = (this.position() - 1 + n) % n
      // Once the scroll stops on a copy, jump without animation to the real ring
      clearTimeout(this.settleTimer)
      this.settleTimer = setTimeout(() => {
        if (this.dragging) return
        const position = this.position()
        if (position === 0) this.jumpTo(n)
        else if (position === n + 1) this.jumpTo(1)
      }, 140)
    },
    onResize() { this.jumpTo(this.active + 1) },
    // index can be -1 or n: it then slides onto a copy and loops
    goTo(index) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      const n = this.rings.length
      const target = Math.max(-1, Math.min(n, index)) + 1
      this.$refs.track.scrollTo({ left: target * this.slideWidth(), behavior: reduce ? 'auto' : 'smooth' })
    },
    // Mouse drag to slide (touch and trackpads already scroll natively)
    onPointerDown(event) {
      if (event.pointerType !== 'mouse' || event.target.closest('button')) return
      this.dragStart = { x: event.clientX, left: this.$refs.track.scrollLeft, index: this.active }
    },
    onPointerMove(event) {
      if (!this.dragStart) return
      const dx = event.clientX - this.dragStart.x
      if (!this.dragging && Math.abs(dx) > 5) {
        this.dragging = true
        this.$refs.track.setPointerCapture(event.pointerId)
      }
      if (this.dragging) this.$refs.track.scrollLeft = this.dragStart.left - dx
    },
    // A short drag is enough: 40 px to the left or right moves one card
    onPointerUp(event) {
      if (this.dragging) {
        const dx = event.clientX - this.dragStart.x
        const index = this.dragStart.index + (dx < -40 ? 1 : dx > 40 ? -1 : 0)
        this.dragging = false
        this.$nextTick(() => this.goTo(index))
      }
      this.dragStart = null
    }
  }
}
</script>

<style scoped>
.score-rings { max-width: 34rem; margin: 0.5rem auto 2rem; }
.score-rings__track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 100%;
  column-gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  cursor: grab;
  outline: none;
}
.score-rings__track::-webkit-scrollbar { display: none; }
.score-rings__track:focus-visible { outline: 3px solid var(--score-focus, #174f78); outline-offset: 4px; border-radius: 1.5rem; }
.score-rings__track--dragging { scroll-snap-type: none; cursor: grabbing; user-select: none; }

.score-rings__slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 1.25rem 1.25rem;
  border-radius: 18px;
  background: var(--score-surface, #ffffff);
  scroll-snap-align: start;
  text-align: center;
}
.score-rings__head { display: flex; align-items: center; gap: 0.6rem; align-self: stretch; text-align: left; }
.score-rings__head > .v-icon { padding: 1.1rem; border-radius: 50%; color: var(--accent); background: color-mix(in srgb, var(--accent) 18%, transparent); }
.score-rings__head :deep(.info-tip) { margin-left: auto; }
.score-rings__head h2 { margin: 0; color: var(--accent); font-size: 1.05rem; font-weight: 600; font-family: inherit; }
.score-rings__head p { margin: 0; color: var(--score-muted, #52605a); font-size: 0.8rem; }

.score-rings__ring { width: min(13rem, 70vw); height: auto; }
.score-rings__track-circle { fill: none; stroke: var(--score-rule, #d8dedb); stroke-width: 10; }
.score-rings__arc { fill: none; stroke-width: 10; transition: stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease; animation: score-rings-draw 1s cubic-bezier(0.22, 1, 0.36, 1) both; }
/* The ring turns into place: each arc grows from 12 o'clock to its final position */
@keyframes score-rings-draw { from { stroke-dasharray: 0 400; stroke-dashoffset: 0; } }
.score-rings__value { fill: currentColor; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
.score-rings__unit { fill: var(--score-muted, #52605a); font-size: 8.5px; }

.score-rings__verdict { margin: 0; font-size: 0.95rem; font-weight: 500; }
.score-rings__grades { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem 0.75rem; margin: 0; padding: 0; list-style: none; font-size: 0.85rem; }
.score-rings__grades li { display: flex; align-items: center; gap: 0.3rem; }
.score-rings__grades span { min-width: 1.6rem; padding: 0.1rem 0.3rem; border-radius: 0.4rem; font-size: 0.75rem; font-weight: 700; }
.score-rings__coverage { margin: 0; color: var(--score-muted, #52605a); font-size: 0.75rem; }
.score-rings__details { display: inline-flex; align-items: center; gap: 0.1rem; margin-top: auto; padding: 0.35rem 0.6rem; border-radius: 0.6rem; color: var(--score-accent, #245b3f); font-size: 0.9rem; font-weight: 500; }
.score-rings__details:hover { background: var(--score-tint, #e7ebe9); }

.score-rings__nav { display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-top: 0.85rem; }
.score-rings__arrow { display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border-radius: 50%; background: var(--score-surface, #ffffff); }
.score-rings__arrow:disabled { opacity: 0.3; cursor: default; }
.score-rings__dots { display: flex; }
.score-rings__dots button { display: grid; place-items: center; width: 1.5rem; height: 2.75rem; }
.score-rings__dots button::before { content: ''; width: 0.5rem; height: 0.5rem; border-radius: 1rem; background: #c7c7cc; transition: width 0.2s ease, background 0.2s ease; }
.score-rings__dots .score-rings__dot--active { width: 2rem; }
.score-rings__dots .score-rings__dot--active::before { width: 1.4rem; background: #3a3a3c; }
button:focus-visible { outline: 3px solid var(--score-focus, #174f78); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .score-rings__arc, .score-rings__dots button::before { transition: none; animation: none; }
}
</style>
