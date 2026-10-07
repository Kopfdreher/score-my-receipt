<template>
  <main class="score">
    <header class="score__header">
      <div>
        <p class="score__brand">
          {{ $t('app.name') }}
        </p>
        <h1 class="score__title">
          {{ $t('score.title') }}
        </h1>
      </div>
    </header>

    <section class="score__panel">
      <p>{{ $t('score.teamNote') }}</p>
      <div class="score__actions">
        <v-btn variant="tonal" color="primary" :to="{ name: 'review' }">
          {{ $t('score.back') }}
        </v-btn>
        <v-btn color="primary" variant="flat" :to="{ name: 'history' }">
          {{ $t('score.history') }}
        </v-btn>
      </div>
    </section>
  </main>
</template>

<script>
import { useAppStore } from '@/store'

export default {
  name: 'Score',
  mounted() {
    this.ensureReceipt()
  },
  methods: {
    ensureReceipt() {
      const store = useAppStore()
      if (this.$route.query.mock === '1') {
        store.loadMockReceipt()
        return
      }
      if (store.getItems.length === 0) {
        store.loadMockReceipt()
      }
    }
  }
}
</script>

<style scoped>
.score {
  min-height: 100dvh;
  padding: 0.85rem 0.75rem 4.5rem;
  color: var(--smr-cream, #F7FBF4);
  background: linear-gradient(160deg, #16382A 0%, #0E241C 100%);
  overflow-x: hidden;
}

.score__header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
  width: 100%;
  max-width: 56rem;
}

.score__brand {
  margin: 0 0 0.2rem;
  font-family: var(--font-display, Georgia, serif);
  font-size: 0.95rem;
  font-weight: 700;
}

.score__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.score__panel {
  width: 100%;
  max-width: 56rem;
  padding: 0.85rem;
  border-radius: 0.75rem;
  background: #F7FBF4;
  color: #0E241C;
  box-shadow: 0 14px 30px rgba(6, 18, 13, 0.22);
}

.score__panel p {
  margin: 0;
  line-height: 1.45;
}

.score__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

@media (min-width: 600px) {
  .score {
    padding: 1.25rem;
  }

  .score__header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .score__title {
    font-size: 1.35rem;
  }
}
</style>
