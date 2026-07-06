// Seed catalog for the single demo store, transcribed from the seller's menu.
// Prices are in INR, per 1 kg unless noted, and already include the +100
// per-item markup applied to the live catalog. Telugu item names are best-effort
// transliterations — edit freely. Used by the admin "Seed catalog" action.

export const SEED_STORE = {
  name: 'Anupama Home Foods',
  description: 'Homemade traditional sweets, hot snacks, pickles and podis — made fresh to order.',
  pickupAddress: 'Hyderabad, Telangana',
  shippingFlatFee: 60,
  freeShippingThreshold: 1500,
  images: [],
  kyc: { pan: '', gst: '', payoutMethod: 'UPI', payoutDetails: '', docUrls: [] },
};

// Category name -> list of { name, price, unit }
export const SEED_CATEGORIES = {
  Sweets: [
    { name: 'Ariselu', price: 400, unit: 'kg' },
    { name: 'Laddu', price: 400, unit: 'kg' },
    { name: 'Bobbattlu', price: 500, unit: 'kg' },
    { name: 'Kova Bobbattlu', price: 600, unit: 'kg' },
    { name: 'Sunnundalu', price: 700, unit: 'kg' },
    { name: 'Boondhi', price: 340, unit: 'kg' },
    { name: 'Kaju Pakam (Cashew)', price: 1100, unit: 'kg' },
    { name: 'Mirai Achu', price: 500, unit: 'kg' },
    { name: 'Dry Fruit Laddu', price: 700, unit: 'kg' },
    { name: 'Ragi Laddu', price: 700, unit: 'kg' },
  ],
  'Hot Snacks': [
    { name: 'Gavvalu', price: 400, unit: 'kg' },
    { name: 'Karappusa', price: 350, unit: 'kg' },
    { name: 'Ribbon Pakodi', price: 350, unit: 'kg' },
    { name: 'Chakra Pakodi', price: 400, unit: 'kg' },
    { name: 'Chakralu', price: 350, unit: 'kg' },
    { name: 'Murukulu', price: 400, unit: 'kg' },
    { name: 'Chaya Chakralu', price: 500, unit: 'kg' },
    { name: 'Mixture', price: 400, unit: 'kg' },
  ],
  Pickles: [
    { name: 'Veg Pickle (all types)', price: 600, unit: 'kg' },
    { name: 'Chicken Pickle', price: 1100, unit: 'kg' },
    { name: 'Prawns Pickle', price: 1600, unit: 'kg' },
    { name: 'Fish Pickle', price: 1400, unit: 'kg' },
  ],
  Podis: [
    { name: 'Nalla Karam', price: 600, unit: 'kg' },
    { name: 'Kandi Podi', price: 600, unit: 'kg' },
    { name: 'Karivepaku Podi (Curry Leaf)', price: 600, unit: 'kg' },
    { name: 'Kobbari Karam (Coconut)', price: 600, unit: 'kg' },
    { name: 'Munaga Aku Karam (Drumstick Leaf)', price: 600, unit: 'kg' },
    { name: 'Dry Fruit Karam', price: 800, unit: 'kg' },
  ],
};
