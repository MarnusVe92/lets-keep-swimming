/**
 * Authentication Landing Page
 * Handles the landing page UI and authentication flow
 */

// Wait for Auth module to be ready
Auth.onAuthStateChange((authState) => {
  const landing = document.getElementById('auth-landing');
  const mainApp = document.getElementById('main-app');

  if (authState.initialized) {
    if (authState.user) {
      // User is signed in - show main app
      landing.style.display = 'none';
      mainApp.style.display = 'block';
    } else {
      // User is not signed in - show landing page
      landing.style.display = 'flex';
      mainApp.style.display = 'none';
    }
  }
});

// Show/hide email form
function showEmailForm() {
  document.querySelector('.auth-options').style.display = 'none';
  document.getElementById('email-auth-form').style.display = 'block';
}

function hideEmailForm() {
  document.querySelector('.auth-options').style.display = 'flex';
  document.getElementById('email-auth-form').style.display = 'none';
}

// Tab switching
document.getElementById('signin-tab')?.addEventListener('click', () => {
  document.getElementById('signin-tab').classList.add('active');
  document.getElementById('signup-tab').classList.remove('active');
  document.getElementById('email-signin-form').style.display = 'block';
  document.getElementById('email-signup-form').style.display = 'none';
  Auth.clearAuthError();
});

document.getElementById('signup-tab')?.addEventListener('click', () => {
  document.getElementById('signup-tab').classList.add('active');
  document.getElementById('signin-tab').classList.remove('active');
  document.getElementById('email-signup-form').style.display = 'block';
  document.getElementById('email-signin-form').style.display = 'none';
  Auth.clearAuthError();
});

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
  } catch (error) {
    console.error('Email sign up error:', error);
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

console.log('Landing page authentication initialized');
