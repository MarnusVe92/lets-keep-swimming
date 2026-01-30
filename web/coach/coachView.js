/**
 * Let's Keep Swimming - Coach View
 *
 * Renders the coaching recommendation UI using the structured model.
 * Displays template provenance, validation results, and workout structure.
 */

/**
 * Render the complete coaching recommendation
 * @param {Object} recommendation - The combined session plan and polish
 * @param {HTMLElement} container - Container element for the display
 */
function renderCoachingRecommendation(recommendation, container) {
  const { session_plan, polish } = recommendation;
  const session = session_plan.session;

  // Clear container
  container.innerHTML = '';

  // Build HTML
  let html = '';

  // Session type badge and summary
  html += renderSessionHeader(session, session_plan.phase, session_plan.days_to_event);

  // Provenance info
  html += renderProvenance(session_plan.derived_from_template);

  // Session details (if not rest)
  if (session.type !== 'rest') {
    html += renderSessionDetails(session);
    html += renderStructure(session.structure);

    // Open water addons
    if (session.open_water_addons && session.open_water_addons.length > 0) {
      html += renderOpenWaterAddons(session.open_water_addons);
    }

    // Technique focus
    if (polish.technique_focus && polish.technique_focus.length > 0) {
      html += renderTechniqueFocus(polish.technique_focus);
    }
  }

  // Why this session
  if (polish.why_this) {
    html += renderWhyThis(polish.why_this);
  }

  // Validation warnings
  if (session_plan.validation && session_plan.validation.warnings.length > 0) {
    html += renderValidationWarnings(session_plan.validation);
  }

  // Flags/warnings
  if (polish.flags && polish.flags.length > 0) {
    html += renderFlags(polish.flags);
  }

  // Event prep tip
  if (polish.event_prep_tip) {
    html += renderEventPrepTip(polish.event_prep_tip);
  }

  // Safety note
  if (session.safety_note) {
    html += renderSafetyNote(session.safety_note);
  }

  container.innerHTML = html;
}

/**
 * Render session header with type badge and summary
 */
function renderSessionHeader(session, phase, daysToEvent) {
  const typeLabel = session.type === 'rest' ? 'REST DAY' : session.type.replace('_', ' ').toUpperCase();
  const typeClass = session.type;

  let phaseBadge = '';
  if (phase === 'TAPER') {
    phaseBadge = '<span class="phase-badge taper">TAPER PHASE</span>';
  } else if (phase === 'SHARPEN') {
    phaseBadge = '<span class="phase-badge sharpen">SHARPEN PHASE</span>';
  } else {
    phaseBadge = '<span class="phase-badge build">BUILD PHASE</span>';
  }

  return `
    <div class="coach-recommendation">
      <div class="coach-header-row">
        <span class="coach-session-type ${typeClass}">${typeLabel}</span>
        ${phaseBadge}
      </div>
      <div class="coach-days-to-event">
        <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 16px; height: 16px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>${daysToEvent} days to event</span>
      </div>
  `;
}

/**
 * Render template provenance info
 */
function renderProvenance(templateInfo) {
  if (!templateInfo) return '';

  return `
    <div class="coach-provenance">
      <span class="provenance-label">Based on:</span>
      <span class="provenance-source">${templateInfo.source} program</span>
      <span class="provenance-name">${templateInfo.template_name}</span>
      ${templateInfo.scaling_notes ? `<span class="provenance-notes">${templateInfo.scaling_notes}</span>` : ''}
    </div>
  `;
}

/**
 * Render session details (duration, distance, intensity)
 */
function renderSessionDetails(session) {
  const distanceDisplay = session.total_distance_m
    ? `<strong>${session.total_distance_m}</strong>m`
    : '<em>Time-based</em>';

  return `
    <div class="coach-details-grid">
      <div class="coach-detail">
        <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 18px; height: 18px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span><strong>${session.estimated_duration_min}</strong> min</span>
      </div>
      <div class="coach-detail">
        <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 4v16"/></svg>
        <span>${distanceDisplay}</span>
      </div>
      <div class="coach-detail">
        <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
        <span>Intensity: <strong class="intensity-${session.intensity}">${session.intensity}</strong></span>
      </div>
    </div>
  `;
}

/**
 * Render workout structure with blocks
 */
function renderStructure(structure) {
  if (!structure || structure.length === 0) return '';

  let html = '<div class="coach-structure">';

  structure.forEach((block, blockIndex) => {
    html += `
      <div class="structure-block">
        <h4 class="structure-block-label">${block.label}</h4>
        <div class="workout-checklist">
    `;

    block.items.forEach((item, itemIndex) => {
      const itemId = `workout-item-${blockIndex}-${itemIndex}`;
      const distanceNote = item.distance_m ? `<span class="item-distance">${item.distance_m}m</span>` : '';

      html += `
        <label class="workout-item" for="${itemId}">
          <input type="checkbox" class="workout-checkbox" id="${itemId}" data-block="${blockIndex}" data-item="${itemIndex}">
          <span class="workout-text">${item.text}</span>
          ${distanceNote}
        </label>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

/**
 * Render open water specific addons
 */
function renderOpenWaterAddons(addons) {
  return `
    <div class="coach-open-water-addons">
      <h4>
        <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 16px; height: 16px;"><path d="M2 12c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/><path d="M2 6c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/><path d="M2 18c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/></svg>
        Open Water Focus
      </h4>
      <ul>
        ${addons.map(addon => `<li>${addon}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Render technique focus tags
 */
function renderTechniqueFocus(techniques) {
  return `
    <div class="coach-technique">
      ${techniques.map(t => `<span class="coach-technique-tag">${t}</span>`).join('')}
    </div>
    </div>
  `;  // Close coach-recommendation div
}

/**
 * Render "Why This Session" explanation
 */
function renderWhyThis(whyThis) {
  return `
    <div class="coach-why">
      <h4>Why This Session?</h4>
      <p>${whyThis}</p>
    </div>
  `;
}

/**
 * Render validation warnings
 */
function renderValidationWarnings(validation) {
  if (validation.distance_check_passed && validation.guardrails_check_passed) {
    return '';
  }

  return `
    <div class="coach-validation-warnings">
      <h4>
        <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 16px; height: 16px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Validation Notes
      </h4>
      <ul>
        ${validation.warnings.map(w => `<li>${w}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Render flags/warnings from polish
 */
function renderFlags(flags) {
  return `
    <div class="coach-flags">
      <h4>Important Notes</h4>
      <ul>
        ${flags.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Render event prep tip
 */
function renderEventPrepTip(tip) {
  return `
    <div class="coach-tip">
      <h4>Event Prep Tip</h4>
      <p>${tip}</p>
    </div>
  `;
}

/**
 * Render safety note for open water
 */
function renderSafetyNote(note) {
  return `
    <div class="coach-safety">
      <h4>
        <svg class="icon icon-outline" viewBox="0 0 24 24" style="width: 16px; height: 16px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Safety Reminder
      </h4>
      <p>${note}</p>
    </div>
  `;
}

/**
 * Format recommendation as plain text for clipboard
 */
function formatAsText(recommendation) {
  const { session_plan, polish } = recommendation;
  const session = session_plan.session;

  let text = '';

  // Header
  text += `TOMORROW'S SESSION: ${session.type.replace('_', ' ').toUpperCase()}\n`;
  text += `Phase: ${session_plan.phase} | ${session_plan.days_to_event} days to event\n`;
  text += `Template: ${session_plan.derived_from_template.template_name}\n\n`;

  // Details
  if (session.type !== 'rest') {
    text += `Duration: ${session.estimated_duration_min} minutes\n`;
    if (session.total_distance_m) {
      text += `Distance: ${session.total_distance_m}m\n`;
    }
    text += `Intensity: ${session.intensity}\n\n`;

    // Structure
    text += `WORKOUT STRUCTURE:\n`;
    session.structure.forEach(block => {
      text += `\n${block.label.toUpperCase()}:\n`;
      block.items.forEach(item => {
        text += `  - ${item.text}`;
        if (item.distance_m) text += ` (${item.distance_m}m)`;
        text += '\n';
      });
    });

    // Open water addons
    if (session.open_water_addons && session.open_water_addons.length > 0) {
      text += `\nOPEN WATER FOCUS:\n`;
      session.open_water_addons.forEach(addon => {
        text += `  - ${addon}\n`;
      });
    }

    // Technique focus
    if (polish.technique_focus && polish.technique_focus.length > 0) {
      text += `\nTECHNIQUE FOCUS:\n`;
      polish.technique_focus.forEach(t => {
        text += `  - ${t}\n`;
      });
    }
  }

  // Why this
  if (polish.why_this) {
    text += `\nWHY THIS SESSION?\n${polish.why_this}\n`;
  }

  // Flags
  if (polish.flags && polish.flags.length > 0) {
    text += `\nIMPORTANT NOTES:\n`;
    polish.flags.forEach(f => {
      text += `  - ${f}\n`;
    });
  }

  // Event prep tip
  if (polish.event_prep_tip) {
    text += `\nEVENT PREP TIP:\n${polish.event_prep_tip}\n`;
  }

  // Safety
  if (session.safety_note) {
    text += `\nSAFETY: ${session.safety_note}\n`;
  }

  return text;
}

/**
 * Get completed workout items from UI
 */
function getCompletedItems() {
  const checkboxes = document.querySelectorAll('.workout-checkbox:checked');
  const completed = [];

  checkboxes.forEach(cb => {
    const blockIdx = parseInt(cb.dataset.block);
    const itemIdx = parseInt(cb.dataset.item);
    completed.push({ block: blockIdx, item: itemIdx });
  });

  return completed;
}

/**
 * Calculate completion percentage
 */
function getCompletionPercentage() {
  const total = document.querySelectorAll('.workout-checkbox').length;
  const completed = document.querySelectorAll('.workout-checkbox:checked').length;

  if (total === 0) return 100;
  return Math.round((completed / total) * 100);
}

// Export for use in other modules
window.CoachView = {
  renderCoachingRecommendation,
  formatAsText,
  getCompletedItems,
  getCompletionPercentage
};
