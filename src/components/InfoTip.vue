<template>
  <v-menu open-on-hover open-on-focus :close-on-content-click="false" max-width="340">
    <template #activator="{ props }">
      <button v-bind="props" type="button" class="info-tip" :aria-label="$t('score.ui.about', { title })">
        <span aria-hidden="true">i</span>
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
.info-tip { flex: none; width: 1.6rem; height: 1.6rem; border: 1px solid currentColor; border-radius: 50%; color: var(--score-muted, #52605a); font: italic 600 0.85rem Georgia, serif; cursor: pointer; }
.info-tip:focus-visible { outline: 3px solid var(--score-focus, #174f78); outline-offset: 3px; }
.info-tip__panel { background: #ffffff; color: #17382a; border: 1px solid #71836f; padding: 1rem; border-radius: 0.75rem; font-size: 0.85rem; box-shadow: 0 6px 24px #0004; }
.info-tip__panel p { margin: 0.5rem 0; }
.info-tip__panel a { display: block; color: #245b3f; margin-top: 0.4rem; }
</style>
