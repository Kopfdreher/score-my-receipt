import { defineStore } from 'pinia'
import mockReceipt from './data/mockReceipt'
import receiptHistoryDb from './services/receiptHistoryDb'

function emptyReceipt() {
  return {
    historyId: null,
    proofId: null,
    imagePreviewUrl: null,
    locationOsmId: null,
    locationOsmType: null,
    locationName: null,
    date: null,
    currency: 'EUR',
    contributePrices: false,
    sentPriceKeys: [],
    status: 'idle',
    errorMessage: null,
    items: []
  }
}

function sameSendField(key, previous, next) {
  if (key === 'price') return Number(previous) === Number(next)
  return (previous || null) === (next || null)
}

function revokePreviewUrl(url) {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    user: {
      username: null,
      token: null
    },
    receipt: emptyReceipt(),
    historySummaries: []
  }),
  getters: {
    getReceipt: (state) => state.receipt,
    getItems: (state) => state.receipt.items,
    getHistorySummaries: (state) => state.historySummaries
  },
  actions: {
    signIn(data) {
      this.user.username = data['user_id']
      this.user.token = data['access_token']
    },
    signOut() {
      this.user.username = null
      this.user.token = null
    },
    setReceiptFromCapture(payload) {
      const itemsReplaced = Object.prototype.hasOwnProperty.call(payload, 'items')
      if (payload.imagePreviewUrl && payload.imagePreviewUrl !== this.receipt.imagePreviewUrl) {
        revokePreviewUrl(this.receipt.imagePreviewUrl)
      }
      this.receipt = {
        ...emptyReceipt(),
        ...this.receipt,
        ...payload,
        historyId: payload.historyId ?? null,
        sentPriceKeys: itemsReplaced ? [] : (this.receipt.sentPriceKeys || []),
        items: payload.items || this.receipt.items
      }
    },
    updateReceiptMeta(patch) {
      const next = { ...patch }
      const contextChanged = ['locationOsmId', 'date', 'currency'].some((key) => (
        Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== this.receipt[key]
      ))
      if (Object.prototype.hasOwnProperty.call(patch, 'locationOsmId')) {
        const hasLocation = Boolean(patch.locationOsmId)
        if (!hasLocation) {
          next.locationOsmType = null
          next.locationName = null
          next.contributePrices = false
        }
      }
      Object.assign(this.receipt, next)
      if (!this.receipt.locationOsmId) {
        this.receipt.contributePrices = false
      }
      if (contextChanged) {
        this.receipt.items.forEach((item) => {
          item.priceSent = false
        })
      }
    },
    updateItem(id, patch) {
      const item = this.receipt.items.find((entry) => entry.id === id)
      if (!item) return

      const sendIdentityChanged = ['price', 'barcode', 'categoryTag'].some((key) => (
        Object.prototype.hasOwnProperty.call(patch, key)
        && !sameSendField(key, item[key], patch[key])
      ))
      Object.assign(item, patch)
      if (sendIdentityChanged && patch.priceSent !== true) {
        item.priceSent = false
      }
    },
    addItem(item) {
      this.receipt.items.push({
        id: item.id || `local-${Date.now()}`,
        name: item.name || '',
        price: item.price ?? null,
        quantity: item.quantity ?? 1,
        barcode: item.barcode ?? null,
        categoryTag: item.categoryTag ?? null,
        off: item.off ?? null,
        verified: item.verified ?? false,
        priceSent: item.priceSent ?? false,
        userPhotoUrl: item.userPhotoUrl ?? null,
        noBarcodeAvailable: item.noBarcodeAvailable ?? false
      })
    },
    removeItem(id) {
      this.receipt.items = this.receipt.items.filter((entry) => entry.id !== id)
    },
    loadMockReceipt() {
      revokePreviewUrl(this.receipt.imagePreviewUrl)
      this.receipt = {
        ...emptyReceipt(),
        ...mockReceipt,
        historyId: null,
        items: mockReceipt.items.map((item) => ({
          ...item,
          verified: Boolean(item.verified),
          priceSent: false,
          userPhotoUrl: item.userPhotoUrl || null,
          noBarcodeAvailable: Boolean(item.noBarcodeAvailable)
        }))
      }
    },
    resetReceipt() {
      revokePreviewUrl(this.receipt.imagePreviewUrl)
      this.receipt = emptyReceipt()
    },
    refreshHistorySummaries() {
      return receiptHistoryDb.list()
        .then((rows) => {
          this.historySummaries = rows
          return rows
        })
        .catch(() => {
          this.historySummaries = []
          return []
        })
    },
    saveReceiptToHistory(status) {
      const existingId = this.receipt.historyId
      const createdAtPromise = existingId
        ? receiptHistoryDb.get(existingId).then((row) => row?.createdAt || null)
        : Promise.resolve(null)

      return createdAtPromise
        .then((createdAt) => receiptHistoryDb.blobFromUrl(this.receipt.imagePreviewUrl)
          .then((image) => ({ createdAt, image })))
        .then(({ createdAt, image }) => {
          const record = receiptHistoryDb.buildRecord({
            id: existingId || undefined,
            status,
            receipt: this.receipt,
            items: this.receipt.items,
            image,
            createdAt
          })
          return receiptHistoryDb.put(record).then(() => record)
        })
        .then((record) => {
          this.receipt.historyId = record.id
          return this.refreshHistorySummaries().then(() => record)
        })
    },
    loadReceiptFromHistory(id) {
      return receiptHistoryDb.get(id)
        .then((record) => {
          if (!record) {
            throw new Error('History entry not found')
          }
          revokePreviewUrl(this.receipt.imagePreviewUrl)
          const imagePreviewUrl = record.image ? URL.createObjectURL(record.image) : null
          this.receipt = {
            ...emptyReceipt(),
            historyId: record.id,
            proofId: record.proofId,
            imagePreviewUrl,
            locationOsmId: record.locationOsmId,
            locationOsmType: record.locationOsmType,
            locationName: record.locationName,
            date: record.date,
            currency: record.currency || 'EUR',
            contributePrices: Boolean(record.contributePrices),
            sentPriceKeys: Array.isArray(record.sentPriceKeys) ? [...record.sentPriceKeys] : [],
            status: 'ready',
            errorMessage: null,
            items: receiptHistoryDb.cloneItems(record.items)
          }
          return record
        })
    },
    deleteReceiptHistory(id) {
      return receiptHistoryDb.remove(id)
        .then(() => {
          if (this.receipt.historyId === id) {
            this.receipt.historyId = null
          }
          return this.refreshHistorySummaries()
        })
    }
  },
  persist: {
    storage: localStorage,
    pick: ['user']
  }
})
