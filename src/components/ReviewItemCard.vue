<template>
  <tr class="review-row" :class="{ 'review-row--verified': isVerified }">
    <td class="review-row__status">
      <v-icon
        :icon="statusIcon"
        :color="statusColor"
        size="20"
        :aria-label="statusLabel"
      />
    </td>

    <td class="review-row__product">
      <button
        type="button"
        class="review-row__image-button"
        :aria-label="$t('review.reviewItem')"
        @click="$emit('preview', item.id)"
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
        />
      </button>
    </td>

    <td class="review-row__text">
      <v-text-field
        :model-value="item.name"
        variant="plain"
        density="compact"
        hide-details
        single-line
        class="review-row__input review-row__input--name"
        :placeholder="$t('review.name')"
        @update:model-value="$emit('update', item.id, { name: $event })"
      />
      <button
        v-if="matchedName"
        type="button"
        class="review-row__matched-link"
        @click="$emit('preview', item.id)"
      >
        {{ matchedName }}
      </button>
      <p v-else-if="categoryLabel" class="review-row__category">
        {{ $t('review.categorySelected', { category: categoryLabel }) }}
      </p>
      <p v-else-if="isNoBarcodeMarked" class="review-row__category review-row__category--muted">
        {{ $t('review.noBarcodeAvailable') }}
      </p>
      <p v-else-if="!item.barcode" class="review-row__category review-row__category--muted">
        {{ $t('review.noBarcode') }}
      </p>
    </td>

    <td class="review-row__barcode">
      <div class="review-row__barcode-wrap">
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
          @click="$emit('scan', item.id)"
        />
      </div>
    </td>

    <td class="review-row__price">
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
    </td>

    <td class="review-row__qty">
      <div class="review-row__qty-wrap">
        <span class="review-row__qty-prefix" aria-hidden="true">x</span>
        <v-text-field
          :model-value="item.quantity"
          type="number"
          step="1"
          min="1"
          variant="outlined"
          density="compact"
          hide-details
          single-line
          class="review-row__input review-row__input--qty"
          @update:model-value="$emit('update', item.id, { quantity: parseQuantity($event) })"
        />
      </div>
    </td>

    <td class="review-row__actions">
      <v-btn
        icon="mdi-eye-outline"
        variant="text"
        size="small"
        density="comfortable"
        color="primary"
        :aria-label="$t('review.reviewItem')"
        @click="$emit('preview', item.id)"
      />
      <v-btn
        icon="mdi-delete-outline"
        variant="text"
        size="small"
        density="comfortable"
        color="error"
        :aria-label="$t('review.removeItem')"
        @click="$emit('remove', item.id)"
      />
    </td>
  </tr>
</template>

<script>
import constants from '@/constants'

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
    }
  },
  emits: [
    'update',
    'remove',
    'scan',
    'barcode-commit',
    'preview'
  ],
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
    barcodeFieldValue() {
      if (this.isNoBarcodeMarked) return ''
      return this.item.barcode || ''
    },
    barcodePlaceholder() {
      if (this.isNoBarcodeMarked) {
        return this.$t('review.barcodeFieldNoBarcode')
      }
      return this.$t('review.barcodePlaceholder')
    },
    categoryLabel() {
      if (!this.item.categoryTag) return null
      const match = constants.PRODUCT_CATEGORY_OPTIONS.find(
        (entry) => entry.value === this.item.categoryTag
      )
      return match?.title || this.item.categoryTag.replace(/^en:/, '')
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
      return parsed && parsed > 0 ? parsed : 1
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
      }
      this.$emit('update', this.item.id, patch)
    },
    onBarcodeBlur() {
      this.$emit('barcode-commit', this.item.id, this.item.barcode || null)
    }
  }
}
</script>

<style scoped>
.review-row td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid rgba(14, 36, 28, 0.08);
  vertical-align: middle;
}

.review-row--verified {
  background: rgba(76, 175, 80, 0.06);
}

.review-row__status {
  width: 2.25rem;
  text-align: center;
}

.review-row__product {
  width: 3.25rem;
}

.review-row__image-button {
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.review-row__image {
  display: block;
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 0.35rem;
  background: #EEF3EE;
  border: 1px solid rgba(14, 36, 28, 0.08);
}

.review-row__image--empty {
  background: linear-gradient(135deg, #EEF3EE 0%, #E2EAE2 100%);
}

.review-row__image--user {
  border-color: rgba(31, 107, 74, 0.45);
}

.review-row__text {
  min-width: 10rem;
}

.review-row__matched-link {
  display: block;
  margin-top: 0.1rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(14, 36, 28, 0.62);
  font-size: 0.75rem;
  line-height: 1.25;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 0.12em;
  cursor: pointer;
}

.review-row__category {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: rgba(14, 36, 28, 0.66);
}

.review-row__category--muted {
  color: rgba(14, 36, 28, 0.45);
}

.review-row__barcode {
  width: 12.5rem;
}

.review-row__barcode-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.review-row__price {
  width: 8.5rem;
}

.review-row__qty {
  width: 6.5rem;
}

.review-row__actions {
  width: 5.5rem;
  white-space: nowrap;
  text-align: right;
}

.review-row__price-wrap,
.review-row__qty-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.review-row__currency,
.review-row__qty-prefix {
  color: rgba(14, 36, 28, 0.55);
  font-size: 0.85rem;
  font-weight: 500;
}

.review-row__input :deep(.v-field) {
  font-size: 0.92rem;
}

.review-row__input--name :deep(.v-field__input) {
  padding-inline: 0;
  min-height: 30px;
  color: #0E241C;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.01em;
}

.review-row__input--barcode :deep(.v-field),
.review-row__input--price :deep(.v-field),
.review-row__input--qty :deep(.v-field) {
  border-radius: 0.45rem;
  background: #fff;
}

.review-row__input--barcode :deep(.v-field__input),
.review-row__input--price :deep(.v-field__input),
.review-row__input--qty :deep(.v-field__input) {
  min-height: 34px;
  padding-top: 4px;
  padding-bottom: 4px;
  color: #0E241C;
}

.review-row__input--barcode {
  width: 8.5rem;
}

.review-row__input--price {
  width: 5rem;
}

.review-row__input--qty {
  width: 4.25rem;
}
</style>
