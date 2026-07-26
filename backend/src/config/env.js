import dotenv from 'dotenv';
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

try {
  dotenv.config({ path: resolve(backendDir, '.env') });
} catch (envErr) {
  // Ignore missing .env in production/serverless
}

const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  invitationExpiryDays: parseInt(process.env.TRUSTED_PERSON_INVITATION_EXPIRY_DAYS, 10) || 7,
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev_secret_key',

  // Firebase Admin
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
    maxFilesPerUpload: parseInt(process.env.MAX_FILES_PER_UPLOAD, 10) || 5,
    maxFilesPerAsset: parseInt(process.env.MAX_FILES_PER_ASSET, 10) || 50,
  },

  isDevelopment() {
    return this.nodeEnv === 'development';
  },

  isProduction() {
    return this.nodeEnv === 'production';
  },
};

export default env;
