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
  // Update avatar
  const avatar = document.getElementById('profile-summary-avatar');
  if (avatar && user.photoURL) {
    avatar.innerHTML = `<img src="${user.photoURL}" alt="Profile">`;
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
 * Initialize profile event handlers
 */
function initProfileHandlers() {
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
