/**
 * Let's Keep Swimming - Cloud Sync Module
 *
 * Handles two-way synchronization between local IndexedDB and Firebase Firestore:
 * - Upload local data to cloud on sign in
 * - Download cloud data on sign in
 * - Conflict resolution (last-write-wins)
 * - Offline queue for pending changes
 */

// Sync state
let syncState = {
  syncing: false,
  lastSyncAt: null,
  pendingChanges: [],
  online: navigator.onLine
};

// Sync listeners
const syncListeners = [];

/**
 * Initialize sync module
 */
function initSync() {
  // Monitor online/offline status
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Listen for auth changes
  if (typeof Auth !== 'undefined') {
    Auth.onAuthStateChange(handleAuthChange);
  }

  console.log('Sync module initialized');
}

/**
 * Handle coming online
 */
function handleOnline() {
  syncState.online = true;
  console.log('Back online - processing pending changes');
  processPendingChanges();
}

/**
 * Handle going offline
 */
function handleOffline() {
  syncState.online = false;
  console.log('Gone offline - changes will be queued');
}

/**
 * Handle auth state changes
 */
async function handleAuthChange(authState) {
  if (authState.user && authState.isConfigured) {
    // User signed in - sync data
    await syncOnLogin(authState.user);
  }
}

/**
 * Sync data when user logs in
 * Merges local and cloud data
 */
async function syncOnLogin(user) {
  if (!Auth.isFirebaseConfigured() || syncState.syncing) return;

  syncState.syncing = true;
  notifySyncListeners({ status: 'syncing' });

  try {
    const db = firebase.firestore();
    const userRef = db.collection('users').doc(user.uid);

    // Get local data
    const localProfile = await DB.getProfile();
    const localSessions = await DB.getSessions();
    const localEvents = await DB.getEvents();

    // Get cloud data
    const cloudDoc = await userRef.get();
    const cloudData = cloudDoc.exists ? cloudDoc.data() : null;

    // Merge strategies
    let finalProfile = localProfile;
    let finalSessions = localSessions;
    let finalEvents = localEvents;

    if (cloudData) {
      // Merge profile (prefer local if exists, otherwise cloud)
      if (cloudData.localProfile && !localProfile) {
        finalProfile = cloudData.localProfile;
      }

      // Merge sessions (by ID, keep newest by date modified)
      if (cloudData.sessions && cloudData.sessions.length > 0) {
        finalSessions = mergeSessions(localSessions, cloudData.sessions);
      }

      // Merge events (by ID, keep newest)
      if (cloudData.events && cloudData.events.length > 0) {
        finalEvents = mergeEvents(localEvents, cloudData.events);
      }
    }

    // Save merged data locally
    if (finalProfile) {
      await DB.saveProfile(finalProfile);
    }
    await DB.saveSessions(finalSessions);
    await DB.saveEvents(finalEvents);

    // Upload merged data to cloud
    await userRef.update({
      localProfile: finalProfile,
      sessions: finalSessions,
      events: finalEvents,
      lastSyncAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update user stats
    await updateCloudStats(finalSessions);

    syncState.lastSyncAt = new Date();
    syncState.syncing = false;

    notifySyncListeners({ status: 'synced', lastSync: syncState.lastSyncAt });
    console.log('Sync completed successfully');

    // Reload app state
    if (typeof state !== 'undefined') {
      state.profile = finalProfile;
      state.sessions = finalSessions;
      state.events = finalEvents;
      if (typeof loadDashboard === 'function') {
        loadDashboard();
      }
    }
  } catch (error) {
    console.error('Sync error:', error);
    syncState.syncing = false;
    notifySyncListeners({ status: 'error', error: error.message });
  }
}

/**
 * Merge sessions from local and cloud
 * Uses ID matching and prefers newer modifications
 */
function mergeSessions(local, cloud) {
  const sessionMap = new Map();

  // Add all local sessions
  local.forEach(session => {
    sessionMap.set(session.id, session);
  });

  // Merge cloud sessions
  cloud.forEach(session => {
    const existing = sessionMap.get(session.id);
    if (!existing) {
      // New session from cloud
      sessionMap.set(session.id, session);
    } else {
      // Both exist - compare timestamps if available
      const localTime = existing.modifiedAt ? new Date(existing.modifiedAt) : new Date(existing.date);
      const cloudTime = session.modifiedAt ? new Date(session.modifiedAt) : new Date(session.date);

      if (cloudTime > localTime) {
        sessionMap.set(session.id, session);
      }
    }
  });

  // Sort by date descending
  return Array.from(sessionMap.values()).sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
}

/**
 * Merge events from local and cloud
 */
function mergeEvents(local, cloud) {
  const eventMap = new Map();

  local.forEach(event => {
    eventMap.set(event.id, event);
  });

  cloud.forEach(event => {
    const existing = eventMap.get(event.id);
    if (!existing) {
      eventMap.set(event.id, event);
    }
    // For events, prefer the one with more data or most recent modification
  });

  return Array.from(eventMap.values()).sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });
}

/**
 * Queue a change for syncing
 */
function queueChange(type, data) {
  syncState.pendingChanges.push({
    type,
    data,
    timestamp: new Date().toISOString()
  });

  // Try to process immediately if online
  if (syncState.online && Auth.isSignedIn()) {
    processPendingChanges();
  }
}

/**
 * Process pending changes
 */
async function processPendingChanges() {
  if (!Auth.isSignedIn() || !Auth.isFirebaseConfigured()) return;
  if (syncState.pendingChanges.length === 0) return;

  try {
    const db = firebase.firestore();
    const user = Auth.getCurrentUser();
    const userRef = db.collection('users').doc(user.uid);

    // Get current data
    const sessions = await DB.getSessions();
    const events = await DB.getEvents();
    const profile = await DB.getProfile();

    // Upload all data
    await userRef.update({
      localProfile: profile,
      sessions: sessions,
      events: events,
      lastSyncAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update stats
    await updateCloudStats(sessions);

    // Clear pending changes
    syncState.pendingChanges = [];
    syncState.lastSyncAt = new Date();

    notifySyncListeners({ status: 'synced', lastSync: syncState.lastSyncAt });
  } catch (error) {
    console.error('Error processing pending changes:', error);
    notifySyncListeners({ status: 'pending', pendingCount: syncState.pendingChanges.length });
  }
}

/**
 * Update cloud stats (for leaderboard/benchmarks)
 */
async function updateCloudStats(sessions) {
  if (!Auth.isSignedIn() || !Auth.isFirebaseConfigured()) return;

  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Calculate weekly distance
    const weeklyDistance = sessions
      .filter(s => new Date(s.date) >= weekAgo && new Date(s.date) <= today)
      .reduce((sum, s) => sum + (s.distance_m || 0), 0);

    // Calculate current streak
    const currentStreak = calculateStreak(sessions);

    // Calculate average pace (min per 100m)
    const recentPaces = sessions
      .filter(s => s.distance_m && s.time_min)
      .slice(0, 10)
      .map(s => (s.time_min / s.distance_m) * 100);

    const avgPace = recentPaces.length > 0
      ? recentPaces.reduce((a, b) => a + b) / recentPaces.length
      : null;

    await Auth.updateUserStats({
      weeklyDistance,
      currentStreak,
      avgPace,
      updatedAt: new Date().toISOString()
    });

    // Update benchmark aggregations if user has opted in
    const userProfile = await Auth.getUserProfile();
    if (userProfile && typeof Social !== 'undefined' && Social.updateBenchmarkAggregations) {
      await Social.updateBenchmarkAggregations(userProfile);
    }
  } catch (error) {
    console.error('Error updating cloud stats:', error);
  }
}

/**
 * Calculate current streak from sessions
 */
function calculateStreak(sessions) {
  if (sessions.length === 0) return 0;

  const sortedSessions = [...sessions].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  // Check if there's a session today or yesterday to start the streak
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const hasToday = sortedSessions.some(s => s.date === todayStr);
  const hasYesterday = sortedSessions.some(s => s.date === yesterdayStr);

  if (!hasToday && !hasYesterday) {
    return 0; // Streak broken
  }

  // Start from the most recent session date
  if (!hasToday) {
    checkDate = yesterdayDate;
  }

  // Count consecutive days backwards
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasSession = sortedSessions.some(s => s.date === dateStr);

    if (hasSession) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Register sync status listener
 */
function onSyncStatusChange(callback) {
  syncListeners.push(callback);
}

/**
 * Notify sync listeners
 */
function notifySyncListeners(status) {
  syncListeners.forEach(callback => {
    try {
      callback(status);
    } catch (error) {
      console.error('Sync listener error:', error);
    }
  });
}

/**
 * Get sync status
 */
function getSyncStatus() {
  return {
    syncing: syncState.syncing,
    online: syncState.online,
    lastSyncAt: syncState.lastSyncAt,
    pendingCount: syncState.pendingChanges.length
  };
}

/**
 * Force a full sync
 */
async function forceSync() {
  if (!Auth.isSignedIn() || !Auth.isFirebaseConfigured()) {
    console.log('Cannot sync - not signed in or Firebase not configured');
    return;
  }

  const user = Auth.getCurrentUser();
  await syncOnLogin(user);
}

// Export Sync module
window.Sync = {
  init: initSync,
  syncOnLogin,
  queueChange,
  forceSync,
  onSyncStatusChange,
  getSyncStatus
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSync);
} else {
  initSync();
}
