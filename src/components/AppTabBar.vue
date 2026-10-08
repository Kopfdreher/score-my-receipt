<template>
  <nav class="app-tabbar" :aria-label="$t('nav.ariaLabel')">
    <router-link
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="app-tabbar__item"
      :class="{ 'app-tabbar__item--active': isRoute(tab.route) }"
    >
      <v-icon :icon="tab.icon" size="22" />
      <span>{{ tab.title }}</span>
    </router-link>
  </nav>
</template>

<script>
export default {
  name: 'AppTabBar',
  computed: {
    tabs() {
      return [
        { to: '/upload', route: 'upload', icon: 'mdi-line-scan', title: this.$t('nav.upload') },
        { to: '/review', route: 'review', icon: 'mdi-playlist-edit', title: this.$t('nav.review') },
        { to: '/score', route: 'score', icon: 'mdi-chart-donut', title: this.$t('nav.score') }
      ]
    }
  },
  methods: {
    isRoute(name) {
      return this.$route.name === name
    }
  }
}
</script>

<style scoped>
.app-tabbar {
  position: sticky;
  bottom: 0;
  z-index: 40;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0.25rem;
  flex: 0 0 auto;
  margin-top: auto;
  width: 100%;
  background: #16382A;
  border-top: 1px solid rgba(232, 242, 230, 0.16);
  box-sizing: border-box;
}

.app-tabbar__item {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  min-width: 4.75rem;
  min-height: 3.25rem;
  padding: 0.4rem 0.35rem;
  color: rgba(232, 242, 230, 0.65);
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.1;
  text-decoration: none;
}

.app-tabbar__item--active {
  color: #F7FBF4;
}
</style>
