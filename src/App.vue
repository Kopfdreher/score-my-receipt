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
}

html,
body,
#app {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: var(--font-body);
  background: var(--smr-forest);
  color: var(--smr-cream);
}

.app-shell {
  background: transparent !important;
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
</style>
