/**
 * Profile Tab UI Handler
 * Manages the profile summary, collapsible sections, and account actions
 */

// Initialize profile when auth state changes
Auth.onAuthStateChange((authState) => {
  if (authState.user) {
    updateProfileSummary(authState.user);
  }
});

/**
 * Update profile summary card
 */
function updateProfileSummary(user) {
  console.log('📷 updateProfileSummary called, photoURL:', user?.photoURL);

  // Update avatar
  const avatar = document.getElementById('profile-summary-avatar');
  if (avatar && user.photoURL) {
    console.log('📷 Setting profile summary avatar with URL:', user.photoURL);
    avatar.innerHTML = `<img src="${user.photoURL}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;" referrerpolicy="no-referrer" onerror="console.error('📷 Avatar image failed to load')">`;
  } else {
    console.log('📷 No avatar element or no photoURL', { avatar: !!avatar, photoURL: user?.photoURL });
  }

  // Update name
  const nameEl = document.getElementById('profile-summary-name');
  if (nameEl) {
    nameEl.textContent = user.displayName || user.email.split('@')[0];
  }

  // Update email (masked)
  const emailEl = document.getElementById('profile-summary-email');
  if (emailEl) {
    emailEl.textContent = Auth.maskEmail(user.email);
  }

  // Update email verification badges
  const verifiedBadge = document.getElementById('email-verified-badge');
  const unverifiedBadge = document.getElementById('email-unverified-badge');

  if (user.emailVerified) {
    if (verifiedBadge) verifiedBadge.style.display = 'inline-flex';
    if (unverifiedBadge) unverifiedBadge.style.display = 'none';
  } else {
    if (verifiedBadge) verifiedBadge.style.display = 'none';
    if (unverifiedBadge) unverifiedBadge.style.display = 'inline-flex';
  }
}

/**
 * Initialize collapsible sections
 */
function initCollapsibleSections() {
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const content = document.getElementById(targetId);

      if (content) {
        // Toggle active class on header
        header.classList.toggle('active');

        // Toggle collapsed class on content
        content.classList.toggle('collapsed');
      }
    });
  });
}

/**
 * Reset profile page buttons to default state
 */
function resetProfileButtons() {
  const deleteBtn = document.getElementById('delete-account-btn');
  if (deleteBtn) {
    deleteBtn.disabled = false;
    deleteBtn.innerHTML = '<svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 16px; height: 16px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Delete Account';
  }

  const resendBtn = document.getElementById('resend-verification-btn');
  if (resendBtn) {
    resendBtn.disabled = false;
    resendBtn.textContent = 'Resend Verification Email';
  }
}

/**
 * Initialize profile event handlers
 */
function initProfileHandlers() {
  // Reset buttons to default state on load
  resetProfileButtons();

  // Handle resend verification email
  const resendBtn = document.getElementById('resend-verification-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      const originalText = resendBtn.textContent;

      resendBtn.disabled = true;
      resendBtn.textContent = 'Sending...';

      try {
        await Auth.resendVerificationEmail();
        resendBtn.textContent = 'Sent!';
        setTimeout(() => {
          resendBtn.textContent = originalText;
          resendBtn.disabled = false;
        }, 3000);
      } catch (error) {
        console.error('Error resending verification:', error);
        alert('Failed to resend verification email. Please try again.');
        resendBtn.textContent = originalText;
        resendBtn.disabled = false;
      }
    });
  }

  // Handle privacy toggles
  const privacyToggles = [
    'privacy-share-volume',
    'privacy-share-streak',
    'privacy-share-pace',
    'privacy-contribute-anonymous'
  ];

  privacyToggles.forEach(id => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.addEventListener('change', async () => {
        const settings = {
          shareVolume: document.getElementById('privacy-share-volume')?.checked ?? true,
          shareStreak: document.getElementById('privacy-share-streak')?.checked ?? true,
          sharePace: document.getElementById('privacy-share-pace')?.checked ?? false,
          contributeAnonymous: document.getElementById('privacy-contribute-anonymous')?.checked ?? true
        };

        try {
          await Auth.updatePrivacySettings(settings);
          console.log('Privacy settings updated');
        } catch (error) {
          console.error('Error saving privacy settings:', error);
        }
      });
    }
  });

  // Load privacy settings from profile
  Auth.onAuthStateChange(async (authState) => {
    if (authState.user && authState.isConfigured) {
      try {
        const userProfile = await Auth.getUserProfile();
        if (userProfile?.privacy) {
          const shareVolumeToggle = document.getElementById('privacy-share-volume');
          const shareStreakToggle = document.getElementById('privacy-share-streak');
          const sharePaceToggle = document.getElementById('privacy-share-pace');
          const contributeToggle = document.getElementById('privacy-contribute-anonymous');

          if (shareVolumeToggle) shareVolumeToggle.checked = userProfile.privacy.shareVolume !== false;
          if (shareStreakToggle) shareStreakToggle.checked = userProfile.privacy.shareStreak !== false;
          if (sharePaceToggle) sharePaceToggle.checked = userProfile.privacy.sharePace === true;
          if (contributeToggle) contributeToggle.checked = userProfile.privacy.contributeAnonymous !== false;
        }
      } catch (error) {
        console.error('Error loading privacy settings:', error);
      }
    }
  });

  // Handle sign out from profile
  const signOutBtn = document.getElementById('sign-out-profile-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      try {
        await Auth.signOut();
      } catch (error) {
        console.error('Sign out error:', error);
        alert('Failed to sign out. Please try again.');
      }
    });
  }

  // Handle delete account
  const deleteBtn = document.getElementById('delete-account-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const user = Auth.getCurrentUser();
      if (!user) return;

      // Show confirmation dialog
      const confirmed = confirm(
        `Are you sure you want to delete your account?\n\n` +
        `This will permanently delete:\n` +
        `• All your training sessions\n` +
        `• Your progress and statistics\n` +
        `• Your friend connections\n` +
        `• All associated data\n\n` +
        `This action CANNOT be undone.`
      );

      if (!confirmed) return;

      // Second confirmation
      const emailConfirm = prompt(
        `To confirm account deletion, please type your email address:\n${user.email}`
      );

      if (emailConfirm !== user.email) {
        alert('Email address does not match. Account deletion cancelled.');
        return;
      }

      const originalText = deleteBtn.innerHTML;
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<span style="opacity: 0.7;">Deleting...</span>';

      try {
        await Auth.deleteAccount();
        // User will be automatically signed out and redirected to landing page
      } catch (error) {
        console.error('Delete account error:', error);

        let message = 'Failed to delete account. ';

        if (error.code === 'auth/requires-recent-login') {
          message += 'For security, please sign out and sign in again, then try deleting your account.';
        } else {
          message += 'Please try again or contact support.';
        }

        alert(message);
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
      }
    });
  }

  // Note: Individual form handlers removed - now using single profile-form
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initCollapsibleSections();
    initProfileHandlers();
  });
} else {
  initCollapsibleSections();
  initProfileHandlers();
}

console.log('Profile UI initialized');
