import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA9Fa1GdVmQSxVc0sU9tH6NUFrtG92_2UM',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'digital-legacy-vault-61b0a.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'digital-legacy-vault-61b0a',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'digital-legacy-vault-61b0a.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '392968582997',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:392968582997:web:9e54b0d7bb49994d9b21dc',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
