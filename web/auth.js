/**
 * Let's Keep Swimming - Authentication Module
 *
 * Handles Firebase authentication:
 * - Google OAuth sign in
 * - Email/password sign in and sign up
 * - Auth state management
 * - User profile management
 */

// Firebase configuration
// IMPORTANT: Replace these with your own Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyCJ0X9HaxuYPyWzcIADpZnNPcei8yKQbIc",
  authDomain: "lets-keep-swimming.firebaseapp.com",
  projectId: "lets-keep-swimming",
  storageBucket: "lets-keep-swimming.firebasestorage.app",
  messagingSenderId: "298160284764",
  appId: "1:298160284764:web:8b648bd4a342c619177299",
  measurementId: "G-DVLG88Z7RL"
};

// Auth state
let authState = {
  initialized: false,
  user: null,
  isConfigured: false
};

// Auth listeners
const authListeners = [];

/**
 * Initialize Firebase and Auth
 */
function initAuth() {
  // Check if Firebase config is set
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn('Firebase not configured. Social features disabled.');
    console.log('To enable social features:');
    console.log('1. Create a Firebase project at https://console.firebase.google.com');
    console.log('2. Enable Authentication (Google and Email/Password)');
    console.log('3. Copy your config to web/auth.js');
    authState.initialized = true;
    authState.isConfigured = false;
    notifyAuthListeners();
    return;
  }

  try {
    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    authState.isConfigured = true;

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged((user) => {
      authState.user = user;
      authState.initialized = true;

      if (user) {
        console.log('User signed in:', user.email);
        // Trigger sync when user signs in
        if (typeof Sync !== 'undefined' && Sync.syncOnLogin) {
          Sync.syncOnLogin(user);
        }
      } else {
        console.log('User signed out');
      }

      notifyAuthListeners();
    });

    console.log('Firebase Auth initialized');
  } catch (error) {
    console.error('Firebase initialization error:', error);
    authState.initialized = true;
    authState.isConfigured = false;
    notifyAuthListeners();
  }
}

/**
 * Register a listener for auth state changes
 */
function onAuthStateChange(callback) {
  authListeners.push(callback);

  // If already initialized, call immediately
  if (authState.initialized) {
    callback(authState);
  }
}

/**
 * Notify all auth listeners
 */
function notifyAuthListeners() {
  authListeners.forEach(callback => {
    try {
      callback(authState);
    } catch (error) {
      console.error('Auth listener error:', error);
    }
  });
}

/**
 * Sign in with Google
 */
async function signInWithGoogle() {
  if (!authState.isConfigured) {
    showAuthError('Firebase not configured. Please set up Firebase first.');
    return;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);

    // Parse display name into first/last name
    const nameParts = (result.user.displayName || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create user profile in Firestore if new user
    await ensureUserProfile(result.user, result.user.displayName, firstName, lastName);

    return result.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    handleAuthError(error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
async function signInWithEmail(email, password) {
  if (!authState.isConfigured) {
    showAuthError('Firebase not configured. Please set up Firebase first.');
    return;
  }

  try {
    const result = await firebase.auth().signInWithEmailAndPassword(email, password);
    return result.user;
  } catch (error) {
    console.error('Email sign in error:', error);
    handleAuthError(error);
    throw error;
  }
}

/**
 * Sign up with email and password
 */
async function signUpWithEmail(email, password, displayName) {
  if (!authState.isConfigured) {
    showAuthError('Firebase not configured. Please set up Firebase first.');
    return;
  }

  try {
    const result = await firebase.auth().createUserWithEmailAndPassword(email, password);

    // Update display name
    if (displayName) {
      await result.user.updateProfile({ displayName });
    }

    // Send email verification
    await result.user.sendEmailVerification({
      url: window.location.origin,
      handleCodeInApp: false
    });

    console.log('Verification email sent to:', email);

    // Create user profile in Firestore
    await ensureUserProfile(result.user, displayName);

    return result.user;
  } catch (error) {
    console.error('Email sign up error:', error);
    handleAuthError(error);
    throw error;
  }
}

/**
 * Sign out
 */
async function signOut() {
  if (!authState.isConfigured) return;

  try {
    await firebase.auth().signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Ensure user has a profile in Firestore
 */
async function ensureUserProfile(user, displayName, firstName, lastName) {
  if (!authState.isConfigured || !user) return;

  try {
    const db = firebase.firestore();
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      // Generate friend code
      const friendCode = generateFriendCode();

      // Parse name if not provided
      if (!firstName && displayName) {
        const nameParts = displayName.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      // Create new user profile
      const profile = {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName || user.email.split('@')[0],
        firstName: firstName || '',
        lastName: lastName || '',
        photoURL: user.photoURL || null,
        friendCode: friendCode,
        emailVerified: user.emailVerified,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        privacy: {
          shareVolume: true,
          shareStreak: true,
          sharePace: false,
          contributeAnonymous: true
        },
        stats: {
          weeklyDistance: 0,
          currentStreak: 0,
          avgPace: null
        }
      };

      await userRef.set(profile);

      // Also create the friend code lookup entry
      await db.collection('friend_codes').doc(friendCode).set({
        uid: user.uid
      });

      console.log('Created user profile with friend code:', friendCode);
    }
  } catch (error) {
    console.error('Error creating user profile:', error);
  }
}

/**
 * Generate a unique 6-character friend code
 */
function generateFriendCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0,O,1,I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get current user
 */
function getCurrentUser() {
  return authState.user;
}

/**
 * Check if user is signed in
 */
function isSignedIn() {
  return authState.user !== null;
}

/**
 * Check if Firebase is configured
 */
function isFirebaseConfigured() {
  return authState.isConfigured;
}

/**
 * Handle auth errors
 */
function handleAuthError(error) {
  let message = 'An error occurred during authentication.';

  switch (error.code) {
    case 'auth/invalid-email':
      message = 'Invalid email address.';
      break;
    case 'auth/user-disabled':
      message = 'This account has been disabled.';
      break;
    case 'auth/user-not-found':
      message = 'No account found with this email.';
      break;
    case 'auth/wrong-password':
      message = 'Incorrect password.';
      break;
    case 'auth/email-already-in-use':
      message = 'An account with this email already exists.';
      break;
    case 'auth/weak-password':
      message = 'Password should be at least 6 characters.';
      break;
    case 'auth/popup-closed-by-user':
      message = 'Sign in cancelled.';
      break;
    case 'auth/network-request-failed':
      message = 'Network error. Please check your connection.';
      break;
    default:
      message = error.message || message;
  }

  showAuthError(message);
}

/**
 * Show auth error in the UI
 */
function showAuthError(message) {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  } else {
    alert(message);
  }
}

/**
 * Clear auth error
 */
function clearAuthError() {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
}

/**
 * Get user's friend code
 */
async function getUserFriendCode() {
  if (!authState.isConfigured || !authState.user) return null;

  try {
    const db = firebase.firestore();
    const doc = await db.collection('users').doc(authState.user.uid).get();
    return doc.exists ? doc.data().friendCode : null;
  } catch (error) {
    console.error('Error getting friend code:', error);
    return null;
  }
}

/**
 * Get user profile from Firestore
 */
async function getUserProfile() {
  if (!authState.isConfigured || !authState.user) return null;

  try {
    const db = firebase.firestore();
    const doc = await db.collection('users').doc(authState.user.uid).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Update user privacy settings
 */
async function updatePrivacySettings(settings) {
  if (!authState.isConfigured || !authState.user) return;

  try {
    const db = firebase.firestore();
    await db.collection('users').doc(authState.user.uid).update({
      privacy: settings
    });
    console.log('Privacy settings updated');
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    throw error;
  }
}

/**
 * Update user stats (called when sessions change)
 */
async function updateUserStats(stats) {
  if (!authState.isConfigured || !authState.user) return;

  try {
    const db = firebase.firestore();
    await db.collection('users').doc(authState.user.uid).update({
      stats: stats,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

/**
 * Mask email for privacy (e.g., "tes***@exa***.com")
 */
function maskEmail(email) {
  if (!email) return '';

  const [localPart, domain] = email.split('@');
  if (!domain) return email;

  // Mask local part (show first 3, mask rest)
  const maskedLocal = localPart.length > 3
    ? localPart.substring(0, 3) + '***'
    : localPart;

  // Mask domain (show first 3 and extension, mask middle)
  const domainParts = domain.split('.');
  const mainDomain = domainParts[0];
  const extension = domainParts.slice(1).join('.');

  const maskedDomain = mainDomain.length > 3
    ? mainDomain.substring(0, 3) + '***'
    : mainDomain;

  return `${maskedLocal}@${maskedDomain}.${extension}`;
}

/**
 * Resend email verification
 */
async function resendVerificationEmail() {
  if (!authState.user) {
    throw new Error('No user signed in');
  }

  try {
    await authState.user.sendEmailVerification({
      url: window.location.origin,
      handleCodeInApp: false
    });
    console.log('Verification email resent');
  } catch (error) {
    console.error('Error resending verification email:', error);
    throw error;
  }
}

// Export Auth module
window.Auth = {
  init: initAuth,
  onAuthStateChange,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
  isSignedIn,
  isFirebaseConfigured,
  getUserFriendCode,
  getUserProfile,
  updatePrivacySettings,
  updateUserStats,
  maskEmail,
  resendVerificationEmail,
  clearAuthError
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
