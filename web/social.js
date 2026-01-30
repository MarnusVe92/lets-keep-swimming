/**
 * Let's Keep Swimming - Social Module
 *
 * Handles friend system functionality:
 * - Friend codes and QR codes
 * - Friend requests (send, accept, reject)
 * - Friends list management
 * - Leaderboard
 * - Anonymous benchmarks
 */

// Social state
let socialState = {
  myFriendCode: null,
  friends: [],
  friendRequests: [],
  leaderboard: []
};

// QR Scanner state
let qrScanner = {
  active: false,
  stream: null
};

/**
 * Initialize social module
 */
function initSocial() {
  // Listen for auth changes
  if (typeof Auth !== 'undefined') {
    Auth.onAuthStateChange(handleSocialAuthChange);
  }

  // Set up event listeners
  setupSocialEventListeners();

  console.log('Social module initialized');
}

/**
 * Handle auth state changes for social features
 */
async function handleSocialAuthChange(authState) {
  const authBanner = document.getElementById('auth-banner');
  const socialContent = document.getElementById('social-content');

  if (authState.user && authState.isConfigured) {
    // User is signed in - show social content
    if (authBanner) authBanner.style.display = 'none';
    if (socialContent) socialContent.style.display = 'block';

    // Load user's social data
    await loadSocialData(authState.user);
  } else {
    // User is signed out - show auth banner
    if (authBanner) authBanner.style.display = 'block';
    if (socialContent) socialContent.style.display = 'none';

    // Clear social data
    socialState.myFriendCode = null;
    socialState.friends = [];
    socialState.friendRequests = [];
  }

  updateSocialUI();
}

/**
 * Load social data for user
 */
async function loadSocialData(user) {
  if (!Auth.isFirebaseConfigured()) return;

  try {
    const db = firebase.firestore();

    // Get user profile
    const userProfile = await Auth.getUserProfile();
    if (userProfile) {
      socialState.myFriendCode = userProfile.friendCode;

      // Update UI with user info
      document.getElementById('social-user-name').textContent = userProfile.displayName || 'Anonymous';
      document.getElementById('social-user-email').textContent = user.email;
      document.getElementById('my-friend-code').textContent = userProfile.friendCode || '------';

      // Show avatar if available
      const avatarEl = document.getElementById('social-user-avatar');
      if (userProfile.photoURL || user.photoURL) {
        avatarEl.innerHTML = `<img src="${userProfile.photoURL || user.photoURL}" alt="Avatar" class="avatar-img">`;
      }

      // Load privacy settings
      if (userProfile.privacy) {
        document.getElementById('privacy-share-volume').checked = userProfile.privacy.shareVolume !== false;
        document.getElementById('privacy-share-streak').checked = userProfile.privacy.shareStreak !== false;
        document.getElementById('privacy-share-pace').checked = userProfile.privacy.sharePace === true;
        document.getElementById('privacy-contribute-anonymous').checked = userProfile.privacy.contributeAnonymous !== false;
      }
    }

    // Load friends
    await loadFriends(user.uid);

    // Load friend requests
    await loadFriendRequests(user.uid);

    // Load leaderboard
    await loadLeaderboard();

    // Load benchmarks
    await loadBenchmarks();
  } catch (error) {
    console.error('Error loading social data:', error);
  }
}

/**
 * Load user's friends
 */
async function loadFriends(uid) {
  if (!Auth.isFirebaseConfigured()) return;

  try {
    const db = firebase.firestore();

    // Get accepted friendships where user is user1 or user2
    const friendships1 = await db.collection('friendships')
      .where('user1', '==', uid)
      .where('status', '==', 'accepted')
      .get();

    const friendships2 = await db.collection('friendships')
      .where('user2', '==', uid)
      .where('status', '==', 'accepted')
      .get();

    const friendIds = new Set();

    friendships1.forEach(doc => {
      friendIds.add(doc.data().user2);
    });

    friendships2.forEach(doc => {
      friendIds.add(doc.data().user1);
    });

    // Get friend profiles
    socialState.friends = [];
    for (const friendId of friendIds) {
      const friendDoc = await db.collection('users').doc(friendId).get();
      if (friendDoc.exists) {
        const friendData = friendDoc.data();
        socialState.friends.push({
          uid: friendId,
          displayName: friendData.displayName,
          photoURL: friendData.photoURL,
          stats: friendData.stats || {},
          privacy: friendData.privacy || {}
        });
      }
    }

    updateFriendsListUI();
  } catch (error) {
    console.error('Error loading friends:', error);
  }
}

/**
 * Load pending friend requests
 */
async function loadFriendRequests(uid) {
  if (!Auth.isFirebaseConfigured()) return;

  try {
    const db = firebase.firestore();

    // Get pending requests where user is the recipient
    const requests = await db.collection('friendships')
      .where('user2', '==', uid)
      .where('status', '==', 'pending')
      .get();

    socialState.friendRequests = [];

    for (const doc of requests.docs) {
      const data = doc.data();
      // Get requester's profile
      const requesterDoc = await db.collection('users').doc(data.user1).get();
      if (requesterDoc.exists) {
        const requesterData = requesterDoc.data();
        socialState.friendRequests.push({
          id: doc.id,
          fromUid: data.user1,
          displayName: requesterData.displayName,
          photoURL: requesterData.photoURL,
          createdAt: data.createdAt
        });
      }
    }

    updateFriendRequestsUI();
  } catch (error) {
    console.error('Error loading friend requests:', error);
  }
}

/**
 * Load leaderboard (friends + self)
 */
async function loadLeaderboard() {
  const user = Auth.getCurrentUser();
  if (!user) return;

  // Build leaderboard from friends + self
  const userProfile = await Auth.getUserProfile();

  socialState.leaderboard = [
    {
      uid: user.uid,
      displayName: userProfile?.displayName || 'You',
      photoURL: userProfile?.photoURL || user.photoURL,
      weeklyDistance: userProfile?.stats?.weeklyDistance || 0,
      currentStreak: userProfile?.stats?.currentStreak || 0,
      isMe: true
    },
    ...socialState.friends.map(friend => ({
      uid: friend.uid,
      displayName: friend.displayName,
      photoURL: friend.photoURL,
      weeklyDistance: friend.privacy?.shareVolume !== false ? (friend.stats?.weeklyDistance || 0) : null,
      currentStreak: friend.privacy?.shareStreak !== false ? (friend.stats?.currentStreak || 0) : null,
      isMe: false
    }))
  ];

  // Sort by weekly distance (nulls at end)
  socialState.leaderboard.sort((a, b) => {
    if (a.weeklyDistance === null) return 1;
    if (b.weeklyDistance === null) return -1;
    return b.weeklyDistance - a.weeklyDistance;
  });

  updateLeaderboardUI();
}

/**
 * Load anonymous benchmarks
 */
async function loadBenchmarks() {
  // For now, show placeholder data
  // In production, this would query aggregated benchmark data from Firestore
  const benchmarkDistanceEl = document.getElementById('benchmark-distance-comparison');
  const benchmarkStreakEl = document.getElementById('benchmark-streak-comparison');

  if (benchmarkDistanceEl) {
    benchmarkDistanceEl.innerHTML = `
      <span class="benchmark-percentile">Coming soon</span>
      <span class="benchmark-avg">Avg: -- m</span>
    `;
  }

  if (benchmarkStreakEl) {
    benchmarkStreakEl.innerHTML = `
      <span class="benchmark-percentile">Coming soon</span>
      <span class="benchmark-avg">Avg: -- days</span>
    `;
  }

  // Update current user stats
  const userProfile = await Auth.getUserProfile();
  if (userProfile?.stats) {
    const myDistanceEl = document.getElementById('benchmark-my-distance');
    const myStreakEl = document.getElementById('benchmark-my-streak');

    if (myDistanceEl) myDistanceEl.textContent = `${userProfile.stats.weeklyDistance || 0} m`;
    if (myStreakEl) myStreakEl.textContent = `${userProfile.stats.currentStreak || 0} days`;
  }
}

/**
 * Send friend request by code
 */
async function sendFriendRequest(code) {
  if (!Auth.isFirebaseConfigured() || !Auth.isSignedIn()) {
    alert('Please sign in to add friends');
    return;
  }

  const normalizedCode = code.toUpperCase().trim();

  if (normalizedCode === socialState.myFriendCode) {
    alert("You can't add yourself as a friend!");
    return;
  }

  try {
    const db = firebase.firestore();
    const user = Auth.getCurrentUser();

    // Look up friend code
    const codeDoc = await db.collection('friend_codes').doc(normalizedCode).get();

    if (!codeDoc.exists) {
      alert('Friend code not found. Please check and try again.');
      return;
    }

    const friendUid = codeDoc.data().uid;

    // Check if already friends or request pending
    const existingFriendship = await db.collection('friendships')
      .where('user1', 'in', [user.uid, friendUid])
      .get();

    let alreadyExists = false;
    existingFriendship.forEach(doc => {
      const data = doc.data();
      if ((data.user1 === user.uid && data.user2 === friendUid) ||
        (data.user1 === friendUid && data.user2 === user.uid)) {
        alreadyExists = true;
      }
    });

    if (alreadyExists) {
      alert('Friend request already sent or you are already friends!');
      return;
    }

    // Create friend request
    await db.collection('friendships').add({
      user1: user.uid,
      user2: friendUid,
      status: 'pending',
      initiatedBy: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('Friend request sent!');

    // Clear input
    document.getElementById('friend-code-input').value = '';
  } catch (error) {
    console.error('Error sending friend request:', error);
    alert('Error sending friend request. Please try again.');
  }
}

/**
 * Accept friend request
 */
async function acceptFriendRequest(requestId) {
  if (!Auth.isFirebaseConfigured()) return;

  try {
    const db = firebase.firestore();

    await db.collection('friendships').doc(requestId).update({
      status: 'accepted',
      acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Reload data
    await loadFriends(Auth.getCurrentUser().uid);
    await loadFriendRequests(Auth.getCurrentUser().uid);
    await loadLeaderboard();

    alert('Friend request accepted!');
  } catch (error) {
    console.error('Error accepting friend request:', error);
    alert('Error accepting friend request.');
  }
}

/**
 * Reject friend request
 */
async function rejectFriendRequest(requestId) {
  if (!Auth.isFirebaseConfigured()) return;

  try {
    const db = firebase.firestore();

    await db.collection('friendships').doc(requestId).delete();

    // Reload requests
    await loadFriendRequests(Auth.getCurrentUser().uid);
  } catch (error) {
    console.error('Error rejecting friend request:', error);
  }
}

/**
 * Remove friend
 */
async function removeFriend(friendUid) {
  if (!Auth.isFirebaseConfigured()) return;

  if (!confirm('Are you sure you want to remove this friend?')) return;

  try {
    const db = firebase.firestore();
    const user = Auth.getCurrentUser();

    // Find and delete the friendship
    const friendships = await db.collection('friendships')
      .where('status', '==', 'accepted')
      .get();

    friendships.forEach(async (doc) => {
      const data = doc.data();
      if ((data.user1 === user.uid && data.user2 === friendUid) ||
        (data.user1 === friendUid && data.user2 === user.uid)) {
        await doc.ref.delete();
      }
    });

    // Reload friends
    await loadFriends(user.uid);
    await loadLeaderboard();
  } catch (error) {
    console.error('Error removing friend:', error);
    alert('Error removing friend.');
  }
}

/**
 * Generate QR code for friend code
 */
async function generateQRCode() {
  if (!socialState.myFriendCode) return;

  const canvas = document.getElementById('qr-code-canvas');
  const container = document.getElementById('qr-code-container');

  if (!canvas || !container) return;

  try {
    // Generate QR code with friend link
    const friendLink = `${window.location.origin}${window.location.pathname}?addFriend=${socialState.myFriendCode}`;

    await QRCode.toCanvas(canvas, friendLink, {
      width: 200,
      margin: 2,
      color: {
        dark: '#2C3E50',
        light: '#FFFFFF'
      }
    });

    container.style.display = 'block';
  } catch (error) {
    console.error('Error generating QR code:', error);
    alert('Error generating QR code');
  }
}

/**
 * Start QR scanner
 */
async function startQRScanner() {
  const modal = document.getElementById('qr-scanner-modal');
  const video = document.getElementById('qr-scanner-video');

  if (!modal || !video) return;

  try {
    // Request camera permission
    qrScanner.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    video.srcObject = qrScanner.stream;
    qrScanner.active = true;
    modal.style.display = 'flex';

    // Start scanning (simplified - in production use a QR scanning library)
    // For now, just show the camera
    console.log('QR scanner started - scanning functionality requires additional library');
  } catch (error) {
    console.error('Error starting QR scanner:', error);
    alert('Could not access camera. Please check permissions.');
  }
}

/**
 * Stop QR scanner
 */
function stopQRScanner() {
  const modal = document.getElementById('qr-scanner-modal');
  const video = document.getElementById('qr-scanner-video');

  if (qrScanner.stream) {
    qrScanner.stream.getTracks().forEach(track => track.stop());
    qrScanner.stream = null;
  }

  if (video) {
    video.srcObject = null;
  }

  qrScanner.active = false;

  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Copy friend code to clipboard
 */
async function copyFriendCode() {
  if (!socialState.myFriendCode) return;

  try {
    await navigator.clipboard.writeText(socialState.myFriendCode);
    alert('Friend code copied to clipboard!');
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = socialState.myFriendCode;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('Friend code copied!');
  }
}

/**
 * Share friend link
 */
async function shareFriendLink() {
  if (!socialState.myFriendCode) return;

  const friendLink = `${window.location.origin}${window.location.pathname}?addFriend=${socialState.myFriendCode}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Let's Keep Swimming - Add me as a friend!",
        text: `Add me on Let's Keep Swimming! My friend code is: ${socialState.myFriendCode}`,
        url: friendLink
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        await copyToClipboard(friendLink);
      }
    }
  } else {
    await copyToClipboard(friendLink);
  }
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  } catch (error) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('Link copied!');
  }
}

/**
 * Save privacy settings
 */
async function savePrivacySettings() {
  const settings = {
    shareVolume: document.getElementById('privacy-share-volume').checked,
    shareStreak: document.getElementById('privacy-share-streak').checked,
    sharePace: document.getElementById('privacy-share-pace').checked,
    contributeAnonymous: document.getElementById('privacy-contribute-anonymous').checked
  };

  try {
    await Auth.updatePrivacySettings(settings);
    console.log('Privacy settings saved');
  } catch (error) {
    console.error('Error saving privacy settings:', error);
  }
}

/**
 * Update friends list UI
 */
function updateFriendsListUI() {
  const container = document.getElementById('friends-list');
  if (!container) return;

  if (socialState.friends.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No friends yet. Share your code to get started!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = socialState.friends.map(friend => `
    <div class="friend-card">
      <div class="friend-avatar">
        ${friend.photoURL
      ? `<img src="${friend.photoURL}" alt="${friend.displayName}">`
      : `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
    }
      </div>
      <div class="friend-info">
        <div class="friend-name">${friend.displayName}</div>
        <div class="friend-stats">
          ${friend.privacy?.shareVolume !== false && friend.stats?.weeklyDistance
      ? `<span>${friend.stats.weeklyDistance}m this week</span>`
      : ''
    }
          ${friend.privacy?.shareStreak !== false && friend.stats?.currentStreak
      ? `<span>${friend.stats.currentStreak} day streak</span>`
      : ''
    }
        </div>
      </div>
      <button class="btn-icon" onclick="Social.removeFriend('${friend.uid}')" title="Remove friend">
        <svg class="icon icon-outline" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

/**
 * Update friend requests UI
 */
function updateFriendRequestsUI() {
  const card = document.getElementById('friend-requests-card');
  const container = document.getElementById('friend-requests-list');
  const badge = document.getElementById('friend-requests-count');

  if (!card || !container) return;

  if (socialState.friendRequests.length === 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  if (badge) badge.textContent = socialState.friendRequests.length;

  container.innerHTML = socialState.friendRequests.map(request => `
    <div class="friend-request-card">
      <div class="friend-avatar">
        ${request.photoURL
      ? `<img src="${request.photoURL}" alt="${request.displayName}">`
      : `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
    }
      </div>
      <div class="friend-info">
        <div class="friend-name">${request.displayName}</div>
        <div class="friend-stats">wants to be your friend</div>
      </div>
      <div class="friend-request-actions">
        <button class="btn btn-primary btn-small" onclick="Social.acceptFriendRequest('${request.id}')">Accept</button>
        <button class="btn btn-secondary btn-small" onclick="Social.rejectFriendRequest('${request.id}')">Decline</button>
      </div>
    </div>
  `).join('');
}

/**
 * Update leaderboard UI
 */
function updateLeaderboardUI() {
  const container = document.getElementById('leaderboard');
  if (!container) return;

  if (socialState.leaderboard.length <= 1) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Add friends to see the leaderboard</p>
      </div>
    `;
    return;
  }

  container.innerHTML = socialState.leaderboard.map((entry, index) => `
    <div class="leaderboard-entry ${entry.isMe ? 'is-me' : ''}">
      <div class="leaderboard-rank">${index + 1}</div>
      <div class="leaderboard-avatar">
        ${entry.photoURL
      ? `<img src="${entry.photoURL}" alt="${entry.displayName}">`
      : `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
    }
      </div>
      <div class="leaderboard-info">
        <div class="leaderboard-name">${entry.displayName}${entry.isMe ? ' (You)' : ''}</div>
      </div>
      <div class="leaderboard-stats">
        ${entry.weeklyDistance !== null
      ? `<span class="stat-value">${entry.weeklyDistance}m</span>`
      : '<span class="stat-private">Private</span>'
    }
      </div>
    </div>
  `).join('');
}

/**
 * Update social UI
 */
function updateSocialUI() {
  updateFriendsListUI();
  updateFriendRequestsUI();
  updateLeaderboardUI();
}

/**
 * Set up social event listeners
 */
function setupSocialEventListeners() {
  // Auth buttons
  const signInGoogleBtn = document.getElementById('sign-in-google-btn');
  const signInEmailBtn = document.getElementById('sign-in-email-btn');
  const signOutBtn = document.getElementById('sign-out-btn');

  if (signInGoogleBtn) {
    signInGoogleBtn.addEventListener('click', async () => {
      try {
        await Auth.signInWithGoogle();
      } catch (error) {
        console.error('Google sign in failed:', error);
      }
    });
  }

  if (signInEmailBtn) {
    signInEmailBtn.addEventListener('click', () => {
      const modal = document.getElementById('email-auth-modal');
      if (modal) modal.style.display = 'flex';
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      try {
        await Auth.signOut();
      } catch (error) {
        console.error('Sign out failed:', error);
      }
    });
  }

  // Email auth modal
  const emailAuthForm = document.getElementById('email-auth-form');
  const emailAuthCloseBtn = document.getElementById('email-auth-close-btn');
  const authSwitchBtn = document.getElementById('auth-switch-btn');

  let isSignUp = false;

  if (emailAuthForm) {
    emailAuthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      Auth.clearAuthError();

      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const displayName = document.getElementById('auth-display-name').value;

      try {
        if (isSignUp) {
          await Auth.signUpWithEmail(email, password, displayName);
        } else {
          await Auth.signInWithEmail(email, password);
        }
        document.getElementById('email-auth-modal').style.display = 'none';
        emailAuthForm.reset();
      } catch (error) {
        // Error is handled by Auth module
      }
    });
  }

  if (emailAuthCloseBtn) {
    emailAuthCloseBtn.addEventListener('click', () => {
      document.getElementById('email-auth-modal').style.display = 'none';
    });
  }

  if (authSwitchBtn) {
    authSwitchBtn.addEventListener('click', () => {
      isSignUp = !isSignUp;
      const title = document.getElementById('email-auth-title');
      const submitBtn = document.getElementById('auth-submit-btn');
      const switchText = document.getElementById('auth-switch-text');
      const nameGroup = document.getElementById('auth-name-group');

      if (isSignUp) {
        title.textContent = 'Create Account';
        submitBtn.textContent = 'Sign Up';
        switchText.textContent = 'Already have an account?';
        authSwitchBtn.textContent = 'Sign In';
        nameGroup.style.display = 'block';
      } else {
        title.textContent = 'Sign In with Email';
        submitBtn.textContent = 'Sign In';
        switchText.textContent = "Don't have an account?";
        authSwitchBtn.textContent = 'Sign Up';
        nameGroup.style.display = 'none';
      }
    });
  }

  // Friend code actions
  const copyFriendCodeBtn = document.getElementById('copy-friend-code-btn');
  const showQRBtn = document.getElementById('show-qr-btn');
  const shareLinkBtn = document.getElementById('share-link-btn');
  const addFriendBtn = document.getElementById('add-friend-btn');
  const scanQRBtn = document.getElementById('scan-qr-btn');

  if (copyFriendCodeBtn) {
    copyFriendCodeBtn.addEventListener('click', copyFriendCode);
  }

  if (showQRBtn) {
    showQRBtn.addEventListener('click', generateQRCode);
  }

  if (shareLinkBtn) {
    shareLinkBtn.addEventListener('click', shareFriendLink);
  }

  if (addFriendBtn) {
    addFriendBtn.addEventListener('click', () => {
      const code = document.getElementById('friend-code-input').value;
      if (code.length >= 6) {
        sendFriendRequest(code);
      } else {
        alert('Please enter a valid friend code');
      }
    });
  }

  if (scanQRBtn) {
    scanQRBtn.addEventListener('click', startQRScanner);
  }

  // QR scanner close
  const qrScannerCloseBtn = document.getElementById('qr-scanner-close-btn');
  if (qrScannerCloseBtn) {
    qrScannerCloseBtn.addEventListener('click', stopQRScanner);
  }

  // Privacy toggles
  const privacyToggles = [
    'privacy-share-volume',
    'privacy-share-streak',
    'privacy-share-pace',
    'privacy-contribute-anonymous'
  ];

  privacyToggles.forEach(id => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.addEventListener('change', savePrivacySettings);
    }
  });

  // Check for friend code in URL (from shared link)
  const urlParams = new URLSearchParams(window.location.search);
  const friendCode = urlParams.get('addFriend');
  if (friendCode) {
    // Wait for auth to be ready, then add friend
    Auth.onAuthStateChange((authState) => {
      if (authState.user && authState.isConfigured) {
        // Remove from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Send friend request
        sendFriendRequest(friendCode);
      }
    });
  }

  // Sync status listener
  if (typeof Sync !== 'undefined') {
    Sync.onSyncStatusChange((status) => {
      const syncStatusEl = document.getElementById('sync-status');
      if (!syncStatusEl) return;

      const dot = syncStatusEl.querySelector('.sync-dot');
      const text = syncStatusEl.querySelector('.sync-text');

      if (status.status === 'syncing') {
        dot.className = 'sync-dot syncing';
        text.textContent = 'Syncing...';
      } else if (status.status === 'synced') {
        dot.className = 'sync-dot synced';
        text.textContent = 'Synced';
      } else if (status.status === 'pending') {
        dot.className = 'sync-dot pending';
        text.textContent = `${status.pendingCount} pending`;
      } else if (status.status === 'error') {
        dot.className = 'sync-dot error';
        text.textContent = 'Sync error';
      }
    });
  }
}

// Export Social module
window.Social = {
  init: initSocial,
  loadSocialData,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  generateQRCode,
  copyFriendCode,
  shareFriendLink,
  savePrivacySettings,
  loadLeaderboard,
  loadBenchmarks
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSocial);
} else {
  initSocial();
}
