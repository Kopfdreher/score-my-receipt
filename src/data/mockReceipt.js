export default {
  proofId: 'mock-proof-1',
  imagePreviewUrl: null,
  locationOsmId: 123456,
  locationOsmType: 'NODE',
  date: '2026-10-01',
  currency: 'EUR',
  status: 'ready',
  errorMessage: null,
  items: [
    {
      id: 'mock-1',
      name: 'Organic oat drink',
      price: 1.79,
      quantity: 1,
      barcode: '5411188115366',
      categoryTag: null,
      off: {
        nutriscore_grade: 'a',
        nova_group: 1,
        ecoscore_grade: 'b'
      }
    },
    {
      id: 'mock-2',
      name: 'Whole grain pasta',
      price: 1.29,
      quantity: 2,
      barcode: '8076809513388',
      categoryTag: null,
      off: {
        nutriscore_grade: 'a',
        nova_group: 1,
        ecoscore_grade: 'b'
      }
    },
    {
      id: 'mock-3',
      name: 'Cola 1.5L',
      price: 1.49,
      quantity: 1,
      barcode: '5449000000996',
      categoryTag: null,
      off: {
        nutriscore_grade: 'e',
        nova_group: 4,
        ecoscore_grade: 'd'
      }
    },
    {
      id: 'mock-4',
      name: 'Yogurt plain',
      price: 0.89,
      quantity: 4,
      barcode: '3017620422003',
      categoryTag: null,
      off: {
        nutriscore_grade: 'c',
        nova_group: 3,
        ecoscore_grade: 'c'
      }
    },
    {
      id: 'mock-5',
      name: 'Apples',
      price: 2.49,
      quantity: 1,
      barcode: null,
      categoryTag: 'en:apples',
      off: null
    },
    {
      id: 'mock-6',
      name: 'Bananas',
      price: 1.19,
      quantity: 1,
      barcode: null,
      categoryTag: 'en:bananas',
      off: null
    },
    {
      id: 'mock-7',
      name: 'Unknown bakery item',
      price: 2.1,
      quantity: 1,
      barcode: null,
      categoryTag: null,
      off: null
    }
  ]
}
