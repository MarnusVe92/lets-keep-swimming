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
  currentView: 'dashboard',
  editingSessionId: null,
  coaching: null, // { recommendation, generatedAt, sessionCountAtGeneration }
  currentCoaching: null, // Current coaching data being displayed (for adjustments)
  originalCoaching: null, // Original coaching data (before any adaptations)
};

/**
 * Initialize the application
 * Called when page loads
 */
async function init() {
  console.log('🏊 Initializing Let\'s Keep Swimming...');

  try {
    // Initialize storage
    await DB.initDB();

    // Load data from storage
    state.profile = await DB.getProfile();
    state.sessions = await DB.getSessions();
    state.coaching = await DB.getCoaching();

    console.log(`✅ Loaded profile: ${state.profile ? 'Yes' : 'No'}`);
    console.log(`✅ Loaded ${state.sessions.length} sessions`);
    console.log(`✅ Loaded coaching: ${state.coaching ? 'Yes' : 'No'}`);

    // Set up event listeners
    setupEventListeners();

    // Set default date for forms to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('sessionDate').value = today;

    // Load initial view
    loadDashboard();

    // Show storage info
    const storageInfo = DB.getStorageInfo();
    document.getElementById('storage-method').textContent = storageInfo.description;

    console.log('🚀 App ready!');
  } catch (error) {
    console.error('❌ Initialization error:', error);
    alert('Error initializing app. Please refresh the page.');
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
  document.getElementById('profile-form').addEventListener('submit', handleProfileSubmit);
  document.getElementById('goal').addEventListener('change', toggleTargetTime);
  document.querySelectorAll('input[name="availability-type"]').forEach(radio => {
    radio.addEventListener('change', toggleAvailabilityType);
  });

  // Session form
  document.getElementById('session-form').addEventListener('submit', handleSessionSubmit);
  document.getElementById('session-cancel-btn').addEventListener('click', cancelSessionEdit);
  document.getElementById('sessionRPE').addEventListener('input', updateRPEDisplay);

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
  }
}

/**
 * Load and render dashboard
 */
function loadDashboard() {
  if (!state.profile) {
    // No profile yet - show empty state
    document.getElementById('countdown-display').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg class="icon icon-outline" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
        </div>
        <p>Set up your profile first!</p>
        <button class="btn btn-primary mt-lg" onclick="switchTab('profile')">
          Create Profile
        </button>
      </div>
    `;
    return;
  }

  // Calculate countdown
  const today = new Date();
  const eventDate = new Date(state.profile.eventDate);
  const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

  document.getElementById('countdown-display').innerHTML = `
    <div class="countdown-number">${daysUntil}</div>
    <div class="countdown-label">days until Midmar Mile</div>
    <div class="countdown-date">
      ${new Date(state.profile.eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    </div>
  `;

  // Calculate stats
  const summary = Prompts.calculateTrainingSummary(state.sessions, today.toISOString().split('T')[0]);

  document.getElementById('stat-7days').textContent = `${summary.last7days_m}m`;
  document.getElementById('stat-14days').textContent = `${summary.last14days_m}m`;
  document.getElementById('stat-avg-rpe').textContent = summary.last7days_avg_rpe > 0
    ? summary.last7days_avg_rpe.toFixed(1)
    : '--';
  document.getElementById('stat-streak').textContent = summary.consecutive_days_trained;

  // Calculate and display best streak
  const bestStreak = calculateBestStreak(state.sessions);
  document.getElementById('streak-best-value').textContent = bestStreak;

  // Update charts
  Charts.initCharts(state.profile, state.sessions);

  // Update weekly goals
  updateWeeklyGoals();

  // Show recent sessions
  renderRecentSessions();
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
}

/**
 * Calculate best (longest) training streak from all sessions
 * Returns the number of consecutive days in the best streak
 */
function calculateBestStreak(sessions) {
  if (sessions.length === 0) return 0;

  // Sort sessions by date
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));

  let bestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    const currDate = new Date(sorted[i].date);

    // Calculate difference in days
    const diffTime = currDate - prevDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else if (diffDays === 0) {
      // Same day - don't break streak but don't increment
      continue;
    } else {
      // Gap in training - reset streak
      currentStreak = 1;
    }
  }

  return bestStreak;
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
  displayCoachingPretty(state.coaching.recommendation);
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
 * Calls the API to regenerate structure for new type/distance
 */
async function adaptSession() {
  if (!state.currentCoaching) {
    alert('No coaching recommendation to adapt');
    return;
  }

  const newType = document.getElementById('toggle-pool').classList.contains('active') ? 'pool' : 'open_water';
  const newDistance = parseInt(document.getElementById('adjust-distance').value) || state.currentCoaching.tomorrow_session.distance_m;

  // Show loading state
  const adaptBtn = document.getElementById('adapt-session-btn');
  const originalText = adaptBtn.innerHTML;
  adaptBtn.innerHTML = `<div class="spinner-small"></div> Adapting...`;
  adaptBtn.disabled = true;

  try {
    // Build adaptation request
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

    // Update the current coaching with adapted session
    state.currentCoaching.tomorrow_session = adaptedSession;

    // Re-display the coaching (mark as adapted to preserve original)
    displayCoachingPretty(state.currentCoaching, true);

    // Save the updated coaching
    await DB.saveCoaching(state.currentCoaching, state.sessions.length);
    state.coaching = {
      recommendation: state.currentCoaching,
      generatedAt: new Date().toISOString(),
      sessionCountAtGeneration: state.sessions.length
    };

  } catch (error) {
    console.error('Error adapting session:', error);
    // Fallback: manually adapt without API call
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
 */
async function logSessionFromCoach() {
  if (!state.currentCoaching || !state.currentCoaching.tomorrow_session) {
    alert('No coaching recommendation to log');
    return;
  }

  const session = state.currentCoaching.tomorrow_session;

  if (session.type === 'rest') {
    alert('Rest days cannot be logged as sessions');
    return;
  }

  // Get completed workout items
  const checkboxes = document.querySelectorAll('.workout-checkbox');
  const completedItems = [];
  checkboxes.forEach((cb, idx) => {
    if (cb.checked && session.structure && session.structure[idx]) {
      completedItems.push(session.structure[idx]);
    }
  });

  // Create the session object
  const newSession = {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0], // Today's date
    type: session.type,
    distance_m: session.distance_m || 0,
    time_min: session.duration_min || 0,
    rpe: 5, // Default RPE - user can edit later
    notes: `Coach recommendation. ${completedItems.length > 0 ? `Completed: ${completedItems.length}/${session.structure?.length || 0} items.` : ''}`,
    conditions: ''
  };

  try {
    // Save to database
    await DB.addSession(newSession);
    state.sessions.push(newSession);

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

  // Populate form
  document.getElementById('eventDate').value = state.profile.eventDate;
  document.getElementById('goal').value = state.profile.goal;
  document.getElementById('targetTime').value = state.profile.targetTime || '';
  document.getElementById('longestDistance').value = state.profile.longestRecentSwim.distance_m;
  document.getElementById('longestTime').value = state.profile.longestRecentSwim.time_min;
  document.getElementById('weeklyVolume').value = state.profile.weeklyVolumeEstimate_m;
  document.getElementById('tone').value = state.profile.tone;
  document.getElementById('access-pool').checked = state.profile.access.pool;
  document.getElementById('access-ow').checked = state.profile.access.openWater;

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

  toggleTargetTime();
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

  // Build profile object
  const profile = {
    eventDate: formData.get('eventDate'),
    goal: formData.get('goal'),
    targetTime: formData.get('targetTime') || null,
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
 * Toggle target time field based on goal
 */
function toggleTargetTime() {
  const goal = document.getElementById('goal').value;
  const targetTimeGroup = document.getElementById('target-time-group');
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
        ${session.notes ? `<div class="session-notes">"${session.notes}"</div>` : ''}
        ${session.conditions ? `<div class="session-notes">Conditions: ${session.conditions}</div>` : ''}
      </div>
      <div class="session-actions">
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
    rpe: parseInt(formData.get('sessionRPE')),
    notes: formData.get('sessionNotes'),
    conditions: formData.get('sessionConditions')
  };

  if (editId) {
    // Update existing session
    await DB.updateSession(editId, session);
    const index = state.sessions.findIndex(s => s.id === editId);
    state.sessions[index] = session;
    alert('✅ Session updated!');
  } else {
    // Add new session
    await DB.addSession(session);
    state.sessions.push(session);
    alert('✅ Session logged!');
  }

  // Reset form
  e.target.reset();
  document.getElementById('edit-session-id').value = '';
  document.getElementById('session-form-title').textContent = 'Log New Session';
  document.getElementById('session-submit-btn').textContent = 'Log Session';
  document.getElementById('session-cancel-btn').style.display = 'none';
  document.getElementById('sessionRPE').value = 5;
  updateRPEDisplay();

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
  document.getElementById('sessionRPE').value = session.rpe;
  document.getElementById('sessionNotes').value = session.notes || '';
  document.getElementById('sessionConditions').value = session.conditions || '';

  updateRPEDisplay();

  // Update UI
  document.getElementById('session-form-title').textContent = 'Edit Session';
  document.getElementById('session-submit-btn').textContent = 'Update Session';
  document.getElementById('session-cancel-btn').style.display = 'inline-block';

  // Scroll to form
  document.getElementById('session-form').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Cancel session edit
 */
function cancelSessionEdit() {
  document.getElementById('session-form').reset();
  document.getElementById('edit-session-id').value = '';
  document.getElementById('session-form-title').textContent = 'Log New Session';
  document.getElementById('session-submit-btn').textContent = 'Log Session';
  document.getElementById('session-cancel-btn').style.display = 'none';
  document.getElementById('sessionRPE').value = 5;
  updateRPEDisplay();
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
 * Update RPE display as slider moves
 */
function updateRPEDisplay() {
  const rpe = document.getElementById('sessionRPE').value;
  document.getElementById('rpe-value').textContent = rpe;

  const descriptions = {
    1: 'Very easy',
    2: 'Easy',
    3: 'Light',
    4: 'Moderate',
    5: 'Moderate',
    6: 'Somewhat hard',
    7: 'Hard',
    8: 'Very hard',
    9: 'Very hard',
    10: 'Maximum effort'
  };

  document.getElementById('rpe-description').textContent = descriptions[rpe];
}

/**
 * Get coaching recommendation from server
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
    // Build request
    const today = new Date().toISOString().split('T')[0];
    const request = Prompts.buildCoachRequest(state.profile, state.sessions, today);

    console.log('📡 Requesting coaching from server...');

    // Call server
    const response = await fetch(`${API_URL}/api/coach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log('✅ Coaching received');

    // Validate response
    if (!Prompts.validateCoachResponse(data)) {
      throw new Error('Invalid coaching response format');
    }

    // Save to storage for persistence
    await DB.saveCoaching(data, state.sessions.length);

    // Update state
    state.coaching = {
      recommendation: data,
      generatedAt: new Date().toISOString(),
      sessionCountAtGeneration: state.sessions.length
    };

    // Display the recommendation
    displayCoachingPretty(data);
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

  const text = Prompts.formatCoachResponse(state.coaching.recommendation);
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
