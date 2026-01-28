/**
 * Let's Keep Swimming - Storage Layer
 *
 * This module handles all data storage with a focus on durability.
 *
 * STORAGE STRATEGY:
 * - Primary: IndexedDB (browser database, can store lots of data)
 * - Fallback: LocalStorage (simpler, less capacity, works everywhere)
 * - Safety net: Export/Import JSON files
 *
 * WHY TWO METHODS?
 * Some browsers (especially private/incognito mode) block IndexedDB.
 * LocalStorage is our backup so the app always works.
 */

const DB_NAME = 'LetsKeepSwimming';
const DB_VERSION = 1;
const SCHEMA_VERSION = 1;

// Storage state
let storageMethod = null; // Will be 'indexeddb' or 'localstorage'
let db = null; // IndexedDB connection

/**
 * Initialize the database
 * Tries IndexedDB first, falls back to LocalStorage if needed
 */
async function initDB() {
  // Try IndexedDB first
  try {
    db = await openIndexedDB();
    storageMethod = 'indexeddb';
    console.log('✅ Storage: IndexedDB (preferred)');
    return true;
  } catch (error) {
    console.warn('⚠️  IndexedDB unavailable, using LocalStorage fallback');
    storageMethod = 'localstorage';
    return true;
  }
}

/**
 * Open IndexedDB connection
 * Creates object stores if they don't exist
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('IndexedDB not available'));
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    // This runs only when database is created or version changes
    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create object stores (like tables in SQL)
      if (!database.objectStoreNames.contains('profile')) {
        database.createObjectStore('profile');
      }
      if (!database.objectStoreNames.contains('sessions')) {
        database.createObjectStore('sessions');
      }
      if (!database.objectStoreNames.contains('metadata')) {
        database.createObjectStore('metadata');
      }
    };
  });
}

/**
 * Save profile data
 */
async function saveProfile(profile) {
  if (storageMethod === 'indexeddb') {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['profile'], 'readwrite');
      const store = transaction.objectStore('profile');
      const request = store.put(profile, 'current');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save profile'));
    });
  } else {
    // LocalStorage fallback
    localStorage.setItem('lks_profile', JSON.stringify(profile));
    return Promise.resolve();
  }
}

/**
 * Get profile data
 */
async function getProfile() {
  if (storageMethod === 'indexeddb') {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['profile'], 'readonly');
      const store = transaction.objectStore('profile');
      const request = store.get('current');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to load profile'));
    });
  } else {
    // LocalStorage fallback
    const data = localStorage.getItem('lks_profile');
    return Promise.resolve(data ? JSON.parse(data) : null);
  }
}

/**
 * Save all sessions (overwrites existing)
 */
async function saveSessions(sessions) {
  if (storageMethod === 'indexeddb') {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      const request = store.put(sessions, 'all');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save sessions'));
    });
  } else {
    // LocalStorage fallback
    localStorage.setItem('lks_sessions', JSON.stringify(sessions));
    return Promise.resolve();
  }
}

/**
 * Get all sessions
 */
async function getSessions() {
  if (storageMethod === 'indexeddb') {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.get('all');

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to load sessions'));
    });
  } else {
    // LocalStorage fallback
    const data = localStorage.getItem('lks_sessions');
    return Promise.resolve(data ? JSON.parse(data) : []);
  }
}

/**
 * Add a single session
 * Helper function that loads all sessions, adds one, and saves back
 */
async function addSession(session) {
  const sessions = await getSessions();
  sessions.push(session);
  await saveSessions(sessions);
}

/**
 * Update a session by ID
 */
async function updateSession(id, updatedSession) {
  const sessions = await getSessions();
  const index = sessions.findIndex(s => s.id === id);

  if (index === -1) {
    throw new Error('Session not found');
  }

  sessions[index] = { ...updatedSession, id }; // Preserve ID
  await saveSessions(sessions);
}

/**
 * Delete a session by ID
 */
async function deleteSession(id) {
  const sessions = await getSessions();
  const filtered = sessions.filter(s => s.id !== id);

  if (filtered.length === sessions.length) {
    throw new Error('Session not found');
  }

  await saveSessions(filtered);
}

/**
 * Export all data as JSON
 * Returns an object ready to be downloaded as a file
 */
async function exportData() {
  const profile = await getProfile();
  const sessions = await getSessions();

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profile,
    sessions: sessions
  };
}

/**
 * Import data from exported JSON
 *
 * @param {Object} data - The imported data object
 * @param {string} strategy - 'replace' or 'merge'
 *   - replace: Delete all existing data and use imported data
 *   - merge: Combine imported sessions with existing (by ID, keeping newest)
 */
async function importData(data, strategy = 'replace') {
  // Validate data structure
  if (!data.schemaVersion || !data.sessions || !data.profile) {
    throw new Error('Invalid import file: missing required fields');
  }

  if (data.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Schema version mismatch: file is v${data.schemaVersion}, app expects v${SCHEMA_VERSION}`);
  }

  if (strategy === 'replace') {
    // Simple: just overwrite everything
    await saveProfile(data.profile);
    await saveSessions(data.sessions);
  } else if (strategy === 'merge') {
    // Merge strategy: combine sessions by ID, keep newest
    const existingSessions = await getSessions();
    const existingProfile = await getProfile();

    // Create a map of existing sessions by ID
    const sessionMap = new Map();
    existingSessions.forEach(s => sessionMap.set(s.id, s));

    // Add/update with imported sessions (imported data wins if duplicate)
    data.sessions.forEach(s => sessionMap.set(s.id, s));

    // Convert map back to array
    const mergedSessions = Array.from(sessionMap.values());

    // Use imported profile if no existing profile, otherwise keep existing
    const finalProfile = existingProfile || data.profile;

    await saveProfile(finalProfile);
    await saveSessions(mergedSessions);
  } else {
    throw new Error('Invalid strategy: must be "replace" or "merge"');
  }
}

/**
 * Get information about current storage method
 */
function getStorageInfo() {
  return {
    method: storageMethod,
    description: storageMethod === 'indexeddb'
      ? 'IndexedDB (browser database, reliable, large capacity)'
      : 'LocalStorage (fallback, limited capacity)'
  };
}

/**
 * Save coaching recommendation with metadata
 * Stores the recommendation along with when it was generated
 * and the session count at that time (to detect staleness)
 */
async function saveCoaching(coaching, sessionCount) {
  const data = {
    recommendation: coaching,
    generatedAt: new Date().toISOString(),
    sessionCountAtGeneration: sessionCount
  };

  if (storageMethod === 'indexeddb') {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put(data, 'coaching');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save coaching'));
    });
  } else {
    localStorage.setItem('lks_coaching', JSON.stringify(data));
    return Promise.resolve();
  }
}

/**
 * Get saved coaching recommendation
 * Returns null if no coaching saved
 */
async function getCoaching() {
  if (storageMethod === 'indexeddb') {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get('coaching');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to load coaching'));
    });
  } else {
    const data = localStorage.getItem('lks_coaching');
    return Promise.resolve(data ? JSON.parse(data) : null);
  }
}

/**
 * Clear all data (for testing/debugging)
 * BE CAREFUL with this!
 */
async function clearAllData() {
  if (storageMethod === 'indexeddb') {
    const transaction = db.transaction(['profile', 'sessions', 'metadata'], 'readwrite');
    transaction.objectStore('profile').clear();
    transaction.objectStore('sessions').clear();
    transaction.objectStore('metadata').clear();
    return new Promise(resolve => {
      transaction.oncomplete = resolve;
    });
  } else {
    localStorage.removeItem('lks_profile');
    localStorage.removeItem('lks_sessions');
    localStorage.removeItem('lks_metadata');
    localStorage.removeItem('lks_coaching');
    return Promise.resolve();
  }
}

// Export all functions
// This makes them available to other JavaScript files
window.DB = {
  initDB,
  saveProfile,
  getProfile,
  saveSessions,
  getSessions,
  addSession,
  updateSession,
  deleteSession,
  exportData,
  importData,
  getStorageInfo,
  clearAllData,
  saveCoaching,
  getCoaching
};
