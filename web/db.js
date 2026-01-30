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
const DB_VERSION = 2; // Bumped for events store
const SCHEMA_VERSION = 2; // Bumped for events support

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

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(new Error('IndexedDB not available: ' + (event.target.error?.message || 'Unknown error')));
    };

    request.onblocked = () => {
      console.warn('IndexedDB blocked - please close other tabs using this app');
      // Don't reject, just wait - it might unblock
    };

    request.onsuccess = (event) => {
      console.log('IndexedDB opened successfully, version:', event.target.result.version);
      resolve(event.target.result);
    };

    // This runs only when database is created or version changes
    request.onupgradeneeded = (event) => {
      console.log('IndexedDB upgrade needed from version', event.oldVersion, 'to', event.newVersion);
      const database = event.target.result;

      // Create object stores (like tables in SQL)
      if (!database.objectStoreNames.contains('profile')) {
        database.createObjectStore('profile');
        console.log('Created profile store');
      }
      if (!database.objectStoreNames.contains('sessions')) {
        database.createObjectStore('sessions');
        console.log('Created sessions store');
      }
      if (!database.objectStoreNames.contains('metadata')) {
        database.createObjectStore('metadata');
        console.log('Created metadata store');
      }
      // v2: Add events store
      if (!database.objectStoreNames.contains('events')) {
        database.createObjectStore('events');
        console.log('Created events store');
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

// ============================================
// EVENTS
// ============================================

/**
 * Save all events (overwrites existing)
 */
async function saveEvents(events) {
  if (storageMethod === 'indexeddb') {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      const request = store.put(events, 'all');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save events'));
    });
  } else {
    localStorage.setItem('lks_events', JSON.stringify(events));
    return Promise.resolve();
  }
}

/**
 * Get all events
 */
async function getEvents() {
  if (storageMethod === 'indexeddb') {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['events'], 'readonly');
      const store = transaction.objectStore('events');
      const request = store.get('all');

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to load events'));
    });
  } else {
    const data = localStorage.getItem('lks_events');
    return Promise.resolve(data ? JSON.parse(data) : []);
  }
}

/**
 * Add a single event
 */
async function addEvent(event) {
  const events = await getEvents();
  events.push(event);
  await saveEvents(events);
}

/**
 * Update an event by ID
 */
async function updateEvent(id, updatedEvent) {
  const events = await getEvents();
  const index = events.findIndex(e => e.id === id);

  if (index === -1) {
    throw new Error('Event not found');
  }

  events[index] = { ...updatedEvent, id };
  await saveEvents(events);
}

/**
 * Delete an event by ID
 */
async function deleteEvent(id) {
  const events = await getEvents();
  const filtered = events.filter(e => e.id !== id);

  if (filtered.length === events.length) {
    throw new Error('Event not found');
  }

  await saveEvents(filtered);
}

/**
 * Get active event (closest upcoming event)
 */
async function getActiveEvent() {
  const events = await getEvents();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter to future events and sort by date
  const futureEvents = events
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return futureEvents.length > 0 ? futureEvents[0] : null;
}

/**
 * Set an event as the active/primary event
 */
async function setActiveEvent(eventId) {
  const events = await getEvents();
  events.forEach(e => {
    e.isActive = e.id === eventId;
  });
  await saveEvents(events);
}

/**
 * Export all data as JSON
 * Returns an object ready to be downloaded as a file
 */
async function exportData() {
  const profile = await getProfile();
  const sessions = await getSessions();
  const events = await getEvents();

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profile,
    sessions: sessions,
    events: events
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
  // Validate data structure (allow v1 files without events)
  if (!data.schemaVersion || !data.sessions) {
    throw new Error('Invalid import file: missing required fields');
  }

  // Allow importing v1 files (migrate event data from profile)
  if (data.schemaVersion === 1 && data.profile && data.profile.eventDate) {
    // Migrate old profile event to events array
    data.events = [{
      id: crypto.randomUUID(),
      name: 'Midmar Mile',
      date: data.profile.eventDate,
      distance: 1609,
      goal: data.profile.goal || 'finish_comfortably',
      targetTime: data.profile.targetTime || null,
      isActive: true
    }];
    // Remove event fields from profile
    delete data.profile.eventDate;
    delete data.profile.goal;
    delete data.profile.targetTime;
  }

  if (strategy === 'replace') {
    // Simple: just overwrite everything
    if (data.profile) await saveProfile(data.profile);
    await saveSessions(data.sessions);
    if (data.events) await saveEvents(data.events);
  } else if (strategy === 'merge') {
    // Merge strategy: combine by ID, keep newest
    const existingSessions = await getSessions();
    const existingProfile = await getProfile();
    const existingEvents = await getEvents();

    // Merge sessions
    const sessionMap = new Map();
    existingSessions.forEach(s => sessionMap.set(s.id, s));
    data.sessions.forEach(s => sessionMap.set(s.id, s));
    const mergedSessions = Array.from(sessionMap.values());

    // Merge events
    const eventMap = new Map();
    existingEvents.forEach(e => eventMap.set(e.id, e));
    if (data.events) {
      data.events.forEach(e => eventMap.set(e.id, e));
    }
    const mergedEvents = Array.from(eventMap.values());

    // Use imported profile if no existing profile, otherwise keep existing
    const finalProfile = existingProfile || data.profile;

    if (finalProfile) await saveProfile(finalProfile);
    await saveSessions(mergedSessions);
    await saveEvents(mergedEvents);
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
    const transaction = db.transaction(['profile', 'sessions', 'metadata', 'events'], 'readwrite');
    transaction.objectStore('profile').clear();
    transaction.objectStore('sessions').clear();
    transaction.objectStore('metadata').clear();
    transaction.objectStore('events').clear();
    return new Promise(resolve => {
      transaction.oncomplete = resolve;
    });
  } else {
    localStorage.removeItem('lks_profile');
    localStorage.removeItem('lks_sessions');
    localStorage.removeItem('lks_metadata');
    localStorage.removeItem('lks_coaching');
    localStorage.removeItem('lks_events');
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
  saveEvents,
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  getActiveEvent,
  setActiveEvent,
  exportData,
  importData,
  getStorageInfo,
  clearAllData,
  saveCoaching,
  getCoaching
};
