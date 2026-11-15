// A store's shareable storefront URL: /store/<slug>, e.g.
// /store/anupama-home-foods. Opening it lands straight on that store, with no
// picker, so a business can share its own link.
//
// `slug` is saved on the store when an admin creates or edits it (Admin ->
// Stores & products). Stores saved before that get one derived from their
// name. Links by store id (/store/<id>) keep working too.

export function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export const storeSlug = (store) => store?.slug || slugify(store?.name) || store?.id || '';

export const storePath = (store) => (store?.id ? `/store/${storeSlug(store)}` : '/');

export const storeUrl = (store) => `${window.location.origin}${storePath(store)}`;

// Resolve the :key in /store/:key. A saved slug wins, then a store id, then a
// slug derived from a name.
export function findStoreByKey(stores, key) {
  const k = (key || '').toLowerCase();
  return stores.find((s) => s.slug === k)
    || stores.find((s) => s.id === key)
    || stores.find((s) => !s.slug && slugify(s.name) === k)
    || null;
}

// Validation for the admin's link-name field. `stores` is every store, so a
// clash with another store's link is caught.
export function slugProblem(slug, stores, selfId) {
  if (!slug) return 'Enter a link name.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return 'Use lowercase letters, numbers and single dashes only.';
  const clash = stores.find((s) => s.id !== selfId && storeSlug(s) === slug);
  return clash ? `Already used by ${clash.name}.` : '';
}
