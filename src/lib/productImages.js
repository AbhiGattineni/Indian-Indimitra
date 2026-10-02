// A product's photos, in display order. Products saved before multi-image
// support only have `imageUrl`; newer ones have `images` (with `imageUrl`
// kept equal to images[0] so cards, cart lines and orders -- which read
// imageUrl -- keep working unchanged).
export function productImages(product) {
  const list = (product?.images || []).filter(Boolean);
  if (list.length) return list;
  return product?.imageUrl ? [product.imageUrl] : [];
}

// Fields to save for a product's photo list.
export function imageFields(images) {
  const list = (images || []).filter(Boolean);
  return { images: list, imageUrl: list[0] || '' };
}
