/**
 * Let's Keep Swimming - Coach Service
 *
 * Handles communication with the server for coaching polish.
 * The service sends the deterministic session plan to the server,
 * which uses the LLM only to polish and add explanations.
 */

const COACH_API_URL = 'http://localhost:3000/api/coach';

/**
 * Request polish from the server
 * Sends the session plan and receives only text polish (why, tips, cues)
 *
 * @param {Object} sessionPlan - The deterministic session plan from planner.js
 * @param {Object} profile - User profile
 * @param {Array} recentSessions - Last 14 days of sessions
 * @returns {Promise<Object>} Polish data (why_this, technique_focus, event_prep_tip, flags)
 */
async function requestPolish(sessionPlan, profile, recentSessions) {
  try {
    const requestBody = {
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
      })),
      phase: sessionPlan.phase,
      days_to_event: sessionPlan.days_to_event
    };

    const response = await fetch(COACH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coach API error:', response.status, errorText);
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Failed to get polish from server:', error);
    // Return fallback polish
    return generateFallbackPolish(sessionPlan);
  }
}

/**
 * Generate fallback polish when server is unavailable
 * Provides sensible defaults without LLM
 */
function generateFallbackPolish(sessionPlan) {
  const { session, phase, readiness, days_to_event } = sessionPlan;

  let why_this = '';
  let technique_focus = [];
  let event_prep_tip = '';
  let flags = [];

  // Generate why_this based on session type and phase
  if (session.type === 'rest') {
    why_this = 'Your body needs recovery. Rest today will help you come back stronger for your next session.';
  } else if (phase === 'TAPER') {
    why_this = `With ${days_to_event} days to event, this session maintains fitness while ensuring you arrive fresh. Reduced volume, preserved intensity.`;
  } else if (phase === 'SHARPEN') {
    why_this = 'Race-specific work to dial in your pacing and build confidence. Quality over quantity as you approach event day.';
  } else {
    why_this = 'Building your aerobic base with consistent volume. This foundation supports everything that comes later.';
  }

  // Generate technique_focus based on intensity
  if (session.type !== 'rest') {
    if (session.intensity === 'easy') {
      technique_focus = [
        'Focus on smooth, relaxed strokes',
        'Breathe naturally, no rushing'
      ];
    } else if (session.intensity === 'moderate') {
      technique_focus = [
        'Maintain good catch position',
        'Steady rhythm throughout',
        'Sight regularly in open water sets'
      ];
    } else {
      technique_focus = [
        'High elbow catch on hard efforts',
        'Strong kick from the hips',
        'Controlled breathing pattern'
      ];
    }
  }

  // Generate event_prep_tip based on days to event
  if (days_to_event <= 7) {
    event_prep_tip = 'Final week: trust your training, prioritize sleep, stay hydrated.';
  } else if (days_to_event <= 14) {
    event_prep_tip = 'Two weeks out: maintain routine, visualize race day success.';
  } else {
    event_prep_tip = 'Stay consistent, listen to your body, enjoy the process.';
  }

  // Add flags based on readiness
  if (readiness && readiness.status !== 'READY') {
    readiness.reasons.forEach(reason => {
      if (!reason.includes('looks balanced')) {
        flags.push(reason);
      }
    });
  }

  // Add open water safety flag
  if (session.type === 'open_water') {
    flags.push('Always swim with a buddy or in supervised areas');
  }

  return {
    why_this,
    technique_focus,
    event_prep_tip,
    flags,
    is_fallback: true
  };
}

/**
 * Get complete coaching recommendation
 * Combines deterministic plan with LLM polish
 */
async function getCoachingRecommendation(profile, sessions) {
  // Filter to last 14 days
  const today = new Date();
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const recentSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= fourteenDaysAgo && sessionDate <= today;
  });

  // Determine preferred type based on user access
  const preferredType = profile.access?.openWater ? 'open_water' : 'pool';

  // Generate deterministic session plan
  const sessionPlan = window.CoachPlanner.generateSessionPlan(profile, recentSessions, preferredType);

  // Request polish from server (or use fallback)
  const polish = await requestPolish(sessionPlan, profile, recentSessions);

  // Combine plan with polish
  return {
    session_plan: sessionPlan,
    polish: polish,
    generated_at: new Date().toISOString()
  };
}

/**
 * Adapt existing recommendation to new type
 */
async function adaptRecommendation(existingRecommendation, newType, sessions) {
  const metrics = window.CoachPlanner.calculateRecentMetrics(sessions);

  // Adapt the plan
  const adaptedPlan = window.CoachPlanner.adaptPlanToType(
    existingRecommendation.session_plan,
    newType,
    metrics
  );

  // Re-validate
  const profile = { weeklyVolumeEstimate_m: 5000 }; // Use default
  adaptedPlan.validation = window.CoachPlanner.validatePlan(adaptedPlan, profile, metrics);

  // Request new polish for adapted session
  const polish = await requestPolish(adaptedPlan, profile, sessions.slice(0, 14));

  return {
    session_plan: adaptedPlan,
    polish: polish,
    generated_at: new Date().toISOString(),
    adapted_from: existingRecommendation.session_plan.derived_from_template.template_id
  };
}

/**
 * Scale existing recommendation to new distance
 */
async function scaleRecommendation(existingRecommendation, newDistanceM, profile, sessions) {
  const metrics = window.CoachPlanner.calculateRecentMetrics(sessions);

  // Scale the plan
  const scaledPlan = window.CoachPlanner.scalePlanToDistance(
    existingRecommendation.session_plan,
    newDistanceM,
    metrics
  );

  // Re-validate
  scaledPlan.validation = window.CoachPlanner.validatePlan(scaledPlan, profile, metrics);

  // Request new polish for scaled session
  const polish = await requestPolish(scaledPlan, profile, sessions.slice(0, 14));

  return {
    session_plan: scaledPlan,
    polish: polish,
    generated_at: new Date().toISOString(),
    scaled_to: newDistanceM
  };
}

/**
 * Format complete recommendation for storage
 * Converts to the legacy format expected by the rest of the app
 */
function formatForStorage(recommendation) {
  const { session_plan, polish } = recommendation;
  const session = session_plan.session;

  // Convert structure blocks to flat array of strings for legacy format
  const structureStrings = [];
  session.structure.forEach(block => {
    block.items.forEach(item => {
      structureStrings.push(item.text);
    });
  });

  return {
    tomorrow_session: {
      type: session.type,
      duration_min: session.estimated_duration_min,
      distance_m: session.total_distance_m,
      structure: structureStrings,
      intensity: session.intensity,
      technique_focus: polish.technique_focus || []
    },
    why_this: polish.why_this || '',
    flags: polish.flags || [],
    event_prep_tip: polish.event_prep_tip || '',
    // New fields for provenance
    template_info: session_plan.derived_from_template,
    validation: session_plan.validation,
    phase: session_plan.phase,
    days_to_event: session_plan.days_to_event,
    readiness: session_plan.readiness,
    // Preserve structured data
    structured_session: session_plan
  };
}

// Export for use in other modules
window.CoachService = {
  requestPolish,
  generateFallbackPolish,
  getCoachingRecommendation,
  adaptRecommendation,
  scaleRecommendation,
  formatForStorage
};
