/**
 * Let's Keep Swimming - Prompt System
 *
 * This file handles building coaching requests to send to the server.
 * It calculates training summaries and formats data for the AI coach.
 */

/**
 * Calculate training summary statistics
 *
 * This analyzes all sessions to provide context for coaching decisions:
 * - How much have you swum in the last week?
 * - How hard was the training (RPE)?
 * - Have you been training consecutive days without rest?
 */
function calculateTrainingSummary(sessions, today) {
  const todayDate = new Date(today);
  const sevenDaysAgo = new Date(todayDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(todayDate);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Filter sessions by time period
  const last7Days = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= sevenDaysAgo && sessionDate <= todayDate;
  });

  const last14Days = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= fourteenDaysAgo && sessionDate <= todayDate;
  });

  // Calculate total distance
  const last7days_m = last7Days.reduce((sum, s) => sum + s.distance_m, 0);
  const last14days_m = last14Days.reduce((sum, s) => sum + s.distance_m, 0);

  // Calculate average RPE (Rate of Perceived Exertion)
  const last7days_avg_rpe = last7Days.length > 0
    ? last7Days.reduce((sum, s) => sum + s.rpe, 0) / last7Days.length
    : 0;

  // Calculate consecutive training days (working backwards from today, INCLUDING today)
  let consecutive_days_trained = 0;
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));

  let checkDate = new Date(todayDate);
  // Start with today - if there's a session today, count it

  for (let i = 0; i < 14; i++) { // Check up to 14 days back
    const checkDateStr = checkDate.toISOString().split('T')[0];
    const hasSession = sortedSessions.some(s => s.date === checkDateStr);

    if (hasSession) {
      consecutive_days_trained++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      // No session today - start checking from yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break; // Stop at first gap after streak started
    }
  }

  return {
    last7days_m,
    last14days_m,
    last7days_avg_rpe,
    consecutive_days_trained
  };
}

/**
 * Build a coaching request to send to the server
 *
 * This packages up all the information the AI coach needs:
 * - Your profile (goals, availability, etc.)
 * - Your recent sessions (last 3 workouts)
 * - Training summary (volume, intensity, rest patterns)
 * - Current date
 *
 * @param {Object} profile - User's profile data
 * @param {Array} sessions - All training sessions
 * @param {string} today - Today's date (ISO format: "YYYY-MM-DD")
 * @returns {Object} - Formatted request ready to send to server
 */
function buildCoachRequest(profile, sessions, today) {
  // Sort sessions by date (newest first)
  const sortedSessions = [...sessions].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  // Get last 3 sessions for detailed context
  const recent_sessions = sortedSessions.slice(0, 3);

  // Calculate summary statistics
  const all_sessions_summary = calculateTrainingSummary(sessions, today);

  return {
    profile,
    recent_sessions,
    all_sessions_summary,
    today
  };
}

/**
 * Validate a coaching response from the server
 * Returns true if valid, false if missing required fields
 */
function validateCoachResponse(response) {
  if (!response || typeof response !== 'object') {
    return false;
  }

  // Check required top-level fields
  if (!response.tomorrow_session || !response.why_this) {
    return false;
  }

  const session = response.tomorrow_session;

  // Check required session fields
  const requiredFields = ['type', 'duration_min', 'structure', 'intensity', 'technique_focus'];
  for (const field of requiredFields) {
    if (!(field in session)) {
      return false;
    }
  }

  // Validate types
  if (!['pool', 'open_water', 'rest'].includes(session.type)) {
    return false;
  }

  if (!['easy', 'moderate', 'hard'].includes(session.intensity)) {
    return false;
  }

  if (!Array.isArray(session.structure) || !Array.isArray(session.technique_focus)) {
    return false;
  }

  return true;
}

/**
 * Format coaching response for display
 * Converts the structured data into readable text
 */
function formatCoachResponse(response) {
  const { tomorrow_session, why_this, flags, event_prep_tip } = response;

  let text = `**Tomorrow's Session: ${tomorrow_session.type.toUpperCase()}**\n\n`;

  if (tomorrow_session.type === 'rest') {
    text += `Duration: Rest day\n\n`;
  } else {
    text += `Duration: ${tomorrow_session.duration_min} minutes\n`;
    if (tomorrow_session.distance_m) {
      text += `Distance: ${tomorrow_session.distance_m}m\n`;
    }
    text += `Intensity: ${tomorrow_session.intensity}\n\n`;
  }

  if (tomorrow_session.structure.length > 0) {
    text += `**Structure:**\n`;
    tomorrow_session.structure.forEach((step, i) => {
      text += `${i + 1}. ${step}\n`;
    });
    text += `\n`;
  }

  if (tomorrow_session.technique_focus.length > 0) {
    text += `**Technique Focus:**\n`;
    tomorrow_session.technique_focus.forEach(focus => {
      text += `• ${focus}\n`;
    });
    text += `\n`;
  }

  text += `**Why This Session?**\n${why_this}\n\n`;

  if (flags && flags.length > 0) {
    text += `**⚠️ Important Notes:**\n`;
    flags.forEach(flag => {
      text += `• ${flag}\n`;
    });
    text += `\n`;
  }

  if (event_prep_tip) {
    text += `**Event Prep Tip:**\n${event_prep_tip}\n`;
  }

  return text;
}

// Export functions for use in other files
window.Prompts = {
  buildCoachRequest,
  validateCoachResponse,
  formatCoachResponse,
  calculateTrainingSummary
};
