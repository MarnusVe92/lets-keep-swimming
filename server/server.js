/**
 * Let's Keep Swimming - Server
 *
 * This server provides AI coaching recommendations for swim training.
 * It can run in two modes:
 * - MOCK_MODE: Returns dummy data (no API key needed, free)
 * - LIVE MODE: Calls Claude AI for real coaching (requires API key, ~$0.01 per request)
 *
 * NEW: Polish-only mode where LLM only provides explanations for pre-determined workouts.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const MOCK_MODE = process.env.MOCK_MODE === 'true';
const MODEL = process.env.MODEL || 'claude-3-5-sonnet-latest';

// Initialize Anthropic client (only needed in live mode)
let anthropic = null;
if (!MOCK_MODE) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('⚠️  ERROR: ANTHROPIC_API_KEY not found in .env file');
    console.error('   Either add your API key or set MOCK_MODE=true');
    process.exit(1);
  }
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
}

// ============================================================================
// FIREBASE ADMIN SDK INITIALIZATION (for Social Features)
// ============================================================================
let admin = null;
let firebaseEnabled = false;

function initializeFirebase() {
  try {
    const firebaseAdmin = require('firebase-admin');

    // Check for service account configuration
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Load from JSON file
      const serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount)
      });
      admin = firebaseAdmin;
      firebaseEnabled = true;
      console.log('✅ Firebase Admin SDK initialized (from service account file)');
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      // Load from individual environment variables
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      });
      admin = firebaseAdmin;
      firebaseEnabled = true;
      console.log('✅ Firebase Admin SDK initialized (from env variables)');
    } else {
      console.log('ℹ️  Firebase not configured - social features disabled');
      console.log('   To enable: set FIREBASE_SERVICE_ACCOUNT_KEY in .env');
    }
  } catch (error) {
    console.warn('⚠️  Firebase initialization failed:', error.message);
    console.log('   Social features will be disabled');
  }
}

// Try to initialize Firebase
initializeFirebase();

/**
 * Middleware to verify Firebase auth token
 */
async function verifyFirebaseToken(req, res, next) {
  if (!firebaseEnabled) {
    return res.status(503).json({ error: 'Social features not available - Firebase not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
}

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'null' // allows file:// protocol
];

// Add Render domain in production
if (process.env.RENDER_EXTERNAL_URL) {
  allowedOrigins.push(process.env.RENDER_EXTERNAL_URL);
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in production for now
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint
 * Returns server status and current mode
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Let\'s Keep Swimming API',
    mode: MOCK_MODE ? 'mock' : 'live',
    version: '2.0.0'
  });
});

// ============================================================================
// POLISH-ONLY MODE (NEW)
// The LLM only provides explanations for pre-determined workouts
// ============================================================================

/**
 * System prompt for polish-only LLM calls
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
 * Generate mock polish response
 * Used when MOCK_MODE is enabled
 */
function generateMockPolish(sessionPlan, profile, recentSessions) {
  const { session, phase, days_to_event, readiness } = sessionPlan;

  let why_this = '';
  let technique_focus = [];
  let event_prep_tip = null;
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
  } else if (days_to_event <= 21) {
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
    flags
  };
}

/**
 * Format session structure for the polish prompt
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
function buildPolishUserMessage(sessionPlan, profile, recentSessions) {
  const { phase, days_to_event, readiness, derived_from_template, session } = sessionPlan;

  const sessionDescription = formatSessionForPrompt(session);

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

  if (!recentSessions || recentSessions.length === 0) {
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
 * POST /api/coach
 * Now handles both legacy full-coaching and new polish-only requests
 *
 * New format (polish-only):
 * {
 *   session_plan: { session, phase, days_to_event, readiness, derived_from_template, ... },
 *   profile: { eventDate, goal, targetTime, tone, sessionsPerWeek, access },
 *   recent_sessions: [...],
 *   phase: "BUILD" | "SHARPEN" | "TAPER",
 *   days_to_event: number
 * }
 *
 * Legacy format:
 * {
 *   profile: {...},
 *   recent_sessions: [...],
 *   all_sessions_summary: {...},
 *   today: "YYYY-MM-DD"
 * }
 */
app.post('/api/coach', async (req, res) => {
  try {
    const requestBody = req.body;

    // Detect request type: polish-only if session_plan exists
    const isPolishOnly = !!requestBody.session_plan;

    if (isPolishOnly) {
      return handlePolishRequest(req, res);
    } else {
      return handleLegacyCoachRequest(req, res);
    }

  } catch (error) {
    console.error('❌ Server error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Handle polish-only requests (new format)
 */
async function handlePolishRequest(req, res) {
  const { session_plan, profile, recent_sessions } = req.body;

  if (!session_plan || !profile) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['session_plan', 'profile']
    });
  }

  console.log(`\n🏊 Polish request for ${session_plan.session.type} session`);
  console.log(`   Phase: ${session_plan.phase}`);
  console.log(`   Days to event: ${session_plan.days_to_event}`);
  console.log(`   Mode: ${MOCK_MODE ? 'MOCK' : 'LIVE'}`);

  // MOCK MODE: Return mock polish
  if (MOCK_MODE) {
    const mockPolish = generateMockPolish(session_plan, profile, recent_sessions);
    console.log(`   ✅ Mock polish generated`);
    return res.json(mockPolish);
  }

  // LIVE MODE: Call Anthropic API for polish only
  const userMessage = buildPolishUserMessage(session_plan, profile, recent_sessions);

  console.log(`   📡 Calling Claude API for polish...`);

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512, // Polish responses are shorter
      temperature: 0.3,
      system: POLISH_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });

    const responseText = message.content[0].text;
    console.log(`   📥 Received polish response (${responseText.length} chars)`);

    // Parse JSON response
    try {
      const polishData = JSON.parse(responseText);

      // Validate polish response has required fields
      if (!polishData.why_this || !Array.isArray(polishData.technique_focus)) {
        throw new Error('Missing required polish fields');
      }

      // Ensure flags is an array
      if (!polishData.flags) {
        polishData.flags = [];
      }

      console.log(`   ✅ Valid polish JSON parsed`);
      return res.json(polishData);

    } catch (parseError) {
      console.error(`   ❌ JSON parse error:`, parseError.message);
      // Return mock polish as fallback
      const fallbackPolish = generateMockPolish(session_plan, profile, recent_sessions);
      fallbackPolish.is_fallback = true;
      return res.json(fallbackPolish);
    }

  } catch (apiError) {
    console.error(`   ❌ API error:`, apiError.message);
    // Return mock polish as fallback
    const fallbackPolish = generateMockPolish(session_plan, profile, recent_sessions);
    fallbackPolish.is_fallback = true;
    fallbackPolish.api_error = apiError.message;
    return res.json(fallbackPolish);
  }
}

// ============================================================================
// LEGACY MODE (backwards compatibility)
// Full coaching where LLM generates workout structure
// ============================================================================

/**
 * Mock coaching response generator (legacy)
 */
function generateMockCoaching(request) {
  const { profile, all_sessions_summary, today } = request;

  // Get tomorrow's day of week
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayOfWeek = tomorrow.getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Determine if rest is needed
  const needsRest = all_sessions_summary.consecutive_days_trained >= 3 ||
                    all_sessions_summary.last7days_avg_rpe > 8 ||
                    dayOfWeek === 2 ||
                    dayOfWeek === 5;

  const daysUntilEvent = Math.ceil(
    (new Date(profile.eventDate) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const swimType = profile.access.pool ? 'pool' : 'open_water';

  if (needsRest) {
    return {
      tomorrow_session: {
        type: 'rest',
        duration_min: 0,
        distance_m: null,
        structure: ['Active recovery: light stretching', 'Optional: 20min easy walk', 'Stay hydrated'],
        intensity: 'easy',
        technique_focus: ['recovery', 'mental visualization']
      },
      why_this: dayOfWeek === 2 || dayOfWeek === 5
        ? `${dayNames[dayOfWeek]} is a scheduled rest day in the Midmar program. Recovery allows adaptation.`
        : 'Your body needs recovery after consecutive training days. Rest is when adaptation happens.',
      flags: all_sessions_summary.last7days_avg_rpe > 8 ? ['High recent training intensity detected'] : [],
      event_prep_tip: `${daysUntilEvent} days until event. Recovery is part of training.`
    };
  }

  // Session templates based on day of week
  const sessionTemplates = {
    1: {
      duration_min: 50,
      distance_m: 2000,
      structure: [
        '400m freestyle warm-up (easy DPS focus)',
        '6x100m freestyle breathing every 3rd stroke, 20s rest',
        '8x50m catch-up drill, 15s rest',
        '4x100m freestyle at moderate pace, 30s rest',
        '200m easy cool-down'
      ],
      intensity: 'moderate',
      technique_focus: ['bilateral breathing', 'catch-up drill', 'DPS']
    },
    3: {
      duration_min: 60,
      distance_m: 3000,
      structure: [
        '500m freestyle DPS easy warm-up',
        '10x200m freestyle steady pace, 30s rest',
        '4x100m pull with paddles, breathing 3rd stroke, 30s rest',
        '200m easy cool-down'
      ],
      intensity: 'moderate',
      technique_focus: ['steady pacing', 'breathing rhythm', 'endurance']
    },
    4: {
      duration_min: 50,
      distance_m: 2500,
      structure: [
        '600m freestyle DPS easy',
        '8x25m catch-up drill, 20s rest',
        '4x100m freestyle working on technique, 30s rest',
        '8x50m pull breathing 3rd stroke, 20s rest',
        '8x25m catch-up drill, 20s rest',
        '200m easy cool-down'
      ],
      intensity: 'easy',
      technique_focus: ['catch-up drill', 'high elbow catch', 'body rotation']
    },
    6: {
      duration_min: 70,
      distance_m: 3500,
      structure: [
        '800m freestyle comfortable pace warm-up',
        '3x800m freestyle steady pace, 60s rest',
        '4x100m kick with fins, 30s rest',
        '200m easy backstroke cool-down'
      ],
      intensity: 'moderate',
      technique_focus: ['steady pacing', 'open water sighting', 'relaxed breathing']
    },
    0: {
      duration_min: 40,
      distance_m: 1500,
      structure: [
        '500m freestyle easy DPS',
        '6x100m freestyle slightly faster than warm-up, 20s rest',
        '4x50m pull breathing 5th stroke, 20s rest',
        '200m easy cool-down (mix freestyle/backstroke)'
      ],
      intensity: 'easy',
      technique_focus: ['relaxed stroke', 'recovery focus', 'breathing control']
    }
  };

  const template = sessionTemplates[dayOfWeek] || sessionTemplates[1];

  return {
    tomorrow_session: {
      type: swimType,
      duration_min: template.duration_min,
      distance_m: template.distance_m,
      structure: template.structure,
      intensity: template.intensity,
      technique_focus: template.technique_focus
    },
    why_this: `${dayNames[dayOfWeek]} session following Midmar Mile program structure. ${
      dayOfWeek === 6 ? 'Longest session of the week builds endurance.' :
      dayOfWeek === 0 ? 'Easy recovery swim after yesterday\'s long session.' :
      dayOfWeek === 3 ? 'Mid-week volume work maintains fitness.' :
      'Technique-focused work improves efficiency.'
    }`,
    flags: daysUntilEvent <= 14 ? ['Taper phase approaching - prioritize recovery'] : [],
    event_prep_tip: daysUntilEvent <= 7
      ? `${daysUntilEvent} days until event! Focus on rest and easy swims. No hard efforts.`
      : daysUntilEvent <= 14
      ? `${daysUntilEvent} days until event. Begin reducing volume, maintain frequency.`
      : `${daysUntilEvent} days until event. Build consistency and confidence.`
  };
}

/**
 * Build the system prompt for Claude (legacy)
 */
function buildSystemPrompt(profile) {
  const toneMap = {
    neutral: 'professional and factual',
    calm: 'gentle, encouraging, and supportive',
    tough_love: 'direct, motivating, and challenging (but never harsh)'
  };

  const tone = toneMap[profile.tone] || toneMap.neutral;

  return `You are an experienced swim coach helping a swimmer prepare for the Midmar Mile (1.6km open water event in South Africa).

MIDMAR MILE TRAINING PHILOSOPHY (based on official aQuellé program):
- 5 sessions per week is optimal for intermediate swimmers
- Weekly volume: 10-16km depending on phase (build up gradually)
- Session types should vary:
  * Monday: Technique focus (2-3km)
  * Tuesday: REST DAY (important for recovery)
  * Wednesday: Volume/steady pace (3-4km)
  * Thursday: Technique drills (2-2.5km)
  * Friday: REST DAY
  * Saturday: Endurance building (longest session, 3-4km)
  * Sunday: Recovery swim (1.5-2.5km)
- Key training elements:
  * DPS (Distance Per Stroke) for efficiency
  * Bilateral breathing (every 3rd stroke)
  * Pull sets with paddles/buoy
  * Kick sets with fins
  * Catchup drills for technique
  * Descending sets for speed work
- Equipment: paddles, pull buoy, short fins, kickboard
- Always include warm-up and cool-down

CRITICAL RULES:
1. Be conservative with recommendations - safety first, especially within 14 days of the event
2. Avoid sharp jumps in volume or intensity (no more than 10% increase per week)
3. If notes mention pain, illness, dizziness, or extreme fatigue: ALWAYS recommend rest
4. NEVER provide medical advice or diagnose conditions
5. Output ONLY valid JSON, no markdown, no explanations outside the JSON
6. Keep "why_this" under 60 words
7. Maximum 3 items in technique_focus array
8. Be ${tone} in tone
9. Respect rest days - Tuesday and Friday are traditional rest days
10. Tailor sessions based on what day of the week tomorrow is

SWIMMER'S GOAL: ${profile.goal === 'target_time' ? `Complete Midmar Mile in ${profile.targetTime}` : 'Finish comfortably'}

OUTPUT FORMAT (valid JSON only):
{
  "tomorrow_session": {
    "type": "pool" | "open_water" | "rest",
    "duration_min": <number>,
    "distance_m": <number or null>,
    "structure": ["step 1", "step 2", ...],
    "intensity": "easy" | "moderate" | "hard",
    "technique_focus": ["focus 1", "focus 2", ...]
  },
  "why_this": "<brief explanation>",
  "flags": ["<caution if needed>"],
  "event_prep_tip": "<contextual advice for event prep>"
}`;
}

/**
 * Build the user message with training context (legacy)
 */
function buildUserMessage(request) {
  const { profile, recent_sessions, all_sessions_summary, today } = request;

  const daysUntilEvent = Math.ceil(
    (new Date(profile.eventDate) - new Date(today)) / (1000 * 60 * 60 * 24)
  );

  let message = `Today is ${today}. Event date is ${profile.eventDate} (${daysUntilEvent} days away).\n\n`;

  message += `TRAINING SUMMARY:\n`;
  message += `- Last 7 days: ${all_sessions_summary.last7days_m}m\n`;
  message += `- Last 14 days: ${all_sessions_summary.last14days_m}m\n`;
  message += `- Average RPE (last 7 days): ${all_sessions_summary.last7days_avg_rpe.toFixed(1)}/10\n`;
  message += `- Consecutive training days: ${all_sessions_summary.consecutive_days_trained}\n\n`;

  if (recent_sessions.length > 0) {
    message += `RECENT SESSIONS:\n`;
    recent_sessions.forEach((session, i) => {
      message += `${i + 1}. ${session.date}: ${session.distance_m}m ${session.type} in ${session.time_min}min, RPE ${session.rpe}/10\n`;
      if (session.notes) {
        message += `   Notes: ${session.notes}\n`;
      }
      if (session.conditions) {
        message += `   Conditions: ${session.conditions}\n`;
      }
    });
  } else {
    message += `No recent sessions logged.\n`;
  }

  message += `\nACCESS: ${profile.access.pool ? 'Pool available' : 'No pool'}${profile.access.openWater ? ', Open water available' : ''}\n`;
  message += `LONGEST RECENT SWIM: ${profile.longestRecentSwim.distance_m}m in ${profile.longestRecentSwim.time_min}min\n`;
  message += `WEEKLY VOLUME ESTIMATE: ${profile.weeklyVolumeEstimate_m}m\n`;

  if (profile.availabilityDays) {
    message += `AVAILABILITY: ${profile.availabilityDays.join(', ')}\n`;
  } else if (profile.sessionsPerWeek) {
    message += `SESSIONS PER WEEK: ${profile.sessionsPerWeek}\n`;
  }

  message += `\nProvide tomorrow's training session recommendation as JSON only.`;

  return message;
}

/**
 * Handle legacy full-coaching requests
 */
async function handleLegacyCoachRequest(req, res) {
  const { profile, recent_sessions, all_sessions_summary, today } = req.body;

  if (!profile || !recent_sessions || !all_sessions_summary || !today) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['profile', 'recent_sessions', 'all_sessions_summary', 'today']
    });
  }

  console.log(`\n🏊 Legacy coaching request for event: ${profile.eventDate}`);
  console.log(`   Mode: ${MOCK_MODE ? 'MOCK' : 'LIVE'}`);
  console.log(`   Recent sessions: ${recent_sessions.length}`);
  console.log(`   Last 7 days: ${all_sessions_summary.last7days_m}m`);

  // MOCK MODE: Return dummy data
  if (MOCK_MODE) {
    const mockResponse = generateMockCoaching(req.body);
    console.log(`   ✅ Mock response generated`);
    return res.json(mockResponse);
  }

  // LIVE MODE: Call Anthropic API
  const systemPrompt = buildSystemPrompt(profile);
  const userMessage = buildUserMessage(req.body);

  console.log(`   📡 Calling Claude API...`);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.2,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage }
    ]
  });

  const responseText = message.content[0].text;
  console.log(`   📥 Received response (${responseText.length} chars)`);

  // Parse JSON response
  try {
    const coachingData = JSON.parse(responseText);
    console.log(`   ✅ Valid JSON parsed`);
    return res.json(coachingData);
  } catch (parseError) {
    console.error(`   ❌ JSON parse error:`, parseError.message);
    return res.status(502).json({
      error: 'Invalid response from AI',
      details: 'The AI returned invalid JSON. This is a model error.',
      raw: responseText
    });
  }
}

// ============================================================================
// SOCIAL / FRIEND ENDPOINTS
// ============================================================================

/**
 * GET /api/social/status
 * Check if social features are enabled
 */
app.get('/api/social/status', (req, res) => {
  res.json({
    enabled: firebaseEnabled,
    message: firebaseEnabled
      ? 'Social features are enabled'
      : 'Social features disabled - Firebase not configured'
  });
});

/**
 * GET /api/benchmarks
 * Get anonymous benchmark data for comparison
 * No authentication required - data is aggregated and anonymous
 */
app.get('/api/benchmarks', async (req, res) => {
  if (!firebaseEnabled) {
    return res.json({
      enabled: false,
      message: 'Benchmarks not available - Firebase not configured'
    });
  }

  try {
    const { ageGroup, gender } = req.query;
    const db = admin.firestore();

    // Build benchmark document ID
    let benchmarkId = 'all_all';
    if (ageGroup && ageGroup !== 'all') {
      benchmarkId = gender && gender !== 'all'
        ? `${ageGroup}_${gender}`
        : `${ageGroup}_all`;
    } else if (gender && gender !== 'all') {
      benchmarkId = `all_${gender}`;
    }

    // Try to get specific benchmark
    let benchmarkDoc = await db.collection('benchmarks').doc(benchmarkId).get();

    // Fall back to all_all if specific doesn't exist
    if (!benchmarkDoc.exists) {
      benchmarkDoc = await db.collection('benchmarks').doc('all_all').get();
    }

    if (!benchmarkDoc.exists) {
      // Return placeholder data if no benchmarks exist yet
      return res.json({
        enabled: true,
        data: {
          totalUsers: 0,
          avgWeeklyDistance: 0,
          avgSessionsPerWeek: 0,
          avgStreak: 0,
          percentiles: { p25: 0, p50: 0, p75: 0, p90: 0 }
        },
        message: 'No benchmark data available yet'
      });
    }

    res.json({
      enabled: true,
      data: benchmarkDoc.data()
    });
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    res.status(500).json({ error: 'Failed to fetch benchmarks' });
  }
});

/**
 * POST /api/friend/lookup
 * Look up a user by friend code
 * Requires authentication
 */
app.post('/api/friend/lookup', verifyFirebaseToken, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid friend code' });
    }

    const db = admin.firestore();
    const codeDoc = await db.collection('friend_codes').doc(code.toUpperCase()).get();

    if (!codeDoc.exists) {
      return res.status(404).json({ error: 'Friend code not found' });
    }

    const friendUid = codeDoc.data().uid;

    // Don't allow adding yourself
    if (friendUid === req.user.uid) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    // Get friend's public profile
    const friendDoc = await db.collection('users').doc(friendUid).get();

    if (!friendDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const friendData = friendDoc.data();

    res.json({
      uid: friendUid,
      displayName: friendData.displayName,
      photoURL: friendData.photoURL
    });
  } catch (error) {
    console.error('Friend lookup error:', error);
    res.status(500).json({ error: 'Failed to look up friend code' });
  }
});

/**
 * POST /api/friend/request
 * Send a friend request
 * Requires authentication
 */
app.post('/api/friend/request', verifyFirebaseToken, async (req, res) => {
  try {
    const { friendUid } = req.body;
    const myUid = req.user.uid;

    if (!friendUid) {
      return res.status(400).json({ error: 'Friend UID required' });
    }

    if (friendUid === myUid) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    const db = admin.firestore();

    // Check if friendship already exists
    const existingQuery = await db.collection('friendships')
      .where('user1', 'in', [myUid, friendUid])
      .get();

    let alreadyExists = false;
    existingQuery.forEach(doc => {
      const data = doc.data();
      if ((data.user1 === myUid && data.user2 === friendUid) ||
          (data.user1 === friendUid && data.user2 === myUid)) {
        alreadyExists = true;
      }
    });

    if (alreadyExists) {
      return res.status(400).json({ error: 'Friendship already exists or request pending' });
    }

    // Create friend request
    const friendshipRef = await db.collection('friendships').add({
      user1: myUid,
      user2: friendUid,
      status: 'pending',
      initiatedBy: myUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      friendshipId: friendshipRef.id,
      message: 'Friend request sent'
    });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * POST /api/friend/accept
 * Accept a friend request
 * Requires authentication
 */
app.post('/api/friend/accept', verifyFirebaseToken, async (req, res) => {
  try {
    const { friendshipId } = req.body;
    const myUid = req.user.uid;

    if (!friendshipId) {
      return res.status(400).json({ error: 'Friendship ID required' });
    }

    const db = admin.firestore();
    const friendshipRef = db.collection('friendships').doc(friendshipId);
    const friendshipDoc = await friendshipRef.get();

    if (!friendshipDoc.exists) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const friendshipData = friendshipDoc.data();

    // Verify this user is the recipient
    if (friendshipData.user2 !== myUid) {
      return res.status(403).json({ error: 'Not authorized to accept this request' });
    }

    // Verify status is pending
    if (friendshipData.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Accept the request
    await friendshipRef.update({
      status: 'accepted',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'Friend request accepted'
    });
  } catch (error) {
    console.error('Accept friend error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

/**
 * POST /api/friend/reject
 * Reject a friend request
 * Requires authentication
 */
app.post('/api/friend/reject', verifyFirebaseToken, async (req, res) => {
  try {
    const { friendshipId } = req.body;
    const myUid = req.user.uid;

    if (!friendshipId) {
      return res.status(400).json({ error: 'Friendship ID required' });
    }

    const db = admin.firestore();
    const friendshipRef = db.collection('friendships').doc(friendshipId);
    const friendshipDoc = await friendshipRef.get();

    if (!friendshipDoc.exists) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const friendshipData = friendshipDoc.data();

    // Verify this user is the recipient
    if (friendshipData.user2 !== myUid) {
      return res.status(403).json({ error: 'Not authorized to reject this request' });
    }

    // Delete the request
    await friendshipRef.delete();

    res.json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    console.error('Reject friend error:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

/**
 * DELETE /api/friend/:friendshipId
 * Remove a friend
 * Requires authentication
 */
app.delete('/api/friend/:friendshipId', verifyFirebaseToken, async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const myUid = req.user.uid;

    const db = admin.firestore();
    const friendshipRef = db.collection('friendships').doc(friendshipId);
    const friendshipDoc = await friendshipRef.get();

    if (!friendshipDoc.exists) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    const friendshipData = friendshipDoc.data();

    // Verify this user is part of the friendship
    if (friendshipData.user1 !== myUid && friendshipData.user2 !== myUid) {
      return res.status(403).json({ error: 'Not authorized to remove this friendship' });
    }

    // Delete the friendship
    await friendshipRef.delete();

    res.json({
      success: true,
      message: 'Friend removed'
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Serve static files from web folder
app.use(express.static(path.join(__dirname, '../web')));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

// 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🏊 Let\'s Keep Swimming - Server');
  console.log('================================');
  console.log(`Mode:    ${MOCK_MODE ? '🎭 MOCK (free, dummy data)' : '🤖 LIVE (AI coaching)'}`);
  console.log(`Social:  ${firebaseEnabled ? '✅ Enabled' : '❌ Disabled (Firebase not configured)'}`);
  console.log(`Port:    ${PORT}`);
  console.log(`URL:     http://localhost:${PORT}`);
  if (!MOCK_MODE) {
    console.log(`Model:   ${MODEL}`);
  }
  console.log('\nEndpoints:');
  console.log('  GET  /                    - Web UI');
  console.log('  GET  /api/health          - Health check');
  console.log('  POST /api/coach           - Get coaching');
  if (firebaseEnabled) {
    console.log('  GET  /api/social/status   - Social features status');
    console.log('  GET  /api/benchmarks      - Anonymous benchmarks');
    console.log('  POST /api/friend/lookup   - Look up friend by code');
    console.log('  POST /api/friend/request  - Send friend request');
    console.log('  POST /api/friend/accept   - Accept friend request');
    console.log('  POST /api/friend/reject   - Reject friend request');
    console.log('  DEL  /api/friend/:id      - Remove friend');
  }
  console.log('\nReady for requests! 🚀\n');
});
