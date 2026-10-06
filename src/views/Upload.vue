<template>
  <main class="upload">
    <header class="upload__header">
      <p class="upload__brand">
        {{ $t('app.name') }}
      </p>
      <div class="upload__header-actions">
        <UserSessionBar />
      </div>
    </header>

    <section class="upload__hero">
      <h1 class="upload__title">
        {{ $t('upload.title') }}
      </h1>
      <p class="upload__support">
        {{ $t('upload.support') }}
      </p>

      <v-btn
        color="primary"
        size="x-large"
        prepend-icon="mdi-line-scan"
        @click="openFilePicker"
      >
        {{ $t('upload.scanCta') }}
      </v-btn>

      <p class="upload__hint">
        {{ $t('upload.hint') }}
      </p>

      <input
        ref="fileInput"
        class="d-sr-only"
        type="file"
        accept="image/*,.pdf"
        @change="onFileSelected"
      >
    </section>
  </main>
</template>

<script>
import { defineAsyncComponent } from 'vue'

export default {
  name: 'Upload',
  components: {
    UserSessionBar: defineAsyncComponent(() => import('@/components/UserSessionBar.vue'))
  },
  data() {
    return {
      selectedFile: null
    }
  },
  methods: {
    openFilePicker() {
      this.$refs.fileInput.click()
    },
    onFileSelected(event) {
      const [file] = event.target.files || []
      this.selectedFile = file || null
      // Receipt upload API wiring comes next; keep the real file selection only.
    }
  }
}
</script>

<style scoped>
.upload {
  min-height: 100dvh;
  padding: 1.5rem;
  color: var(--smr-cream, #F7FBF4);
  background:
    radial-gradient(90% 70% at 80% 0%, rgba(31, 107, 74, 0.35), transparent 55%),
    linear-gradient(160deg, #16382A 0%, #0E241C 100%);
}

.upload__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 3rem;
}

.upload__brand {
  margin: 0;
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.35rem;
  font-weight: 700;
}

.upload__header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.upload__hero {
  width: min(32rem, 100%);
  margin: 0 auto;
  padding-top: clamp(2rem, 12vh, 6rem);
  text-align: center;
}

.upload__title {
  margin: 0 0 0.75rem;
  font-family: var(--font-display, Georgia, serif);
  font-size: clamp(2rem, 6vw, 3rem);
  font-weight: 700;
  line-height: 1.1;
}

.upload__support {
  margin: 0 0 2rem;
  color: rgba(247, 251, 244, 0.78);
  font-size: 1.05rem;
  line-height: 1.5;
}

.upload__hint {
  margin: 1rem 0 0;
  color: rgba(247, 251, 244, 0.6);
  font-size: 0.9rem;
}
</style>
