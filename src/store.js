import { defineStore } from 'pinia'
import mockReceipt from './data/mockReceipt'

function emptyReceipt() {
  return {
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

export const useAppStore = defineStore('app', {
  state: () => ({
    user: {
      username: null,
      token: null
    },
    receipt: emptyReceipt()
  }),
  getters: {
    getReceipt: (state) => state.receipt,
    getItems: (state) => state.receipt.items
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
      this.receipt = {
        ...emptyReceipt(),
        ...this.receipt,
        ...payload,
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

      const sendIdentityChanged = ['price', 'barcode', 'categoryTag', 'quantityUnit'].some((key) => (
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
        quantityUnit: item.quantityUnit || 'pcs',
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
      this.receipt = {
        ...emptyReceipt(),
        ...mockReceipt,
        items: mockReceipt.items.map((item) => ({
          ...item,
          verified: Boolean(item.verified),
          priceSent: false,
          userPhotoUrl: item.userPhotoUrl || null,
          noBarcodeAvailable: Boolean(item.noBarcodeAvailable),
          quantityUnit: item.quantityUnit || 'pcs'
        }))
      }
    },
    resetReceipt() {
      this.receipt = emptyReceipt()
    }
  },
  persist: {
    storage: localStorage,
    pick: ['user']
  }
})
