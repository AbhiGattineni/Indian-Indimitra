// Firebase Storage helper for image uploads (product images, store images, docs).
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

// Uploads a File and returns its public download URL.
export async function uploadImage(path, file) {
  const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
