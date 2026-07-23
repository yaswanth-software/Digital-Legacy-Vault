import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const usersCollection = firestoreAdmin ? firestoreAdmin.collection('users') : null;

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid) {
  const userDoc = await usersCollection.doc(uid).get();

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
  const userRef = usersCollection.doc(uid);
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
  const userRef = usersCollection.doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    await userRef.update({
      lastLoginAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
