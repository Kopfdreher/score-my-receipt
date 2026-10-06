import { defineStore } from 'pinia'
import mockReceipt from './data/mockReceipt'

function emptyReceipt() {
  return {
    proofId: null,
    imagePreviewUrl: null,
    locationOsmId: null,
    locationOsmType: null,
    date: null,
    currency: 'EUR',
    status: 'idle',
    errorMessage: null,
    items: []
  }
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
      this.receipt = {
        ...emptyReceipt(),
        ...this.receipt,
        ...payload,
        items: payload.items || this.receipt.items
      }
    },
    updateItem(id, patch) {
      const item = this.receipt.items.find((entry) => entry.id === id)
      if (item) {
        Object.assign(item, patch)
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
        off: item.off ?? null
      })
    },
    removeItem(id) {
      this.receipt.items = this.receipt.items.filter((entry) => entry.id !== id)
    },
    loadMockReceipt() {
      this.receipt = {
        ...emptyReceipt(),
        ...mockReceipt,
        items: mockReceipt.items.map((item) => ({ ...item }))
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
