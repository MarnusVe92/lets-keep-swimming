/**
 * Authentication Landing Page
 * Handles the landing page UI and authentication flow
 */

// Track if app has been initialized
let appInitialized = false;

// Reset all auth buttons to their default state
function resetAuthButtons() {
  // Reset Google button
  const googleBtn = document.getElementById('landing-google-btn');
  if (googleBtn) {
    googleBtn.disabled = false;
    googleBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continue with Google';
  }

  // Reset email button
  const emailBtn = document.getElementById('landing-email-btn');
  if (emailBtn) {
    emailBtn.disabled = false;
  }

  // Reset any form submit buttons
  const signInBtn = document.querySelector('#email-signin-form button[type="submit"]');
  if (signInBtn) {
    signInBtn.disabled = false;
    signInBtn.textContent = 'Sign In';
  }

  const signUpBtn = document.querySelector('#email-signup-form button[type="submit"]');
  if (signUpBtn) {
    signUpBtn.disabled = false;
    signUpBtn.textContent = 'Create Account';
  }

  const forgotBtn = document.querySelector('#forgot-password-form button[type="submit"]');
  if (forgotBtn) {
    forgotBtn.disabled = false;
    forgotBtn.textContent = 'Send Reset Link';
  }
}

// Wait for Auth module to be ready
Auth.onAuthStateChange((authState) => {
  const landing = document.getElementById('auth-landing');
  const mainApp = document.getElementById('main-app');

  if (authState.initialized) {
    if (authState.user) {
      // User is signed in - show main app
      landing.style.display = 'none';
      mainApp.style.display = 'block';

      // Initialize app only once when user is authenticated
      if (!appInitialized && typeof window.initApp === 'function') {
        appInitialized = true;
        window.initApp();
      }
    } else {
      // User is not signed in - show landing page
      landing.style.display = 'flex';
      mainApp.style.display = 'none';
      appInitialized = false; // Reset for next sign in

      // Reset all auth buttons to their default state
      resetAuthButtons();
    }
  }
});

// Show/hide email form
function showEmailForm() {
  document.querySelector('.auth-options').style.display = 'none';
  document.getElementById('email-auth-form').style.display = 'block';
  // Show sign in form by default
  showSignInForm();
}

function hideEmailForm() {
  document.querySelector('.auth-options').style.display = 'flex';
  document.getElementById('email-auth-form').style.display = 'none';
  Auth.clearAuthError();
}

function showSignInForm() {
  document.getElementById('signin-tab').classList.add('active');
  document.getElementById('signup-tab').classList.remove('active');
  document.getElementById('email-signin-form').style.display = 'block';
  document.getElementById('email-signup-form').style.display = 'none';
  document.getElementById('forgot-password-form').style.display = 'none';
  Auth.clearAuthError();
}

function showSignUpForm() {
  document.getElementById('signup-tab').classList.add('active');
  document.getElementById('signin-tab').classList.remove('active');
  document.getElementById('email-signup-form').style.display = 'block';
  document.getElementById('email-signin-form').style.display = 'none';
  document.getElementById('forgot-password-form').style.display = 'none';
  Auth.clearAuthError();
}

function showForgotPasswordForm() {
  document.getElementById('email-signin-form').style.display = 'none';
  document.getElementById('email-signup-form').style.display = 'none';
  document.getElementById('forgot-password-form').style.display = 'block';
  Auth.clearAuthError();
}

// Tab switching
document.getElementById('signin-tab')?.addEventListener('click', showSignInForm);
document.getElementById('signup-tab')?.addEventListener('click', showSignUpForm);

// Google sign in
document.getElementById('landing-google-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('landing-google-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span style="opacity: 0.7;">Signing in...</span>';
  Auth.clearAuthError();

  try {
    await Auth.signInWithGoogle();
  } catch (error) {
    console.error('Google sign in error:', error);
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

// Show email form
document.getElementById('landing-email-btn')?.addEventListener('click', () => {
  showEmailForm();
  Auth.clearAuthError();
});

// Back to options
document.getElementById('back-to-options-btn')?.addEventListener('click', hideEmailForm);
document.getElementById('back-to-options-btn-2')?.addEventListener('click', hideEmailForm);

// Forgot password
document.getElementById('forgot-password-btn')?.addEventListener('click', showForgotPasswordForm);
document.getElementById('back-to-signin-btn')?.addEventListener('click', showSignInForm);

// Email sign in form
document.getElementById('email-signin-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('signin-email').value;
  const password = document.getElementById('signin-password').value;
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.textContent;

  btn.disabled = true;
  btn.textContent = 'Signing in...';
  Auth.clearAuthError();

  try {
    await Auth.signInWithEmail(email, password);
  } catch (error) {
    console.error('Email sign in error:', error);
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

// Email sign up form
document.getElementById('email-signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.textContent;

  btn.disabled = true;
  btn.textContent = 'Creating account...';
  Auth.clearAuthError();

  try {
    await Auth.signUpWithEmail(email, password, name);
    // Show success message about verification email
    showAuthSuccess(`Account created! Please check ${Auth.maskEmail(email)} for a verification link.`);
  } catch (error) {
    console.error('Email sign up error:', error);

    // Check if account already exists
    if (error.code === 'auth/email-already-in-use') {
      showAuthErrorWithAction(
        `An account with ${Auth.maskEmail(email)} already exists. Would you like to sign in instead?`,
        'Switch to Sign In',
        showSignInForm
      );
    }

    btn.disabled = false;
    btn.textContent = originalText;
  }
});

// Forgot password form
document.getElementById('forgot-password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.textContent;

  btn.disabled = true;
  btn.textContent = 'Sending...';
  Auth.clearAuthError();

  try {
    await Auth.sendPasswordResetEmail(email);
    showAuthSuccess(`Password reset link sent! Please check ${Auth.maskEmail(email)} for instructions.`);
    // Clear the form
    document.getElementById('forgot-email').value = '';
    btn.textContent = originalText;
    btn.disabled = false;

    // Switch back to sign in after 3 seconds
    setTimeout(() => {
      showSignInForm();
    }, 3000);
  } catch (error) {
    console.error('Password reset error:', error);
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

// Show success message
function showAuthSuccess(message) {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    errorEl.style.background = '#dcfce7';
    errorEl.style.borderColor = '#bbf7d0';
    errorEl.style.color = '#166534';
  }
}

// Show error message with action button
function showAuthErrorWithAction(message, actionText, actionCallback) {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md);">
        <span>${message}</span>
        <button type="button" class="btn-link" style="white-space: nowrap;" onclick="this.parentElement.parentElement.dataset.action()">${actionText}</button>
      </div>
    `;
    errorEl.style.display = 'block';
    errorEl.style.background = '#fef2f2';
    errorEl.style.borderColor = '#fecaca';
    errorEl.style.color = '#991b1b';
    errorEl.dataset.action = actionCallback;

    // Add click handler for the button
    const actionBtn = errorEl.querySelector('button');
    if (actionBtn) {
      actionBtn.onclick = (e) => {
        e.preventDefault();
        actionCallback();
      };
    }
  }
}

console.log('Landing page authentication initialized');
