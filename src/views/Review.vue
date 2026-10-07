<template>
  <main class="review">
    <header class="review__header">
      <h1 class="review__title">
        {{ $t('review.title') }}
      </h1>
      <p class="review__subtitle">
        {{ $t('review.subtitle') }}
      </p>
    </header>

    <div class="review__layout" :class="{ 'review__layout--with-receipt': Boolean(receiptImageUrl) }">
      <aside
        v-if="receiptImageUrl"
        class="review__panel review__panel--receipt"
      >
        <button
          type="button"
          class="review__receipt-toggle"
          :aria-expanded="receiptOpen"
          @click="receiptOpen = !receiptOpen"
        >
          <v-icon icon="mdi-receipt-text-outline" size="20" />
          <span class="review__receipt-toggle-label">
            {{ receiptOpen ? $t('review.receiptToggleHide') : $t('review.receiptToggleShow') }}
          </span>
          <v-icon :icon="receiptOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="22" class="review__receipt-toggle-chevron" />
        </button>
        <div v-show="receiptOpen" class="review__receipt-frame">
          <img
            :src="receiptImageUrl"
            :alt="$t('review.receiptImageAlt')"
            class="review__receipt-image"
          >
        </div>
      </aside>

      <div class="review__main">
        <section class="review__panel review__panel--meta">
          <h2 class="review__panel-title review__panel-title--sm">
            {{ $t('review.receiptDetailsTitle') }}
          </h2>

          <div class="review__meta-grid">
            <div class="review__meta-location">
              <v-autocomplete
                v-model="selectedLocation"
                v-model:search="locationQuery"
                :items="locationOptions"
                item-title="label"
                item-value="value"
                return-object
                clearable
                hide-no-data
                hide-details
                :loading="locationSearching"
                :label="$t('review.location')"
                :placeholder="$t('review.locationPlaceholder')"
                prepend-inner-icon="mdi-map-marker-outline"
                variant="outlined"
                density="comfortable"
                class="review__meta-field"
                no-filter
                @update:model-value="onLocationSelected"
                @update:search="onLocationSearch"
                @click:clear="clearLocation"
              />
              <p
                class="review__contribute-hint"
                :class="{ 'review__contribute-hint--ok': canContribute }"
              >
                <v-icon
                  :icon="canContribute ? 'mdi-check-circle-outline' : 'mdi-information-outline'"
                  size="15"
                />
                <span>{{ canContribute ? $t('review.locationInfoOk') : $t('review.locationInfoNeeded') }}</span>
              </p>
            </div>

            <v-text-field
              :model-value="receiptDate"
              type="date"
              :label="$t('review.date')"
              variant="outlined"
              density="comfortable"
              class="review__meta-field review__meta-field--date"
              hide-details
              @update:model-value="onDateChange"
            />

            <v-autocomplete
              :model-value="currency"
              :items="currencyOptions"
              :label="$t('review.currency')"
              variant="outlined"
              density="comfortable"
              hide-details
              auto-select-first
              class="review__meta-field"
              @update:model-value="onCurrencyChange"
            />
          </div>
        </section>

        <section class="review__panel">
          <div class="review__panel-head review__panel-head--row">
            <h2 class="review__panel-title">
              {{ $t('review.itemsTitle') }}
              <span v-if="items.length" class="review__count">{{ items.length }}</span>
            </h2>
          </div>
          <p v-if="items.length && !fetchingProducts" class="review__items-hint">
            {{ $t('review.itemsTapHint') }}
          </p>
          <div v-if="fetchingProducts" class="review__loading" role="status">
            <v-progress-circular indeterminate color="primary" size="28" width="3" />
            <p>{{ $t('review.loadingProducts') }}</p>
          </div>

          <div v-else-if="items.length" class="review__table-wrap">
            <table class="review__table">
              <thead class="review__thead">
                <tr>
                  <th scope="colgroup" class="review__th-row">
                    <div class="review__th-grid">
                      <span class="review__th review__th--status">
                        <span class="d-sr-only">{{ $t('review.status') }}</span>
                      </span>
                      <span class="review__th review__th--product">
                        <span class="d-sr-only">{{ $t('review.product') }}</span>
                      </span>
                      <span class="review__th review__th--text">
                        {{ $t('review.text') }}
                      </span>
                      <span class="review__th">
                        {{ $t('review.barcodeOrCategory') }}
                      </span>
                      <span class="review__th">
                        {{ $t('review.price') }}
                      </span>
                      <span class="review__th">
                        {{ $t('review.quantity') }}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <ReviewItemCard
                  v-for="item in items"
                  :key="item.id"
                  :item="item"
                  :currency="currency"
                  :swipe-open="swipeOpenItemId === item.id"
                  @update="onUpdateItem"
                  @remove="onRemoveItem"
                  @scan="openScanner"
                  @barcode-commit="enrichFromBarcode"
                  @preview="openProductPreview"
                  @category-confirm="confirmCategory"
                  @swipe-open="onItemSwipeOpen"
                  @swipe-close="onItemSwipeClose"
                />
              </tbody>
            </table>
          </div>

          <div v-else class="review__empty">
            <p>{{ receipt.proofId ? $t('review.emptyCaptured') : $t('review.empty') }}</p>
            <v-btn
              v-if="!receipt.proofId"
              color="primary"
              variant="tonal"
              size="small"
              @click="loadMock"
            >
              {{ $t('review.loadMock') }}
            </v-btn>
          </div>

          <v-btn
            class="review__add-item"
            variant="outlined"
            color="primary"
            block
            prepend-icon="mdi-plus"
            @click="onAddItem"
          >
            {{ $t('review.addItem') }}
          </v-btn>

          <div v-if="items.length" class="review__contribute-send">
            <div class="review__contribute-send-copy">
              <p class="review__contribute-send-status">
                {{ contributeStatus }}
              </p>
              <p class="review__contribute-send-hint">
                {{ $t('review.contributeSendHint') }}
              </p>
            </div>
            <v-btn
              color="primary"
              variant="tonal"
              block
              prepend-icon="mdi-cloud-upload-outline"
              :loading="contributing"
              :disabled="!canSendContribute"
              @click="sendContributePrices"
            >
              {{ $t('review.contributeSend') }}
            </v-btn>
          </div>

          <v-alert
            v-if="locationMessage"
            class="mt-3"
            :type="locationMessageType"
            variant="tonal"
            density="compact"
            :text="locationMessage"
          />
          <v-alert
            v-if="contributeMessage"
            class="mt-3"
            :type="contributeMessageType"
            variant="tonal"
            density="compact"
            :text="contributeMessage"
          />
          <v-alert
            v-if="draftMessage"
            class="mt-3"
            :type="draftMessageType"
            variant="tonal"
            density="compact"
            :text="draftMessage"
          />
        </section>
      </div>
    </div>

    <v-dialog
      v-model="previewOpen"
      max-width="380"
      content-class="review-preview-dialog"
      @update:model-value="onPreviewOpenChange"
    >
      <v-card v-if="previewItem" class="review-preview">
        <v-card-title class="review-preview__title">
          <span class="review-preview__title-text">
            {{ previewItem.off?.product_name || previewItem.name || $t('review.product') }}
          </span>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            density="comfortable"
            :aria-label="$t('review.closePreview')"
            @click="previewOpen = false"
          />
        </v-card-title>
        <v-card-text class="review-preview__body">
          <div class="review-preview__photo">
            <img
              v-if="previewImageUrl"
              :src="previewImageUrl"
              :alt="previewItem.off?.product_name || previewItem.name || $t('review.product')"
              class="review-preview__image"
            >
            <div
              v-else
              class="review-preview__image review-preview__image--empty"
            >
              <v-icon icon="mdi-image-off-outline" size="28" />
            </div>
            <div class="review-preview__actions review-preview__actions--photo">
              <v-btn
                size="x-small"
                variant="tonal"
                color="primary"
                icon="mdi-camera"
                :aria-label="$t('review.takeProductPhoto')"
                @click="openCameraPhotoPicker"
              />
              <v-btn
                size="x-small"
                variant="tonal"
                color="primary"
                icon="mdi-image-plus"
                :aria-label="previewItem.userPhotoUrl ? $t('review.changeProductPhoto') : $t('review.addProductPhoto')"
                @click="openGalleryPhotoPicker"
              />
              <v-btn
                v-if="previewItem.userPhotoUrl"
                size="x-small"
                variant="text"
                color="error"
                icon="mdi-delete-outline"
                :aria-label="$t('review.removeProductPhoto')"
                @click="removeProductPhoto(previewItem.id)"
              />
              <span v-if="previewItem.userPhotoUrl" class="review-preview__photo-badge">
                {{ $t('review.yourPhoto') }}
              </span>
            </div>
            <v-alert
              v-if="previewPhotoMessage"
              class="mt-1"
              type="warning"
              variant="tonal"
              density="compact"
              :text="previewPhotoMessage"
            />
          </div>

          <input
            ref="galleryPhotoInput"
            class="d-sr-only"
            type="file"
            accept="image/*"
            @change="onProductPhotoSelected"
          >
          <input
            ref="cameraPhotoInput"
            class="d-sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            @change="onProductPhotoSelected"
          >

          <p v-if="previewItem.off?.brands || previewItem.off?.quantity" class="review-preview__meta">
            <template v-if="previewItem.off?.brands">
              {{ previewItem.off.brands }}
            </template>
            <template v-if="previewItem.off?.brands && previewItem.off?.quantity">
              ·
            </template>
            <template v-if="previewItem.off?.quantity">
              {{ previewItem.off.quantity }}
            </template>
          </p>

          <div class="review-preview__name-edit">
            <p class="review-preview__match-label">
              {{ $t('review.receiptName') }}
            </p>
            <v-text-field
              :model-value="previewItem.name"
              variant="outlined"
              density="compact"
              hide-details
              single-line
              :placeholder="$t('review.name')"
              class="review-preview__name-field"
              @update:model-value="onPreviewNameChange"
            />
          </div>

          <div class="review-preview__commerce">
            <div class="review-preview__commerce-field">
              <p class="review-preview__match-label">
                {{ $t('review.price') }}
              </p>
              <div class="review-preview__price-row">
                <v-text-field
                  :model-value="previewItem.price"
                  type="number"
                  step="0.01"
                  min="0"
                  variant="outlined"
                  density="compact"
                  hide-details
                  single-line
                  class="review-preview__price-field"
                  @update:model-value="onPreviewPriceChange"
                />
                <span class="review-preview__currency">{{ currency }}</span>
              </div>
            </div>
            <div class="review-preview__commerce-field">
              <p class="review-preview__match-label">
                {{ $t('review.quantity') }}
              </p>
              <div class="review-preview__qty-row">
                <v-text-field
                  :model-value="previewItem.quantity"
                  type="number"
                  :step="previewQuantityStep"
                  min="0"
                  variant="outlined"
                  density="compact"
                  hide-details
                  single-line
                  class="review-preview__qty-field"
                  :aria-label="$t('review.quantity')"
                  @update:model-value="onPreviewQuantityChange"
                />
                <span class="review-preview__unit">{{ $t(previewQuantityUnitKey) }}</span>
              </div>
            </div>
          </div>

          <div v-if="showPreviewExtras" class="review-preview__extras">
            <div class="review-preview__origin">
              <p class="review-preview__match-label">
                {{ $t('review.origin') }}
              </p>
              <v-autocomplete
                v-model:search="originSearch"
                :model-value="previewItem.originTag"
                :items="filteredOriginOptions"
                item-title="title"
                item-value="value"
                clearable
                no-filter
                auto-select-first
                variant="outlined"
                density="compact"
                hide-details
                :placeholder="$t('review.originPlaceholder')"
                :no-data-text="$t('review.originNoMatch')"
                class="review-preview__origin-field"
                @update:model-value="onPreviewOriginChange"
                @update:search="onOriginSearch"
              />
            </div>
            <v-switch
              :model-value="Boolean(previewItem.organic)"
              :label="$t('review.organic')"
              color="primary"
              density="compact"
              hide-details
              inset
              class="review-preview__organic"
              @update:model-value="onPreviewOrganicChange"
            />
          </div>

          <div
            v-if="previewMatchedName && !previewCorrecting && !isPreviewCategoryItem"
            class="review-preview__match"
          >
            <p class="review-preview__match-label">
              {{ $t('review.matchedProduct') }}
            </p>
            <p class="review-preview__match-name">
              {{ previewMatchedName }}
            </p>
            <p v-if="previewNameLooksDifferent" class="review-preview__warning">
              {{ $t('review.nameMismatchHint') }}
            </p>
            <p v-if="previewItem.verified" class="review-preview__confirmed">
              {{ $t('review.productConfirmed') }}
            </p>
            <div class="review-preview__actions">
              <v-btn
                v-if="!previewItem.verified && previewNameLooksDifferent"
                size="small"
                color="primary"
                @click="confirmProduct(previewItem.id)"
              >
                {{ $t('review.correctBarcode') }}
              </v-btn>
              <v-btn
                v-if="!previewItem.verified && previewNameLooksDifferent"
                size="small"
                variant="tonal"
                color="error"
                @click="clearIncorrectBarcode(previewItem.id)"
              >
                {{ $t('review.incorrectBarcode') }}
              </v-btn>
              <v-btn
                v-if="!previewItem.verified && !previewNameLooksDifferent"
                size="small"
                color="primary"
                @click="confirmProduct(previewItem.id)"
              >
                {{ $t('review.confirmProduct') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                @click="useOffName(previewItem.id)"
              >
                {{ $t('review.useOffName') }}
              </v-btn>
            </div>
          </div>

          <div v-if="showPreviewBarcodeEdit" class="review-preview__edit">
            <p class="review-preview__match-label">
              {{ $t('review.barcode') }}
            </p>
            <div class="review-preview__barcode-row">
              <v-text-field
                v-model="previewBarcodeDraft"
                variant="outlined"
                density="compact"
                hide-details
                single-line
                inputmode="numeric"
                autocomplete="off"
                :placeholder="previewBarcodePlaceholder"
                class="review-preview__barcode-field"
              />
              <v-btn
                icon="mdi-barcode-scan"
                variant="tonal"
                color="primary"
                size="small"
                :aria-label="$t('review.scanBarcode')"
                @click="openScanner(previewItem.id)"
              />
            </div>
            <div class="review-preview__actions">
              <v-btn
                size="small"
                color="primary"
                :loading="previewLookingUp"
                :disabled="!previewBarcodeDraft || previewLookingUp"
                @click="applyPreviewBarcode"
              >
                {{ $t('review.applyBarcode') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                @click="markNoBarcodeAvailable(previewItem.id)"
              >
                {{ $t('review.noBarcodeAvailable') }}
              </v-btn>
            </div>
          </div>

          <div v-if="showPreviewNoBarcode" class="review-preview__category">
            <p class="review-preview__match-label">
              {{ $t('review.useCategory') }}
            </p>
            <p class="review-preview__hint">
              {{ $t('review.categoryHint') }}
            </p>
            <v-autocomplete
              v-model:search="categorySearch"
              :model-value="previewItem.categoryTag"
              :items="filteredCategoryOptions"
              item-title="title"
              item-value="value"
              clearable
              no-filter
              auto-select-first
              variant="outlined"
              density="compact"
              hide-details
              :placeholder="$t('review.categoryPlaceholder')"
              :no-data-text="$t('review.categoryNoMatch')"
              class="review-preview__category-field"
              @update:model-value="onPreviewCategoryChange"
              @update:search="onCategorySearch"
            />
            <div class="review-preview__actions">
              <v-btn
                v-if="!previewItem.verified"
                size="small"
                variant="tonal"
                @click="markNoBarcodeAvailable(previewItem.id)"
              >
                {{ $t('review.noBarcodeAvailable') }}
              </v-btn>
              <v-btn
                size="small"
                color="primary"
                :loading="categoryImageLoading"
                :disabled="!previewItem.categoryTag || categoryImageLoading"
                @click="confirmCategory(previewItem.id)"
              >
                {{ $t('review.confirmCategory') }}
              </v-btn>
            </div>
            <p v-if="categoryImageLoading" class="review-preview__hint">
              {{ $t('review.categoryImageLoading') }}
            </p>
            <p v-if="previewItem.verified && previewItem.categoryTag" class="review-preview__confirmed">
              {{ $t('review.productConfirmed') }}
            </p>
            <p v-else-if="previewItem.noBarcodeAvailable && !previewItem.categoryTag" class="review-preview__hint">
              {{ $t('review.noBarcodeConfirmed') }}
            </p>
            <p v-if="categoryImageMessage" class="review-preview__hint">
              {{ categoryImageMessage }}
            </p>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <BarcodeScannerDialog
      v-model="scannerOpen"
      @scanned="onBarcodeScanned"
    />

    <footer class="review__dock">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        class="review__dock-back"
        :aria-label="$t('review.back')"
        @click="goBack"
      />
      <div class="review__dock-summary">
        <span class="review__dock-count">{{ $t('review.dockCount', { count: items.length }) }}</span>
        <span class="review__dock-total">{{ formattedTotal }}</span>
      </div>
      <v-btn
        color="primary"
        variant="flat"
        class="review__dock-cta"
        append-icon="mdi-arrow-right"
        :disabled="!items.length || contributing || fetchingProducts"
        :loading="contributing || savingScored"
        @click="goNext"
      >
        {{ $t('review.next') }}
      </v-btn>
    </footer>
  </main>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { mapStores } from 'pinia'
import { useAppStore } from '@/store'
import openFoodFactsApi from '@/services/openFoodFactsApi'
import openFoodFactsCategories from '@/services/openFoodFactsCategories'
import openFoodFactsOrigins from '@/services/openFoodFactsOrigins'
import openStreetMapApi from '@/services/openStreetMapApi'
import openPricesApi from '@/services/openPricesApi'
import constants from '@/constants'

const OSM_TYPE_MAP = {
  node: 'NODE',
  way: 'WAY',
  relation: 'RELATION',
  n: 'NODE',
  w: 'WAY',
  r: 'RELATION'
}

export default {
  name: 'Review',
  components: {
    ReviewItemCard: defineAsyncComponent(() => import('@/components/ReviewItemCard.vue')),
    BarcodeScannerDialog: defineAsyncComponent(() => import('@/components/BarcodeScannerDialog.vue'))
  },
  data() {
    return {
      scannerOpen: false,
      scanningItemId: null,
      fetchingProducts: false,
      previewOpen: false,
      previewItemId: null,
      previewCorrecting: false,
      previewNoBarcodeMode: false,
      previewBarcodeDraft: '',
      previewLookingUp: false,
      previewPhotoMessage: null,
      locationQuery: '',
      locationOptions: [],
      locationSearching: false,
      locationSearchTimer: null,
      locationMessage: null,
      locationMessageType: 'info',
      selectedLocation: null,
      contributing: false,
      contributeMessage: null,
      contributeDetail: null,
      contributeMessageType: 'info',
      categorySearch: '',
      originSearch: '',
      categoryImageLoading: false,
      categoryImageMessage: null,
      swipeOpenItemId: null,
      receiptOpen: false,
      savingDraft: false,
      savingScored: false,
      draftMessage: null,
      draftMessageType: 'info'
    }
  },
  computed: {
    ...mapStores(useAppStore),
    receipt() {
      return this.appStore.getReceipt
    },
    receiptImageUrl() {
      return this.receipt?.imagePreviewUrl || null
    },
    currencyOptions() {
      let codes = []
      try {
        if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
          codes = Intl.supportedValuesOf('currency')
        }
      } catch {
        codes = []
      }
      if (!codes.length) {
        codes = [...constants.CURRENCY_OPTIONS]
      }
      const current = this.currency
      if (current && !codes.includes(current)) {
        return [current, ...codes]
      }
      return codes
    },
    items() {
      return this.appStore.getItems
    },
    previewItem() {
      if (!this.previewItemId) return null
      return this.items.find((item) => item.id === this.previewItemId) || null
    },
    previewImageUrl() {
      if (!this.previewItem) return null
      return this.previewItem.userPhotoUrl
        || this.previewItem.off?.image_front_url
        || this.previewItem.off?.image_front_small_url
        || null
    },
    previewMatchedName() {
      return this.previewItem?.off?.product_name || null
    },
    previewNameLooksDifferent() {
      if (!this.previewMatchedName || !this.previewItem?.name) return false
      const receipt = this.normalizeForCompare(this.previewItem.name)
      const matched = this.normalizeForCompare(this.previewMatchedName)
      if (!receipt || !matched) return false
      return receipt !== matched && !receipt.includes(matched) && !matched.includes(receipt)
    },
    // Origin and organic only apply to items without a barcode (category prices).
    showPreviewExtras() {
      return Boolean(this.previewItem && !this.previewItem.barcode)
    },
    filteredOriginOptions() {
      return openFoodFactsOrigins.filterOriginOptions(this.originSearch)
    },
    filteredCategoryOptions() {
      // Keep the full OFF list outside Vue reactive state; only expose the filtered slice.
      const options = openFoodFactsCategories.filterCategoryOptions(this.categorySearch)
      const selected = this.previewItem && this.previewItem.categoryTag
      return openFoodFactsCategories.optionsWithSelected(options, selected)
    },
    isPreviewCategoryItem() {
      if (!this.previewItem) return false
      if (this.previewItem.barcode && !this.previewItem.noBarcodeAvailable) return false
      return Boolean(
        this.previewNoBarcodeMode
        || this.previewItem.noBarcodeAvailable
        || this.previewItem.categoryTag
        || !this.previewItem.barcode
      )
    },
    previewQuantityUnitKey() {
      return this.isCategoryPriced(this.previewItem) ? 'review.unitKg' : 'review.unitPackage'
    },
    previewQuantityStep() {
      return this.isCategoryPriced(this.previewItem) ? '0.001' : '1'
    },
    showPreviewBarcodeEdit() {
      if (!this.previewItem) return false
      if (this.previewCorrecting) return true
      if (this.isPreviewCategoryItem) return false
      if (this.previewMatchedName) return false
      return Boolean(this.previewItem.barcode)
    },
    showPreviewNoBarcode() {
      if (!this.previewItem || this.previewCorrecting) return false
      return this.isPreviewCategoryItem
    },
    previewBarcodePlaceholder() {
      if (this.previewItem?.noBarcodeAvailable) {
        return this.$t('review.barcodeFieldNoBarcode')
      }
      return this.$t('review.barcodePlaceholder')
    },
    currency() {
      return this.receipt?.currency || 'EUR'
    },
    receiptDate() {
      return this.receipt?.date || ''
    },
    canContribute() {
      return Boolean(this.receipt?.locationOsmId && this.receipt?.locationOsmType)
    },
    pendingVerificationCount() {
      return this.items.filter((item) => !item.verified).length
    },
    sentPriceCount() {
      return this.items.filter((item) => this.itemPriceAlreadySent(item)).length
    },
    contributableItems() {
      return this.items.filter((item) => this.itemCanContribute(item) && !this.itemPriceAlreadySent(item))
    },
    contributeStatus() {
      if (!this.contributableItems.length && this.sentPriceCount) {
        return this.$t('review.contributeAlreadySent', { count: this.sentPriceCount })
      }
      if (this.pendingVerificationCount) {
        return this.$t('review.contributePending', {
          count: this.contributableItems.length,
          pending: this.pendingVerificationCount
        })
      }
      return this.$t('review.contributeReady', { count: this.contributableItems.length })
    },
    canSendContribute() {
      return Boolean(
        this.appStore.user?.token
        && this.canContribute
        && this.receiptDate
        && this.contributableItems.length
        && !this.contributing
      )
    },
    total() {
      return this.items.reduce((sum, item) => {
        const price = Number(item.price)
        const quantity = Number(item.quantity) || 0
        if (!Number.isFinite(price)) return sum
        return sum + (price * quantity)
      }, 0)
    },
    formattedTotal() {
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: this.currency
        }).format(this.total)
      } catch {
        return `${this.total.toFixed(2)} ${this.currency}`
      }
    }
  },
  mounted() {
    this.receiptOpen = typeof window !== 'undefined'
      && window.matchMedia('(min-width: 960px)').matches
    this.ensureReceipt()
    this.syncSelectedLocationFromStore()
    this.autoFetchMissingProducts()
    if (this.$route.query.edit) this.openProductPreview(this.$route.query.edit)
  },
  unmounted() {
    if (this.locationSearchTimer) {
      clearTimeout(this.locationSearchTimer)
      this.locationSearchTimer = null
    }
  },
  methods: {
    ensureReceipt() {
      if (this.$route.query.mock === '1') {
        this.appStore.loadMockReceipt()
        this.syncSelectedLocationFromStore()
        return
      }
      // Keep a restored History entry even when it has no Open Prices proofId.
      if (this.appStore.getReceipt.historyId) return
      if (!this.appStore.getReceipt.proofId && this.appStore.getItems.length === 0) {
        this.appStore.loadMockReceipt()
        this.syncSelectedLocationFromStore()
      }
    },
    loadMock() {
      this.appStore.loadMockReceipt()
      this.syncSelectedLocationFromStore()
    },
    syncSelectedLocationFromStore() {
      if (!this.receipt?.locationOsmId) {
        this.selectedLocation = null
        return
      }
      this.selectedLocation = {
        value: `${this.receipt.locationOsmType}:${this.receipt.locationOsmId}`,
        label: this.receipt.locationName || `${this.receipt.locationOsmType} ${this.receipt.locationOsmId}`,
        osmId: this.receipt.locationOsmId,
        osmType: this.receipt.locationOsmType,
        name: this.receipt.locationName
      }
      this.locationOptions = [this.selectedLocation]
    },
    onDateChange(value) {
      this.appStore.updateReceiptMeta({ date: value || null })
    },
    onCurrencyChange(value) {
      this.appStore.updateReceiptMeta({ currency: value || 'EUR' })
    },
    clearLocation() {
      this.selectedLocation = null
      this.locationOptions = []
      this.locationQuery = ''
      this.locationMessage = null
      this.appStore.updateReceiptMeta({
        locationOsmId: null,
        locationOsmType: null,
        locationName: null,
        contributePrices: false
      })
    },
    onLocationSelected(option) {
      if (!option) {
        this.clearLocation()
        return
      }
      this.appStore.updateReceiptMeta({
        locationOsmId: option.osmId,
        locationOsmType: option.osmType,
        locationName: option.name || option.label,
        contributePrices: true
      })
      this.locationMessage = null
    },
    onLocationSearch(query) {
      this.locationQuery = query || ''
      if (this.locationSearchTimer) {
        clearTimeout(this.locationSearchTimer)
      }

      const trimmed = String(query || '').trim()
      if (trimmed.length < 3) {
        return
      }

      this.locationSearchTimer = setTimeout(() => {
        this.searchLocations(trimmed)
      }, 350)
    },
    searchLocations(query) {
      this.locationSearching = true
      this.locationMessage = null

      // Photon is more reliable from the browser than Nominatim (CORS).
      openStreetMapApi.openstreetmapSearch(query, 'photon')
        .then((results) => {
          const options = (results || [])
            .map((result) => this.normalizePhotonResult(result))
            .filter(Boolean)

          this.locationOptions = options
          if (!options.length) {
            this.locationMessageType = 'warning'
            this.locationMessage = this.$t('review.locationNoResults')
          }
        })
        .catch(() => {
          this.locationOptions = []
          this.locationMessageType = 'error'
          this.locationMessage = this.$t('review.locationError')
        })
        .finally(() => {
          this.locationSearching = false
        })
    },
    normalizePhotonResult(feature) {
      const props = feature?.properties || {}
      const osmId = props.osm_id
      const osmType = this.normalizeOsmType(props.osm_type)
      if (!osmId || !osmType) return null

      const parts = [
        props.name,
        props.street,
        props.housenumber,
        props.city || props.town || props.village,
        props.country
      ].filter(Boolean)

      const label = parts.join(', ') || `${osmType} ${osmId}`
      return {
        value: `${osmType}:${osmId}`,
        label,
        name: props.name || label,
        osmId: Number(osmId),
        osmType
      }
    },
    normalizeOsmType(value) {
      if (!value) return null
      const key = String(value).toLowerCase()
      return OSM_TYPE_MAP[key] || null
    },
    normalizeForCompare(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
    },
    onUpdateItem(id, patch) {
      const current = this.appStore.getItems.find((entry) => entry.id === id)
      const nextPatch = { ...patch }

      if (
        current
        && Object.prototype.hasOwnProperty.call(patch, 'barcode')
        && String(patch.barcode || '') !== String(current.barcode || '')
      ) {
        nextPatch.verified = false
        nextPatch.off = null
        if (patch.barcode) {
          nextPatch.categoryTag = null
          nextPatch.noBarcodeAvailable = false
        }
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'noBarcodeAvailable') && patch.noBarcodeAvailable) {
        nextPatch.barcode = null
        // Only clear OFF / verification when the caller did not set them explicitly
        // (e.g. category confirm may send noBarcodeAvailable with a fresh off payload).
        if (!Object.prototype.hasOwnProperty.call(patch, 'off')) {
          nextPatch.off = null
        }
        if (!Object.prototype.hasOwnProperty.call(patch, 'verified')) {
          nextPatch.verified = false
        }
      }

      this.appStore.updateItem(id, nextPatch)
    },
    onRemoveItem(id) {
      if (this.scanningItemId === id) {
        this.scanningItemId = null
        this.scannerOpen = false
      }
      if (this.swipeOpenItemId === id) {
        this.swipeOpenItemId = null
      }
      this.appStore.removeItem(id)
    },
    onItemSwipeOpen(id) {
      this.swipeOpenItemId = id
    },
    onItemSwipeClose(id) {
      if (this.swipeOpenItemId === id) {
        this.swipeOpenItemId = null
      }
    },
    onAddItem() {
      this.appStore.addItem({
        name: '',
        price: null,
        quantity: 1,
        barcode: null,
        categoryTag: null,
        off: null
      })
    },
    openScanner(itemId) {
      this.scanningItemId = itemId
      this.scannerOpen = true
    },
    onBarcodeScanned(barcode) {
      const itemId = this.scanningItemId
      this.scanningItemId = null
      if (!itemId || !barcode) return

      if (this.previewOpen && this.previewItemId === itemId) {
        this.previewBarcodeDraft = barcode
        this.previewCorrecting = true
        this.previewNoBarcodeMode = false
        this.applyPreviewBarcode()
        return
      }

      this.appStore.updateItem(itemId, {
        barcode,
        categoryTag: null,
        verified: false,
        off: null,
        noBarcodeAvailable: false
      })
      this.enrichFromBarcode(itemId, barcode)
    },
    enrichFromBarcode(itemId, barcode) {
      if (!itemId || !barcode) return

      openFoodFactsApi.openfoodfactsProductSearch(barcode)
        .then((data) => {
          if (!data || data.status !== 1 || !data.product) return
          this.applyProductToItem(itemId, data.product)
        })
        .catch(() => {
          // Keep the barcode even if OFF lookup fails.
        })
    },
    // Barcodes without Open Food Facts details are loaded before the list is shown.
    autoFetchMissingProducts() {
      const missing = this.items.filter((item) => item.barcode && !item.off)
      if (!missing.length) return
      this.fetchingProducts = true
      openFoodFactsApi.fetchProductsByCode(missing.map((item) => item.barcode))
        .then((byCode) => {
          missing.forEach((item) => {
            const product = byCode.get(String(item.barcode))
            if (product) this.applyProductToItem(item.id, product)
          })
        })
        .finally(() => {
          this.fetchingProducts = false
        })
    },
    applyProductToItem(itemId, product) {
      const item = this.appStore.getItems.find((entry) => entry.id === itemId)
      if (!item || !product) return

      const patch = {
        categoryTag: null,
        noBarcodeAvailable: false,
        off: openFoodFactsApi.toItemOff(product)
      }

      // Keep receipt OCR text when present; only fill empty names from OFF.
      if ((!item.name || !item.name.trim()) && product.product_name) {
        patch.name = product.product_name
      }

      this.appStore.updateItem(itemId, patch)
    },
    useOffName(itemId) {
      const item = this.appStore.getItems.find((entry) => entry.id === itemId)
      const offName = item?.off?.product_name
      if (!item || !offName) return
      this.appStore.updateItem(itemId, { name: offName })
    },
    confirmProduct(itemId) {
      const item = this.appStore.getItems.find((entry) => entry.id === itemId)
      if (!item?.off) return
      this.appStore.updateItem(itemId, {
        verified: true,
        categoryTag: null,
        noBarcodeAvailable: false
      })
      this.previewCorrecting = false
      this.previewNoBarcodeMode = false
    },
    clearIncorrectBarcode(itemId) {
      this.appStore.updateItem(itemId, {
        barcode: null,
        off: null,
        verified: false,
        noBarcodeAvailable: false,
        categoryTag: null
      })
      this.previewCorrecting = true
      this.previewNoBarcodeMode = false
      this.previewBarcodeDraft = ''
    },
    confirmCategory(itemId) {
      const item = this.appStore.getItems.find((entry) => entry.id === itemId)
      if (!item?.categoryTag || this.categoryImageLoading) return

      this.categoryImageLoading = true
      this.categoryImageMessage = null

      this.appStore.updateItem(itemId, {
        verified: true,
        barcode: null,
        noBarcodeAvailable: true,
        off: {
          nutriscore_grade: null,
          nova_group: null,
          ecoscore_grade: null,
          image_front_small_url: null,
          image_front_url: null,
          brands: null,
          quantity: null
        }
      })
      this.previewCorrecting = false
      this.previewNoBarcodeMode = true

      openFoodFactsApi.openfoodfactsCategoryImageSearch(item.categoryTag)
        .then((imageData) => {
          const current = this.appStore.getItems.find((entry) => entry.id === itemId)
          if (!current || current.categoryTag !== item.categoryTag) return

          if (!imageData || !(imageData.image_front_small_url || imageData.image_front_url)) {
            this.categoryImageMessage = this.$t('review.categoryImageError')
            return
          }

          this.appStore.updateItem(itemId, {
            off: {
              ...(current.off || {}),
              image_front_small_url: imageData.image_front_small_url || null,
              image_front_url: imageData.image_front_url || imageData.image_front_small_url || null
            }
          })
          this.categoryImageMessage = null
        })
        .catch(() => {
          this.categoryImageMessage = this.$t('review.categoryImageError')
        })
        .finally(() => {
          this.categoryImageLoading = false
        })
    },
    onOriginSearch(query) {
      this.originSearch = query || ''
    },
    onPreviewOriginChange(value) {
      if (!this.previewItemId) return
      this.onUpdateItem(this.previewItemId, { originTag: value || null })
      this.originSearch = value ? (openFoodFactsOrigins.getOriginName(value) || '') : ''
    },
    onPreviewOrganicChange(value) {
      if (!this.previewItemId) return
      this.onUpdateItem(this.previewItemId, { organic: Boolean(value) })
    },
    onCategorySearch(query) {
      this.categorySearch = query || ''
    },
    onPreviewNameChange(value) {
      if (!this.previewItemId) return
      this.appStore.updateItem(this.previewItemId, { name: value || '' })
    },
    onPreviewPriceChange(value) {
      if (!this.previewItemId) return
      this.onUpdateItem(this.previewItemId, { price: this.parsePreviewNumber(value) })
    },
    onPreviewQuantityChange(value) {
      if (!this.previewItemId) return
      const parsed = this.parsePreviewNumber(value)
      this.onUpdateItem(this.previewItemId, {
        quantity: parsed === null || parsed <= 0 ? 1 : parsed
      })
    },
    // Category prices are per kg; barcode (product) prices are per package.
    isCategoryPriced(item) {
      return Boolean(item && !item.barcode && item.categoryTag)
    },
    parsePreviewNumber(value) {
      if (value === '' || value === null || value === undefined) return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    },
    onPreviewCategoryChange(categoryTag) {
      if (!this.previewItemId) return
      this.appStore.updateItem(this.previewItemId, {
        categoryTag: categoryTag || null,
        barcode: null,
        verified: false,
        off: null,
        noBarcodeAvailable: true
      })
      this.previewNoBarcodeMode = true
      this.previewCorrecting = false
      this.previewBarcodeDraft = ''
      if (categoryTag) {
        this.categorySearch = openFoodFactsCategories.getCategoryName(categoryTag) || ''
      }
    },
    markNoBarcodeAvailable(itemId) {
      const item = this.appStore.getItems.find((entry) => entry.id === itemId)
      if (!item) return
      this.appStore.updateItem(itemId, {
        barcode: null,
        off: null,
        verified: false,
        noBarcodeAvailable: true,
        categoryTag: item.categoryTag || null
      })
      this.previewCorrecting = false
      this.previewNoBarcodeMode = true
      this.previewBarcodeDraft = ''
    },
    applyPreviewBarcode() {
      const itemId = this.previewItemId
      const barcode = String(this.previewBarcodeDraft || '').trim()
      if (!itemId || !barcode) return

      this.previewLookingUp = true
      this.appStore.updateItem(itemId, {
        barcode,
        categoryTag: null,
        verified: false,
        off: null,
        noBarcodeAvailable: false
      })

      openFoodFactsApi.openfoodfactsProductSearch(barcode)
        .then((data) => {
          if (!data || data.status !== 1 || !data.product) {
            this.previewCorrecting = true
            return
          }
          this.applyProductToItem(itemId, data.product)
          this.previewCorrecting = false
          this.previewNoBarcodeMode = false
        })
        .catch(() => {
          this.previewCorrecting = true
        })
        .finally(() => {
          this.previewLookingUp = false
        })
    },
    onPreviewOpenChange(open) {
      if (!open) {
        this.previewCorrecting = false
        this.previewNoBarcodeMode = false
        this.previewBarcodeDraft = ''
        this.previewLookingUp = false
        this.previewPhotoMessage = null
        this.previewItemId = null
        this.categorySearch = ''
        this.originSearch = ''
        this.categoryImageLoading = false
        this.categoryImageMessage = null
      }
    },
    openProductPreview(itemId) {
      const item = this.appStore.getItems.find((entry) => entry.id === itemId)
      this.previewItemId = itemId
      this.previewOpen = true
      this.previewBarcodeDraft = item?.barcode || ''
      this.previewCorrecting = false
      this.previewNoBarcodeMode = Boolean(
        item && (
          item.noBarcodeAvailable
          || item.categoryTag
          || !item.barcode
        )
      )
      this.previewLookingUp = false
      this.previewPhotoMessage = null
      this.categoryImageLoading = false
      this.categoryImageMessage = null
      this.categorySearch = item?.categoryTag
        ? (openFoodFactsCategories.getCategoryName(item.categoryTag) || '')
        : ''
      this.originSearch = item?.originTag
        ? (openFoodFactsOrigins.getOriginName(item.originTag) || '')
        : ''
    },
    openGalleryPhotoPicker() {
      this.previewPhotoMessage = null
      this.$refs.galleryPhotoInput?.click()
    },
    openCameraPhotoPicker() {
      this.previewPhotoMessage = null
      this.$refs.cameraPhotoInput?.click()
    },
    onProductPhotoSelected(event) {
      const input = event.target
      const [file] = input.files || []
      input.value = ''
      if (!file || !this.previewItemId) return

      const maxBytes = 5 * 1024 * 1024
      if (file.size > maxBytes) {
        this.previewPhotoMessage = this.$t('review.productPhotoTooLarge')
        return
      }

      if (!String(file.type || '').startsWith('image/')) {
        this.previewPhotoMessage = this.$t('review.productPhotoError')
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : null
        if (!result) {
          this.previewPhotoMessage = this.$t('review.productPhotoError')
          return
        }
        this.appStore.updateItem(this.previewItemId, { userPhotoUrl: result })
        this.previewPhotoMessage = null
      }
      reader.onerror = () => {
        this.previewPhotoMessage = this.$t('review.productPhotoError')
      }
      reader.readAsDataURL(file)
    },
    removeProductPhoto(itemId) {
      this.appStore.updateItem(itemId, { userPhotoUrl: null })
      this.previewPhotoMessage = null
    },
    goBack() {
      this.$router.push({ name: 'upload' })
    },
    saveDraft() {
      if (!this.items.length || this.savingDraft) return
      this.savingDraft = true
      this.draftMessage = null
      this.appStore.saveReceiptToHistory('draft')
        .then(() => {
          this.draftMessageType = 'success'
          this.draftMessage = this.$t('review.saveDraftSuccess')
        })
        .catch(() => {
          this.draftMessageType = 'error'
          this.draftMessage = this.$t('review.saveDraftError')
        })
        .finally(() => {
          this.savingDraft = false
        })
    },
    persistScoredThenGo() {
      this.savingScored = true
      this.draftMessage = null
      return this.appStore.saveReceiptToHistory('scored')
        .then(() => {
          this.$router.push({ name: 'score' })
        })
        .catch(() => {
          this.draftMessageType = 'error'
          this.draftMessage = this.$t('review.saveScoredError')
        })
        .finally(() => {
          this.savingScored = false
        })
    },
    goNext() {
      this.persistScoredThenGo()
    },
    buildPricePayload(item) {
      const price = Number(item.price)
      const quantity = Number(item.quantity)
      const payload = {
        price,
        currency: this.currency,
        date: this.receiptDate,
        location_osm_id: this.receipt.locationOsmId,
        location_osm_type: this.receipt.locationOsmType,
        receipt_quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
      }

      if (this.receipt.proofId) {
        payload.proof_id = this.receipt.proofId
      }

      if (!item.barcode && item.originTag) {
        payload.origins_tags = [item.originTag]
      }
      if (!item.barcode && item.organic) {
        payload.labels_tags = [constants.LABEL_ORGANIC]
      }

      if (item.barcode) {
        payload.type = constants.PRICE_TYPE_PRODUCT
        payload.product_code = String(item.barcode)
      } else if (item.categoryTag) {
        payload.type = constants.PRICE_TYPE_CATEGORY
        payload.category_tag = item.categoryTag
        payload.price_per = 'KILOGRAM'
      }

      return payload
    },
    itemCanContribute(item) {
      if (!item?.verified) return false
      if (!Number.isFinite(Number(item.price))) return false
      return Boolean(item.barcode || item.categoryTag)
    },
    pricePayloadKey(payload) {
      const identity = payload.product_code || payload.category_tag || ''
      return [
        payload.type,
        identity,
        Number(payload.price),
        payload.currency,
        payload.date,
        payload.location_osm_id,
        payload.location_osm_type,
        payload.price_per || '',
        (payload.origins_tags || []).join(','),
        (payload.labels_tags || []).join(',')
      ].join('|')
    },
    itemPriceAlreadySent(item) {
      if (!item || !this.itemCanContribute(item)) return Boolean(item?.priceSent)
      if (item.priceSent) return true
      const keys = this.receipt?.sentPriceKeys || []
      if (!keys.length) return false
      return keys.includes(this.pricePayloadKey(this.buildPricePayload(item)))
    },
    // Turn an Open Prices / network failure into something readable.
    describeContributeError(error) {
      if (error && typeof error.status === 'number') {
        const detail = error.data && error.data.detail
        let text = ''
        if (Array.isArray(detail)) {
          text = detail
            .map((entry) => `${(entry.loc || []).slice(1).join('.')}: ${entry.msg}`)
            .join('; ')
        } else if (typeof detail === 'string') {
          text = detail
        }
        return `${error.status}${text ? ` ${text}` : ''}`
      }
      return error && error.message ? error.message : this.$t('review.contributeUnknownError')
    },
    sendContributePrices() {
      this.contributeMessage = null
      this.contributeDetail = null

      if (!this.appStore.user?.token) {
        this.contributeMessageType = 'warning'
        this.contributeMessage = this.$t('review.contributeNeedSignIn')
        return
      }
      if (!this.canContribute) {
        this.contributeMessageType = 'warning'
        this.contributeMessage = this.$t('review.contributeNeedLocation')
        return
      }
      if (!this.receiptDate) {
        this.contributeMessageType = 'warning'
        this.contributeMessage = this.$t('review.contributeNeedDate')
        return
      }

      const seen = new Set(this.receipt.sentPriceKeys || [])
      const queued = []
      this.contributableItems.forEach((item) => {
        const payload = this.buildPricePayload(item)
        const key = this.pricePayloadKey(payload)
        if (seen.has(key)) return
        seen.add(key)
        queued.push({ item, payload, key })
      })

      if (!queued.length) {
        this.contributeMessageType = 'warning'
        this.contributeMessage = this.$t('review.contributeNothingToSend')
        return
      }

      // Button click is the contribute action — keep the toggle in sync.
      this.appStore.updateReceiptMeta({ contributePrices: true })
      this.contributing = true

      Promise.allSettled(
        queued.map((entry) => openPricesApi.createPrice(entry.payload, 'review'))
      )
        .then((results) => {
          const succeededKeys = new Set()
          results.forEach((result, index) => {
            if (result.status !== 'fulfilled') return
            succeededKeys.add(queued[index].key)
            this.appStore.updateItem(queued[index].item.id, { priceSent: true })
          })

          if (succeededKeys.size) {
            const nextKeys = new Set([...(this.receipt.sentPriceKeys || []), ...succeededKeys])
            this.appStore.updateReceiptMeta({ sentPriceKeys: [...nextKeys] })
            this.items.forEach((item) => {
              if (item.priceSent || !this.itemCanContribute(item)) return
              const key = this.pricePayloadKey(this.buildPricePayload(item))
              if (succeededKeys.has(key)) {
                this.appStore.updateItem(item.id, { priceSent: true })
              }
            })
          }

          const sent = succeededKeys.size
          const failed = results.length - sent
          const reasons = results
            .filter((result) => result.status === 'rejected')
            .map((result) => this.describeContributeError(result.reason))
          if (reasons.length) {
            console.error('Open Prices rejected price(s):', results.filter((r) => r.status === 'rejected').map((r) => r.reason))
          }
          this.contributeDetail = reasons.length ? [...new Set(reasons)].join(' · ') : null
          if (!failed) {
            this.contributeMessageType = 'success'
            this.contributeMessage = this.$t('review.contributeSuccess', {
              sent,
              total: results.length
            })
            return
          }
          this.contributeMessageType = sent ? 'warning' : 'error'
          this.contributeMessage = [
            this.$t('review.contributePartial', { sent, total: results.length, failed }),
            this.contributeDetail ? this.$t('review.contributeDetail', { detail: this.contributeDetail }) : null
          ].filter(Boolean).join(' ')
        })
        .catch(() => {
          this.contributeMessageType = 'error'
          this.contributeMessage = this.$t('review.contributeError')
        })
        .finally(() => {
          this.contributing = false
        })
    }
  }
}

</script>

<style scoped>
.review {
  min-height: 100dvh;
  padding: 0.9rem 0.8rem 0;
  color: var(--smr-cream, #F7FBF4);
  background: linear-gradient(160deg, #16382A 0%, #0E241C 100%);
  overflow-x: clip;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.review__header {
  margin-bottom: 0.85rem;
  width: 100%;
}

.review__title {
  margin: 0;
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.45rem;
  font-weight: 700;
  line-height: 1.2;
}

.review__subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  line-height: 1.35;
  color: rgba(232, 242, 230, 0.72);
}

.review__layout {
  display: grid;
  gap: 0.8rem;
  margin-bottom: 1.25rem;
  width: 100%;
  max-width: 56rem;
  align-items: start;
}

.review__layout--with-receipt {
  max-width: 74rem;
}

.review__main {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-width: 0;
}

.review__panel {
  width: 100%;
  max-width: 100%;
  padding: 0.85rem 0.8rem;
  border-radius: 1rem;
  background: #F7FBF4;
  color: #0E241C;
  box-shadow: 0 10px 26px rgba(6, 18, 13, 0.22);
  box-sizing: border-box;
}

.review__panel--receipt {
  min-width: 0;
  order: -1;
  padding: 0.35rem;
}

.review__receipt-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.55rem 0.55rem;
  border: 0;
  border-radius: 0.7rem;
  background: transparent;
  color: #0E241C;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.review__receipt-toggle:focus-visible {
  outline: 2px solid #1F6B4A;
  outline-offset: 1px;
}

.review__receipt-toggle-label {
  flex: 1;
  min-width: 0;
}

.review__receipt-toggle-chevron {
  color: rgba(14, 36, 28, 0.5);
}

.review__receipt-frame {
  overflow: auto;
  max-height: min(48dvh, 24rem);
  margin: 0.2rem 0.2rem 0.2rem;
  padding: 0.35rem;
  border-radius: 0.7rem;
  background:
    linear-gradient(#F7FBF4, #F7FBF4) padding-box,
    linear-gradient(160deg, rgba(31, 107, 74, 0.55), rgba(14, 36, 28, 0.35)) border-box;
  border: 3px solid transparent;
  box-shadow:
    inset 0 0 0 1px rgba(14, 36, 28, 0.08),
    0 0 0 1px rgba(14, 36, 28, 0.12);
  -webkit-overflow-scrolling: touch;
}

.review__receipt-image {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 0.4rem;
  border: 1px solid rgba(14, 36, 28, 0.14);
  background: #fff;
}

.review__panel-head {
  margin-bottom: 0.2rem;
}

.review__panel-head--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.review__panel-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.review__panel-title--sm {
  margin-bottom: 0.7rem;
  font-size: 1rem;
}

.review__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.4rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: rgba(31, 107, 74, 0.14);
  color: #1F6B4A;
  font-size: 0.75rem;
  font-weight: 700;
}

.review__items-hint {
  margin: 0.15rem 0 0.7rem;
  font-size: 0.76rem;
  line-height: 1.35;
  color: rgba(14, 36, 28, 0.55);
}

.review__meta-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.7rem;
  align-items: start;
}

.review__meta-location {
  grid-column: 1 / -1;
  min-width: 0;
}

.review__meta-field :deep(.v-field) {
  border-radius: 0.65rem;
  background: #fff;
  font-size: 0.92rem;
}

.review__meta-field--date :deep(input) {
  text-align: left;
  min-width: 0;
}

.review__contribute-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  margin: 0.4rem 0 0;
  font-size: 0.76rem;
  line-height: 1.35;
  color: #8A5A00;
}

.review__contribute-hint .v-icon {
  margin-top: 0.1rem;
  flex-shrink: 0;
}

.review__contribute-hint--ok {
  color: #1F6B4A;
}

.review__table-wrap {
  overflow: visible;
}

.review__table {
  display: block;
  width: 100%;
  border-collapse: collapse;
}

.review__table tbody {
  display: block;
  width: 100%;
}

.review__thead {
  display: none;
}

.review__th-row {
  padding: 0;
  border-bottom: 1px solid rgba(14, 36, 28, 0.1);
}

.review__th-grid {
  display: grid;
  grid-template-columns: 2.25rem 3.25rem minmax(8rem, 1fr) minmax(13rem, 15rem) 8.5rem 10.5rem;
  min-width: 50rem;
}

.review__th {
  display: block;
  padding: 0.4rem 0.5rem;
  text-align: left;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(14, 36, 28, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review__th--product {
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}

.review__add-item {
  margin-top: 0.7rem;
  border-style: dashed;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.review__contribute-send {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.7rem;
  margin-top: 0.9rem;
  padding: 0.8rem;
  border-radius: 0.8rem;
  background: rgba(31, 107, 74, 0.08);
  border: 1px solid rgba(31, 107, 74, 0.18);
}

.review__contribute-send-copy {
  min-width: 0;
}

.review__contribute-send-status {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #0E241C;
}

.review__contribute-send-hint {
  margin: 0.2rem 0 0;
  font-size: 0.76rem;
  line-height: 1.35;
  color: rgba(14, 36, 28, 0.62);
}

.review__contribute-send .v-btn {
  width: 100%;
  min-width: 0;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.review__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 0.5rem;
  color: rgba(14, 36, 28, 0.7);
  font-size: 0.9rem;
}

.review__loading p {
  margin: 0;
}

.review__empty {
  padding: 1.25rem 0.5rem;
  text-align: center;
}

.review__empty p {
  margin: 0 0 0.75rem;
  color: rgba(14, 36, 28, 0.7);
}

/* Sticky bottom action bar */
.review__dock {
  position: sticky;
  bottom: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: auto -0.8rem 0;
  padding: 0.65rem 0.8rem;
  background: rgba(14, 36, 28, 0.92);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(232, 242, 230, 0.14);
  box-sizing: border-box;
}

.review__dock-back {
  flex-shrink: 0;
  color: var(--smr-mist, #E8F2E6) !important;
}

.review__dock-summary {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}

.review__dock-count {
  font-size: 0.72rem;
  color: rgba(232, 242, 230, 0.7);
}

.review__dock-total {
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #F7FBF4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.review__dock-cta {
  flex-shrink: 0;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 700;
}

@media (min-width: 600px) {
  .review {
    padding: 1.1rem 1rem 0;
  }

  .review__dock {
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .review__title {
    font-size: 1.6rem;
  }

  .review__meta-grid {
    grid-template-columns: minmax(0, 1fr) minmax(9rem, 11rem) minmax(7rem, 8.5rem);
  }

  .review__meta-location {
    grid-column: auto;
  }

  .review__contribute-send {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .review__contribute-send .v-btn {
    width: auto;
  }

  .review__add-item {
    width: auto;
    align-self: flex-start;
  }
}

@media (min-width: 960px) {
  .review {
    padding: 1.25rem 1.25rem 0;
  }

  .review__dock {
    margin-left: -1.25rem;
    margin-right: -1.25rem;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .review__layout--with-receipt {
    grid-template-columns: minmax(15rem, 22rem) minmax(0, 1fr);
  }

  .review__panel--receipt {
    order: 0;
    position: sticky;
    top: 4.5rem;
  }

  .review__receipt-toggle {
    display: none;
  }

  .review__receipt-frame {
    display: block !important;
    max-height: min(70dvh, 40rem);
  }

  .review__table {
    display: table;
  }

  .review__table tbody {
    display: table-row-group;
  }

  .review__thead {
    display: table-header-group;
  }

  .review__items-hint {
    display: none;
  }

  .review__table-wrap {
    overflow-x: auto;
  }
}

.review__back {
  color: var(--smr-mist, #E8F2E6) !important;
}

.review-preview {
  max-height: min(92dvh, 640px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.review-preview__title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.65rem 0.65rem 0.35rem 0.85rem !important;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.25;
}

.review-preview__title-text {
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-preview__body {
  flex: 1;
  min-height: 0;
  padding: 0.35rem 0.85rem 0.85rem !important;
  overflow-x: hidden;
  overflow-y: auto;
  text-align: center;
  -webkit-overflow-scrolling: touch;
}

.review-preview__image {
  width: 110px;
  height: 110px;
  max-height: 110px;
  object-fit: contain;
  border-radius: 0.55rem;
  background: #F4F7F2;
  border: 1px solid rgba(14, 36, 28, 0.08);
}

.review-preview__photo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.review-preview__image--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(14, 36, 28, 0.35);
}

.review-preview__photo-badge {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #1F6B4A;
}

.review-preview__actions--photo {
  justify-content: center;
  align-items: center;
  margin-top: 0;
  gap: 0.3rem;
}

.review-preview__meta {
  margin: 0.35rem 0 0;
  color: rgba(14, 36, 28, 0.7);
  font-size: 0.78rem;
  line-height: 1.3;
}

.review-preview__match {
  margin-top: 0.55rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(14, 36, 28, 0.1);
  text-align: left;
}

.review-preview__match-label {
  margin: 0;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(14, 36, 28, 0.5);
}

.review-preview__match-name {
  margin: 0.15rem 0 0;
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.25;
  color: #0E241C;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-preview__receipt-name {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: rgba(14, 36, 28, 0.68);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-preview__warning {
  margin: 0.25rem 0 0;
  font-size: 0.72rem;
  line-height: 1.3;
  color: #A15C00;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-preview__confirmed {
  margin: 0.3rem 0 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1F6B4A;
}

.review-preview__hint {
  margin: 0.2rem 0 0.45rem;
  font-size: 0.72rem;
  line-height: 1.3;
  color: rgba(14, 36, 28, 0.6);
}

.review-preview__name-edit {
  margin-top: 0.55rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(14, 36, 28, 0.1);
  text-align: left;
}

.review-preview__name-field {
  margin-top: 0.3rem;
}

.review-preview__name-field :deep(.v-field) {
  border-radius: 0.5rem;
  background: #fff;
}

.review-preview__commerce {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  margin-top: 0.55rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(14, 36, 28, 0.1);
  text-align: left;
}

.review-preview__commerce-field {
  min-width: 0;
}

.review-preview__price-row,
.review-preview__qty-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.3rem;
}

.review-preview__price-field,
.review-preview__qty-field {
  flex: 1;
  min-width: 0;
}

.review-preview__unit {
  flex-shrink: 0;
  min-width: 2.6rem;
  color: rgba(14, 36, 28, 0.65);
  font-size: 0.85rem;
  font-weight: 600;
}

.review-preview__currency {
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(14, 36, 28, 0.55);
}

.review-preview__price-field :deep(.v-field),
.review-preview__qty-field :deep(.v-field) {
  border-radius: 0.5rem;
  background: #fff;
}

.review-preview__extras {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.55rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(14, 36, 28, 0.1);
  text-align: left;
}

.review-preview__origin-field {
  margin-top: 0.3rem;
}

.review-preview__origin-field :deep(.v-field) {
  border-radius: 0.5rem;
  background: #fff;
}

.review-preview__organic {
  margin-left: -0.15rem;
}

.review-preview__edit,
.review-preview__category {
  margin-top: 0.55rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(14, 36, 28, 0.1);
  text-align: left;
}

.review-preview__barcode-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.35rem 0 0;
}

.review-preview__barcode-field {
  flex: 1;
}

.review-preview__barcode-field :deep(.v-field),
.review-preview__category-field :deep(.v-field) {
  border-radius: 0.5rem;
  background: #fff;
}

.review-preview__category-field {
  margin-top: 0.35rem;
}

.review-preview__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.45rem;
}
</style>
