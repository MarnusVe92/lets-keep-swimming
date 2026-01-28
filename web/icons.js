/**
 * Lightweight SVG Icons
 * Clean, outline-style icons for a modern UI
 */

const Icons = {
  // Navigation & UI
  swimmer: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M4 22c2-2.5 4-4 6-4 1.5 0 2.5.5 4 1.5 1.5 1 2.5 1.5 4 1.5 2 0 4-1.5 6-4"/><path d="M4 17c2-2.5 4-4 6-4 1.5 0 2.5.5 4 1.5 1.5 1 2.5 1.5 4 1.5 2 0 4-1.5 6-4"/><path d="M7 14l3.5-3.5L13 13l4-6"/></svg>`,

  dashboard: `<svg class="icon icon-outline" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,

  profile: `<svg class="icon icon-outline" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>`,

  sessions: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M4 22c2-2.5 4-4 6-4 1.5 0 2.5.5 4 1.5 1.5 1 2.5 1.5 4 1.5 2 0 4-1.5 6-4"/><path d="M4 17c2-2.5 4-4 6-4 1.5 0 2.5.5 4 1.5 1.5 1 2.5 1.5 4 1.5 2 0 4-1.5 6-4"/></svg>`,

  coach: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M12 3c-1.5 0-2.5 1-2.5 2.5S10.5 8 12 8s2.5-1 2.5-2.5S13.5 3 12 3z"/><path d="M19 8h-1a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z"/><path d="M5 8H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z"/><path d="M12 10v4"/><path d="M8 16h8v4H8z"/></svg>`,

  data: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,

  // Stats
  ruler: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 4v16"/><path d="M12 4h4"/><path d="M12 8h3"/><path d="M12 12h4"/><path d="M12 16h3"/><path d="M12 20h4"/></svg>`,

  chart: `<svg class="icon icon-outline" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,

  strength: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M6.5 6.5a2.5 2.5 0 0 1 5 0v11a2.5 2.5 0 0 1-5 0v-11z"/><path d="M12.5 6.5a2.5 2.5 0 0 1 5 0v11a2.5 2.5 0 0 1-5 0v-11z"/><line x1="4" y1="12" x2="6.5" y2="12"/><line x1="17.5" y1="12" x2="20" y2="12"/></svg>`,

  fire: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M12 22c4.97 0 9-3.58 9-8 0-2.5-.5-4-2-6-1-1.5-2-3-2-5 0 0-1.5 1-2 3-.5 2-2 3-4 3s-4-1.5-4-3.5c0-1.5.5-3 1-4C6 4 4 7 4 10c0 6 4 12 8 12z"/></svg>`,

  // Actions
  plus: `<svg class="icon icon-outline" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,

  calendar: `<svg class="icon icon-outline" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,

  clock: `<svg class="icon icon-outline" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,

  target: `<svg class="icon icon-outline" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,

  edit: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,

  trash: `<svg class="icon icon-outline" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,

  copy: `<svg class="icon icon-outline" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,

  download: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,

  upload: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,

  refresh: `<svg class="icon icon-outline" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,

  check: `<svg class="icon icon-outline" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,

  // Session types
  pool: `<svg class="icon icon-outline" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 14h20"/><path d="M6 6v12"/><path d="M10 6v12"/><path d="M14 6v12"/><path d="M18 6v12"/></svg>`,

  waves: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M2 12c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/><path d="M2 6c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/><path d="M2 18c2-2 4-3 6-3s4 1 6 3 4 3 6 3 4-1 6-3"/></svg>`,

  // Misc
  eye: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,

  settings: `<svg class="icon icon-outline" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,

  alert: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,

  lightbulb: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg>`,

  message: `<svg class="icon icon-outline" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,

  storage: `<svg class="icon icon-outline" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
};

// Helper function to get icon HTML
function getIcon(name) {
  return Icons[name] || '';
}

// Make available globally
window.Icons = Icons;
window.getIcon = getIcon;
