<template>
  <main class="upload">
    <header class="upload__header">
      <p class="upload__brand">
        {{ $t('app.name') }}
      </p>
    </header>

    <section class="upload__hero">
      <h1 class="upload__title">
        {{ $t('upload.title') }}
      </h1>
      <p class="upload__support">
        {{ statusMessage }}
      </p>

      <v-alert
        v-if="errorMessage"
        class="mb-6"
        type="error"
        variant="tonal"
        :text="errorMessage"
      />

      <v-btn
        color="primary"
        size="x-large"
        prepend-icon="mdi-line-scan"
        :loading="busy"
        :disabled="busy"
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
        accept="image/*"
        @change="onFileSelected"
      >
    </section>
  </main>
</template>

<script>
import { useAppStore } from '@/store'
import openPricesApi from '@/services/openPricesApi'
import openFoodFactsApi from '@/services/openFoodFactsApi'

const POLL_INTERVAL_MS = 2000
const POLL_TRIES = 15

export default {
  name: 'Upload',
  data() {
    return {
      busy: false,
      phase: 'idle',
      errorMessage: null,
      pollTimer: null
    }
  },
  computed: {
    statusMessage() {
      if (this.phase === 'uploading') return this.$t('upload.uploading')
      if (this.phase === 'extracting') return this.$t('upload.extracting')
      if (this.phase === 'enriching') return this.$t('upload.enriching')
      return this.$t('upload.support')
    }
  },
  unmounted() {
    this.clearPoll()
  },
  methods: {
    openFilePicker() {
      this.$refs.fileInput.click()
    },
    onFileSelected(event) {
      const [file] = event.target.files || []
      event.target.value = ''
      if (!file || this.busy) return
      this.uploadReceipt(file)
    },
    uploadReceipt(file) {
      const date = this.localDate()
      const currency = this.currencyFromLocale()
      const imagePreviewUrl = URL.createObjectURL(file)
      const store = useAppStore()

      this.busy = true
      this.phase = 'uploading'
      this.errorMessage = null
      this.clearPoll()

      openPricesApi.createProof(file, { date, currency })
        .then((proof) => {
          const proofId = proof && proof.id
          this.phase = 'extracting'
          return this.pollReceiptItems(proofId, 0)
            .then((rows) => ({ proofId, rows }))
        })
        .then(({ proofId, rows }) => {
          const items = rows.map((row) => this.mapReceiptItem(row))
          this.phase = 'enriching'
          return this.attachProductDetails(items).then(() => {
            store.setReceiptFromCapture({
              proofId,
              date,
              currency,
              locationOsmId: null,
              locationOsmType: null,
              imagePreviewUrl,
              status: rows.length ? 'ready' : 'error',
              errorMessage: rows.length ? null : this.$t('upload.error'),
              items
            })
            return this.$router.push({ name: 'review' })
          })
        })
        .catch(() => {
          URL.revokeObjectURL(imagePreviewUrl)
          this.phase = 'idle'
          this.errorMessage = this.$t('upload.error')
        })
        .finally(() => {
          this.busy = false
        })
    },
    // Fetch Open Food Facts photo + details for every barcode so Adjust opens ready.
    attachProductDetails(items) {
      const withBarcode = items.filter((item) => item.barcode)
      if (!withBarcode.length) return Promise.resolve()
      return openFoodFactsApi.fetchProductsByCode(withBarcode.map((item) => item.barcode))
        .then((byCode) => {
          withBarcode.forEach((item) => {
            const product = byCode.get(String(item.barcode))
            if (!product) return
            item.off = openFoodFactsApi.toItemOff(product)
            item.categoryTag = null
            if (!item.name && product.product_name) item.name = product.product_name
          })
        })
    },
    pollReceiptItems(proofId, attempt) {
      return openPricesApi.getReceiptItems({ proof_id: proofId })
        .then((payload) => {
          const rows = this.rowsFromPayload(payload)
          if (rows.length || attempt >= POLL_TRIES - 1) return rows
          return new Promise((resolve, reject) => {
            this.pollTimer = setTimeout(() => {
              this.pollReceiptItems(proofId, attempt + 1).then(resolve).catch(reject)
            }, POLL_INTERVAL_MS)
          })
        })
    },
    rowsFromPayload(payload) {
      if (Array.isArray(payload)) return payload
      if (payload && Array.isArray(payload.items)) return payload.items
      if (payload && Array.isArray(payload.results)) return payload.results
      return []
    },
    mapReceiptItem(row) {
      const predicted = row.predicted_data && typeof row.predicted_data === 'object'
        ? row.predicted_data
        : {}
      const data = row.data && typeof row.data === 'object' ? row.data : {}
      const source = Object.keys(predicted).length ? predicted : data
      const barcode = source.product_code || source.barcode || null
      const categoryTag = source.category_tag || null
      const price = source.price ?? source.price_total ?? null
      return {
        id: row.id,
        name: source.product_name || source.name || '',
        price,
        quantity: source.quantity ?? 1,
        barcode: barcode || null,
        categoryTag: categoryTag || null,
        off: null
      }
    },
    localDate() {
      const now = new Date()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return `${now.getFullYear()}-${month}-${day}`
    },
    currencyFromLocale() {
      const locale = navigator.language || ''
      const region = (locale.split('-')[1] || '').toUpperCase()
      if (region === 'US') return 'USD'
      if (region === 'GB') return 'GBP'
      return 'EUR'
    },
    clearPoll() {
      if (this.pollTimer) {
        clearTimeout(this.pollTimer)
        this.pollTimer = null
      }
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
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.upload__brand {
  margin: 0;
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.2rem;
  font-weight: 700;
}

.upload__header-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  width: 100%;
}

@media (min-width: 600px) {
  .upload__header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 3rem;
  }

  .upload__brand {
    font-size: 1.35rem;
  }

  .upload__header-actions {
    width: auto;
    max-width: min(36rem, 70%);
  }
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
