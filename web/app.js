/**
 * Let's Keep Swimming - Main Application
 *
 * This is the main controller that orchestrates everything:
 * - Loads data from storage
 * - Handles all user interactions
 * - Updates the UI
 * - Calls the server for coaching
 */

// Configuration
const API_URL = 'http://localhost:3000';

// Application State
let state = {
  profile: null,
  sessions: [],
  events: [], // Swimming events (Midmar Mile, etc.)
  activeEvent: null, // The currently selected/upcoming event
  currentView: 'dashboard',
  editingSessionId: null,
  editingEventId: null,
  coaching: null, // { recommendation, generatedAt, sessionCountAtGeneration }
  currentCoaching: null, // Current coaching data being displayed (for adjustments)
  originalCoaching: null, // Original coaching data (before any adaptations)
  pendingImport: null, // Sessions pending import confirmation
  dashboardEventIndex: 0, // Current event index in dashboard carousel
};

/**
 * Initialize the application
 * Called when page loads
 */
async function init() {
  console.log('🏊 Initializing Let\'s Keep Swimming...');

  try {
    // Initialize storage
    console.log('📦 Initializing database...');
    await DB.initDB();
    console.log('✅ Database initialized');

    // Load data from storage
    console.log('📖 Loading profile...');
    state.profile = await DB.getProfile();

    console.log('📖 Loading sessions...');
    state.sessions = await DB.getSessions();

    console.log('📖 Loading events...');
    state.events = await DB.getEvents();

    console.log('📖 Loading coaching...');
    state.coaching = await DB.getCoaching();

    // Migrate old profile event data to events array if needed
    console.log('🔄 Checking for migration...');
    await migrateProfileEventToEvents();

    // Set active event (closest upcoming)
    state.activeEvent = await DB.getActiveEvent();

    console.log(`✅ Loaded profile: ${state.profile ? 'Yes' : 'No'}`);
    console.log(`✅ Loaded ${state.sessions.length} sessions`);
    console.log(`✅ Loaded ${state.events.length} events`);
    console.log(`✅ Loaded coaching: ${state.coaching ? 'Yes' : 'No'}`);

    // Set up event listeners
    console.log('🔧 Setting up event listeners...');
    setupEventListeners();

    // Set default date for forms to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('sessionDate').value = today;

    // Load profile picture
    loadProfilePicture();

    // Load initial view
    loadDashboard();

    // Show storage info
    const storageInfo = DB.getStorageInfo();
    document.getElementById('storage-method').textContent = storageInfo.description;

    console.log('🚀 App ready!');
  } catch (error) {
    console.error('❌ Initialization error:', error);
    console.error('Stack:', error.stack);

    // Offer to reset if there's a database issue
    const shouldReset = confirm(
      'Error initializing app: ' + error.message +
      '\n\nThis may be due to a database upgrade issue.' +
      '\n\nWould you like to reset the database? (Your data will be lost unless you have a backup)'
    );

    if (shouldReset) {
      try {
        // Delete the IndexedDB entirely
        indexedDB.deleteDatabase('LetsKeepSwimming');
        // Clear localStorage too
        localStorage.removeItem('lks_profile');
        localStorage.removeItem('lks_sessions');
        localStorage.removeItem('lks_metadata');
        localStorage.removeItem('lks_coaching');
        localStorage.removeItem('lks_events');
        alert('Database reset. The page will now reload.');
        location.reload();
      } catch (resetError) {
        alert('Could not reset database. Please clear your browser data for this site manually.');
      }
    }
  }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Tab switching (desktop nav and mobile nav)
  document.querySelectorAll('.tab-btn, .mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      closeMobileNav(); // Close mobile nav when tab is selected
    });
  });

  // Mobile navigation
  document.getElementById('hamburger-btn').addEventListener('click', toggleMobileNav);
  document.getElementById('mobile-nav-close').addEventListener('click', closeMobileNav);
  document.getElementById('mobile-nav-overlay').addEventListener('click', closeMobileNav);

  // Scroll detection for header collapse
  setupScrollHandler();

  // Profile form
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileSubmit);
  }
  document.querySelectorAll('input[name="availability-type"]').forEach(radio => {
    radio.addEventListener('change', toggleAvailabilityType);
  });

  // Session form (modal)
  document.getElementById('session-form').addEventListener('submit', handleSessionSubmit);
  document.getElementById('session-cancel-btn').addEventListener('click', hideSessionForm);
  document.getElementById('add-session-btn').addEventListener('click', showSessionForm);
  document.getElementById('session-form-close-btn').addEventListener('click', hideSessionForm);
  document.getElementById('session-modal').addEventListener('click', handleModalOverlayClick);

  // Effort selector buttons
  document.querySelectorAll('.effort-btn').forEach(btn => {
    btn.addEventListener('click', () => selectEffort(btn.dataset.effort));
  });

  // Import modal
  document.getElementById('sessions-import-btn').addEventListener('click', showImportModal);
  document.getElementById('import-modal-close-btn').addEventListener('click', hideImportModal);
  document.getElementById('import-modal').addEventListener('click', handleModalOverlayClick);
  document.getElementById('samsung-import-btn').addEventListener('click', () => document.getElementById('samsung-import-file').click());
  document.getElementById('gpx-import-btn').addEventListener('click', () => document.getElementById('gpx-import-file').click());
  document.getElementById('app-import-btn').addEventListener('click', () => document.getElementById('app-import-file').click());
  document.getElementById('samsung-import-file').addEventListener('change', handleSamsungImport);
  document.getElementById('gpx-import-file').addEventListener('change', handleGPXImport);
  document.getElementById('app-import-file').addEventListener('change', handleAppImport);
  document.getElementById('confirm-import-btn').addEventListener('click', confirmImport);
  document.getElementById('cancel-import-btn').addEventListener('click', cancelImport);

  // Coaching
  document.getElementById('get-coaching-btn').addEventListener('click', getCoaching);
  document.getElementById('copy-coaching-btn').addEventListener('click', copyCoachingToClipboard);

  // Coach adjustments
  document.getElementById('toggle-pool').addEventListener('click', () => setCoachType('pool'));
  document.getElementById('toggle-openwater').addEventListener('click', () => setCoachType('open_water'));
  document.getElementById('adapt-session-btn').addEventListener('click', adaptSession);
  document.getElementById('log-from-coach-btn').addEventListener('click', logSessionFromCoach);

  // Data management
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-btn').addEventListener('click', importData);
  document.getElementById('clear-all-btn').addEventListener('click', clearAllData);

  // Sessions page export button
  document.getElementById('sessions-export-btn').addEventListener('click', exportData);

  // Profile picture
  document.getElementById('upload-picture-btn').addEventListener('click', () => document.getElementById('profile-picture-input').click());
  document.getElementById('profile-picture-input').addEventListener('change', handleProfilePictureUpload);
  document.getElementById('remove-picture-btn').addEventListener('click', removeProfilePicture);

  // Session detail modal
  document.getElementById('session-detail-close-btn').addEventListener('click', hideSessionDetailModal);
  document.getElementById('session-detail-modal').addEventListener('click', handleModalOverlayClick);
  document.getElementById('session-detail-edit-btn').addEventListener('click', editSessionFromDetail);
  document.getElementById('session-detail-delete-btn').addEventListener('click', deleteSessionFromDetail);

  // Sub-tabs (Sessions/Events)
  document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSubTab(btn.dataset.subtab));
  });

  // Event form (modal)
  document.getElementById('event-form').addEventListener('submit', handleEventSubmit);
  document.getElementById('event-cancel-btn').addEventListener('click', hideEventForm);
  document.getElementById('add-event-btn').addEventListener('click', showEventForm);
  document.getElementById('event-form-close-btn').addEventListener('click', hideEventForm);
  document.getElementById('event-modal').addEventListener('click', handleModalOverlayClick);
  document.getElementById('eventGoal').addEventListener('change', toggleEventTargetTime);
}

/**
 * Set up scroll handler for header collapse
 */
function setupScrollHandler() {
  const header = document.getElementById('main-header');
  const scrollThreshold = 50;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add/remove scrolled class based on scroll position
    if (currentScroll > scrollThreshold) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

/**
 * Toggle mobile navigation drawer
 */
function toggleMobileNav() {
  const hamburger = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const overlay = document.getElementById('mobile-nav-overlay');

  const isOpen = mobileNav.classList.contains('active');

  if (isOpen) {
    closeMobileNav();
  } else {
    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('active');
    mobileNav.setAttribute('aria-hidden', 'false');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scroll when menu open
  }
}

/**
 * Close mobile navigation drawer
 */
function closeMobileNav() {
  const hamburger = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const overlay = document.getElementById('mobile-nav-overlay');

  hamburger.classList.remove('active');
  hamburger.setAttribute('aria-expanded', 'false');
  mobileNav.classList.remove('active');
  mobileNav.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('active');
  document.body.style.overflow = ''; // Restore scroll
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  state.currentView = tabName;

  // Update tab buttons (both desktop and mobile)
  document.querySelectorAll('.tab-btn, .mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });

  // Load content for specific tabs
  if (tabName === 'dashboard') {
    loadDashboard();
  } else if (tabName === 'coach') {
    loadCoach();
  } else if (tabName === 'profile') {
    loadProfile();
  } else if (tabName === 'sessions') {
    loadSessions();
  } else if (tabName === 'social') {
    loadSocial();
  }
}

/**
 * Load and render social tab
 * Delegates to the Social module for UI updates
 */
function loadSocial() {
  // Social tab UI is handled by social.js via auth state changes
  // Just trigger a refresh if the Social module is available
  if (typeof Social !== 'undefined' && Auth.isSignedIn()) {
    Social.loadLeaderboard();
    Social.loadBenchmarks();
  }
}

/**
 * Trigger cloud sync after data changes
 * Called after sessions/events/profile are modified
 */
function triggerCloudSync() {
  if (typeof Sync !== 'undefined' && typeof Auth !== 'undefined' && Auth.isSignedIn()) {
    Sync.queueChange('data_update', { timestamp: new Date().toISOString() });
  }
}

/**
 * Load and render dashboard
 */
function loadDashboard() {
  // Get today's date for calculations throughout this function
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get upcoming events sorted by date
  const upcomingEvents = state.events
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Ensure carousel index is valid
  if (state.dashboardEventIndex >= upcomingEvents.length) {
    state.dashboardEventIndex = 0;
  }

  // Check if we have any upcoming events
  if (upcomingEvents.length === 0) {
    // No events - show prompt to create one
    document.getElementById('countdown-display').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg class="icon icon-outline" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="12" cy="15" r="2"/></svg>
        </div>
        <p>No upcoming event set</p>
        <button class="btn btn-primary mt-lg" onclick="showEventForm()">
          <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 16px; height: 16px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Your First Event
        </button>
      </div>
    `;
  } else {
    // Get the current event to display
    const currentEvent = upcomingEvents[state.dashboardEventIndex];
    const eventDate = new Date(currentEvent.date);
    const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

    // Build pagination dots HTML
    let paginationHtml = '';
    if (upcomingEvents.length > 1) {
      const dots = upcomingEvents.map((event, index) => {
        const isActive = index === state.dashboardEventIndex;
        return `<button class="pagination-dot ${isActive ? 'active' : ''}" onclick="goToEvent(${index})" title="${event.name}"></button>`;
      }).join('');
      paginationHtml = `<div class="event-pagination">${dots}</div>`;
    }

    document.getElementById('countdown-display').innerHTML = `
      <div class="countdown-number">${daysUntil}</div>
      <div class="countdown-label">days until ${currentEvent.name}</div>
      <div class="countdown-date">
        ${eventDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>
      <div class="countdown-goal">${getGoalLabel(currentEvent.goal)}${currentEvent.targetTime ? ` - Target: ${currentEvent.targetTime}` : ''}</div>
      ${paginationHtml}
    `;
  }

  // Calculate stats
  const summary = Prompts.calculateTrainingSummary(state.sessions, today.toISOString().split('T')[0]);

  document.getElementById('stat-7days').textContent = `${summary.last7days_m}m`;
  document.getElementById('stat-14days').textContent = `${summary.last14days_m}m`;

  // Calculate most common effort in last 7 days
  const mostCommonEffort = getMostCommonEffort(state.sessions, 7);
  const effortLabel = getEffortLabel(mostCommonEffort);
  document.getElementById('stat-avg-rpe').textContent = mostCommonEffort
    ? `${effortLabel.emoji} ${effortLabel.text}`
    : '--';
  document.getElementById('stat-streak').textContent = summary.consecutive_days_trained;

  // Calculate and display best streak
  const bestStreak = calculateBestStreak(state.sessions);
  document.getElementById('streak-best-value').textContent = bestStreak.count;

  // Show date range for best streak
  const datesEl = document.getElementById('streak-best-dates');
  if (bestStreak.count > 0 && bestStreak.startDate && bestStreak.endDate) {
    const startFormatted = new Date(bestStreak.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endFormatted = new Date(bestStreak.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (bestStreak.startDate === bestStreak.endDate) {
      datesEl.textContent = `(${startFormatted})`;
    } else {
      datesEl.textContent = `(${startFormatted} - ${endFormatted})`;
    }
  } else {
    datesEl.textContent = '';
  }

  // Update charts
  Charts.initCharts(state.profile, state.sessions);

  // Update weekly goals
  updateWeeklyGoals();

  // Show recent sessions
  renderRecentSessions();
}

/**
 * Navigate to a specific event in the dashboard carousel
 */
function goToEvent(index) {
  state.dashboardEventIndex = index;
  // Only re-render the countdown section, not the entire dashboard
  loadDashboard();
}

/**
 * Render recent sessions on dashboard
 */
function renderRecentSessions() {
  const container = document.getElementById('recent-sessions-list');

  if (state.sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M4 22c2-2.5 4-4 6-4 1.5 0 2.5.5 4 1.5 1.5 1 2.5 1.5 4 1.5 2 0 4-1.5 6-4"/><path d="M4 17c2-2.5 4-4 6-4 1.5 0 2.5.5 4 1.5 1.5 1 2.5 1.5 4 1.5 2 0 4-1.5 6-4"/></svg>
        </div>
        <p>No sessions logged yet</p>
        <button class="btn btn-primary mt-lg" onclick="switchTab('sessions')">
          Log Your First Session
        </button>
      </div>
    `;
    return;
  }

  // Get last 3 sessions
  const recent = [...state.sessions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  container.innerHTML = recent.map(session => `
    <div class="session-item ${session.type}">
      <div class="session-icon-wrap">
        ${session.type === 'pool'
          ? '<svg class="icon icon-outline" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 14h20"/><path d="M6 6v12"/><path d="M10 6v12"/><path d="M14 6v12"/><path d="M18 6v12"/></svg>'
          : '<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M2 12c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/><path d="M2 6c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/><path d="M2 18c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/></svg>'
        }
      </div>
      <div class="session-info">
        <div class="session-header">
          <span class="session-date">${new Date(session.date).toLocaleDateString()}</span>
          <span class="session-type">${session.type.replace('_', ' ')}</span>
        </div>
        <div class="session-stats">
          <span>${session.distance_m}m</span>
          <span>${session.time_min} min</span>
          <span>RPE ${session.rpe}/10</span>
        </div>
        ${session.notes ? `<div class="session-notes">${session.notes}</div>` : ''}
      </div>
    </div>
  `).join('');
}

/**
 * Update weekly goals progress on dashboard
 * Based on Midmar Mile training program guidelines
 */
function updateWeeklyGoals() {
  if (!state.profile) return;

  // Get the start of current week (Monday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  // Calculate sessions this week
  const thisWeekSessions = state.sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= monday && sessionDate <= today;
  });

  // Calculate distance this week
  const thisWeekDistance = thisWeekSessions.reduce((sum, s) => sum + s.distance_m, 0);
  const sessionsCount = thisWeekSessions.length;

  // Weekly targets based on profile
  const targetDistance = state.profile.weeklyVolumeEstimate_m || 10000; // Default 10km/week
  const targetSessions = state.profile.sessionsPerWeek ||
    (state.profile.availabilityDays ? state.profile.availabilityDays.length : 5);

  // Calculate progress percentages
  const distanceProgress = Math.min(100, Math.round((thisWeekDistance / targetDistance) * 100));
  const sessionsProgress = Math.min(100, Math.round((sessionsCount / targetSessions) * 100));

  // Determine status based on day of week
  const daysIntoWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
  const expectedDistanceProgress = (daysIntoWeek / 7) * 100;
  const expectedSessionsProgress = (daysIntoWeek / 7) * 100;

  // Update distance goal UI
  document.getElementById('goal-distance-text').textContent =
    `${(thisWeekDistance / 1000).toFixed(1)}km / ${(targetDistance / 1000).toFixed(1)}km`;
  document.getElementById('goal-distance-fill').style.width = `${distanceProgress}%`;
  document.getElementById('goal-distance-remaining').textContent =
    `${((targetDistance - thisWeekDistance) / 1000).toFixed(1)}km`;

  // Update distance status
  const distanceFill = document.getElementById('goal-distance-fill');
  distanceFill.classList.remove('on-track', 'behind', 'ahead');
  if (distanceProgress >= expectedDistanceProgress + 10) {
    distanceFill.classList.add('ahead');
    document.getElementById('goal-distance-status').textContent = 'Ahead of schedule!';
  } else if (distanceProgress >= expectedDistanceProgress - 10) {
    distanceFill.classList.add('on-track');
    document.getElementById('goal-distance-status').textContent = 'On track';
  } else {
    distanceFill.classList.add('behind');
    document.getElementById('goal-distance-status').textContent = 'Behind schedule';
  }

  // Update sessions goal UI
  document.getElementById('goal-sessions-text').textContent = `${sessionsCount} / ${targetSessions}`;
  document.getElementById('goal-sessions-fill').style.width = `${sessionsProgress}%`;
  document.getElementById('goal-sessions-remaining').textContent = `${targetSessions - sessionsCount}`;

  // Update sessions status
  const sessionsFill = document.getElementById('goal-sessions-fill');
  sessionsFill.classList.remove('on-track', 'behind', 'ahead');
  if (sessionsProgress >= expectedSessionsProgress + 10) {
    sessionsFill.classList.add('ahead');
    document.getElementById('goal-sessions-status').textContent = 'Ahead of schedule!';
  } else if (sessionsProgress >= expectedSessionsProgress - 10) {
    sessionsFill.classList.add('on-track');
    document.getElementById('goal-sessions-status').textContent = 'On track';
  } else {
    sessionsFill.classList.add('behind');
    document.getElementById('goal-sessions-status').textContent = 'Keep going!';
  }

  // Render 10-week history rings
  renderWeekRings(targetDistance);
}

/**
 * Render 10-week history as circular progress rings
 */
function renderWeekRings(weeklyTarget) {
  const container = document.getElementById('week-rings');
  if (!container) return;

  // Calculate weekly data for past 10 weeks
  const weekData = [];
  const today = new Date();

  for (let i = 9; i >= 0; i--) {
    // Get Monday of that week
    const weekStart = new Date(today);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - (i * 7));
    weekStart.setHours(0, 0, 0, 0);

    // Get Sunday of that week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Filter sessions for this week
    const weekSessions = state.sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });

    // Calculate distance
    const distance = weekSessions.reduce((sum, s) => sum + s.distance_m, 0);
    const percentage = Math.round((distance / weeklyTarget) * 100);

    // Format week label
    const weekLabel = i === 0 ? 'This' :
                      i === 1 ? 'Last' :
                      `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;

    weekData.push({
      label: weekLabel,
      distance,
      percentage,
      weekStart
    });
  }

  // Render SVG rings
  const circumference = 2 * Math.PI * 16; // radius = 16

  container.innerHTML = weekData.map(week => {
    const progress = Math.min(100, week.percentage);
    const offset = circumference - (progress / 100) * circumference;

    let colorClass = 'empty';
    if (week.distance > 0) {
      if (week.percentage >= 100) colorClass = 'complete';
      else if (week.percentage >= 50) colorClass = 'partial';
      else colorClass = 'low';
    }

    return `
      <div class="week-ring" title="Week of ${week.weekStart.toLocaleDateString()}: ${(week.distance/1000).toFixed(1)}km (${week.percentage}%)">
        <div class="week-ring-container">
          <svg class="week-ring-svg" viewBox="0 0 40 40">
            <circle class="week-ring-bg" cx="20" cy="20" r="16"></circle>
            <circle class="week-ring-progress ${colorClass}" cx="20" cy="20" r="16"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"></circle>
          </svg>
          <span class="week-ring-value">${week.percentage > 0 ? week.percentage + '%' : '-'}</span>
        </div>
        <span class="week-ring-label">${week.label}</span>
      </div>
    `;
  }).join('');
}

/**
 * Calculate best (longest) training streak from all sessions
 * Returns an object with count and date range
 */
function calculateBestStreak(sessions) {
  if (sessions.length === 0) {
    return { count: 0, startDate: null, endDate: null };
  }

  // Sort sessions by date
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));

  let bestStreak = 1;
  let currentStreak = 1;
  let bestStartIdx = 0;
  let bestEndIdx = 0;
  let currentStartIdx = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    const currDate = new Date(sorted[i].date);

    // Calculate difference in days
    const diffTime = currDate - prevDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      currentStreak++;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
        bestStartIdx = currentStartIdx;
        bestEndIdx = i;
      }
    } else if (diffDays === 0) {
      // Same day - don't break streak but don't increment
      continue;
    } else {
      // Gap in training - reset streak
      currentStreak = 1;
      currentStartIdx = i;
    }
  }

  return {
    count: bestStreak,
    startDate: sorted[bestStartIdx].date,
    endDate: sorted[bestEndIdx].date
  };
}

/**
 * Load Coach tab
 * Shows saved recommendation if available, with staleness indicator
 */
function loadCoach() {
  const statusDot = document.getElementById('coach-status-dot');
  const statusText = document.getElementById('coach-status-text');
  const resultsDiv = document.getElementById('coaching-results');
  const emptyState = document.getElementById('coach-empty-state');

  if (!state.coaching || !state.coaching.recommendation) {
    // No recommendation yet
    statusDot.classList.remove('stale');
    statusDot.classList.add('none');
    statusText.textContent = 'No recommendation yet';
    resultsDiv.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  // Check if recommendation is stale
  const isStale = state.sessions.length !== state.coaching.sessionCountAtGeneration;
  const generatedDate = new Date(state.coaching.generatedAt);
  const timeAgo = getTimeAgo(generatedDate);

  if (isStale) {
    statusDot.classList.add('stale');
    statusDot.classList.remove('none');
    statusText.textContent = `Generated ${timeAgo} - New sessions logged, consider refreshing`;
  } else {
    statusDot.classList.remove('stale', 'none');
    statusText.textContent = `Generated ${timeAgo} - Up to date`;
  }

  // Display the recommendation
  emptyState.style.display = 'none';
  resultsDiv.style.display = 'block';

  // Check if this is the new structured format or legacy format
  if (state.coaching.recommendation.session_plan) {
    // New structured format - use CoachView
    displayCoachingStructured(state.coaching.recommendation);
  } else {
    // Legacy format - use old display
    displayCoachingPretty(state.coaching.recommendation);
  }
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 172800) return 'yesterday';
  return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Display coaching in a nice visual format
 */
function displayCoachingPretty(coaching, isAdapted = false) {
  const container = document.getElementById('coaching-display');
  const session = coaching.tomorrow_session;

  // Store current coaching for adjustments
  state.currentCoaching = coaching;

  // Store original coaching only on first display (not after adaptations)
  if (!isAdapted) {
    state.originalCoaching = JSON.parse(JSON.stringify(coaching));
  }

  // Update adjustment controls
  updateCoachAdjustments(session);

  let html = `
    <div class="coach-recommendation">
      <span class="coach-session-type ${session.type}">${session.type.replace('_', ' ').toUpperCase()}</span>

      ${session.type !== 'rest' ? `
        <div class="coach-detail">
          <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 18px; height: 18px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span><strong>${session.duration_min}</strong> minutes</span>
        </div>
        ${session.distance_m ? `
          <div class="coach-detail">
            <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 4v16"/><path d="M12 4h4"/><path d="M12 8h3"/><path d="M12 12h4"/><path d="M12 16h3"/><path d="M12 20h4"/></svg>
            <span><strong>${session.distance_m}</strong> meters</span>
          </div>
        ` : ''}
        <div class="coach-detail">
          <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path d="M6.5 6.5a2.5 2.5 0 0 1 5 0v11a2.5 2.5 0 0 1-5 0v-11z"/><path d="M12.5 6.5a2.5 2.5 0 0 1 5 0v11a2.5 2.5 0 0 1-5 0v-11z"/><line x1="4" y1="12" x2="6.5" y2="12"/><line x1="17.5" y1="12" x2="20" y2="12"/></svg>
          <span>Intensity: <strong>${session.intensity}</strong></span>
        </div>
      ` : ''}

      ${session.structure && session.structure.length > 0 ? `
        <div class="coach-structure">
          <h4>Session Structure</h4>
          <div class="workout-checklist">
            ${session.structure.map((step, index) => `
              <label class="workout-item">
                <input type="checkbox" class="workout-checkbox" data-index="${index}">
                <span class="workout-text">${step}</span>
              </label>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${session.technique_focus && session.technique_focus.length > 0 ? `
        <div class="coach-technique">
          ${session.technique_focus.map(t => `<span class="coach-technique-tag">${t}</span>`).join('')}
        </div>
      ` : ''}
    </div>

    <div class="coach-why">
      <h4>Why This Session?</h4>
      <p>${coaching.why_this}</p>
    </div>

    ${coaching.flags && coaching.flags.length > 0 ? `
      <div class="coach-flags">
        <h4>Important Notes</h4>
        <ul>
          ${coaching.flags.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    ${coaching.event_prep_tip ? `
      <div class="coach-tip">
        <h4>Event Prep Tip</h4>
        <p>${coaching.event_prep_tip}</p>
      </div>
    ` : ''}
  `;

  container.innerHTML = html;

  // Show/hide commit section based on session type
  const commitSection = document.getElementById('coach-commit');
  if (session.type === 'rest') {
    commitSection.style.display = 'none';
  } else {
    commitSection.style.display = 'block';
  }
}

/**
 * Display coaching using the new structured CoachView format
 * Uses the deterministic session plan + polish
 */
function displayCoachingStructured(recommendation, isAdapted = false) {
  const container = document.getElementById('coaching-display');
  const session = recommendation.session_plan.session;

  // Store current coaching for adjustments
  state.currentCoaching = recommendation;

  // Store original coaching only on first display (not after adaptations)
  if (!isAdapted) {
    state.originalCoaching = JSON.parse(JSON.stringify(recommendation));
  }

  // Use CoachView to render the structured recommendation
  if (window.CoachView) {
    CoachView.renderCoachingRecommendation(recommendation, container);
  } else {
    // Fallback if CoachView not loaded
    container.innerHTML = '<p>Error: CoachView module not loaded</p>';
  }

  // Update adjustment controls
  updateCoachAdjustments(session);

  // Show/hide commit section based on session type
  const commitSection = document.getElementById('coach-commit');
  if (session.type === 'rest') {
    commitSection.style.display = 'none';
  } else {
    commitSection.style.display = 'block';
  }
}

/**
 * Update the adjustment controls with current session data
 */
function updateCoachAdjustments(session) {
  // Update type toggle
  const poolBtn = document.getElementById('toggle-pool');
  const openWaterBtn = document.getElementById('toggle-openwater');

  if (session.type === 'pool') {
    poolBtn.classList.add('active');
    openWaterBtn.classList.remove('active');
  } else if (session.type === 'open_water') {
    openWaterBtn.classList.add('active');
    poolBtn.classList.remove('active');
  }

  // Update distance input
  const distanceInput = document.getElementById('adjust-distance');
  if (session.distance_m) {
    distanceInput.value = session.distance_m;
  }

  // Show/hide adjustments for rest days
  const adjustments = document.getElementById('coach-adjustments');
  if (session.type === 'rest') {
    adjustments.style.display = 'none';
  } else {
    adjustments.style.display = 'flex';
  }
}

/**
 * Set the coach session type (pool or open_water)
 */
function setCoachType(type) {
  const poolBtn = document.getElementById('toggle-pool');
  const openWaterBtn = document.getElementById('toggle-openwater');

  if (type === 'pool') {
    poolBtn.classList.add('active');
    openWaterBtn.classList.remove('active');
  } else {
    openWaterBtn.classList.add('active');
    poolBtn.classList.remove('active');
  }
}

/**
 * Adapt the session based on user adjustments
 * Uses new CoachService methods when available
 */
async function adaptSession() {
  if (!state.currentCoaching) {
    alert('No coaching recommendation to adapt');
    return;
  }

  // Determine which session object to use based on format
  const isNewFormat = !!state.currentCoaching.session_plan;
  const currentSession = isNewFormat
    ? state.currentCoaching.session_plan.session
    : state.currentCoaching.tomorrow_session;

  const newType = document.getElementById('toggle-pool').classList.contains('active') ? 'pool' : 'open_water';
  const newDistance = parseInt(document.getElementById('adjust-distance').value) || currentSession.distance_m || currentSession.total_distance_m;

  // Show loading state
  const adaptBtn = document.getElementById('adapt-session-btn');
  const originalText = adaptBtn.innerHTML;
  adaptBtn.innerHTML = `<div class="spinner-small"></div> Adapting...`;
  adaptBtn.disabled = true;

  try {
    // Check if type changed
    const typeChanged = newType !== currentSession.type;
    const distanceChanged = newDistance !== (currentSession.distance_m || currentSession.total_distance_m);

    if (isNewFormat && window.CoachService) {
      // Use new CoachService for adaptation
      let adaptedRecommendation;

      if (typeChanged) {
        // Adapt to new type
        adaptedRecommendation = await CoachService.adaptRecommendation(
          state.originalCoaching || state.currentCoaching,
          newType,
          state.sessions
        );
      } else if (distanceChanged) {
        // Scale to new distance
        adaptedRecommendation = await CoachService.scaleRecommendation(
          state.originalCoaching || state.currentCoaching,
          newDistance,
          state.profile,
          state.sessions
        );
      } else {
        // No change needed
        adaptBtn.innerHTML = originalText;
        adaptBtn.disabled = false;
        return;
      }

      // Update state and display
      state.currentCoaching = adaptedRecommendation;
      displayCoachingStructured(adaptedRecommendation, true);

      // Save the updated coaching
      await DB.saveCoaching(adaptedRecommendation, state.sessions.length);
      state.coaching = {
        recommendation: adaptedRecommendation,
        generatedAt: new Date().toISOString(),
        sessionCountAtGeneration: state.sessions.length
      };

    } else {
      // Legacy format - use API or local fallback
      try {
        const adaptRequest = {
          original_session: state.currentCoaching.tomorrow_session,
          new_type: newType,
          new_distance: newDistance,
          profile: state.profile
        };

        const response = await fetch('http://localhost:3000/api/adapt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adaptRequest)
        });

        if (!response.ok) {
          throw new Error('Failed to adapt session');
        }

        const adaptedSession = await response.json();
        state.currentCoaching.tomorrow_session = adaptedSession;
        displayCoachingPretty(state.currentCoaching, true);

        await DB.saveCoaching(state.currentCoaching, state.sessions.length);
        state.coaching = {
          recommendation: state.currentCoaching,
          generatedAt: new Date().toISOString(),
          sessionCountAtGeneration: state.sessions.length
        };

      } catch (apiError) {
        console.error('API error, using local adaptation:', apiError);
        adaptSessionLocally(newType, newDistance);
      }
    }

  } catch (error) {
    console.error('Error adapting session:', error);
    // Final fallback: manually adapt without API call
    adaptSessionLocally(newType, newDistance);
  } finally {
    adaptBtn.innerHTML = originalText;
    adaptBtn.disabled = false;
  }
}

/**
 * Local fallback for adapting session without API call
 * Always works from the ORIGINAL coaching data to avoid cumulative changes
 */
function adaptSessionLocally(newType, newDistance) {
  if (!state.originalCoaching) return;

  // Get original values
  const originalSession = state.originalCoaching.tomorrow_session;
  const originalType = originalSession.type;
  const originalDistance = originalSession.distance_m || 1500;
  const originalWhyThis = state.originalCoaching.why_this;

  // Check if anything changed from ORIGINAL
  const typeChanged = newType !== originalType;
  const distanceChanged = newDistance && newDistance !== originalDistance;

  // Create a fresh copy from original
  const adaptedCoaching = JSON.parse(JSON.stringify(state.originalCoaching));
  const session = adaptedCoaching.tomorrow_session;

  // Update type
  session.type = newType;

  // Update distance and scale structure from ORIGINAL
  if (distanceChanged) {
    const ratio = newDistance / originalDistance;
    session.distance_m = newDistance;

    // Scale the structure proportionally from original
    if (originalSession.structure && originalSession.structure.length > 0) {
      session.structure = originalSession.structure.map(step => {
        return step.replace(/(\d+)m/g, (_, num) => {
          const scaled = Math.round(parseInt(num) * ratio / 50) * 50;
          return `${scaled}m`;
        });
      });
    }

    // Update duration estimate based on new distance
    if (originalSession.duration_min) {
      session.duration_min = Math.round(originalSession.duration_min * ratio);
    }
  }

  // Adapt structure for type change (pool vs open water)
  if (typeChanged && session.structure && session.structure.length > 0) {
    if (newType === 'open_water') {
      session.structure = session.structure.map(step => {
        return step
          .replace(/(\d+)\s*x\s*(\d+)m/gi, (_, sets, dist) => {
            const total = parseInt(sets) * parseInt(dist);
            return `${total}m continuous`;
          })
          .replace(/pool/gi, 'open water')
          .replace(/wall/gi, 'buoy');
      });
    } else if (originalType === 'open_water') {
      // Only convert if original was open water
      session.structure = session.structure.map(step => {
        return step
          .replace(/continuous/gi, 'with turns')
          .replace(/open water/gi, 'pool')
          .replace(/buoy/gi, 'wall');
      });
    }
  }

  // Update why_this with adaptation note if changed
  if (typeChanged || distanceChanged) {
    adaptedCoaching.why_this = originalWhyThis +
      ` (Adapted to ${newType.replace('_', ' ')} - ${newDistance}m)`;
  }

  // Update current coaching and re-display (mark as adapted)
  state.currentCoaching = adaptedCoaching;
  displayCoachingPretty(adaptedCoaching, true);
}

/**
 * Log a session directly from the coaching recommendation
 * Handles both new structured format and legacy format
 */
async function logSessionFromCoach() {
  if (!state.currentCoaching) {
    alert('No coaching recommendation to log');
    return;
  }

  // Determine which session object to use based on format
  const isNewFormat = !!state.currentCoaching.session_plan;
  const session = isNewFormat
    ? state.currentCoaching.session_plan.session
    : state.currentCoaching.tomorrow_session;

  if (!session) {
    alert('No coaching recommendation to log');
    return;
  }

  if (session.type === 'rest') {
    alert('Rest days cannot be logged as sessions');
    return;
  }

  // Get completed workout items
  let completedCount = 0;
  let totalCount = 0;

  if (isNewFormat && window.CoachView) {
    // Use CoachView helper for new format
    const completedItems = CoachView.getCompletedItems();
    completedCount = completedItems.length;
    // Count total items across all structure blocks
    session.structure.forEach(block => {
      totalCount += block.items.length;
    });
  } else {
    // Legacy format
    const checkboxes = document.querySelectorAll('.workout-checkbox');
    checkboxes.forEach(cb => {
      totalCount++;
      if (cb.checked) {
        completedCount++;
      }
    });
  }

  // Create the session object
  const newSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0], // Today's date
    type: session.type,
    distance_m: isNewFormat ? (session.total_distance_m || 0) : (session.distance_m || 0),
    time_min: isNewFormat ? (session.estimated_duration_min || 0) : (session.duration_min || 0),
    rpe: 5, // Default RPE - user can edit later
    notes: `Coach recommendation. ${completedCount > 0 ? `Completed: ${completedCount}/${totalCount} items.` : ''}`,
    conditions: ''
  };

  try {
    // Save to database
    await DB.addSession(newSession);
    state.sessions.push(newSession);

    // Trigger cloud sync
    triggerCloudSync();

    // Show success
    alert('Session logged successfully! You can edit the details in the Sessions tab.');

    // Reload relevant views
    if (state.currentView === 'dashboard') {
      loadDashboard();
    }

    // Switch to sessions tab to show the new session
    switchTab('sessions');

  } catch (error) {
    console.error('Error logging session:', error);
    alert('Failed to log session. Please try again.');
  }
}

/**
 * Load profile form
 */
function loadProfile() {
  if (!state.profile) return;

  // Personal details
  document.getElementById('firstName').value = state.profile.firstName || '';
  document.getElementById('lastName').value = state.profile.lastName || '';
  document.getElementById('birthYear').value = state.profile.birthYear || '';
  document.getElementById('gender').value = state.profile.gender || '';

  // Training details
  document.getElementById('longestDistance').value = state.profile.longestRecentSwim?.distance_m || 1000;
  document.getElementById('longestTime').value = state.profile.longestRecentSwim?.time_min || 30;
  document.getElementById('weeklyVolume').value = state.profile.weeklyVolumeEstimate_m || 3000;
  document.getElementById('tone').value = state.profile.tone || 'neutral';
  document.getElementById('access-pool').checked = state.profile.access?.pool !== false;
  document.getElementById('access-ow').checked = state.profile.access?.openWater || false;

  // Availability
  if (state.profile.availabilityDays) {
    document.getElementById('avail-days').checked = true;
    state.profile.availabilityDays.forEach(day => {
      const checkbox = document.querySelector(`input[name="day"][value="${day}"]`);
      if (checkbox) checkbox.checked = true;
    });
    toggleAvailabilityType();
  } else if (state.profile.sessionsPerWeek) {
    document.getElementById('avail-sessions').checked = true;
    document.getElementById('sessionsPerWeek').value = state.profile.sessionsPerWeek;
    toggleAvailabilityType();
  }
}

/**
 * Handle profile form submission
 */
async function handleProfileSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);

  // Build availability
  let availabilityDays = null;
  let sessionsPerWeek = null;

  if (document.getElementById('avail-days').checked) {
    availabilityDays = Array.from(document.querySelectorAll('input[name="day"]:checked'))
      .map(cb => cb.value);
  } else {
    sessionsPerWeek = parseInt(formData.get('sessionsPerWeek'));
  }

  // Build profile object (no longer contains event data)
  const profile = {
    // Personal details
    firstName: formData.get('firstName') || null,
    lastName: formData.get('lastName') || null,
    birthYear: formData.get('birthYear') ? parseInt(formData.get('birthYear')) : null,
    gender: formData.get('gender') || null,
    // Training preferences
    availabilityDays: availabilityDays,
    sessionsPerWeek: sessionsPerWeek,
    access: {
      pool: document.getElementById('access-pool').checked,
      openWater: document.getElementById('access-ow').checked
    },
    longestRecentSwim: {
      distance_m: parseInt(formData.get('longestDistance')),
      time_min: parseInt(formData.get('longestTime'))
    },
    weeklyVolumeEstimate_m: parseInt(formData.get('weeklyVolume')),
    tone: formData.get('tone')
  };

  // Save to storage
  await DB.saveProfile(profile);
  state.profile = profile;

  alert('✅ Profile saved!');
  switchTab('dashboard');
}

/**
 * Toggle event target time field based on goal
 */
function toggleEventTargetTime() {
  const goal = document.getElementById('eventGoal').value;
  const targetTimeGroup = document.getElementById('event-target-time-group');
  targetTimeGroup.style.display = goal === 'target_time' ? 'block' : 'none';
}

/**
 * Toggle availability type (days vs sessions per week)
 */
function toggleAvailabilityType() {
  const isDays = document.getElementById('avail-days').checked;
  document.getElementById('days-group').style.display = isDays ? 'block' : 'none';
  document.getElementById('sessions-group').style.display = isDays ? 'none' : 'block';
}

/**
 * Handle profile picture upload
 */
function handleProfilePictureUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return;
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert('Image size should be less than 2MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      // Resize and crop to square
      const canvas = document.createElement('canvas');
      const size = 200; // Output size
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Calculate crop dimensions (center crop to square)
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      // Draw circular crop
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

      // Convert to base64 and save
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      saveProfilePicture(dataUrl);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * Save profile picture to localStorage
 */
function saveProfilePicture(dataUrl) {
  localStorage.setItem('profilePicture', dataUrl);
  updateProfilePictureDisplay(dataUrl);
}

/**
 * Remove profile picture
 */
function removeProfilePicture() {
  localStorage.removeItem('profilePicture');
  updateProfilePictureDisplay(null);
}

/**
 * Update profile picture display in all locations
 */
function updateProfilePictureDisplay(dataUrl) {
  const navAvatar = document.getElementById('avatar-image');
  const navPlaceholder = document.getElementById('avatar-placeholder');
  const profileImg = document.getElementById('profile-picture-img');
  const profilePlaceholder = document.getElementById('profile-picture-placeholder');
  const removeBtn = document.getElementById('remove-picture-btn');

  if (dataUrl) {
    // Show images
    navAvatar.src = dataUrl;
    navAvatar.style.display = 'block';
    navPlaceholder.style.display = 'none';

    profileImg.src = dataUrl;
    profileImg.style.display = 'block';
    profilePlaceholder.style.display = 'none';
    removeBtn.style.display = 'inline-flex';
  } else {
    // Show placeholders
    navAvatar.style.display = 'none';
    navPlaceholder.style.display = 'flex';

    profileImg.style.display = 'none';
    profilePlaceholder.style.display = 'flex';
    removeBtn.style.display = 'none';
  }
}

/**
 * Load profile picture from localStorage
 */
function loadProfilePicture() {
  const dataUrl = localStorage.getItem('profilePicture');
  updateProfilePictureDisplay(dataUrl);
}

/**
 * Load and render all sessions
 */
function loadSessions() {
  const container = document.getElementById('sessions-list');

  if (state.sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M4 22c2-2.5 4-4 6-4 1.5 0 2.5.5 4 1.5 1.5 1 2.5 1.5 4 1.5 2 0 4-1.5 6-4"/><path d="M4 17c2-2.5 4-4 6-4 1.5 0 2.5.5 4 1.5 1.5 1 2.5 1.5 4 1.5 2 0 4-1.5 6-4"/></svg>
        </div>
        <p>No sessions logged yet. Log your first swim above!</p>
      </div>
    `;
    return;
  }

  // Sort sessions by date (newest first)
  const sorted = [...state.sessions].sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = sorted.map(session => `
    <div class="session-item session-item-clickable ${session.type} ${session.gpsTrack ? 'session-has-map' : ''}" onclick="viewSessionDetail('${session.id}')" title="${session.gpsTrack ? 'Click to view session details and map' : 'Click to view session details'}">
      <div class="session-icon-wrap">
        ${session.type === 'pool'
          ? '<svg class="icon icon-outline" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 14h20"/><path d="M6 6v12"/><path d="M10 6v12"/><path d="M14 6v12"/><path d="M18 6v12"/></svg>'
          : '<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M2 12c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/><path d="M2 6c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/><path d="M2 18c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/></svg>'
        }
      </div>
      <div class="session-info">
        <div class="session-header">
          <span class="session-date">${new Date(session.date).toLocaleDateString()}</span>
          <span class="session-type">${session.type.replace('_', ' ')}${session.gpsTrack ? ' 📍' : ''}</span>
        </div>
        <div class="session-stats">
          <span>${session.distance_m}m</span>
          <span>${session.time_min} min</span>
          <span class="effort-badge ${normalizeEffort(session.effort || session.rpe)}">${getEffortLabel(session.effort || session.rpe).emoji} ${getEffortLabel(session.effort || session.rpe).text}</span>
        </div>
        ${session.notes ? `<div class="session-notes">"${session.notes}"</div>` : ''}
        ${session.conditions ? `<div class="session-notes">Conditions: ${session.conditions}</div>` : ''}
      </div>
      <div class="session-actions" onclick="event.stopPropagation()">
        <button class="btn btn-secondary btn-small" onclick="editSession('${session.id}')">
          <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button class="btn btn-danger btn-small" onclick="deleteSession('${session.id}')">
          <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * Handle session form submission
 */
async function handleSessionSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const editId = document.getElementById('edit-session-id').value;

  // Build session object
  const session = {
    id: editId || crypto.randomUUID(),
    date: formData.get('sessionDate'),
    type: formData.get('sessionType'),
    distance_m: parseInt(formData.get('sessionDistance')),
    time_min: parseInt(formData.get('sessionTime')),
    effort: formData.get('sessionRPE'), // easy, moderate, or hard
    notes: formData.get('sessionNotes'),
    conditions: formData.get('sessionConditions')
  };

  if (editId) {
    // Update existing session
    await DB.updateSession(editId, session);
    const index = state.sessions.findIndex(s => s.id === editId);
    state.sessions[index] = session;
    alert('✅ Session updated!');
    triggerCloudSync();
  } else {
    // Add new session
    await DB.addSession(session);
    state.sessions.push(session);
    alert('✅ Session logged!');
    triggerCloudSync();
  }

  // Reset and hide form
  hideSessionForm();

  // Reload sessions list
  loadSessions();

  // If we're on dashboard, reload it
  if (state.currentView === 'dashboard') {
    loadDashboard();
  }
}

/**
 * Edit a session
 */
function editSession(id) {
  const session = state.sessions.find(s => s.id === id);
  if (!session) return;

  // Populate form
  document.getElementById('edit-session-id').value = session.id;
  document.getElementById('sessionDate').value = session.date;
  document.getElementById('sessionType').value = session.type;
  document.getElementById('sessionDistance').value = session.distance_m;
  document.getElementById('sessionTime').value = session.time_min;
  document.getElementById('sessionNotes').value = session.notes || '';
  document.getElementById('sessionConditions').value = session.conditions || '';

  // Handle effort (support legacy rpe values)
  const effort = normalizeEffort(session.effort || session.rpe);
  selectEffort(effort);

  // Update UI
  document.getElementById('session-form-title').textContent = 'Edit Session';
  document.getElementById('session-submit-btn').textContent = 'Update Session';

  // Show modal
  document.getElementById('session-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/**
 * Cancel session edit
 */
function cancelSessionEdit() {
  hideSessionForm();
}

/**
 * Show the session form modal
 */
function showSessionForm() {
  document.getElementById('session-modal').style.display = 'flex';
  document.getElementById('sessionDate').value = new Date().toISOString().split('T')[0];
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

/**
 * Hide the session form modal
 */
function hideSessionForm() {
  document.getElementById('session-modal').style.display = 'none';
  document.getElementById('session-form').reset();
  document.getElementById('edit-session-id').value = '';
  document.getElementById('session-form-title').textContent = 'Log New Session';
  document.getElementById('session-submit-btn').textContent = 'Log Session';
  selectEffort('moderate'); // Reset to default
  document.body.style.overflow = ''; // Restore scrolling
}

/**
 * Handle click on modal overlay (close when clicking outside modal)
 */
function handleModalOverlayClick(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// ============================================
// EVENTS MANAGEMENT
// ============================================

/**
 * Switch between sub-tabs (Sessions/Events)
 */
function switchSubTab(subTabId) {
  // Update buttons
  document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === subTabId);
  });

  // Update content
  document.querySelectorAll('.sub-tab-content').forEach(content => {
    content.classList.toggle('active', content.id === subTabId);
  });

  // Load events if switching to events tab
  if (subTabId === 'events-list-tab') {
    loadEvents();
  }
}

/**
 * Load and render all events
 */
function loadEvents() {
  const upcomingContainer = document.getElementById('events-list');
  const pastContainer = document.getElementById('past-events-list');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Separate events into upcoming and past
  const upcoming = state.events
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const past = state.events
    .filter(e => new Date(e.date) < today)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Render upcoming events
  if (upcoming.length === 0) {
    upcomingContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg class="icon icon-outline" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <p>No upcoming events</p>
        <button class="btn btn-primary mt-lg" onclick="showEventForm()">
          Add Your First Event
        </button>
      </div>
    `;
  } else {
    upcomingContainer.innerHTML = upcoming.map(event => renderEventItem(event, false)).join('');
  }

  // Render past events
  if (past.length === 0) {
    pastContainer.innerHTML = `
      <div class="empty-state">
        <p class="text-muted">No past events yet</p>
      </div>
    `;
  } else {
    pastContainer.innerHTML = past.map(event => renderEventItem(event, true)).join('');
  }
}

/**
 * Render a single event item
 */
function renderEventItem(event, isPast) {
  const eventDate = new Date(event.date);
  const today = new Date();
  const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
  const isActive = state.activeEvent && state.activeEvent.id === event.id;

  return `
    <div class="event-item ${isActive ? 'active' : ''}" onclick="viewEvent('${event.id}')">
      <div class="event-icon">🏊</div>
      <div class="event-info">
        <div class="event-name">
          ${event.name}
          ${isActive ? '<span class="event-badge primary">Active</span>' : ''}
        </div>
        <div class="event-details">
          <span class="event-detail">
            <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span class="event-detail">
            <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 4v16"/></svg>
            ${event.distance}m
          </span>
          <span class="event-detail">${getGoalLabel(event.goal)}</span>
        </div>
      </div>
      ${!isPast ? `
        <div class="event-countdown">
          <div class="event-countdown-number">${daysUntil}</div>
          <div class="event-countdown-label">days</div>
        </div>
      ` : `
        <span class="event-badge past">Completed</span>
      `}
      <div class="event-actions" onclick="event.stopPropagation()">
        <button class="btn btn-secondary btn-small" onclick="editEvent('${event.id}')">
          <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn-danger btn-small" onclick="deleteEvent('${event.id}')">
          <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 14px; height: 14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Show event form modal
 */
function showEventForm() {
  state.editingEventId = null;
  document.getElementById('event-form').reset();
  document.getElementById('edit-event-id').value = '';
  document.getElementById('event-form-title').textContent = 'Add New Event';
  document.getElementById('event-submit-btn').textContent = 'Add Event';
  document.getElementById('event-target-time-group').style.display = 'none';

  // Set default date to 1 month from now
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() + 1);
  document.getElementById('eventDate').value = defaultDate.toISOString().split('T')[0];

  document.getElementById('event-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/**
 * Hide event form modal
 */
function hideEventForm() {
  document.getElementById('event-modal').style.display = 'none';
  document.getElementById('event-form').reset();
  document.getElementById('edit-event-id').value = '';
  state.editingEventId = null;
  document.body.style.overflow = '';
}

/**
 * Edit an event
 */
function editEvent(id) {
  const event = state.events.find(e => e.id === id);
  if (!event) return;

  state.editingEventId = id;

  document.getElementById('edit-event-id').value = event.id;
  document.getElementById('eventName').value = event.name;
  document.getElementById('eventDate').value = event.date;
  document.getElementById('eventDistance').value = event.distance;
  document.getElementById('eventGoal').value = event.goal;
  document.getElementById('eventTargetTime').value = event.targetTime || '';
  document.getElementById('eventNotes').value = event.notes || '';

  document.getElementById('event-form-title').textContent = 'Edit Event';
  document.getElementById('event-submit-btn').textContent = 'Save Changes';

  toggleEventTargetTime();

  document.getElementById('event-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/**
 * Handle event form submission
 */
async function handleEventSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const editId = document.getElementById('edit-event-id').value;

  const event = {
    id: editId || crypto.randomUUID(),
    name: formData.get('eventName'),
    date: formData.get('eventDate'),
    distance: parseInt(formData.get('eventDistance')),
    goal: formData.get('eventGoal'),
    targetTime: formData.get('eventTargetTime') || null,
    notes: formData.get('eventNotes') || null,
    isActive: false
  };

  if (editId) {
    // Update existing
    await DB.updateEvent(editId, event);
    const index = state.events.findIndex(e => e.id === editId);
    state.events[index] = event;
    alert('✅ Event updated!');
  } else {
    // Add new
    await DB.addEvent(event);
    state.events.push(event);
    alert('✅ Event added!');
  }

  // Update active event
  state.activeEvent = await DB.getActiveEvent();

  hideEventForm();
  loadEvents();

  // Also refresh dashboard if we're there
  if (state.currentView === 'dashboard') {
    loadDashboard();
  }
}

/**
 * Delete an event
 */
async function deleteEvent(id) {
  if (!confirm('Delete this event? This cannot be undone.')) {
    return;
  }

  await DB.deleteEvent(id);
  state.events = state.events.filter(e => e.id !== id);

  // Update active event
  state.activeEvent = await DB.getActiveEvent();

  alert('✅ Event deleted');
  loadEvents();

  if (state.currentView === 'dashboard') {
    loadDashboard();
  }
}

/**
 * View event details (or set as active)
 */
function viewEvent(id) {
  const event = state.events.find(e => e.id === id);
  if (!event) return;

  const eventDate = new Date(event.date);
  const today = new Date();

  // Only allow setting as active if it's a future event
  if (eventDate >= today && (!state.activeEvent || state.activeEvent.id !== id)) {
    if (confirm(`Set "${event.name}" as your active training event?`)) {
      setEventActive(id);
    }
  }
}

/**
 * Set an event as the active training event
 */
async function setEventActive(id) {
  await DB.setActiveEvent(id);
  state.events = await DB.getEvents();
  state.activeEvent = state.events.find(e => e.id === id);

  loadEvents();
  if (state.currentView === 'dashboard') {
    loadDashboard();
  }
}

/**
 * Get human-readable goal label
 */
function getGoalLabel(goal) {
  const labels = {
    'finish_comfortably': 'Finish Comfortably',
    'target_time': 'Target Time',
    'personal_best': 'Personal Best',
    'just_finish': 'Just Finish'
  };
  return labels[goal] || goal;
}

/**
 * Migrate old profile event data to events array
 */
async function migrateProfileEventToEvents() {
  if (!state.profile) return;

  // Check if profile has old event data
  if (state.profile.eventDate && state.events.length === 0) {
    console.log('📦 Migrating profile event to events array...');

    const migratedEvent = {
      id: crypto.randomUUID(),
      name: 'Midmar Mile',
      date: state.profile.eventDate,
      distance: 1609,
      goal: state.profile.goal || 'finish_comfortably',
      targetTime: state.profile.targetTime || null,
      notes: 'Migrated from profile',
      isActive: true
    };

    await DB.addEvent(migratedEvent);
    state.events.push(migratedEvent);

    // Remove event data from profile
    delete state.profile.eventDate;
    delete state.profile.goal;
    delete state.profile.targetTime;
    await DB.saveProfile(state.profile);

    console.log('✅ Migration complete');
  }
}

/**
 * Show import modal
 */
function showImportModal() {
  document.getElementById('import-modal').style.display = 'flex';
  document.getElementById('import-preview').style.display = 'none';
  document.body.style.overflow = 'hidden';
}

/**
 * Hide import modal
 */
function hideImportModal() {
  document.getElementById('import-modal').style.display = 'none';
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('samsung-import-file').value = '';
  document.getElementById('gpx-import-file').value = '';
  document.getElementById('app-import-file').value = '';
  state.pendingImport = null;
  document.body.style.overflow = '';
}

/**
 * Handle Samsung Health CSV import
 */
function handleSamsungImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const sessions = parseSamsungHealthCSV(event.target.result);
      if (sessions.length === 0) {
        alert('No swimming sessions found in the file. Make sure this is a Samsung Health swimming export.');
        return;
      }
      showImportPreview(sessions);
    } catch (error) {
      alert('Error parsing file: ' + error.message);
    }
  };
  reader.readAsText(file);
}

/**
 * Parse Samsung Health CSV format
 */
function parseSamsungHealthCSV(csvText) {
  const lines = csvText.split('\n');
  const sessions = [];

  // Find header line
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('date') &&
        (lines[i].toLowerCase().includes('distance') || lines[i].toLowerCase().includes('duration'))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Could not find header row in CSV');
  }

  const headers = lines[headerIndex].split(',').map(h => h.trim().toLowerCase());

  // Find column indices
  const dateCol = headers.findIndex(h => h.includes('date') || h.includes('time'));
  const distanceCol = headers.findIndex(h => h.includes('distance'));
  const durationCol = headers.findIndex(h => h.includes('duration') || h.includes('time'));
  const typeCol = headers.findIndex(h => h.includes('type') || h.includes('activity'));

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',').map(c => c.trim());

    // Parse date
    let dateStr = cols[dateCol] || '';
    let date;
    try {
      date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Try other formats
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
          date = new Date(parts[2], parts[1] - 1, parts[0]);
        }
      }
    } catch {
      continue;
    }

    if (isNaN(date.getTime())) continue;

    // Parse distance (convert to meters if needed)
    let distance = parseFloat(cols[distanceCol]) || 0;
    if (distance > 0 && distance < 100) {
      distance = distance * 1000; // Assume km, convert to m
    }

    // Parse duration (convert to minutes)
    let duration = 0;
    const durationStr = cols[durationCol] || '';
    if (durationStr.includes(':')) {
      const parts = durationStr.split(':');
      if (parts.length === 3) {
        duration = parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
      } else if (parts.length === 2) {
        duration = parseInt(parts[0]) + parseInt(parts[1]) / 60;
      }
    } else {
      duration = parseFloat(durationStr) || 0;
      if (duration > 500) duration = duration / 60; // Assume seconds if large
    }

    // Determine type
    const typeStr = (cols[typeCol] || '').toLowerCase();
    const type = typeStr.includes('open') || typeStr.includes('outdoor') ? 'open_water' : 'pool';

    if (distance > 0 || duration > 0) {
      sessions.push({
        id: crypto.randomUUID(),
        date: date.toISOString().split('T')[0],
        type: type,
        distance_m: Math.round(distance),
        time_min: Math.round(duration),
        rpe: 5,
        notes: 'Imported from Samsung Health',
        conditions: ''
      });
    }
  }

  return sessions;
}

/**
 * Handle GPX file import (Samsung Health, Garmin, etc.)
 */
function handleGPXImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const sessions = parseGPXFile(event.target.result);
      if (sessions.length === 0) {
        alert('No swimming sessions found in the GPX file.');
        return;
      }
      showImportPreview(sessions);
    } catch (error) {
      alert('Error parsing GPX file: ' + error.message);
    }
  };
  reader.readAsText(file);
}

/**
 * Parse GPX file format (XML)
 * Extracts session data from Samsung Health and other fitness app exports
 */
function parseGPXFile(gpxText) {
  const sessions = [];

  // Parse XML
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxText, 'text/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid GPX file format');
  }

  // Get metadata time (session date)
  let sessionDate = new Date().toISOString().split('T')[0];
  const metadataTime = doc.querySelector('metadata > time');
  if (metadataTime) {
    const dateObj = new Date(metadataTime.textContent);
    if (!isNaN(dateObj.getTime())) {
      sessionDate = dateObj.toISOString().split('T')[0];
    }
  }

  // Try to get first trackpoint time as fallback
  if (!metadataTime) {
    const firstTrkpt = doc.querySelector('trkpt > time');
    if (firstTrkpt) {
      const dateObj = new Date(firstTrkpt.textContent);
      if (!isNaN(dateObj.getTime())) {
        sessionDate = dateObj.toISOString().split('T')[0];
      }
    }
  }

  // Extract GPS track points for map display
  const gpsTrack = [];
  const trkpts = doc.querySelectorAll('trkpt');
  trkpts.forEach(trkpt => {
    const lat = parseFloat(trkpt.getAttribute('lat'));
    const lon = parseFloat(trkpt.getAttribute('lon'));
    if (!isNaN(lat) && !isNaN(lon)) {
      const point = { lat, lon };
      // Try to get heart rate from extensions
      const hr = trkpt.querySelector('hr');
      if (hr) {
        point.hr = parseInt(hr.textContent) || null;
      }
      // Try to get time
      const time = trkpt.querySelector('time');
      if (time) {
        point.time = time.textContent;
      }
      gpsTrack.push(point);
    }
  });

  // Look for exerciseinfo (Samsung Health format)
  let distance = 0;
  let duration = 0;

  const exerciseInfo = doc.querySelector('exerciseinfo');
  if (exerciseInfo) {
    // Samsung Health stores distance in meters and duration in milliseconds
    const distanceEl = exerciseInfo.querySelector('distance');
    const durationEl = exerciseInfo.querySelector('duration');

    if (distanceEl) {
      distance = parseFloat(distanceEl.textContent) || 0;
    }
    if (durationEl) {
      // Convert milliseconds to minutes
      duration = Math.round((parseFloat(durationEl.textContent) || 0) / 60000);
    }
  }

  // If no exerciseinfo, calculate from track points
  if (distance === 0 && gpsTrack.length >= 2) {
    // Calculate distance from track points using Haversine formula
    let totalDistance = 0;
    for (let i = 1; i < gpsTrack.length; i++) {
      totalDistance += haversineDistance(
        gpsTrack[i-1].lat, gpsTrack[i-1].lon,
        gpsTrack[i].lat, gpsTrack[i].lon
      );
    }
    distance = Math.round(totalDistance);

    // Calculate duration from first and last track point times
    if (gpsTrack[0].time && gpsTrack[gpsTrack.length - 1].time) {
      const start = new Date(gpsTrack[0].time);
      const end = new Date(gpsTrack[gpsTrack.length - 1].time);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        duration = Math.round((end - start) / 60000); // milliseconds to minutes
      }
    }
  }

  // Only create session if we have valid data
  if (distance > 0 || duration > 0) {
    const session = {
      id: crypto.randomUUID(),
      date: sessionDate,
      type: 'open_water', // GPX files are typically from outdoor/open water activities
      distance_m: Math.round(distance),
      time_min: duration,
      effort: 'moderate', // Default effort
      notes: 'Imported from GPX file',
      conditions: ''
    };

    // Store GPS track if available (for map display)
    if (gpsTrack.length > 0) {
      session.gpsTrack = gpsTrack;
    }

    sessions.push(session);
  }

  return sessions;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Handle app JSON import
 */
function handleAppImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);
      const sessions = data.sessions || [];
      if (sessions.length === 0) {
        alert('No sessions found in the file.');
        return;
      }
      showImportPreview(sessions);
    } catch (error) {
      alert('Error parsing file: ' + error.message);
    }
  };
  reader.readAsText(file);
}

/**
 * Show import preview
 */
function showImportPreview(sessions) {
  state.pendingImport = sessions;

  document.getElementById('import-preview-count').textContent =
    `Found ${sessions.length} session${sessions.length !== 1 ? 's' : ''} to import:`;

  const listEl = document.getElementById('import-preview-list');
  listEl.innerHTML = sessions.slice(0, 10).map(s => `
    <div class="import-preview-item">
      <span>${s.date}</span>
      <span>${s.distance_m}m</span>
      <span>${s.time_min}min</span>
      <span>${s.type === 'open_water' ? 'Open Water' : 'Pool'}</span>
    </div>
  `).join('');

  if (sessions.length > 10) {
    listEl.innerHTML += `<div class="import-preview-item text-muted">...and ${sessions.length - 10} more</div>`;
  }

  document.getElementById('import-preview').style.display = 'block';
}

/**
 * Confirm import
 */
async function confirmImport() {
  if (!state.pendingImport || state.pendingImport.length === 0) return;

  // Check for duplicates by date
  const existingDates = new Set(state.sessions.map(s => s.date));
  const newSessions = state.pendingImport.filter(s => !existingDates.has(s.date));
  const duplicates = state.pendingImport.length - newSessions.length;

  if (duplicates > 0 && newSessions.length > 0) {
    if (!confirm(`${duplicates} session(s) already exist for those dates and will be skipped. Import ${newSessions.length} new session(s)?`)) {
      return;
    }
  } else if (newSessions.length === 0) {
    alert('All sessions already exist (matching dates). No new sessions to import.');
    hideImportModal();
    return;
  }

  // Import sessions
  for (const session of newSessions) {
    await DB.addSession(session);
    state.sessions.push(session);
  }

  // Trigger cloud sync
  triggerCloudSync();

  alert(`✅ Imported ${newSessions.length} session(s)!`);
  hideImportModal();
  loadSessions();

  if (state.currentView === 'dashboard') {
    loadDashboard();
  }
}

/**
 * Cancel import
 */
function cancelImport() {
  state.pendingImport = null;
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('samsung-import-file').value = '';
  document.getElementById('gpx-import-file').value = '';
  document.getElementById('app-import-file').value = '';
}

/**
 * Delete a session
 */
async function deleteSession(id) {
  if (!confirm('Delete this session? This cannot be undone.')) {
    return;
  }

  await DB.deleteSession(id);
  state.sessions = state.sessions.filter(s => s.id !== id);

  alert('✅ Session deleted');
  loadSessions();

  if (state.currentView === 'dashboard') {
    loadDashboard();
  }
}

/**
 * Select effort level (easy/moderate/hard)
 */
function selectEffort(effort) {
  // Update hidden input
  document.getElementById('sessionRPE').value = effort;

  // Update button states
  document.querySelectorAll('.effort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.effort === effort);
  });
}

/**
 * Get effort label for display
 */
function getEffortLabel(effort) {
  const labels = {
    easy: { emoji: '😊', text: 'Easy' },
    moderate: { emoji: '💪', text: 'Moderate' },
    hard: { emoji: '🔥', text: 'Hard' },
    // Legacy numeric values mapping
    1: { emoji: '😊', text: 'Easy' },
    2: { emoji: '😊', text: 'Easy' },
    3: { emoji: '😊', text: 'Easy' },
    4: { emoji: '💪', text: 'Moderate' },
    5: { emoji: '💪', text: 'Moderate' },
    6: { emoji: '💪', text: 'Moderate' },
    7: { emoji: '🔥', text: 'Hard' },
    8: { emoji: '🔥', text: 'Hard' },
    9: { emoji: '🔥', text: 'Hard' },
    10: { emoji: '🔥', text: 'Hard' }
  };
  return labels[effort] || labels.moderate;
}

/**
 * Convert legacy numeric RPE to effort string
 */
function normalizeEffort(rpe) {
  if (typeof rpe === 'string' && ['easy', 'moderate', 'hard'].includes(rpe)) {
    return rpe;
  }
  const num = parseInt(rpe);
  if (num <= 3) return 'easy';
  if (num <= 6) return 'moderate';
  return 'hard';
}

/**
 * Get most common effort level from recent sessions
 */
function getMostCommonEffort(sessions, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recentSessions = sessions.filter(s => new Date(s.date) >= cutoff);
  if (recentSessions.length === 0) return null;

  const counts = { easy: 0, moderate: 0, hard: 0 };
  recentSessions.forEach(s => {
    const effort = normalizeEffort(s.effort || s.rpe);
    counts[effort]++;
  });

  // Find the most common
  let maxCount = 0;
  let mostCommon = 'moderate';
  for (const [effort, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = effort;
    }
  }

  return mostCommon;
}

/**
 * Get coaching recommendation using the new deterministic planning system
 * Uses CoachService which combines deterministic templates with LLM polish
 */
async function getCoaching() {
  if (!state.profile) {
    alert('Please set up your profile first!');
    switchTab('profile');
    return;
  }

  // Show loading state
  document.getElementById('get-coaching-btn').style.display = 'none';
  document.getElementById('coaching-loading').style.display = 'block';
  document.getElementById('coaching-results').style.display = 'none';
  const emptyState = document.getElementById('coach-empty-state');
  if (emptyState) emptyState.style.display = 'none';

  try {
    console.log('📡 Generating coaching recommendation...');

    // Use the new CoachService if available, otherwise fall back to legacy
    let recommendation;

    if (window.CoachService && window.CoachPlanner) {
      // New deterministic planning system
      console.log('   Using deterministic planner with LLM polish...');
      recommendation = await CoachService.getCoachingRecommendation(state.profile, state.sessions);
      console.log('✅ Structured coaching received');
    } else {
      // Fall back to legacy API call
      console.log('   Using legacy API (new modules not loaded)...');
      const today = new Date().toISOString().split('T')[0];
      const request = Prompts.buildCoachRequest(state.profile, state.sessions, today);

      const response = await fetch(`${API_URL}/api/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      recommendation = await response.json();

      // Validate legacy response
      if (!Prompts.validateCoachResponse(recommendation)) {
        throw new Error('Invalid coaching response format');
      }

      console.log('✅ Legacy coaching received');
    }

    // Save to storage for persistence
    await DB.saveCoaching(recommendation, state.sessions.length);

    // Update state
    state.coaching = {
      recommendation: recommendation,
      generatedAt: new Date().toISOString(),
      sessionCountAtGeneration: state.sessions.length
    };

    // Display the recommendation using appropriate view
    if (recommendation.session_plan) {
      displayCoachingStructured(recommendation);
    } else {
      displayCoachingPretty(recommendation);
    }
    document.getElementById('coaching-results').style.display = 'block';

    // Update status
    const statusDot = document.getElementById('coach-status-dot');
    const statusText = document.getElementById('coach-status-text');
    if (statusDot) {
      statusDot.classList.remove('stale', 'none');
      statusText.textContent = 'Generated just now - Up to date';
    }

    // Scroll to results
    document.getElementById('coaching-results').scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    console.error('❌ Coaching error:', error);

    let errorMessage = 'Could not get coaching recommendation. ';

    if (error.message.includes('Failed to fetch')) {
      errorMessage += 'Is the server running? Start it with: cd server && npm start';
    } else {
      errorMessage += error.message;
    }

    alert(errorMessage);

    // Show empty state again if no previous coaching
    if (!state.coaching && emptyState) {
      emptyState.style.display = 'block';
    }
  } finally {
    // Hide loading
    document.getElementById('get-coaching-btn').style.display = 'block';
    document.getElementById('coaching-loading').style.display = 'none';
  }
}

/**
 * Copy coaching to clipboard
 */
function copyCoachingToClipboard() {
  if (!state.coaching || !state.coaching.recommendation) {
    alert('No coaching to copy');
    return;
  }

  let text;

  // Check if this is the new structured format or legacy format
  if (state.coaching.recommendation.session_plan && window.CoachView) {
    // New structured format - use CoachView.formatAsText
    text = CoachView.formatAsText(state.coaching.recommendation);
  } else {
    // Legacy format - use Prompts.formatCoachResponse
    text = Prompts.formatCoachResponse(state.coaching.recommendation);
  }

  navigator.clipboard.writeText(text)
    .then(() => alert('✅ Copied to clipboard!'))
    .catch(() => alert('❌ Could not copy to clipboard'));
}

/**
 * Export all data
 */
async function exportData() {
  try {
    const data = await DB.exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `lets-keep-swimming-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    alert('✅ Backup downloaded! Keep this file safe.');
  } catch (error) {
    console.error('Export error:', error);
    alert('❌ Error exporting data: ' + error.message);
  }
}

/**
 * Import data from file
 */
async function importData() {
  const fileInput = document.getElementById('import-file');
  const strategy = document.getElementById('import-strategy').value;

  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Please select a file to import');
    return;
  }

  const file = fileInput.files[0];

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Confirm import
    const confirmMsg = strategy === 'replace'
      ? '⚠️ This will DELETE all existing data and replace it with the imported data. Continue?'
      : 'This will merge imported data with existing data. Continue?';

    if (!confirm(confirmMsg)) {
      return;
    }

    // Import
    await DB.importData(data, strategy);

    // Reload state
    state.profile = await DB.getProfile();
    state.sessions = await DB.getSessions();

    alert('✅ Data imported successfully!');

    // Reload current view
    if (state.currentView === 'dashboard') {
      loadDashboard();
    } else if (state.currentView === 'sessions') {
      loadSessions();
    } else if (state.currentView === 'profile') {
      loadProfile();
    }

    // Clear file input
    fileInput.value = '';

  } catch (error) {
    console.error('Import error:', error);
    alert('❌ Error importing data: ' + error.message);
  }
}

/**
 * Clear all data
 */
async function clearAllData() {
  if (!confirm('⚠️ WARNING: This will permanently delete ALL your data. Have you exported a backup?')) {
    return;
  }

  if (!confirm('Are you absolutely sure? This cannot be undone.')) {
    return;
  }

  try {
    await DB.clearAllData();
    state.profile = null;
    state.sessions = [];
    state.coaching = null;

    alert('✅ All data cleared');
    location.reload();
  } catch (error) {
    console.error('Clear data error:', error);
    alert('❌ Error clearing data: ' + error.message);
  }
}

// Session detail modal state
let currentSessionDetailId = null;
let sessionDetailMap = null;

/**
 * View session details with map (if GPS data available)
 */
function viewSessionDetail(sessionId) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return;

  currentSessionDetailId = sessionId;

  // Set title
  const dateStr = new Date(session.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  document.getElementById('session-detail-title').textContent = dateStr;

  // Build content
  const effort = normalizeEffort(session.effort || session.rpe);
  const effortLabel = getEffortLabel(effort);
  const pace = session.time_min > 0 && session.distance_m > 0
    ? ((session.time_min * 60) / (session.distance_m / 100)).toFixed(1)
    : null;

  let contentHtml = `
    <div class="session-detail-grid">
      <div class="session-detail-item">
        <span class="session-detail-value">${session.distance_m}m</span>
        <span class="session-detail-label">Distance</span>
      </div>
      <div class="session-detail-item">
        <span class="session-detail-value">${session.time_min} min</span>
        <span class="session-detail-label">Duration</span>
      </div>
      <div class="session-detail-item">
        <span class="session-detail-value">${effortLabel.emoji} ${effortLabel.text}</span>
        <span class="session-detail-label">Effort</span>
      </div>
      <div class="session-detail-item">
        <span class="session-detail-value">${session.type === 'pool' ? '🏊 Pool' : '🌊 Open Water'}</span>
        <span class="session-detail-label">Type</span>
      </div>
    </div>
    ${pace ? `
      <div class="session-detail-item" style="margin-bottom: var(--spacing-md);">
        <span class="session-detail-value">${pace}s / 100m</span>
        <span class="session-detail-label">Average Pace</span>
      </div>
    ` : ''}
  `;

  if (session.notes) {
    contentHtml += `
      <div class="session-detail-notes">
        <h4>Notes</h4>
        <p>${session.notes}</p>
      </div>
    `;
  }

  if (session.conditions) {
    contentHtml += `
      <div class="session-detail-notes">
        <h4>Conditions</h4>
        <p>${session.conditions}</p>
      </div>
    `;
  }

  document.getElementById('session-detail-content').innerHTML = contentHtml;

  // Handle map
  const mapContainer = document.getElementById('session-map-container');
  const mapEl = document.getElementById('session-map');
  const mapStats = document.getElementById('map-stats');

  if (session.gpsTrack && session.gpsTrack.length > 0) {
    mapContainer.style.display = 'block';

    // Show modal first so map has dimensions
    document.getElementById('session-detail-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Initialize or update map after a brief delay
    setTimeout(() => {
      renderSessionMap(session.gpsTrack, mapEl, mapStats);
    }, 100);
  } else {
    mapContainer.style.display = 'none';
    document.getElementById('session-detail-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Render GPS track on Leaflet map
 */
function renderSessionMap(gpsTrack, mapEl, mapStats) {
  // Clean up existing map
  if (sessionDetailMap) {
    sessionDetailMap.remove();
    sessionDetailMap = null;
  }

  if (!gpsTrack || gpsTrack.length === 0) return;

  // Create map centered on first point
  const startPoint = gpsTrack[0];
  sessionDetailMap = L.map(mapEl).setView([startPoint.lat, startPoint.lon], 15);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(sessionDetailMap);

  // Create polyline from track points
  const latlngs = gpsTrack.map(p => [p.lat, p.lon]);
  const polyline = L.polyline(latlngs, {
    color: '#4A90E2',
    weight: 4,
    opacity: 0.8
  }).addTo(sessionDetailMap);

  // Fit map to track bounds
  sessionDetailMap.fitBounds(polyline.getBounds(), { padding: [30, 30] });

  // Add start marker
  const startIcon = L.divIcon({
    className: 'map-marker-start',
    html: '<div style="background: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  L.marker([startPoint.lat, startPoint.lon], { icon: startIcon })
    .bindPopup('Start')
    .addTo(sessionDetailMap);

  // Add end marker
  const endPoint = gpsTrack[gpsTrack.length - 1];
  const endIcon = L.divIcon({
    className: 'map-marker-end',
    html: '<div style="background: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  L.marker([endPoint.lat, endPoint.lon], { icon: endIcon })
    .bindPopup('Finish')
    .addTo(sessionDetailMap);

  // Calculate and display map stats
  let avgHR = null;
  let hrCount = 0;
  let hrSum = 0;
  gpsTrack.forEach(p => {
    if (p.hr) {
      hrSum += p.hr;
      hrCount++;
    }
  });
  if (hrCount > 0) {
    avgHR = Math.round(hrSum / hrCount);
  }

  let statsHtml = `
    <div class="map-stat">
      <span>Track Points:</span>
      <span class="map-stat-value">${gpsTrack.length}</span>
    </div>
  `;

  if (avgHR) {
    statsHtml += `
      <div class="map-stat">
        <span>Avg Heart Rate:</span>
        <span class="map-stat-value">${avgHR} bpm</span>
      </div>
    `;
  }

  mapStats.innerHTML = statsHtml;
}

/**
 * Hide session detail modal
 */
function hideSessionDetailModal() {
  document.getElementById('session-detail-modal').style.display = 'none';
  document.body.style.overflow = '';
  currentSessionDetailId = null;

  // Clean up map
  if (sessionDetailMap) {
    sessionDetailMap.remove();
    sessionDetailMap = null;
  }
}

/**
 * Edit session from detail modal
 */
function editSessionFromDetail() {
  if (!currentSessionDetailId) return;
  hideSessionDetailModal();
  editSession(currentSessionDetailId);
}

/**
 * Delete session from detail modal
 */
function deleteSessionFromDetail() {
  if (!currentSessionDetailId) return;
  const id = currentSessionDetailId;
  hideSessionDetailModal();
  deleteSession(id);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Make functions available globally for onclick handlers
window.switchTab = switchTab;
window.editSession = editSession;
window.deleteSession = deleteSession;
window.viewSessionDetail = viewSessionDetail;
window.showEventForm = showEventForm;
window.editEvent = editEvent;
window.deleteEvent = deleteEvent;
window.viewEvent = viewEvent;
