import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, existsSync } from 'fs';
import env from './env.js';

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

let backendDir = process.cwd();
try {
  if (import.meta && import.meta.url) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    backendDir = resolve(__dirname, '../..');
  }
} catch (pathErr) {
  // Fallback to process.cwd() in bundled environments
}

function initializeFirebaseAdmin() {
  // Avoid re-initialization
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    // Option 1: JSON string or Base64 in FIREBASE_SERVICE_ACCOUNT_JSON env var (Highest priority for cloud deployments like Render/Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON && process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim()) {
      try {
        const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
        const jsonString = rawJson.startsWith('{')
          ? rawJson
          : Buffer.from(rawJson, 'base64').toString('utf8');
        const serviceAccount = JSON.parse(jsonString);
        const app = initializeApp({
          credential: cert(serviceAccount),
          storageBucket: env.firebase.storageBucket || `${serviceAccount.project_id}.firebasestorage.app`,
        });
        console.log('✓ Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT_JSON environment variable');
        return app;
      } catch (jsonErr) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', jsonErr.message);
      }
    }

    // Option 2: Service account file path (if file exists locally)
    const candidatePaths = [
      env.firebase.serviceAccountPath,
      'service-account.json',
      'backend/service-account.json',
      resolve(backendDir, 'service-account.json'),
      resolve(process.cwd(), 'backend/service-account.json'),
      resolve(process.cwd(), 'service-account.json')
    ].filter(Boolean);

    for (const pathCandidate of candidatePaths) {
      const resolvedPath = (pathCandidate.startsWith('/') || pathCandidate.includes(':'))
        ? pathCandidate
        : resolve(backendDir, pathCandidate);
      if (existsSync(resolvedPath)) {
        const serviceAccount = JSON.parse(
          readFileSync(resolvedPath, 'utf8')
        );
        const app = initializeApp({
          credential: cert(serviceAccount),
          storageBucket: env.firebase.storageBucket || `${serviceAccount.project_id}.firebasestorage.app`,
        });
        console.log('✓ Firebase Admin initialized with service account file:', resolvedPath);
        return app;
      }
    }

    // Option 3: Individual environment variables
    const hasRealKey = env.firebase.privateKey && 
                       !env.firebase.privateKey.includes('YOUR_PRIVATE_KEY_HERE') &&
                       !env.firebase.privateKey.includes('YOUR_KEY_HERE');

    if (env.firebase.projectId && env.firebase.clientEmail && hasRealKey) {
      const app = initializeApp({
        credential: cert({
          projectId: env.firebase.projectId,
          clientEmail: env.firebase.clientEmail,
          privateKey: env.firebase.privateKey,
        }),
        storageBucket: env.firebase.storageBucket,
      });
      console.log('✓ Firebase Admin initialized with environment variables');
      return app;
    }

    // Option 4: Try ADC if explicitly in Google Cloud environment
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
      const options = {};
      if (env.firebase.projectId) options.projectId = env.firebase.projectId;
      if (env.firebase.storageBucket) options.storageBucket = env.firebase.storageBucket;
      const app = initializeApp(options);
      console.log('✓ Firebase Admin initialized with Application Default Credentials (ADC)');
      return app;
    }

    console.warn('⚠️ No Firebase Admin credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in Environment Variables.');
    return null;
  } catch (error) {
    console.error('✗ Failed to initialize Firebase Admin:', error.message);
    return null;
  }
}

const firebaseAdmin = initializeFirebaseAdmin();

let authAdmin = null;
let firestoreAdmin = null;
let storageAdmin = null;

if (firebaseAdmin) {
  try {
    authAdmin = getAuth(firebaseAdmin);
  } catch (err) {
    console.error('Failed to getAuth:', err.message);
  }
  try {
    firestoreAdmin = getFirestore(firebaseAdmin);
  } catch (err) {
    console.error('Failed to getFirestore:', err.message);
  }
  try {
    storageAdmin = getStorage(firebaseAdmin);
  } catch (err) {
    console.error('Failed to getStorage:', err.message);
  }
}

export { authAdmin, firestoreAdmin, storageAdmin };
export default firebaseAdmin;
