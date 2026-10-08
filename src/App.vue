<template>
  <v-app class="app-shell">
    <div v-if="showChrome" class="app-topnav">
      <UserSessionBar />
    </div>
    <router-view />
    <AppTabBar v-if="showChrome" />
  </v-app>
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'App',
  components: {
    UserSessionBar: defineAsyncComponent(() => import('@/components/UserSessionBar.vue')),
    AppTabBar: defineAsyncComponent(() => import('@/components/AppTabBar.vue'))
  },
  computed: {
    showChrome() {
      return this.$route.name !== 'sign-in'
    }
  }
}
</script>

<style>
:root {
  --smr-ink: #24332d;
  --smr-forest: #245b3f;
  --smr-leaf: #245b3f;
  --smr-mist: #e7ebe9;
  --smr-cream: #f2f4f3;
  --score-ink: #24332d;
  --score-muted: #52605a;
  --score-surface: #ffffff;
  --score-border: #afb9b4;
  --score-rule: #d8dedb;
  --score-accent: #245b3f;
  --score-tint: #e7ebe9;
  --score-focus: #174f78;
  --score-canvas: #f2f4f3;
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
}

html {
  height: 100%;
  height: 100dvh;
  overflow: hidden;
  background: #16382A;
}

html,
body,
#app {
  width: 100%;
  max-width: 100%;
}

body {
  margin: 0;
  height: 100%;
  height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  font-family: var(--font-body);
  background: #16382A;
  color: var(--score-ink);
  touch-action: manipulation;
}

#app {
  height: 100%;
  height: 100dvh;
  overflow: hidden;
}

.app-shell {
  height: 100% !important;
  min-height: 100dvh !important;
  max-height: 100dvh !important;
  overflow: hidden !important;
  background: #16382A !important;
  padding-top: var(--safe-top);
  padding-right: var(--safe-right);
  padding-bottom: var(--safe-bottom);
  padding-left: var(--safe-left);
}

/* Page roots must keep their natural height so the wrap scrolls instead of clipping them */
.app-shell > .v-application__wrap > * {
  flex-shrink: 0;
}

.app-shell > .v-application__wrap > :not(.app-topnav):not(.app-tabbar) {
  flex: 1 0 auto;
}

.app-shell > .v-application__wrap {
  min-height: 0 !important;
  height: 100% !important;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  background: #16382A;
}

.app-topnav {
  position: sticky;
  top: 0;
  z-index: 70;
  flex: 0 0 auto;
  width: 100%;
  padding: 0.85rem 1.15rem;
  background: #16382A;
  border-bottom: 1px solid rgba(232, 242, 230, 0.16);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-sizing: border-box;
  color: #F7FBF4;
}

.d-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.review-mode {
  display: flex;
  gap: 0.2rem;
  padding: 0.2rem;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.12);
}

.review-mode__option {
  flex: 1;
  min-height: 2.15rem;
  padding: 0.3rem 0.7rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--score-muted, #52605a);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
}

.review-mode__option--active {
  background: #1F6B4A;
  color: #fff !important;
  -webkit-text-fill-color: #fff;
  box-shadow: none;
}

/* Home-screen / standalone Safari: feel like a native shell */
@media all and (display-mode: standalone) {
  body {
    user-select: none;
    -webkit-user-select: none;
  }

  input,
  textarea,
  [contenteditable] {
    user-select: text;
    -webkit-user-select: text;
  }
}
</style>
