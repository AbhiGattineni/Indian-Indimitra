// A store's shareable storefront URL. Opening it lands straight on that
// store, with no picker, so a business can share its own link.
export const storePath = (store) => (store?.id ? `/store/${store.id}` : '/');
