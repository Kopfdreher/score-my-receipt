<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    persistent
    :scrim="true"
    @update:model-value="onDialogToggle"
    @after-enter="onDialogOpened"
  >
    <v-card class="scanner-card">
      <v-card-title class="scanner-card__title">
        {{ $t('review.scanBarcodeTitle') }}
      </v-card-title>

      <v-card-text>
        <p class="scanner-card__help">
          {{ $t('review.scanBarcodeHelp') }}
        </p>

        <v-alert
          v-if="errorMessage"
          class="mb-3"
          type="error"
          variant="tonal"
          density="compact"
          :text="errorMessage"
        />

        <v-alert
          v-if="statusMessage"
          class="mb-3"
          type="info"
          variant="tonal"
          density="compact"
          :text="statusMessage"
        />

        <div
          :id="readerId"
          ref="reader"
          class="scanner-card__reader"
        />

        <div class="scanner-card__file">
          <v-btn
            variant="tonal"
            color="primary"
            prepend-icon="mdi-image"
            :loading="busy"
            @click="openFilePicker"
          >
            {{ $t('review.scanFromPhoto') }}
          </v-btn>
          <input
            ref="fileInput"
            class="d-sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            @change="onFileSelected"
          >
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="busy" @click="close">
          {{ $t('review.scanCancel') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE
]

export default {
  name: 'BarcodeScannerDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'scanned'],
  data() {
    return {
      readerId: `barcode-reader-${Math.random().toString(36).slice(2, 9)}`,
      scanner: null,
      running: false,
      busy: false,
      errorMessage: null,
      statusMessage: null,
      handled: false
    }
  },
  watch: {
    modelValue(open) {
      if (open) {
        this.handled = false
        this.errorMessage = null
        this.statusMessage = this.$t('review.scanStarting')
        // Fallback if the dialog transition event does not fire.
        this.$nextTick(() => {
          window.setTimeout(() => {
            if (this.modelValue && !this.running && !this.busy) {
              this.startCamera()
            }
          }, 400)
        })
      } else {
        this.statusMessage = null
        this.stopScanner()
      }
    }
  },
  unmounted() {
    this.stopScanner()
  },
  methods: {
    onDialogToggle(open) {
      this.$emit('update:modelValue', open)
    },
    onDialogOpened() {
      if (!this.modelValue) return
      // Wait one frame so the reader node has a real size inside the dialog.
      window.requestAnimationFrame(() => {
        this.startCamera()
      })
    },
    close() {
      this.$emit('update:modelValue', false)
    },
    openFilePicker() {
      this.$refs.fileInput.click()
    },
    createScanner() {
      return new Html5Qrcode(this.readerId, {
        formatsToSupport: BARCODE_FORMATS,
        verbose: false
      })
    },
    startCamera() {
      if (!this.$refs.reader) {
        this.errorMessage = this.$t('review.scanCameraError')
        return
      }

      this.busy = true
      this.errorMessage = null
      this.statusMessage = this.$t('review.scanStarting')

      this.stopScanner()
        .then(() => {
          this.scanner = this.createScanner()
          return Html5Qrcode.getCameras()
        })
        .then((cameras) => {
          if (!cameras || !cameras.length) {
            throw new Error('NO_CAMERA')
          }

          const preferred = cameras.find((camera) => /back|rear|environment/i.test(camera.label))
          const cameraIdOrConfig = preferred ? preferred.id : cameras[0].id

          return this.scanner.start(
            cameraIdOrConfig,
            {
              fps: 10,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const width = Math.min(280, Math.floor(viewfinderWidth * 0.85))
                const height = Math.min(160, Math.floor(viewfinderHeight * 0.45))
                return { width, height }
              },
              aspectRatio: 1.777778
            },
            (decodedText) => {
              this.handleScan(decodedText)
            },
            () => {}
          )
        })
        .then(() => {
          this.running = true
          this.statusMessage = this.$t('review.scanReady')
        })
        .catch((error) => {
          // Desktop/webcam fallback when facingMode-style selection fails.
          if (this.scanner && !this.running) {
            return this.scanner.start(
              { facingMode: 'user' },
              { fps: 10, qrbox: { width: 250, height: 140 } },
              (decodedText) => {
                this.handleScan(decodedText)
              },
              () => {}
            )
              .then(() => {
                this.running = true
                this.statusMessage = this.$t('review.scanReady')
                this.errorMessage = null
              })
              .catch(() => {
                this.statusMessage = null
                this.errorMessage = error && error.message === 'NO_CAMERA'
                  ? this.$t('review.scanNoCamera')
                  : this.$t('review.scanCameraError')
              })
          }

          this.statusMessage = null
          this.errorMessage = error && error.message === 'NO_CAMERA'
            ? this.$t('review.scanNoCamera')
            : this.$t('review.scanCameraError')
          return null
        })
        .finally(() => {
          this.busy = false
        })
    },
    onFileSelected(event) {
      const [file] = event.target.files || []
      event.target.value = ''
      if (!file) return

      this.busy = true
      this.errorMessage = null
      this.statusMessage = this.$t('review.scanPhotoReading')

      this.stopScanner()
        .then(() => {
          this.scanner = this.createScanner()
          return this.scanner.scanFile(file, true)
        })
        .then((decodedText) => {
          this.handleScan(decodedText)
        })
        .catch(() => {
          this.errorMessage = this.$t('review.scanPhotoError')
          this.statusMessage = null
          // Try to restore the live camera after a failed photo decode.
          if (this.modelValue) {
            this.startCamera()
          }
        })
        .finally(() => {
          this.busy = false
        })
    },
    handleScan(decodedText) {
      if (this.handled) return
      const barcode = String(decodedText || '').trim()
      if (!barcode) return

      this.handled = true
      this.statusMessage = null
      this.$emit('scanned', barcode)
      this.close()
    },
    stopScanner() {
      const scanner = this.scanner
      const wasRunning = this.running
      this.scanner = null
      this.running = false

      if (!scanner) return Promise.resolve()

      const stopPromise = wasRunning
        ? scanner.stop().catch(() => {})
        : Promise.resolve()

      return stopPromise.then(() => {
        try {
          scanner.clear()
        } catch {
          // Reader node may already be unmounted.
        }
      })
    }
  }
}
</script>

<style scoped>
.scanner-card__title {
  font-size: 1.1rem;
  font-weight: 600;
}

.scanner-card__help {
  margin: 0 0 0.85rem;
  color: rgba(14, 36, 28, 0.7);
  font-size: 0.9rem;
  line-height: 1.45;
}

.scanner-card__reader {
  width: 100%;
  min-height: 240px;
  overflow: hidden;
  border-radius: 0.75rem;
  background: #0E241C;
}

.scanner-card__reader :deep(video) {
  width: 100% !important;
  border-radius: 0.75rem;
}

.scanner-card__file {
  margin-top: 0.85rem;
}
</style>
