/**
 * Let's Keep Swimming - Deterministic Planner
 *
 * This module handles all workout planning logic:
 * - Phase determination (BUILD, SHARPEN, TAPER)
 * - Training readiness assessment
 * - Template selection
 * - Scaling and guardrails
 * - Pool <-> Open Water adaptation
 * - Validation
 */

// Fatigue/pain keywords to detect in session notes
const FATIGUE_KEYWORDS = [
  'tired', 'fatigue', 'fatigued', 'exhausted', 'sore', 'pain', 'painful',
  'hurt', 'injury', 'injured', 'sick', 'illness', 'ill', 'unwell',
  'struggled', 'heavy', 'sluggish', 'weak', 'drained', 'burned out',
  'stiff', 'ache', 'aching', 'cramp', 'cramping'
];

/**
 * Determine training phase based on days until event
 * @param {string} eventDate - ISO date string
 * @param {string} today - ISO date string
 * @returns {string} 'BUILD' | 'SHARPEN' | 'TAPER'
 */
function determinePhase(eventDate, today) {
  const event = new Date(eventDate);
  const now = new Date(today);
  const daysToEvent = Math.ceil((event - now) / (1000 * 60 * 60 * 24));

  if (daysToEvent <= 3) {
    return 'TAPER';
  } else if (daysToEvent <= 10) {
    return 'SHARPEN';
  } else {
    return 'BUILD';
  }
}

/**
 * Get days until event
 */
function getDaysToEvent(eventDate, today) {
  const event = new Date(eventDate);
  const now = new Date(today);
  return Math.ceil((event - now) / (1000 * 60 * 60 * 24));
}

/**
 * Assess training readiness from recent sessions
 * @param {Array} recentSessions - Sessions from last 14 days
 * @returns {Object} { status: 'READY'|'FATIGUED'|'NEEDS_REST', reasons: [] }
 */
function assessReadiness(recentSessions) {
  const reasons = [];
  let status = 'READY';

  if (!recentSessions || recentSessions.length === 0) {
    return { status: 'READY', reasons: ['No recent sessions - starting fresh'] };
  }

  // Sort by date descending
  const sorted = [...recentSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastSession = sorted[0];

  // Check if last session had high RPE (>= 8)
  if (lastSession && lastSession.rpe >= 8) {
    reasons.push(`Last session RPE was ${lastSession.rpe}/10 (high)`);
    status = 'FATIGUED';
  }

  // Check for fatigue keywords in notes
  if (lastSession && lastSession.notes) {
    const notesLower = lastSession.notes.toLowerCase();
    const foundKeywords = FATIGUE_KEYWORDS.filter(kw => notesLower.includes(kw));
    if (foundKeywords.length > 0) {
      reasons.push(`Notes mention: ${foundKeywords.join(', ')}`);
      status = 'NEEDS_REST';
    }
  }

  // Check for consecutive hard days
  const last3Days = getSessionsInLastNDays(sorted, 3);
  const hardSessionsIn3Days = last3Days.filter(s => s.rpe >= 7).length;
  if (hardSessionsIn3Days >= 2) {
    reasons.push(`${hardSessionsIn3Days} hard sessions in last 3 days`);
    if (status === 'READY') status = 'FATIGUED';
  }

  // Check for too many hard sessions in 7 days
  const last7Days = getSessionsInLastNDays(sorted, 7);
  const hardSessionsIn7Days = last7Days.filter(s => s.rpe >= 7).length;
  if (hardSessionsIn7Days > 2) {
    reasons.push(`${hardSessionsIn7Days} hard sessions in last 7 days (max recommended: 2)`);
    if (status === 'READY') status = 'FATIGUED';
  }

  // Check if trained yesterday with high intensity
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdaySession = sorted.find(s => s.date === yesterdayStr);
  if (yesterdaySession && yesterdaySession.rpe >= 7) {
    reasons.push('Hard session yesterday');
    if (status === 'READY') status = 'FATIGUED';
  }

  if (reasons.length === 0) {
    reasons.push('Training load looks balanced');
  }

  return { status, reasons };
}

/**
 * Get sessions from the last N days
 */
function getSessionsInLastNDays(sortedSessions, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return sortedSessions.filter(s => new Date(s.date) >= cutoff);
}

/**
 * Calculate recent training metrics
 */
function calculateRecentMetrics(sessions) {
  if (!sessions || sessions.length === 0) {
    return {
      maxRecentDistance: 0,
      avgWeeklyVolume: 0,
      avgRPE: 0,
      avgPacePerKm: null, // minutes per km
      sessionCount7Days: 0,
      sessionCount14Days: 0
    };
  }

  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const last7Days = getSessionsInLastNDays(sorted, 7);
  const last14Days = getSessionsInLastNDays(sorted, 14);

  const maxRecentDistance = Math.max(...sessions.map(s => s.distance_m || 0), 0);
  const totalVolume14Days = last14Days.reduce((sum, s) => sum + (s.distance_m || 0), 0);
  const avgWeeklyVolume = totalVolume14Days / 2;
  const avgRPE = last7Days.length > 0
    ? last7Days.reduce((sum, s) => sum + (s.rpe || 5), 0) / last7Days.length
    : 5;

  // Calculate average pace from sessions that have both distance and time
  const sessionsWithPace = sessions.filter(s => s.distance_m > 0 && s.time_min > 0);
  let avgPacePerKm = null;
  if (sessionsWithPace.length > 0) {
    const paces = sessionsWithPace.map(s => s.time_min / (s.distance_m / 1000));
    avgPacePerKm = paces.reduce((a, b) => a + b, 0) / paces.length;
  }

  return {
    maxRecentDistance,
    avgWeeklyVolume,
    avgRPE,
    avgPacePerKm,
    sessionCount7Days: last7Days.length,
    sessionCount14Days: last14Days.length
  };
}

/**
 * Select appropriate template based on phase, readiness, and profile
 */
function selectTemplate(phase, readiness, profile, metrics, preferredType) {
  const templates = window.CoachTemplates.getTemplatesByPhase(phase);

  // If needs rest or fatigued, prefer easy/recovery
  if (readiness.status === 'NEEDS_REST') {
    return window.CoachTemplates.getTemplateById('rest-day');
  }

  if (readiness.status === 'FATIGUED') {
    const easyTemplates = templates.filter(t => t.intensity === 'easy' || t.tags.includes('recovery'));
    if (easyTemplates.length > 0) {
      return selectByVariety(easyTemplates, metrics);
    }
    return window.CoachTemplates.getTemplateById('recovery-easy-swim');
  }

  // Filter by appropriate distance range (don't jump too much)
  let appropriateTemplates = templates.filter(t => {
    if (t.base_distance_m === 0) return false; // Skip rest template
    const maxAllowed = Math.max(metrics.maxRecentDistance * 1.15, 1400);
    return t.base_distance_m <= maxAllowed;
  });

  // If no templates fit, use the safest ones
  if (appropriateTemplates.length === 0) {
    appropriateTemplates = templates.filter(t =>
      t.base_distance_m <= 1400 && t.base_distance_m > 0
    );
  }

  // For SHARPEN phase, prefer race-specific templates
  if (phase === 'SHARPEN') {
    const raceSpecific = appropriateTemplates.filter(t => t.tags.includes('race_specific'));
    if (raceSpecific.length > 0) {
      appropriateTemplates = raceSpecific;
    }
  }

  // For TAPER phase, ensure reduced volume
  if (phase === 'TAPER') {
    const taperTemplates = appropriateTemplates.filter(t =>
      t.tags.includes('taper') || t.base_distance_m <= 1200
    );
    if (taperTemplates.length > 0) {
      appropriateTemplates = taperTemplates;
    }
  }

  // Avoid hard if did hard yesterday (assessed in readiness, but double-check)
  if (readiness.reasons.some(r => r.includes('yesterday'))) {
    appropriateTemplates = appropriateTemplates.filter(t => t.intensity !== 'hard');
  }

  return selectByVariety(appropriateTemplates, metrics);
}

/**
 * Select template with some variety (not always the same one)
 */
function selectByVariety(templates, metrics) {
  if (templates.length === 0) return null;
  if (templates.length === 1) return templates[0];

  // Use a simple pseudo-random based on today's date
  const today = new Date().toISOString().split('T')[0];
  const hash = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % templates.length;

  return templates[index];
}

/**
 * Scale template to fit user's fitness level and weekly target
 */
function scaleTemplate(template, profile, metrics) {
  if (!template || template.id === 'rest-day') {
    return {
      template,
      scaled_structure: [],
      total_distance_m: 0,
      estimated_duration_min: 0,
      scaling_notes: 'Rest day - no scaling needed'
    };
  }

  const scalingNotes = [];
  let scaleFactor = 1.0;

  // Determine scale factor based on user's fitness
  const userWeeklyTarget = profile.weeklyVolumeEstimate_m || 5000;
  const templateWeeklyEquivalent = template.base_distance_m * 3; // Assume 3 sessions/week

  if (templateWeeklyEquivalent > userWeeklyTarget * 1.2) {
    scaleFactor = (userWeeklyTarget / templateWeeklyEquivalent) * 0.9;
    scalingNotes.push(`Scaled down to match weekly volume target`);
  }

  // Don't exceed max recent distance by more than 15%
  const maxAllowed = Math.max(metrics.maxRecentDistance * 1.15, 1400);
  if (template.base_distance_m * scaleFactor > maxAllowed) {
    scaleFactor = maxAllowed / template.base_distance_m;
    scalingNotes.push(`Capped to avoid volume jump (max: ${Math.round(maxAllowed)}m)`);
  }

  // Don't scale below 70%
  if (scaleFactor < 0.7) {
    scaleFactor = 0.7;
    scalingNotes.push('Minimum scale applied (70%)');
  }

  // Scale the structure
  const scaled_structure = template.structure.map(block => {
    const scaledItems = block.items.map(item => {
      const scaledItem = { ...item };

      if (item.distance_m) {
        scaledItem.distance_m = roundToNearest(item.distance_m * scaleFactor, 50);
      }

      if (item.reps && item.per_rep_m) {
        // Try to keep reps, scale distance per rep
        const scaledPerRep = roundToNearest(item.per_rep_m * scaleFactor, 25);
        // Adjust reps if per_rep gets too small
        if (scaledPerRep < item.per_rep_m * 0.75) {
          scaledItem.reps = Math.max(Math.round(item.reps * scaleFactor), 2);
          scaledItem.per_rep_m = item.per_rep_m;
          scaledItem.distance_m = scaledItem.reps * scaledItem.per_rep_m;
        } else {
          scaledItem.per_rep_m = scaledPerRep;
          scaledItem.distance_m = item.reps * scaledPerRep;
        }
        scaledItem.text = updateRepText(item.text, scaledItem.reps, scaledItem.per_rep_m);
      } else if (item.distance_m) {
        scaledItem.text = updateDistanceText(item.text, scaledItem.distance_m);
      }

      return scaledItem;
    });

    return {
      label: block.label,
      items: scaledItems
    };
  });

  // Calculate totals
  let total_distance_m = 0;
  scaled_structure.forEach(block => {
    block.items.forEach(item => {
      total_distance_m += item.distance_m || 0;
    });
  });

  // Estimate duration based on pace
  let estimated_duration_min = template.base_duration_min_est || 45;
  if (metrics.avgPacePerKm) {
    estimated_duration_min = Math.round((total_distance_m / 1000) * metrics.avgPacePerKm * 1.1); // 10% buffer for rest
  } else {
    estimated_duration_min = Math.round((total_distance_m / template.base_distance_m) * template.base_duration_min_est);
  }

  if (scalingNotes.length === 0) {
    scalingNotes.push('No scaling needed - template fits well');
  }

  return {
    template,
    scaled_structure,
    total_distance_m,
    estimated_duration_min,
    scaling_notes: scalingNotes.join('; ')
  };
}

/**
 * Round to nearest increment
 */
function roundToNearest(value, increment) {
  return Math.round(value / increment) * increment;
}

/**
 * Update text to reflect new rep/distance values
 */
function updateRepText(text, newReps, newPerRep) {
  // Match patterns like "8x100m" or "4 x 50m"
  return text.replace(/(\d+)\s*x\s*(\d+)m/i, `${newReps}x${newPerRep}m`);
}

function updateDistanceText(text, newDistance) {
  // Match patterns like "300m" or "1000m"
  return text.replace(/(\d+)m/i, `${newDistance}m`);
}

/**
 * Adapt a pool session for open water
 */
function adaptPoolToOpenWater(scaledStructure, metrics) {
  const adaptedStructure = [];
  const openWaterAddons = [
    'Sight every 6-10 strokes on moderate/hard efforts',
    'Practice 3 buoy turns if markers available'
  ];
  const safetyNote = 'Always swim with a buddy or in supervised areas. Be aware of water temperature and currents.';

  // Default pace assumptions if no data
  const pace100m = metrics.avgPacePerKm ? metrics.avgPacePerKm / 10 : 2; // minutes per 100m

  scaledStructure.forEach(block => {
    const adaptedItems = block.items.map(item => {
      const adaptedItem = { ...item };

      if (item.reps && item.per_rep_m && item.rest_sec) {
        // Convert repeats with rest to time-based efforts
        const effortTime = Math.round((item.per_rep_m / 100) * pace100m);
        const restDesc = item.rest_sec >= 30 ? `${Math.round(item.rest_sec / 10) * 10}s easy float` : '20s easy float';

        adaptedItem.text = `${item.reps}x ${effortTime} min effort (target ~${item.per_rep_m}m), ${restDesc} between`;
        adaptedItem.time_based = true;
        adaptedItem.effort_min = effortTime;
      } else if (item.distance_m >= 400 && !item.reps) {
        // Long continuous - add sighting note
        adaptedItem.text = item.text.replace(/continuous/i, 'continuous with sighting every 8-10 strokes');
        if (!adaptedItem.text.includes('sighting')) {
          adaptedItem.text += ', sight every 8-10 strokes';
        }
      }

      return adaptedItem;
    });

    adaptedStructure.push({
      label: block.label,
      items: adaptedItems
    });
  });

  return {
    adapted_structure: adaptedStructure,
    open_water_addons: openWaterAddons,
    safety_note: safetyNote
  };
}

/**
 * Adapt an open water session for pool (if needed)
 */
function adaptOpenWaterToPool(scaledStructure) {
  const adaptedStructure = scaledStructure.map(block => {
    const adaptedItems = block.items.map(item => {
      const adaptedItem = { ...item };

      // Convert continuous long distances to broken sets if very long
      if (item.distance_m >= 800 && !item.reps) {
        const segments = Math.ceil(item.distance_m / 400);
        adaptedItem.reps = segments;
        adaptedItem.per_rep_m = Math.round(item.distance_m / segments / 50) * 50;
        adaptedItem.distance_m = adaptedItem.reps * adaptedItem.per_rep_m;
        adaptedItem.rest_sec = 15;
        adaptedItem.text = `${adaptedItem.reps}x${adaptedItem.per_rep_m}m steady, 15s rest (broken continuous)`;
      }

      // Remove sighting references for pool
      adaptedItem.text = adaptedItem.text
        .replace(/,?\s*sight(ing)?\s*(every\s*\d+-?\d*\s*strokes)?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      return adaptedItem;
    });

    return {
      label: block.label,
      items: adaptedItems
    };
  });

  return { adapted_structure: adaptedStructure };
}

/**
 * Validate the session plan
 */
function validatePlan(plan, profile, metrics) {
  const warnings = [];
  let distance_check_passed = true;
  let guardrails_check_passed = true;

  if (plan.session.type === 'rest') {
    return {
      distance_check_passed: true,
      guardrails_check_passed: true,
      warnings: []
    };
  }

  // Check distance sum
  let calculatedDistance = 0;
  plan.session.structure.forEach(block => {
    block.items.forEach(item => {
      calculatedDistance += item.distance_m || 0;
    });
  });

  if (plan.session.total_distance_m !== null) {
    if (Math.abs(calculatedDistance - plan.session.total_distance_m) > 50) {
      warnings.push(`Distance mismatch: structure sums to ${calculatedDistance}m, expected ${plan.session.total_distance_m}m`);
      distance_check_passed = false;
    }
  }

  // Check guardrails
  const maxAllowed = Math.max((metrics.maxRecentDistance || 1400) * 1.15, 1400);
  if (plan.session.total_distance_m > maxAllowed) {
    warnings.push(`Session distance (${plan.session.total_distance_m}m) exceeds safe progression (${Math.round(maxAllowed)}m)`);
    guardrails_check_passed = false;
  }

  // Check weekly volume projection
  const weeklyTarget = profile.weeklyVolumeEstimate_m || 5000;
  const weeklyMax = weeklyTarget * 1.2;
  const sessionsPerWeek = profile.sessionsPerWeek || 3;
  const projectedWeekly = plan.session.total_distance_m * sessionsPerWeek;

  if (projectedWeekly > weeklyMax) {
    warnings.push(`Projected weekly volume high. Consider reducing if accumulated fatigue.`);
  }

  return {
    distance_check_passed,
    guardrails_check_passed,
    warnings
  };
}

/**
 * Main function: Generate a complete session plan
 */
function generateSessionPlan(profile, recentSessions, targetType = null) {
  const today = new Date().toISOString().split('T')[0];

  // 1. Determine phase
  const phase = determinePhase(profile.eventDate, today);
  const daysToEvent = getDaysToEvent(profile.eventDate, today);

  // 2. Assess readiness
  const readiness = assessReadiness(recentSessions);

  // 3. Calculate metrics
  const metrics = calculateRecentMetrics(recentSessions);

  // 4. Determine preferred type (pool or open water)
  const preferredType = targetType || (profile.access?.openWater ? 'open_water' : 'pool');

  // 5. Select template
  const template = selectTemplate(phase, readiness, profile, metrics, preferredType);

  if (!template) {
    // Fallback to recovery
    return generateRestPlan(phase, readiness, daysToEvent);
  }

  // 6. Scale template
  const scaled = scaleTemplate(template, profile, metrics);

  // 7. Adapt for water type if needed
  let finalStructure = scaled.scaled_structure;
  let openWaterAddons = [];
  let safetyNote = null;

  if (preferredType === 'open_water' && template.id !== 'rest-day') {
    const adaptation = adaptPoolToOpenWater(scaled.scaled_structure, metrics);
    finalStructure = adaptation.adapted_structure;
    openWaterAddons = adaptation.open_water_addons;
    safetyNote = adaptation.safety_note;
  }

  // 8. Build session plan
  const sessionPlan = {
    session: {
      type: template.id === 'rest-day' ? 'rest' : preferredType,
      total_distance_m: scaled.total_distance_m || null,
      estimated_duration_min: scaled.estimated_duration_min,
      intensity: template.intensity === 'rest' ? 'rest' : template.intensity,
      structure: finalStructure,
      open_water_addons: openWaterAddons,
      safety_note: safetyNote
    },
    derived_from_template: {
      source: template.source,
      template_id: template.id,
      template_name: template.name,
      scaling_notes: scaled.scaling_notes
    },
    phase,
    days_to_event: daysToEvent,
    readiness
  };

  // 9. Validate
  sessionPlan.validation = validatePlan(sessionPlan, profile, metrics);

  return sessionPlan;
}

/**
 * Generate a rest plan
 */
function generateRestPlan(phase, readiness, daysToEvent) {
  const template = window.CoachTemplates.getTemplateById('rest-day');

  return {
    session: {
      type: 'rest',
      total_distance_m: 0,
      estimated_duration_min: 0,
      intensity: 'rest',
      structure: [],
      open_water_addons: [],
      safety_note: null
    },
    derived_from_template: {
      source: template.source,
      template_id: template.id,
      template_name: template.name,
      scaling_notes: 'Rest day recommended based on training load'
    },
    phase,
    days_to_event: daysToEvent,
    readiness,
    validation: {
      distance_check_passed: true,
      guardrails_check_passed: true,
      warnings: []
    }
  };
}

/**
 * Re-adapt an existing plan for a different water type
 */
function adaptPlanToType(existingPlan, newType, metrics) {
  if (existingPlan.session.type === 'rest') {
    return existingPlan;
  }

  const template = window.CoachTemplates.getTemplateById(existingPlan.derived_from_template.template_id);
  if (!template) {
    return existingPlan;
  }

  // Get original scaled structure (before any adaptation)
  const profile = { weeklyVolumeEstimate_m: 5000 }; // Default for re-scaling
  const scaled = scaleTemplate(template, profile, metrics);

  let finalStructure = scaled.scaled_structure;
  let openWaterAddons = [];
  let safetyNote = null;

  if (newType === 'open_water') {
    const adaptation = adaptPoolToOpenWater(scaled.scaled_structure, metrics);
    finalStructure = adaptation.adapted_structure;
    openWaterAddons = adaptation.open_water_addons;
    safetyNote = adaptation.safety_note;
  } else if (newType === 'pool') {
    const adaptation = adaptOpenWaterToPool(scaled.scaled_structure);
    finalStructure = adaptation.adapted_structure;
  }

  return {
    ...existingPlan,
    session: {
      ...existingPlan.session,
      type: newType,
      structure: finalStructure,
      open_water_addons: openWaterAddons,
      safety_note: safetyNote
    },
    derived_from_template: {
      ...existingPlan.derived_from_template,
      scaling_notes: existingPlan.derived_from_template.scaling_notes + ` (adapted to ${newType.replace('_', ' ')})`
    }
  };
}

/**
 * Scale an existing plan to a new distance
 */
function scalePlanToDistance(existingPlan, newDistanceM, metrics) {
  if (existingPlan.session.type === 'rest') {
    return existingPlan;
  }

  const originalDistance = existingPlan.session.total_distance_m;
  if (!originalDistance || originalDistance === 0) {
    return existingPlan;
  }

  const scaleFactor = newDistanceM / originalDistance;

  // Scale structure
  const scaledStructure = existingPlan.session.structure.map(block => {
    const scaledItems = block.items.map(item => {
      const scaledItem = { ...item };

      if (item.distance_m) {
        scaledItem.distance_m = roundToNearest(item.distance_m * scaleFactor, 50);
      }

      if (item.reps && item.per_rep_m) {
        const scaledPerRep = roundToNearest(item.per_rep_m * scaleFactor, 25);
        if (scaledPerRep < 50) {
          scaledItem.reps = Math.max(Math.round(item.reps * scaleFactor), 2);
          scaledItem.per_rep_m = item.per_rep_m;
        } else {
          scaledItem.per_rep_m = scaledPerRep;
        }
        scaledItem.distance_m = scaledItem.reps * scaledItem.per_rep_m;
        scaledItem.text = updateRepText(item.text, scaledItem.reps, scaledItem.per_rep_m);
      } else if (item.distance_m) {
        scaledItem.text = updateDistanceText(item.text, scaledItem.distance_m);
      }

      return scaledItem;
    });

    return { label: block.label, items: scaledItems };
  });

  // Recalculate total distance
  let totalDistance = 0;
  scaledStructure.forEach(block => {
    block.items.forEach(item => {
      totalDistance += item.distance_m || 0;
    });
  });

  // Estimate new duration
  const durationScale = totalDistance / originalDistance;
  const newDuration = Math.round(existingPlan.session.estimated_duration_min * durationScale);

  return {
    ...existingPlan,
    session: {
      ...existingPlan.session,
      structure: scaledStructure,
      total_distance_m: totalDistance,
      estimated_duration_min: newDuration
    },
    derived_from_template: {
      ...existingPlan.derived_from_template,
      scaling_notes: existingPlan.derived_from_template.scaling_notes + ` (scaled to ${totalDistance}m)`
    }
  };
}

// Export for use in other modules
window.CoachPlanner = {
  determinePhase,
  getDaysToEvent,
  assessReadiness,
  calculateRecentMetrics,
  selectTemplate,
  scaleTemplate,
  adaptPoolToOpenWater,
  adaptOpenWaterToPool,
  validatePlan,
  generateSessionPlan,
  generateRestPlan,
  adaptPlanToType,
  scalePlanToDistance
};
