<template>
  <section class="additives">
    <h3 class="additives__title">
      {{ $t('score.additivesTitle') }}
    </h3>

    <p
      v-if="!additives.productsChecked"
      class="additives__muted"
    >
      {{ $t('score.additivesNoDetails') }}
    </p>

    <template v-else>
      <!-- Summary: how many additives, in how many products -->
      <p class="additives__summary">
        <span class="additives__total">{{ additives.total }}</span>
        {{ $t('score.additivesFoundIn', { count: additives.productsWithAdditives, total: additives.productsChecked }) }}
      </p>

      <template v-if="additives.total">
        <!-- Share of additives per risk level -->
        <div
          class="additives__bar"
          role="img"
          :aria-label="riskSummary"
        >
          <span
            v-for="level in levels"
            :key="level.key"
            :style="{ width: `${(level.count / additives.total) * 100}%`, background: level.color }"
          />
        </div>
        <ul class="additives__counts">
          <li
            v-for="level in levels"
            :key="level.key"
          >
            <span
              class="additives__dot"
              :style="{ background: level.color }"
            />
            {{ $t('score.additivesLevelCount', { count: level.count, level: $t(`score.risk.${level.key}`).toLowerCase() }) }}
          </li>
        </ul>

        <!-- Additives grouped by risk, with the products that contain them -->
        <div
          v-for="group in groups"
          :key="group.key"
          class="additives__group"
        >
          <h4
            class="additives__group-title"
            :style="{ color: group.color }"
          >
            {{ $t(`score.risk.${group.key}`) }}
          </h4>
          <ul class="additives__list">
            <li
              v-for="additive in group.items"
              :key="additive.tag"
              class="additives__item"
            >
              <span
                class="additives__code"
                :style="{ background: group.color }"
              >{{ additive.code }}</span>
              <div class="additives__item-main">
                <span class="additives__label">{{ additive.label || additive.code }}</span>
                <span class="additives__products">
                  <span class="additives__in">{{ $t('score.additivesIn') }}</span>
                  <span
                    v-for="product in additive.products"
                    :key="product.id"
                    class="additives__chip"
                  >{{ product.name }}</span>
                </span>
              </div>
            </li>
          </ul>
        </div>

        <button
          v-if="additives.list.length > maxShown"
          type="button"
          class="additives__more"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ expanded ? $t('score.showLess') : $t('score.additivesShowAll', { count: additives.list.length }) }}
        </button>
      </template>

      <p
        v-else
        class="additives__muted"
      >
        {{ $t('score.additivesNone') }}
      </p>

      <!-- Separate legend: what the risk levels mean -->
      <section
        class="additives__key"
        :aria-label="$t('score.legend')"
      >
        <h4 class="additives__key-title">
          {{ $t('score.legend') }}
        </h4>
        <ul class="additives__key-list">
          <li
            v-for="level in levels"
            :key="level.key"
          >
            <span
              class="additives__dot"
              :style="{ background: level.color }"
            />
            <span><strong>{{ $t(`score.risk.${level.key}`) }}</strong> — {{ $t(`score.riskMeaning.${level.key}`) }}</span>
          </li>
        </ul>
      </section>
    </template>

    <slot />
  </section>
</template>

<script>
// Same order as the calculation: riskiest first
const LEVELS = [
  { key: 'high', color: '#e63e11' },
  { key: 'moderate', color: '#ee8100' },
  { key: 'no', color: '#038141' },
  { key: 'unknown', color: '#9e9e9e' }
]

export default {
  name: 'AdditivesCard',
  props: {
    // computeBasketDetails().additives
    additives: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      maxShown: 5, // additives shown before "Show all"
      expanded: false
    }
  },
  computed: {
    levels() {
      return LEVELS.map((level) => ({ ...level, count: this.additives[level.key] || 0 }))
    },
    // Groups by risk level, keeping only the additives currently shown
    groups() {
      const shown = this.expanded ? this.additives.list : this.additives.list.slice(0, this.maxShown)
      return this.levels
        .map((level) => ({ ...level, items: shown.filter((additive) => additive.risk === level.key) }))
        .filter((group) => group.items.length)
    },
    // Text version of the risk bar, for screen readers
    riskSummary() {
      return this.levels
        .filter((level) => level.count)
        .map((level) => this.$t('score.additivesLevelCount', { count: level.count, level: this.$t(`score.risk.${level.key}`).toLowerCase() }))
        .join(', ')
    }
  }
}
</script>

<style scoped>
.additives {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  padding: 1.25rem;
  border: 1px solid rgba(247, 251, 244, 0.12);
  border-radius: 1rem;
  background: rgba(14, 36, 28, 0.55);
}

.additives p {
  margin: 0;
}

.additives__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.additives__muted {
  color: rgba(247, 251, 244, 0.65);
  font-size: 0.85rem;
}

.additives__summary {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  color: rgba(247, 251, 244, 0.8);
  font-size: 0.9rem;
}

.additives__total {
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--smr-cream, #F7FBF4);
}

.additives__bar {
  display: flex;
  height: 0.6rem;
  border-radius: 0.3rem;
  background: rgba(247, 251, 244, 0.1);
  overflow: hidden;
}

.additives__counts,
.additives__list,
.additives__key-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.additives__counts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.9rem;
  margin-top: -0.35rem;
  color: rgba(247, 251, 244, 0.75);
  font-size: 0.75rem;
}

.additives__counts li,
.additives__key-list li {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.additives__dot {
  flex: none;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
}

.additives__group-title {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.additives__item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 0.6rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(247, 251, 244, 0.08);
}

.additives__code {
  min-width: 3.25rem;
  padding: 0.2rem 0.4rem;
  border-radius: 0.4rem;
  color: #FFFFFF;
  font-size: 0.8rem;
  font-weight: 700;
  text-align: center;
}

.additives__item-main {
  min-width: 0;
}

.additives__label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
}

.additives__in {
  margin-right: 0.25rem;
  color: rgba(247, 251, 244, 0.6);
  font-size: 0.75rem;
}

.additives__chip {
  display: inline-block;
  margin: 0.25rem 0.25rem 0 0;
  padding: 0.1rem 0.5rem;
  border-radius: 1rem;
  background: rgba(247, 251, 244, 0.1);
  font-size: 0.75rem;
}

.additives__more {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: #C8E6C0;
  font: inherit;
  font-size: 0.8rem;
  text-decoration: underline;
  cursor: pointer;
}

.additives__key {
  padding-top: 0.75rem;
  border-top: 1px solid rgba(247, 251, 244, 0.12);
}

.additives__key-title {
  margin: 0 0 0.4rem;
  color: rgba(247, 251, 244, 0.6);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.additives__key-list {
  display: grid;
  gap: 0.3rem;
  color: rgba(247, 251, 244, 0.75);
  font-size: 0.75rem;
  line-height: 1.3;
}

.additives__key-list li {
  align-items: flex-start;
}

.additives__key-list .additives__dot {
  margin-top: 0.2rem;
}
</style>
