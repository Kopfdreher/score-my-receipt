<template>
  <v-app class="app-shell">
    <router-view />
  </v-app>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
:root {
  --smr-ink: #0E241C;
  --smr-forest: #16382A;
  --smr-leaf: #1F6B4A;
  --smr-mist: #E8F2E6;
  --smr-cream: #F7FBF4;
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Sora', system-ui, sans-serif;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
}

html {
  height: 100%;
  height: 100dvh;
  overflow: hidden;
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
  background: var(--smr-forest);
  color: var(--smr-cream);
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
  background: transparent !important;
  padding-top: var(--safe-top);
  padding-right: var(--safe-right);
  padding-bottom: var(--safe-bottom);
  padding-left: var(--safe-left);
}

.app-shell > .v-application__wrap {
  min-height: 0 !important;
  height: 100% !important;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
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
