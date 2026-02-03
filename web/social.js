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
  // If mock data is enabled, load it without Firebase
  if (isMockDataEnabled()) {
    const currentUser = user || Auth.getCurrentUser();
    if (!currentUser) return;

    // Update UI with current user info
    const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'You';
    document.getElementById('social-user-name').textContent = displayName;
    document.getElementById('my-friend-code').textContent = '8HVBU7';
    socialState.myFriendCode = '8HVBU7';

    // Update avatar if available
    const avatarEl = document.getElementById('social-user-avatar');
    if (avatarEl && currentUser.photoURL) {
      avatarEl.innerHTML = `<img src="${currentUser.photoURL}" alt="Avatar" class="avatar-img">`;
    }

    // Load mock friends and leaderboard
    socialState.friends = generateMockFriends();
    updateFriendsListUI();
    await loadLeaderboard();
    await loadBenchmarks();

    console.log('Mock data loaded:', {
      friends: socialState.friends.length,
      user: displayName
    });
    return;
  }

  if (!Auth.isFirebaseConfigured()) return;

  try {
    const db = firebase.firestore();

    // Get user profile
    const userProfile = await Auth.getUserProfile();
    if (userProfile) {
      socialState.myFriendCode = userProfile.friendCode;

      // Update UI with user info
      document.getElementById('social-user-name').textContent = userProfile.displayName || 'Anonymous';
      document.getElementById('my-friend-code').textContent = userProfile.friendCode || '------';

      // Show avatar if available
      const avatarEl = document.getElementById('social-user-avatar');
      if (userProfile.photoURL || user.photoURL) {
        avatarEl.innerHTML = `<img src="${userProfile.photoURL || user.photoURL}" alt="Avatar" class="avatar-img">`;
      }

      // Check if age/gender is set and show/hide benchmark content
      const hasAgeGender = userProfile.ageGroup || userProfile.gender;
      const benchmarkPrompt = document.getElementById('benchmark-prompt');
      const benchmarkContent = document.getElementById('benchmark-content');

      if (hasAgeGender) {
        if (benchmarkPrompt) benchmarkPrompt.style.display = 'none';
        if (benchmarkContent) benchmarkContent.style.display = 'block';

        // Update filter display
        const filterDisplay = document.getElementById('benchmark-filter-display');
        if (filterDisplay) {
          const ageText = userProfile.ageGroup ? `${userProfile.ageGroup} years` : 'All ages';
          const genderText = userProfile.gender ? userProfile.gender : 'all genders';
          filterDisplay.textContent = `${ageText}, ${genderText}`;
        }
      } else {
        if (benchmarkPrompt) benchmarkPrompt.style.display = 'block';
        if (benchmarkContent) benchmarkContent.style.display = 'none';
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
  // Use mock data if enabled
  if (isMockDataEnabled()) {
    socialState.friends = generateMockFriends();
    updateFriendsListUI();
    loadLeaderboard(); // Also update leaderboard with mock data
    return;
  }

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

    // Set up real-time listener for new friend requests
    setupFriendRequestListener(uid);
  } catch (error) {
    console.error('Error loading friend requests:', error);
  }
}

// Store unsubscribe function for cleanup
let friendRequestUnsubscribe = null;

/**
 * Set up real-time listener for friend requests
 */
function setupFriendRequestListener(uid) {
  if (!Auth.isFirebaseConfigured()) return;

  // Clean up existing listener
  if (friendRequestUnsubscribe) {
    friendRequestUnsubscribe();
  }

  const db = firebase.firestore();

  // Listen for changes to pending friend requests
  friendRequestUnsubscribe = db.collection('friendships')
    .where('user2', '==', uid)
    .where('status', '==', 'pending')
    .onSnapshot(async (snapshot) => {
      socialState.friendRequests = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        // Get requester's profile
        try {
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
        } catch (err) {
          console.error('Error fetching requester profile:', err);
        }
      }

      updateFriendRequestsUI();

      // Show notification for new requests
      if (snapshot.docChanges().some(change => change.type === 'added')) {
        console.log('🔔 New friend request received!');
      }
    }, (error) => {
      console.error('Friend request listener error:', error);
    });
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
  // Use mock data if enabled
  if (isMockDataEnabled()) {
    const mockBenchmarks = generateMockBenchmarks();

    const benchmarkDistanceEl = document.getElementById('benchmark-distance-comparison');
    const benchmarkStreakEl = document.getElementById('benchmark-streak-comparison');
    const myDistanceEl = document.getElementById('benchmark-my-distance');
    const myStreakEl = document.getElementById('benchmark-my-streak');
    const benchmarkPrompt = document.getElementById('benchmark-prompt');
    const benchmarkContent = document.getElementById('benchmark-content');

    // Show benchmark content
    if (benchmarkPrompt) benchmarkPrompt.style.display = 'none';
    if (benchmarkContent) benchmarkContent.style.display = 'block';

    // Update display
    if (myDistanceEl) myDistanceEl.textContent = `${mockBenchmarks.myDistance} m`;
    if (myStreakEl) myStreakEl.textContent = `${mockBenchmarks.myStreak} days`;

    const distancePercentile = calculatePercentile(mockBenchmarks.myDistance, mockBenchmarks.avgWeeklyDistance);
    const streakPercentile = calculatePercentile(mockBenchmarks.myStreak, mockBenchmarks.avgCurrentStreak);

    if (benchmarkDistanceEl) {
      const distanceMessage = getPercentileMessage(distancePercentile);
      benchmarkDistanceEl.innerHTML = `
        <span class="benchmark-percentile">${distanceMessage}</span>
        <span class="benchmark-avg">Group avg: ${mockBenchmarks.avgWeeklyDistance} m (${mockBenchmarks.totalUsers} swimmers)</span>
      `;
    }

    if (benchmarkStreakEl) {
      const streakMessage = getPercentileMessage(streakPercentile);
      benchmarkStreakEl.innerHTML = `
        <span class="benchmark-percentile">${streakMessage}</span>
        <span class="benchmark-avg">Group avg: ${mockBenchmarks.avgCurrentStreak} days (${mockBenchmarks.totalUsers} swimmers)</span>
      `;
    }

    return;
  }

  if (!Auth.isFirebaseConfigured()) return;

  const userProfile = await Auth.getUserProfile();
  if (!userProfile || !userProfile.ageGroup || !userProfile.gender) {
    console.log('Benchmarks require age and gender to be set');
    return;
  }

  try {
    const db = firebase.firestore();
    const benchmarkKey = `${userProfile.ageGroup}_${userProfile.gender}`;

    // Get benchmark data for user's demographic
    const benchmarkDoc = await db.collection('benchmarks').doc(benchmarkKey).get();

    const benchmarkDistanceEl = document.getElementById('benchmark-distance-comparison');
    const benchmarkStreakEl = document.getElementById('benchmark-streak-comparison');
    const myDistanceEl = document.getElementById('benchmark-my-distance');
    const myStreakEl = document.getElementById('benchmark-my-streak');

    // Update user's own stats
    const myDistance = userProfile.stats?.weeklyDistance || 0;
    const myStreak = userProfile.stats?.currentStreak || 0;

    if (myDistanceEl) myDistanceEl.textContent = `${myDistance} m`;
    if (myStreakEl) myStreakEl.textContent = `${myStreak} days`;

    if (benchmarkDoc.exists) {
      const benchmarkData = benchmarkDoc.data();
      const avgDistance = benchmarkData.avgWeeklyDistance || 0;
      const avgStreak = benchmarkData.avgCurrentStreak || 0;
      const totalUsers = benchmarkData.totalUsers || 0;

      // Calculate percentile (simplified - in production use actual percentile data)
      const distancePercentile = calculatePercentile(myDistance, avgDistance);
      const streakPercentile = calculatePercentile(myStreak, avgStreak);

      // Update distance comparison
      if (benchmarkDistanceEl) {
        const distanceMessage = getPercentileMessage(distancePercentile);
        benchmarkDistanceEl.innerHTML = `
          <span class="benchmark-percentile">${distanceMessage}</span>
          <span class="benchmark-avg">Group avg: ${avgDistance} m (${totalUsers} swimmers)</span>
        `;
      }

      // Update streak comparison
      if (benchmarkStreakEl) {
        const streakMessage = getPercentileMessage(streakPercentile);
        benchmarkStreakEl.innerHTML = `
          <span class="benchmark-percentile">${streakMessage}</span>
          <span class="benchmark-avg">Group avg: ${avgStreak} days (${totalUsers} swimmers)</span>
        `;
      }
    } else {
      // No benchmark data yet - show that user is the first
      if (benchmarkDistanceEl) {
        benchmarkDistanceEl.innerHTML = `
          <span class="benchmark-percentile">Be the first!</span>
          <span class="benchmark-avg">No data yet for your demographic</span>
        `;
      }

      if (benchmarkStreakEl) {
        benchmarkStreakEl.innerHTML = `
          <span class="benchmark-percentile">Be the first!</span>
          <span class="benchmark-avg">No data yet for your demographic</span>
        `;
      }
    }
  } catch (error) {
    console.error('Error loading benchmarks:', error);
  }
}

/**
 * Calculate percentile (simplified)
 * Returns a value between 0-100 indicating performance vs average
 */
function calculatePercentile(myValue, avgValue) {
  if (avgValue === 0) return myValue > 0 ? 100 : 50;
  const ratio = myValue / avgValue;

  // Convert ratio to percentile (simplified sigmoid-like function)
  if (ratio >= 2.0) return 95;
  if (ratio >= 1.5) return 85;
  if (ratio >= 1.2) return 75;
  if (ratio >= 1.0) return 60;
  if (ratio >= 0.8) return 45;
  if (ratio >= 0.5) return 30;
  return 15;
}

/**
 * Get friendly message for percentile
 */
function getPercentileMessage(percentile) {
  if (percentile >= 90) return '🏆 Top 10%!';
  if (percentile >= 75) return '🌟 Above average';
  if (percentile >= 50) return '✓ On track';
  if (percentile >= 25) return '📈 Room to grow';
  return '💪 Keep swimming';
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
  const friendsTab = document.getElementById('social-tab-friends');

  console.log('updateFriendsListUI called:', {
    containerFound: !!container,
    friendsCount: socialState.friends.length,
    friendsTabFound: !!friendsTab,
    friendsTabVisible: friendsTab ? friendsTab.style.display : 'N/A',
    friendsData: socialState.friends.map(f => f.displayName)
  });

  if (!container) {
    console.error('friends-list container not found!');
    return;
  }

  if (socialState.friends.length === 0) {
    console.log('No friends to display, showing empty state');
    container.innerHTML = `
      <div class="empty-state">
        <p>No friends yet. Share your code to get started!</p>
      </div>
    `;
    return;
  }

  console.log('Rendering', socialState.friends.length, 'friends');
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
  const mobileBadge = document.getElementById('friend-request-badge');

  // Update mobile notification badge
  if (mobileBadge) {
    if (socialState.friendRequests.length > 0) {
      mobileBadge.textContent = socialState.friendRequests.length;
      mobileBadge.style.display = 'flex';
    } else {
      mobileBadge.style.display = 'none';
    }
  }

  // Update mobile dropdown friend requests button
  const mobileDropdownBtn = document.getElementById('mobile-friend-requests-btn');
  const mobileDropdownBadge = document.getElementById('mobile-dropdown-badge');
  if (mobileDropdownBtn) {
    if (socialState.friendRequests.length > 0) {
      mobileDropdownBtn.style.display = 'flex';
      if (mobileDropdownBadge) {
        mobileDropdownBadge.textContent = socialState.friendRequests.length;
      }
    } else {
      mobileDropdownBtn.style.display = 'none';
    }
  }

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

  // Add Friend Modal
  const openAddFriendModalBtn = document.getElementById('open-add-friend-modal-btn');
  const addFriendModal = document.getElementById('add-friend-modal');
  const addFriendModalCloseBtn = document.getElementById('add-friend-modal-close-btn');

  if (openAddFriendModalBtn && addFriendModal) {
    openAddFriendModalBtn.addEventListener('click', () => {
      addFriendModal.style.display = 'flex';
    });
  }

  if (addFriendModalCloseBtn && addFriendModal) {
    addFriendModalCloseBtn.addEventListener('click', () => {
      addFriendModal.style.display = 'none';
    });
  }

  // Close modal when clicking outside
  if (addFriendModal) {
    addFriendModal.addEventListener('click', (e) => {
      if (e.target === addFriendModal) {
        addFriendModal.style.display = 'none';
      }
    });
  }

  // Email auth modal
  const emailAuthForm = document.getElementById('modal-email-auth-form');
  const emailAuthCloseBtn = document.getElementById('email-auth-close-btn');
  const authSwitchBtn = document.getElementById('auth-switch-btn');

  let isSignUp = false;

  if (emailAuthForm) {
    emailAuthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      Auth.clearAuthError();

      const email = document.getElementById('modal-auth-email').value;
      const password = document.getElementById('modal-auth-password').value;
      const displayName = document.getElementById('modal-auth-display-name').value;

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
      const title = document.getElementById('modal-email-auth-title');
      const submitBtn = document.getElementById('modal-auth-submit-btn');
      const switchText = document.getElementById('modal-auth-switch-text');
      const nameGroup = document.getElementById('modal-auth-name-group');

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
    addFriendBtn.addEventListener('click', async () => {
      const code = document.getElementById('friend-code-input').value;
      if (code.length >= 6) {
        await sendFriendRequest(code);
        // Close the modal on success
        const addFriendModal = document.getElementById('add-friend-modal');
        if (addFriendModal) {
          addFriendModal.style.display = 'none';
        }
        // Clear input
        document.getElementById('friend-code-input').value = '';
      } else {
        alert('Please enter a valid friend code');
      }
    });
  }

  if (scanQRBtn) {
    scanQRBtn.addEventListener('click', () => {
      // Close add friend modal if open
      const addFriendModal = document.getElementById('add-friend-modal');
      if (addFriendModal) {
        addFriendModal.style.display = 'none';
      }
      startQRScanner();
    });
  }

  // QR scanner close
  const qrScannerCloseBtn = document.getElementById('qr-scanner-close-btn');
  if (qrScannerCloseBtn) {
    qrScannerCloseBtn.addEventListener('click', stopQRScanner);
  }

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

  // Social Tab Switching
  document.querySelectorAll('.social-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-social-tab');

      console.log('Social tab clicked:', tabName);

      // Update active tab button
      document.querySelectorAll('.social-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update visible tab content
      document.querySelectorAll('.social-tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
      });

      const tabContent = document.getElementById(`social-tab-${tabName}`);
      if (tabContent) {
        tabContent.classList.add('active');
        tabContent.style.display = 'block';
        console.log('Showing tab content:', `social-tab-${tabName}`);
      } else {
        console.error('Tab content not found:', `social-tab-${tabName}`);
      }
    });
  });

  // Mock Data Toggle - only show in development (localhost)
  const mockDataBtn = document.getElementById('toggle-mock-data-btn');
  if (mockDataBtn) {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isDevelopment) {
      // Show the button in development
      mockDataBtn.style.display = 'inline-flex';

      // Load mock data state from localStorage
      const mockDataEnabled = localStorage.getItem('mockDataEnabled') === 'true';
      updateMockDataButton(mockDataEnabled);

      mockDataBtn.addEventListener('click', () => {
        const isEnabled = localStorage.getItem('mockDataEnabled') === 'true';
        const newState = !isEnabled;
        localStorage.setItem('mockDataEnabled', newState.toString());
        updateMockDataButton(newState);

        console.log('Mock data toggled:', newState ? 'ON' : 'OFF');

        // Reload social data with mock data if enabled
        const currentUser = Auth.getCurrentUser();
        if (currentUser) {
          loadSocialData(currentUser);
        }
      });
    } else {
      // In production, ensure mock data is disabled and button stays hidden
      localStorage.removeItem('mockDataEnabled');
    }
  }
}

/**
 * Update mock data button label
 */
function updateMockDataButton(enabled) {
  const label = document.getElementById('mock-data-label');
  if (label) {
    label.textContent = enabled ? 'Hide Mock' : 'Show Mock';
  }
}

/**
 * Generate mock friends data for UI preview
 */
function generateMockFriends() {
  const names = [
    'Emma Wilson', 'Liam Martinez', 'Olivia Brown', 'Noah Johnson', 'Ava Davis',
    'Ethan Garcia', 'Sophia Rodriguez', 'Mason Lee', 'Isabella Taylor', 'James Anderson'
  ];

  return names.map((name, index) => ({
    uid: `mock-friend-${index}`,
    displayName: name,
    photoURL: null,
    stats: {
      weeklyDistance: Math.floor(Math.random() * 8000) + 2000,
      currentStreak: Math.floor(Math.random() * 30) + 1,
      avgPace: (Math.random() * 1 + 1.5).toFixed(2) // 1.5-2.5 min/100m
    },
    privacy: {
      shareVolume: true,
      shareStreak: Math.random() > 0.3,
      sharePace: Math.random() > 0.5
    }
  }));
}

/**
 * Generate mock benchmark data for UI preview
 */
function generateMockBenchmarks() {
  return {
    ageGroup: '30s',
    gender: 'male',
    totalUsers: 247,
    avgWeeklyDistance: 4500,
    avgCurrentStreak: 8,
    myDistance: 5200,
    myStreak: 12
  };
}

/**
 * Check if mock data is enabled
 */
function isMockDataEnabled() {
  return localStorage.getItem('mockDataEnabled') === 'true';
}

/**
 * Update benchmark aggregations
 * Call this whenever a user's stats change and they have opted in
 */
async function updateBenchmarkAggregations(userProfile) {
  if (!Auth.isFirebaseConfigured()) return;
  if (!userProfile?.privacy?.contributeAnonymous) return;
  if (!userProfile.ageGroup || !userProfile.gender) return;

  try {
    const db = firebase.firestore();
    const benchmarkKey = `${userProfile.ageGroup}_${userProfile.gender}`;
    const benchmarkRef = db.collection('benchmarks').doc(benchmarkKey);

    const weeklyDistance = userProfile.stats?.weeklyDistance || 0;
    const currentStreak = userProfile.stats?.currentStreak || 0;

    // Use a transaction to update aggregations safely
    await db.runTransaction(async (transaction) => {
      const benchmarkDoc = await transaction.get(benchmarkRef);

      if (!benchmarkDoc.exists) {
        // Create new benchmark document
        transaction.set(benchmarkRef, {
          ageGroup: userProfile.ageGroup,
          gender: userProfile.gender,
          totalUsers: 1,
          totalWeeklyDistance: weeklyDistance,
          totalCurrentStreak: currentStreak,
          avgWeeklyDistance: weeklyDistance,
          avgCurrentStreak: currentStreak,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Update existing benchmark
        const data = benchmarkDoc.data();
        const totalUsers = data.totalUsers || 1;

        // Recalculate averages (simplified - in production use incremental updates)
        const newTotalWeeklyDistance = data.totalWeeklyDistance + weeklyDistance;
        const newTotalCurrentStreak = data.totalCurrentStreak + currentStreak;

        transaction.update(benchmarkRef, {
          totalWeeklyDistance: newTotalWeeklyDistance,
          totalCurrentStreak: newTotalCurrentStreak,
          avgWeeklyDistance: Math.round(newTotalWeeklyDistance / (totalUsers + 1)),
          avgCurrentStreak: Math.round(newTotalCurrentStreak / (totalUsers + 1)),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    console.log('Benchmark aggregations updated');
  } catch (error) {
    console.error('Error updating benchmark aggregations:', error);
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
  loadBenchmarks,
  updateBenchmarkAggregations
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSocial);
} else {
  initSocial();
}
