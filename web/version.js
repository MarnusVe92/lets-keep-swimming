/**
 * App Version Configuration
 *
 * Update this file when deploying new versions.
 * - version: Semantic version string
 * - build: Incremental build number (triggers update detection)
 * - requiresLogout: Set to true if users need to re-authenticate after this update
 * - changelog: Brief description of changes (shown in update banner)
 */
const APP_VERSION = {
  version: '2.7.0',
  build: 1,
  requiresLogout: false,
  changelog: 'Friend request notifications and real-time updates'
};

// Make available globally
window.APP_VERSION = APP_VERSION;
