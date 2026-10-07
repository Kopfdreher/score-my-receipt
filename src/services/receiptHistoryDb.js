const DB_NAME = 'score-my-receipt-history'
const DB_VERSION = 1
const STORE = 'receipts'

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error || new Error('Could not open history database'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (db.objectStoreNames.contains(STORE)) return
      const store = db.createObjectStore(STORE, { keyPath: 'id' })
      store.createIndex('status', 'status', { unique: false })
      store.createIndex('updatedAt', 'updatedAt', { unique: false })
      store.createIndex('date', 'date', { unique: false })
    }
  })
}

function withStore(mode, work) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    let result
    try {
      result = work(store)
    } catch (error) {
      reject(error)
      return
    }
    tx.oncomplete = () => {
      db.close()
      resolve(result)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error || new Error('History transaction failed'))
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error || new Error('History transaction aborted'))
    }
  }))
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('History request failed'))
  })
}

function cloneItems(items = []) {
  return items.map((item) => ({
    id: item.id,
    name: item.name || '',
    price: item.price ?? null,
    quantity: item.quantity ?? 1,
    barcode: item.barcode ?? null,
    categoryTag: item.categoryTag ?? null,
    originTag: item.originTag ?? null,
    organic: Boolean(item.organic),
    off: item.off ? { ...item.off } : null,
    verified: Boolean(item.verified),
    priceSent: Boolean(item.priceSent),
    userPhotoUrl: item.userPhotoUrl || null,
    noBarcodeAvailable: Boolean(item.noBarcodeAvailable)
  }))
}

function blobFromUrl(url) {
  if (!url || typeof url !== 'string') return Promise.resolve(null)
  if (!(url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http'))) {
    return Promise.resolve(null)
  }
  return fetch(url)
    .then((response) => (response.ok || url.startsWith('blob:') || url.startsWith('data:')
      ? response.blob()
      : null))
    .catch(() => null)
}

function summarize(record) {
  if (!record) return null
  return {
    id: record.id,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    proofId: record.proofId,
    date: record.date,
    currency: record.currency,
    locationName: record.locationName,
    itemCount: Array.isArray(record.items) ? record.items.length : 0,
    hasImage: Boolean(record.image)
  }
}

export default {
  list() {
    return withStore('readonly', (store) => requestToPromise(store.getAll()))
      .then((rows) => (rows || [])
        .map(summarize)
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))))
  },

  get(id) {
    if (!id) return Promise.resolve(null)
    return withStore('readonly', (store) => requestToPromise(store.get(id)))
  },

  put(record) {
    return withStore('readwrite', (store) => {
      store.put(record)
      return record.id
    })
  },

  remove(id) {
    if (!id) return Promise.resolve()
    return withStore('readwrite', (store) => {
      store.delete(id)
    })
  },

  blobFromUrl,
  cloneItems,
  summarize,

  buildRecord({
    id,
    status,
    receipt,
    items,
    image,
    createdAt
  }) {
    const now = new Date().toISOString()
    return {
      id: id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status,
      createdAt: createdAt || now,
      updatedAt: now,
      proofId: receipt.proofId ?? null,
      date: receipt.date || null,
      currency: receipt.currency || 'EUR',
      locationOsmId: receipt.locationOsmId ?? null,
      locationOsmType: receipt.locationOsmType ?? null,
      locationName: receipt.locationName || null,
      contributePrices: Boolean(receipt.contributePrices),
      sentPriceKeys: Array.isArray(receipt.sentPriceKeys) ? [...receipt.sentPriceKeys] : [],
      items: cloneItems(items),
      image: image || null
    }
  }
}
