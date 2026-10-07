<template>
  <v-menu open-on-hover open-on-focus :close-on-content-click="false" max-width="340">
    <template #activator="{ props }">
      <button v-bind="props" type="button" class="info-tip" :aria-label="$t('score.ui.about', { title })">
        <v-icon icon="mdi-information-outline" size="20" aria-hidden="true" />
      </button>
    </template>
    <div class="info-tip__panel">
      <strong>{{ title }}</strong>
      <p>{{ text }}</p>
      <a v-for="source in sources" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }} ↗</a>
    </div>
  </v-menu>
</template>
<script>
export default {
  name: 'InfoTip',
  props: {
    title: { type: String, required: true },
    text: { type: String, required: true },
    sources: { type: Array, default: () => [] }
  }
}
</script>
<style scoped>
/* 44 px tap area (Apple HIG) around a 20 px icon, without changing the layout */
.info-tip { flex: none; display: grid; place-items: center; width: 2.75rem; height: 2.75rem; margin: -0.625rem; border-radius: 50%; color: #6e6e73; cursor: pointer; }
.info-tip:hover { color: #007aff; }
.info-tip:focus-visible { outline: 2px solid #007aff; outline-offset: 3px; }
.info-tip__panel { background: #ffffff; color: #000000; padding: 1rem; border-radius: 0.75rem; font-size: 0.85rem; box-shadow: 0 6px 24px #0000001f; }
.info-tip__panel p { margin: 0.5rem 0; }
.info-tip__panel a { display: block; color: #007aff; margin-top: 0.4rem; }
</style>
