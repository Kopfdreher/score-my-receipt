<template>
  <main class="history">
    <header class="history__header">
      <router-link class="history__brand" to="/upload">
        {{ $t('app.name') }}
      </router-link>
      <UserSessionBar />
    </header>

    <h1 class="history__title">
      {{ $t('history.title') }}
    </h1>
    <p class="history__placeholder">
      {{ $t('history.placeholder') }}
    </p>
  </main>
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'History',
  components: {
    UserSessionBar: defineAsyncComponent(() => import('@/components/UserSessionBar.vue'))
  }
}
</script>

<style scoped>
.history {
  min-height: 100dvh;
  padding: 1.5rem;
  color: var(--smr-cream, #F7FBF4);
  background: linear-gradient(160deg, #16382A 0%, #0E241C 100%);
}

.history__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.history__brand {
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.35rem;
  font-weight: 700;
  color: inherit;
  text-decoration: none;
}

.history__title {
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.history__placeholder {
  margin: 0;
  color: rgba(247, 251, 244, 0.78);
}
</style>
