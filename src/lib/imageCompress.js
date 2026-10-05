// Shrinks a photo before upload: phone cameras produce 4-12 MB images, far
// bigger than the app ever displays, which made uploads slow and tripped the
// per-file size limit. Scales the longest side down to `maxDim` and re-encodes
// as JPEG. Anything that can't be decoded here (e.g. HEIC on non-Apple
// browsers, GIFs, SVGs) is returned unchanged, as is a result that isn't
// actually smaller.
export async function compressImage(file, { maxDim = 2000, quality = 0.85 } = {}) {
  if (!file.type?.startsWith('image/') || /gif|svg/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || (scale === 1 && blob.size >= file.size)) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}
