import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, existsSync } from 'fs';
import env from './env.js';

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendDir = resolve(__dirname, '../..');

function initializeFirebaseAdmin() {
  // Avoid re-initialization
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    // Option 1: Service account file path (if file exists)
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

    // Option 2: Individual environment variables
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

    // Option 3: Try Application Default Credentials (ADC) / local environment auth
    const options = {};
    if (env.firebase.projectId) {
      options.projectId = env.firebase.projectId;
    }
    if (env.firebase.storageBucket) {
      options.storageBucket = env.firebase.storageBucket;
    }
    const app = initializeApp(options);
    console.log(`✓ Firebase Admin initialized with Application Default Credentials (ADC)${options.projectId ? ' for project ' + options.projectId : ''}`);
    return app;
  } catch (error) {
    console.error('✗ Failed to initialize Firebase Admin:', error.message);
    console.warn('⚠️ Server will run without Firebase operations. Configure backend/.env to enable Firebase features.');
    return null;
  }
}

const firebaseAdmin = initializeFirebaseAdmin();
export const authAdmin = firebaseAdmin ? getAuth(firebaseAdmin) : null;
export const firestoreAdmin = firebaseAdmin ? getFirestore(firebaseAdmin) : null;
export const storageAdmin = firebaseAdmin ? getStorage(firebaseAdmin) : null;
export default firebaseAdmin;
