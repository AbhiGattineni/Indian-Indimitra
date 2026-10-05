// Firebase Storage helper for image uploads (product images, store images, docs).
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

// Uploads a File and returns its public download URL. The object name gets a
// random suffix: several files uploaded together start in the same
// millisecond, and photos picked from an iPhone's library are all named
// "image.jpg" -- a time+name key alone made them overwrite each other.
export async function uploadImage(path, file) {
  const safeName = (file.name || 'image').replace(/[^\w.-]+/g, '_');
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const storageRef = ref(storage, `${path}/${unique}_${safeName}`);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}
