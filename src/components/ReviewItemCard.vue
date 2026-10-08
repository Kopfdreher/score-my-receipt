<template>
  <tr class="review-row" :class="{ 'review-row--verified': isVerified }">
    <td class="review-row__swipe-td" colspan="6">
      <div class="review-row__track">
        <div class="review-row__reveal" aria-hidden="true">
          <button
            type="button"
            class="review-row__delete"
            tabindex="-1"
            :aria-label="$t('review.removeItem')"
            @click="onDeleteClick"
          >
            <v-icon icon="mdi-delete-outline" size="22" />
            <span>{{ $t('review.removeItem') }}</span>
          </button>
        </div>

        <div
          class="review-row__pane"
          :class="{ 'review-row__pane--dragging': dragging }"
          :style="paneStyle"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <div class="review-row__cols">
            <div class="review-row__status">
              <v-icon
                :icon="statusIcon"
                :color="statusColor"
                size="18"
                :aria-label="statusLabel"
              />
            </div>

            <div class="review-row__product">
              <button
                type="button"
                class="review-row__image-button"
                :aria-label="$t('review.reviewItem')"
                @click="onContentClick('preview')"
              >
                <img
                  v-if="thumbUrl"
                  :src="thumbUrl"
                  :alt="matchedName || item.name || $t('review.product')"
                  class="review-row__image"
                  :class="{ 'review-row__image--user': hasUserPhoto }"
                  loading="lazy"
                >
                <div
                  v-else
                  class="review-row__image review-row__image--empty"
                  aria-hidden="true"
                >
                  <v-icon icon="mdi-image-outline" size="18" />
                </div>
              </button>
            </div>

            <div class="review-row__text">
              <button
                type="button"
                class="review-row__name-button"
                :aria-label="$t('review.reviewItem')"
                @click="onContentClick('preview')"
              >
                <span class="review-row__name">
                  {{ item.name || $t('review.name') }}
                </span>
                <span v-if="matchedName" class="review-row__matched-link">
                  {{ matchedName }}
                </span>
                <span class="review-row__subline" :class="{ 'review-row__subline--todo': !isVerified }">
                  {{ mobileSubline }}
                </span>
              </button>
            </div>

            <div class="review-row__barcode">
              <span class="review-row__field-label">{{ $t('review.barcodeOrCategory') }}</span>
              <div v-if="showCategoryField" class="review-row__barcode-wrap review-row__barcode-wrap--category">
                <v-autocomplete
                  v-model:search="categorySearch"
                  :model-value="item.categoryTag"
                  :items="filteredCategoryOptions"
                  item-title="title"
                  item-value="value"
                  clearable
                  no-filter
                  auto-select-first
                  variant="outlined"
                  density="compact"
                  hide-details
                  single-line
                  class="review-row__input review-row__input--category"
                  :placeholder="$t('review.categoryPlaceholder')"
                  :no-data-text="$t('review.categoryNoMatch')"
                  :aria-label="$t('review.useCategory')"
                  @update:model-value="onCategoryChange"
                  @update:search="onCategorySearch"
                />
                <v-btn
                  icon="mdi-barcode-scan"
                  variant="tonal"
                  color="primary"
                  size="small"
                  density="comfortable"
                  :aria-label="$t('review.scanBarcode')"
                  :title="$t('review.useBarcodeInstead')"
                  @click="switchToBarcodeEntry"
                />
              </div>
              <div v-else class="review-row__barcode-wrap">
                <v-text-field
                  :model-value="barcodeFieldValue"
                  variant="outlined"
                  density="compact"
                  hide-details
                  single-line
                  inputmode="numeric"
                  autocomplete="off"
                  class="review-row__input review-row__input--barcode"
                  :placeholder="barcodePlaceholder"
                  @update:model-value="onBarcodeTyped"
                  @blur="onBarcodeBlur"
                />
                <v-btn
                  icon="mdi-barcode-scan"
                  variant="tonal"
                  color="primary"
                  size="small"
                  density="comfortable"
                  :aria-label="$t('review.scanBarcode')"
                  @click="onContentClick('scan')"
                />
                <v-btn
                  v-if="!item.barcode"
                  icon="mdi-tag-outline"
                  variant="text"
                  color="primary"
                  size="small"
                  density="comfortable"
                  :aria-label="$t('review.useCategory')"
                  :title="$t('review.useCategory')"
                  @click="switchToCategoryEntry"
                />
              </div>
            </div>

            <div class="review-row__price">
              <span class="review-row__field-label">{{ $t('review.price') }}</span>
              <button
                type="button"
                class="review-row__price-display"
                :aria-label="$t('review.reviewItem')"
                @click="onContentClick('preview')"
              >
                <span class="review-row__price-amount">{{ priceDisplay }}</span>
              </button>
              <div class="review-row__price-wrap">
                <v-text-field
                  :model-value="item.price"
                  type="number"
                  step="0.01"
                  min="0"
                  variant="outlined"
                  density="compact"
                  hide-details
                  single-line
                  class="review-row__input review-row__input--price"
                  @update:model-value="$emit('update', item.id, { price: parseNumber($event) })"
                />
                <span class="review-row__currency">{{ currency }}</span>
              </div>
            </div>

            <button
              type="button"
              class="review-row__go"
              :aria-label="$t('review.reviewItem')"
              @click="onContentClick('preview')"
            >
              <v-icon icon="mdi-chevron-right" size="18" class="review-row__chevron" />
            </button>

            <div class="review-row__qty">
              <span class="review-row__field-label">{{ $t('review.quantity') }}</span>
              <div class="review-row__qty-wrap">
                <v-text-field
                  :model-value="item.quantity"
                  type="number"
                  :step="quantityStep"
                  min="0"
                  variant="outlined"
                  density="compact"
                  hide-details
                  single-line
                  class="review-row__input review-row__input--qty"
                  :aria-label="$t('review.quantity')"
                  @update:model-value="$emit('update', item.id, { quantity: parseQuantity($event) })"
                />
                <span class="review-row__unit">{{ $t(quantityUnitKey) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </td>
  </tr>
</template>

<script>
import openFoodFactsCategories from '@/services/openFoodFactsCategories'

const DELETE_WIDTH = 88
const OPEN_THRESHOLD = 40

export default {
  name: 'ReviewItemCard',
  props: {
    item: {
      type: Object,
      required: true
    },
    currency: {
      type: String,
      default: 'EUR'
    },
    swipeOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'update',
    'remove',
    'scan',
    'barcode-commit',
    'preview',
    'category-confirm',
    'swipe-open',
    'swipe-close'
  ],
  data() {
    return {
      dragX: 0,
      dragging: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      originX: 0,
      tracking: false,
      axisLocked: null,
      ignoreClick: false,
      categorySearch: '',
      preferBarcodeEntry: false
    }
  },
  computed: {
    isVerified() {
      return Boolean(this.item.verified)
    },
    matchedName() {
      return this.item.off?.product_name || null
    },
    thumbUrl() {
      return this.item.userPhotoUrl
        || this.item.off?.image_front_small_url
        || this.item.off?.image_front_url
        || null
    },
    hasUserPhoto() {
      return Boolean(this.item.userPhotoUrl)
    },
    isNoBarcodeMarked() {
      return Boolean(this.item.noBarcodeAvailable)
    },
    showCategoryField() {
      if (this.preferBarcodeEntry) return false
      if (this.item.barcode && !this.isNoBarcodeMarked) return false
      return true
    },
    barcodeFieldValue() {
      if (this.isNoBarcodeMarked && !this.preferBarcodeEntry) return ''
      return this.item.barcode || ''
    },
    barcodePlaceholder() {
      return this.$t('review.barcodePlaceholder')
    },
    isCategoryPriced() {
      return Boolean(!this.item.barcode && this.item.categoryTag)
    },
    quantityUnitKey() {
      return this.isCategoryPriced ? 'review.unitKg' : 'review.unitPackage'
    },
    quantityStep() {
      return this.isCategoryPriced ? '0.001' : '1'
    },
    filteredCategoryOptions() {
      const options = openFoodFactsCategories.filterCategoryOptions(this.categorySearch)
      return openFoodFactsCategories.optionsWithSelected(options, this.item.categoryTag)
    },
    categoryLabel() {
      if (!this.item.categoryTag) return null
      return openFoodFactsCategories.getCategoryName(this.item.categoryTag)
    },
    mobileSubline() {
      if (this.isVerified) return this.$t('review.statusOk')
      if (this.categoryLabel) return this.$t('review.categorySelected', { category: this.categoryLabel })
      if (this.item.barcode) return this.$t('review.barcodeShort', { barcode: this.item.barcode })
      return this.$t('review.tapToAddBarcode')
    },
    priceDisplay() {
      const value = Number(this.item.price)
      if (this.item.price === null || this.item.price === '' || !Number.isFinite(value)) {
        return '—'
      }
      return `${value.toFixed(2)} ${this.currency}`
    },
    statusIcon() {
      if (this.isVerified) return 'mdi-check-circle'
      if (this.matchedName) return 'mdi-help-circle'
      return 'mdi-alert-circle'
    },
    statusColor() {
      if (this.isVerified) return 'success'
      if (this.matchedName) return 'info'
      return 'warning'
    },
    statusLabel() {
      if (this.isVerified) return this.$t('review.statusOk')
      return this.$t('review.statusNeedsReview')
    },
    paneStyle() {
      return {
        transform: `translate3d(${this.dragX}px, 0, 0)`
      }
    }
  },
  watch: {
    swipeOpen(isOpen) {
      if (!isOpen && !this.dragging) {
        this.dragX = 0
      }
      if (isOpen && !this.dragging && this.dragX > -DELETE_WIDTH + 1) {
        this.dragX = -DELETE_WIDTH
      }
    },
    'item.categoryTag': {
      immediate: true,
      handler(tag) {
        if (!tag) return
        const label = openFoodFactsCategories.getCategoryName(tag)
        if (label && (!this.categorySearch || this.categorySearch === tag)) {
          this.categorySearch = label
        }
      }
    },
    'item.barcode'(barcode) {
      if (barcode) {
        this.preferBarcodeEntry = false
      }
    }
  },
  methods: {
    parseNumber(value) {
      if (value === '' || value === null || value === undefined) return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    },
    parseQuantity(value) {
      const parsed = this.parseNumber(value)
      if (parsed === null || parsed <= 0) return 1
      return parsed
    },
    normalizeOptional(value) {
      const trimmed = String(value || '').trim()
      return trimmed || null
    },
    onBarcodeTyped(value) {
      const barcode = this.normalizeOptional(value)
      const patch = { barcode }
      if (barcode) {
        patch.noBarcodeAvailable = false
        patch.categoryTag = null
        this.preferBarcodeEntry = false
      }
      this.$emit('update', this.item.id, patch)
    },
    onBarcodeBlur() {
      this.$emit('barcode-commit', this.item.id, this.item.barcode || null)
    },
    onCategorySearch(query) {
      this.categorySearch = query || ''
    },
    onCategoryChange(categoryTag) {
      const tag = categoryTag || null
      this.$emit('update', this.item.id, {
        categoryTag: tag,
        barcode: null,
        noBarcodeAvailable: true,
        verified: false,
        off: null
      })
      if (tag) {
        this.categorySearch = openFoodFactsCategories.getCategoryName(tag) || ''
        this.$emit('category-confirm', this.item.id)
      } else {
        this.categorySearch = ''
      }
    },
    switchToBarcodeEntry() {
      this.preferBarcodeEntry = true
      this.$emit('update', this.item.id, {
        noBarcodeAvailable: false
      })
    },
    switchToCategoryEntry() {
      this.preferBarcodeEntry = false
      this.$emit('update', this.item.id, {
        barcode: null,
        noBarcodeAvailable: true,
        verified: false
      })
    },
    shouldIgnoreSwipe(target) {
      if (!(target instanceof Element)) return false
      // Don't start a swipe on editors or the product open-edit controls —
      // otherwise micro-moves swallow the click and item edit never opens.
      return Boolean(target.closest([
        'input',
        'textarea',
        'select',
        'button',
        'a',
        '.v-field',
        '.v-btn',
        '.v-selection-control',
        '.review-row__name-button',
        '.review-row__image-button'
      ].join(', ')))
    },
    clampDrag(value) {
      return Math.min(0, Math.max(-DELETE_WIDTH, value))
    },
    onPointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      if (this.shouldIgnoreSwipe(event.target)) return

      this.tracking = true
      this.dragging = false
      this.axisLocked = null
      this.pointerId = event.pointerId
      this.startX = event.clientX
      this.startY = event.clientY
      this.originX = this.dragX
      this.ignoreClick = false

      if (event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId)
      }
    },
    onPointerMove(event) {
      if (!this.tracking || event.pointerId !== this.pointerId) return

      const dx = event.clientX - this.startX
      const dy = event.clientY - this.startY

      if (!this.axisLocked) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        this.axisLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        if (this.axisLocked === 'y') {
          this.tracking = false
          return
        }
        this.dragging = true
      }

      if (this.axisLocked !== 'x') return

      event.preventDefault()
      const next = this.clampDrag(this.originX + dx)
      if (Math.abs(next - this.originX) > 4) {
        this.ignoreClick = true
      }
      this.dragX = next
      if (next < -8) {
        this.$emit('swipe-open', this.item.id)
      }
    },
    onPointerUp(event) {
      if (!this.tracking || event.pointerId !== this.pointerId) {
        this.tracking = false
        this.dragging = false
        this.pointerId = null
        return
      }

      this.tracking = false
      this.dragging = false
      this.pointerId = null

      if (this.axisLocked !== 'x') {
        this.axisLocked = null
        return
      }

      const shouldOpen = this.dragX <= -OPEN_THRESHOLD
      this.dragX = shouldOpen ? -DELETE_WIDTH : 0
      if (shouldOpen) {
        this.$emit('swipe-open', this.item.id)
      } else {
        this.$emit('swipe-close', this.item.id)
      }
      this.axisLocked = null
    },
    onContentClick(action) {
      if (this.ignoreClick) {
        this.ignoreClick = false
        return
      }
      if (this.dragX < -8) {
        this.dragX = 0
        this.$emit('swipe-close', this.item.id)
        return
      }
      if (action === 'preview') {
        this.$emit('preview', this.item.id)
        return
      }
      if (action === 'scan') {
        this.$emit('scan', this.item.id)
      }
    },
    onDeleteClick() {
      this.$emit('remove', this.item.id)
      this.dragX = 0
      this.$emit('swipe-close', this.item.id)
    }
  }
}
</script>

<style scoped>
/* ---------- Mobile-first card row ---------- */
.review-row {
  display: block;
  width: 100%;
}

.review-row + .review-row {
  margin-top: 0.5rem;
}

.review-row__swipe-td {
  display: block;
  width: 100%;
  padding: 0 !important;
  border: 0;
}

.review-row__track {
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
  border-radius: 0.85rem;
  border: 1px solid rgba(14, 36, 28, 0.1);
  background: #fff;
  box-shadow: 0 1px 2px rgba(14, 36, 28, 0.05);
}

.review-row--verified .review-row__track {
  border-color: rgba(31, 107, 74, 0.35);
  box-shadow: inset 3px 0 0 #1F6B4A, 0 1px 2px rgba(14, 36, 28, 0.05);
}

.review-row__reveal {
  position: absolute;
  inset: 0 0 0 auto;
  width: 88px;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  z-index: 0;
}

.review-row__delete {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  width: 100%;
  margin: 0;
  padding: 0.35rem;
  border: 0;
  background: #C62828;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
}

.review-row__delete:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -4px;
}

.review-row__pane {
  position: relative;
  z-index: 1;
  background: #fff;
  transition: transform 0.18s ease;
  will-change: transform;
}

.review-row--verified .review-row__pane {
  background: #F6FBF5;
}

.review-row__pane--dragging {
  transition: none;
}

.review-row__cols {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto auto;
  height: 88px;
  overflow: hidden;
  grid-template-areas:
    'product text status chevron'
    'product price status chevron';
  align-items: center;
  column-gap: 0.55rem;
  row-gap: 0.12rem;
  width: 100%;
  min-width: 0;
  padding: 0 0.45rem 0 0;
}

.review-row__status { grid-area: status; }
.review-row__product { grid-area: product; }
.review-row__text {
  grid-area: text;
  align-self: end;
}
.review-row__price {
  grid-area: price;
  align-self: start;
}
.review-row__go { grid-area: chevron; }

.review-row__barcode,
.review-row__qty {
  display: none;
}

.review-row__status,
.review-row__product,
.review-row__text,
.review-row__price {
  min-width: 0;
  padding: 0;
}

.review-row__text {
  padding-top: 0.45rem;
}

.review-row__price {
  padding-bottom: 0.4rem;
}

.review-row__status {
  display: flex;
  justify-content: center;
}

.review-row__field-label {
  display: none;
}

.review-row__product {
  align-self: stretch;
  height: 100%;
}

.review-row__image-button {
  display: block;
  width: 96px;
  height: 88px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.review-row__image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 88px;
  object-fit: cover;
  object-position: center;
  border-radius: 0;
  background: #F0F5EF;
  border: 0;
  border-right: 1px solid rgba(14, 36, 28, 0.08);
}

.review-row__image--empty {
  color: rgba(14, 36, 28, 0.3);
  background: linear-gradient(135deg, #F0F5EF 0%, #E4ECE3 100%);
}

.review-row__image--user {
  border-color: rgba(31, 107, 74, 0.45);
}

.review-row__name-button {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.review-row__name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #0E241C;
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.25;
  text-transform: uppercase;
  letter-spacing: 0.01em;
}

.review-row__matched-link {
  display: none;
  margin-top: 0.1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(14, 36, 28, 0.6);
  font-size: 0.72rem;
  line-height: 1.2;
}

.review-row__subline {
  display: none;
  margin-top: 0.15rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1F6B4A;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.2;
}

.review-row__subline--todo {
  color: #B26A00;
}

.review-row__price-display {
  display: inline-flex;
  align-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #0E241C;
  font: inherit;
  cursor: pointer;
}

.review-row__go {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0.15rem;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.review-row__price-amount {
  color: rgba(14, 36, 28, 0.55);
  font-size: 0.88rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.review-row__chevron {
  color: rgba(14, 36, 28, 0.35);
}

/* Desktop-only inline editors (hidden on mobile) */
.review-row__price-wrap {
  display: none;
}

.review-row__barcode-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
}

.review-row__barcode-wrap--category {
  width: 100%;
}

.review-row__qty-wrap {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
}

.review-row__currency {
  flex-shrink: 0;
  color: rgba(14, 36, 28, 0.55);
  font-size: 0.85rem;
  font-weight: 500;
}

.review-row__input :deep(.v-field) {
  font-size: 0.92rem;
}

.review-row__input--barcode :deep(.v-field),
.review-row__input--category :deep(.v-field),
.review-row__input--price :deep(.v-field),
.review-row__input--qty :deep(.v-field) {
  border-radius: 0.45rem;
  background: #fff;
}

.review-row__input--barcode :deep(.v-field__input),
.review-row__input--category :deep(.v-field__input),
.review-row__input--price :deep(.v-field__input),
.review-row__input--qty :deep(.v-field__input) {
  min-height: 34px;
  padding-top: 4px;
  padding-bottom: 4px;
  color: #0E241C;
}

.review-row__unit {
  flex-shrink: 0;
  min-width: 2.4rem;
  color: rgba(14, 36, 28, 0.65);
  font-size: 0.82rem;
  font-weight: 600;
}

/* ---------- Desktop table row ---------- */
@media (min-width: 960px) {
  .review-row {
    display: table-row;
  }

  .review-row + .review-row {
    margin-top: 0;
  }

  .review-row__swipe-td {
    display: table-cell;
    border-bottom: 1px solid rgba(14, 36, 28, 0.08);
  }

  .review-row__track {
    border-radius: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .review-row--verified .review-row__track {
    box-shadow: none;
  }

  /* Keep the pane opaque so the swipe-to-delete button never shows through. */
  .review-row__pane {
    background: #F7FBF4;
  }

  .review-row--verified .review-row__pane {
    background: #EEF6EC;
  }

  .review-row__cols {
    grid-template-columns: 2.25rem 3.25rem minmax(8rem, 1fr) minmax(13rem, 15rem) 8.5rem 10.5rem;
    grid-template-areas: none;
    gap: 0;
    row-gap: 0;
    height: auto;
    overflow: visible;
    min-width: 50rem;
    padding: 0.15rem 0;
  }

  .review-row__go {
    display: none;
  }

  .review-row__status,
  .review-row__product,
  .review-row__text,
  .review-row__barcode,
  .review-row__price,
  .review-row__qty {
    display: block;
    grid-area: auto;
    align-self: center;
    padding: 0.4rem 0.5rem;
  }

  .review-row__status {
    display: flex;
  }

  .review-row__product {
    align-self: center;
    height: auto;
  }

  .review-row__image-button {
    width: auto;
    height: auto;
  }

  .review-row__image {
    width: 40px;
    height: 40px;
    min-height: 0;
    object-fit: cover;
    border-radius: 0.45rem;
    border: 1px solid rgba(14, 36, 28, 0.08);
    border-right: 1px solid rgba(14, 36, 28, 0.08);
  }

  .review-row__name {
    display: block;
    font-size: 0.92rem;
  }

  .review-row__matched-link {
    display: block;
    white-space: normal;
    font-size: 0.75rem;
    text-decoration: underline;
    text-underline-offset: 0.12em;
  }

  .review-row__subline,
  .review-row__price-display {
    display: none;
  }

  .review-row__price-wrap {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .review-row__input--barcode {
    width: 8.5rem;
  }

  .review-row__input--category {
    flex: 1;
    min-width: 0;
  }

  .review-row__input--price {
    width: 5rem;
  }

  .review-row__input--qty {
    width: 4.5rem;
  }

}
</style>
