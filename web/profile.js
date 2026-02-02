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
  if (user.photoURL) {
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
 * Handle collapsible sections
 */
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

/**
 * Handle resend verification email
 */
document.getElementById('resend-verification-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('resend-verification-btn');
  const originalText = btn.textContent;

  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    await Auth.resendVerificationEmail();
    btn.textContent = 'Sent!';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 3000);
  } catch (error) {
    console.error('Error resending verification:', error);
    alert('Failed to resend verification email. Please try again.');
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

/**
 * Handle sign out from profile
 */
document.getElementById('sign-out-profile-btn')?.addEventListener('click', async () => {
  try {
    await Auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    alert('Failed to sign out. Please try again.');
  }
});

/**
 * Handle delete account
 */
document.getElementById('delete-account-btn')?.addEventListener('click', async () => {
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

  const btn = document.getElementById('delete-account-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span style="opacity: 0.7;">Deleting...</span>';

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
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

/**
 * Handle form submissions for different profile sections
 */

// Personal details form
document.getElementById('personal-details-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  // This will be handled by existing app.js profile form handler
  // Just trigger the profile-form submit
  const event = new Event('submit', { bubbles: true, cancelable: true });
  document.getElementById('profile-form')?.dispatchEvent(event);
});

// Training requirements form
document.getElementById('training-requirements-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  // Trigger the main profile form
  const event = new Event('submit', { bubbles: true, cancelable: true });
  document.getElementById('profile-form')?.dispatchEvent(event);
});

// Coaching options form
document.getElementById('coaching-options-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  // Trigger the main profile form
  const event = new Event('submit', { bubbles: true, cancelable: true });
  document.getElementById('profile-form')?.dispatchEvent(event);
});

console.log('Profile UI initialized');
