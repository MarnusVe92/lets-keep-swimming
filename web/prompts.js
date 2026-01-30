/**
 * Let's Keep Swimming - Prompt System
 *
 * This file handles building polish requests to send to the server.
 * The LLM is used ONLY for polish (explanations, tips, cues) - NOT for
 * generating workout structure. Structure comes from deterministic templates.
 */

/**
 * System prompt for polish-only LLM calls
 * Strictly instructs the LLM to provide ONLY text polish, no structural changes
 */
const POLISH_SYSTEM_PROMPT = `You are a supportive swim coach assistant for Midmar Mile preparation.

CRITICAL RULES:
1. You are providing POLISH ONLY - explanatory text for a pre-determined workout
2. You MUST NOT suggest changes to distances, reps, sets, or structure
3. You MUST NOT invent new exercises or modify the workout
4. Your job is ONLY to explain WHY this session makes sense and provide technique cues
5. Be encouraging but realistic - no medical advice
6. Use cautious, non-medical language (say "consider rest" not "you may be injured")

OUTPUT FORMAT:
Return ONLY valid JSON with these fields:
{
  "why_this": "string (max 60 words) - explain why this session fits the athlete's current situation",
  "technique_focus": ["array of max 3 short technique cues relevant to this workout"],
  "event_prep_tip": "string - one practical tip related to event preparation (or null if not applicable)",
  "flags": ["array of 0-4 cautionary notes if needed"]
}

TONE GUIDELINES:
- neutral: professional, informative
- calm: gentle, reassuring, emphasize enjoyment
- tough_love: direct, challenging, performance-focused

DO NOT include any text outside the JSON object.`;

/**
 * Build a polish request to send to the server
 *
 * This packages the deterministic session plan with context for LLM polish:
 * - The pre-generated session structure (DO NOT MODIFY)
 * - Recent training context
 * - Athlete profile for personalization
 *
 * @param {Object} sessionPlan - The deterministic session plan from planner.js
 * @param {Object} profile - User's profile data
 * @param {Array} recentSessions - Recent training sessions (last 5)
 * @returns {Object} - Formatted request ready to send to server
 */
function buildPolishRequest(sessionPlan, profile, recentSessions) {
  const session = sessionPlan.session;

  // Format the session for the prompt
  const sessionDescription = formatSessionForPrompt(session);

  // Build the user prompt
  const userPrompt = buildUserPrompt(sessionPlan, profile, recentSessions, sessionDescription);

  return {
    system_prompt: POLISH_SYSTEM_PROMPT,
    user_prompt: userPrompt,
    session_plan: sessionPlan,
    profile: {
      eventDate: profile.eventDate,
      goal: profile.goal,
      targetTime: profile.targetTime,
      tone: profile.tone || 'neutral',
      sessionsPerWeek: profile.sessionsPerWeek,
      access: profile.access
    },
    recent_sessions: recentSessions.slice(0, 5).map(s => ({
      date: s.date,
      type: s.type,
      distance_m: s.distance_m,
      time_min: s.time_min,
      rpe: s.rpe,
      notes: s.notes
    }))
  };
}

/**
 * Format session structure for the prompt
 * Creates a readable description of the workout
 */
function formatSessionForPrompt(session) {
  if (session.type === 'rest') {
    return 'REST DAY - No swimming scheduled';
  }

  let description = `${session.type.toUpperCase()} SESSION\n`;
  description += `Duration: ${session.estimated_duration_min} minutes\n`;

  if (session.total_distance_m) {
    description += `Total Distance: ${session.total_distance_m}m\n`;
  }

  description += `Intensity: ${session.intensity}\n\n`;
  description += `STRUCTURE (DO NOT MODIFY):\n`;

  session.structure.forEach(block => {
    description += `\n${block.label}:\n`;
    block.items.forEach(item => {
      description += `  - ${item.text}`;
      if (item.distance_m) {
        description += ` (${item.distance_m}m)`;
      }
      description += '\n';
    });
  });

  if (session.open_water_addons && session.open_water_addons.length > 0) {
    description += `\nOPEN WATER ADDITIONS:\n`;
    session.open_water_addons.forEach(addon => {
      description += `  - ${addon}\n`;
    });
  }

  return description;
}

/**
 * Build the user prompt for polish request
 */
function buildUserPrompt(sessionPlan, profile, recentSessions, sessionDescription) {
  const { phase, days_to_event, readiness, derived_from_template } = sessionPlan;
  const session = sessionPlan.session;

  let prompt = `Please provide polish for this pre-determined workout session.

ATHLETE CONTEXT:
- Days to event: ${days_to_event}
- Training phase: ${phase}
- Goal: ${profile.goal}${profile.targetTime ? ` (target: ${profile.targetTime})` : ''}
- Preferred tone: ${profile.tone || 'neutral'}
- Training readiness: ${readiness.status}${readiness.reasons.length > 0 ? ` (${readiness.reasons.join('; ')})` : ''}

TEMPLATE SOURCE:
- Based on: ${derived_from_template.source} program
- Template: ${derived_from_template.template_name}
${derived_from_template.scaling_notes ? `- Scaling: ${derived_from_template.scaling_notes}` : ''}

RECENT TRAINING (last 5 sessions):
`;

  if (recentSessions.length === 0) {
    prompt += 'No recent sessions logged.\n';
  } else {
    recentSessions.slice(0, 5).forEach(s => {
      prompt += `- ${s.date}: ${s.type}, ${s.distance_m}m, ${s.time_min}min, RPE ${s.rpe}`;
      if (s.notes) {
        prompt += ` - "${s.notes}"`;
      }
      prompt += '\n';
    });
  }

  prompt += `
THE SESSION (structure is FINAL - do not suggest changes):
${sessionDescription}

Please provide:
1. why_this: Brief explanation (max 60 words) of why this session fits the athlete's current training phase and recent history
2. technique_focus: Up to 3 technique cues relevant to this specific workout
3. event_prep_tip: One practical tip for Midmar Mile preparation (or null if ${days_to_event} > 21)
4. flags: Any cautionary notes (0-4 items) based on readiness status or session demands`;

  // Add open water safety reminder if applicable
  if (session.type === 'open_water') {
    prompt += `

NOTE: This is an open water session. Include a safety reminder in flags about swimming with a buddy or in supervised areas.`;
  }

  prompt += `

Return ONLY the JSON object, no other text.`;

  return prompt;
}

/**
 * Calculate training summary statistics
 * Still useful for context, even with deterministic planning
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

  for (let i = 0; i < 14; i++) {
    const checkDateStr = checkDate.toISOString().split('T')[0];
    const hasSession = sortedSessions.some(s => s.date === checkDateStr);

    if (hasSession) {
      consecutive_days_trained++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
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
 * Validate a polish response from the server
 * Returns true if valid, false if missing required fields
 */
function validatePolishResponse(response) {
  if (!response || typeof response !== 'object') {
    return false;
  }

  // Check required field
  if (typeof response.why_this !== 'string' || response.why_this.length === 0) {
    return false;
  }

  // Check why_this word count (max 60 words)
  const wordCount = response.why_this.trim().split(/\s+/).length;
  if (wordCount > 80) { // Allow some flexibility
    console.warn('why_this exceeds recommended word count:', wordCount);
  }

  // Check technique_focus is array
  if (!Array.isArray(response.technique_focus)) {
    return false;
  }

  // Check technique_focus has max 3 items
  if (response.technique_focus.length > 4) { // Allow some flexibility
    console.warn('technique_focus exceeds recommended count:', response.technique_focus.length);
  }

  // flags should be array if present
  if (response.flags !== undefined && !Array.isArray(response.flags)) {
    return false;
  }

  return true;
}

/**
 * Legacy function for backwards compatibility
 * Maps old request format to new polish request
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
 * Legacy validation for backwards compatibility
 */
function validateCoachResponse(response) {
  if (!response || typeof response !== 'object') {
    return false;
  }

  if (!response.tomorrow_session || !response.why_this) {
    return false;
  }

  const session = response.tomorrow_session;

  const requiredFields = ['type', 'duration_min', 'structure', 'intensity', 'technique_focus'];
  for (const field of requiredFields) {
    if (!(field in session)) {
      return false;
    }
  }

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
 * Legacy formatting for backwards compatibility
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
    text += `**Important Notes:**\n`;
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
  // New polish-only functions
  POLISH_SYSTEM_PROMPT,
  buildPolishRequest,
  validatePolishResponse,
  formatSessionForPrompt,

  // Legacy functions for backwards compatibility
  buildCoachRequest,
  validateCoachResponse,
  formatCoachResponse,
  calculateTrainingSummary
};
