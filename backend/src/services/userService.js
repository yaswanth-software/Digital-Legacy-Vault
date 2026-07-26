import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const getUsersCollection = () => {
  if (!firestoreAdmin) {
    const err = new Error('Database service is unavailable. Please set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel Environment Variables.');
    err.status = 503;
    throw err;
  }
  return firestoreAdmin.collection('users');
};

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid) {
  const userDoc = await getUsersCollection().doc(uid).get();

  if (!userDoc.exists) {
    return null;
  }

  return userDoc.data();
}

/**
 * Create or update user profile
 * Used during registration to create the initial profile
 */
export async function createOrUpdateUserProfile(uid, userData) {
  const userRef = getUsersCollection().doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    // Update existing profile
    await userRef.update({
      ...userData,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    // Create new profile
    await userRef.set({
      uid,
      ...userData,
      role: 'user',
      photoURL: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    });
  }

  return (await userRef.get()).data();
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(uid) {
  const userRef = getUsersCollection().doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    await userRef.update({
      lastLoginAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
