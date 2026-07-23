import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  reload,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create Firestore user profile
  async function createUserProfile(user, displayName) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log('Writing profile to Firestore users/', user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          displayName: displayName || user.displayName || '',
          email: user.email,
          photoURL: null,
          role: 'user',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
        console.log('Profile written successfully');
      } else {
        console.log('Profile already exists in Firestore');
      }
    } catch (error) {
      console.error('Firestore user profile creation failed:', error);
      throw error;
    }
  }

  // Update last login timestamp
  async function updateLastLogin(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  // Register new user
  async function register(email, password, displayName) {
    console.log('Starting registration for:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('Firebase Auth user created:', user.uid);

    // Update display name in Firebase Auth
    await updateProfile(user, { displayName });
    console.log('Firebase Auth profile updated with name:', displayName);

    // Send email verification
    try {
      await sendEmailVerification(user);
      console.log('Verification email sent successfully');
    } catch (emailErr) {
      console.error('Failed to send verification email, but continuing:', emailErr);
    }

    // Create Firestore profile
    console.log('Creating Firestore user profile...');
    await createUserProfile(user, displayName);
    console.log('Firestore user profile created successfully');

    return user;
  }

  // Login
  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await updateLastLogin(userCredential.user.uid);
    return userCredential.user;
  }

  // Logout
  async function logout() {
    await signOut(auth);
  }

  // Reset password
  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  // Resend verification email
  async function resendVerificationEmail() {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  }

  // Refresh user state (check email verification)
  async function refreshUser() {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      setCurrentUser({ ...auth.currentUser });
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    isAuthenticated: !!currentUser,
    emailVerified: currentUser?.emailVerified || false,
    login,
    register,
    logout,
    resetPassword,
    resendVerificationEmail,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
