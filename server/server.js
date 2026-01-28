/**
 * Let's Keep Swimming - Server
 *
 * This server provides AI coaching recommendations for swim training.
 * It can run in two modes:
 * - MOCK_MODE: Returns dummy data (no API key needed, free)
 * - LIVE MODE: Calls Claude AI for real coaching (requires API key, ~$0.01 per request)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'null'], // 'null' allows file:// protocol
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
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Let\'s Keep Swimming API',
    mode: MOCK_MODE ? 'mock' : 'live',
    version: '1.0.0'
  });
});

/**
 * Mock coaching response generator
 * Returns realistic dummy data for testing without API costs
 * Based on Midmar Mile training program structure
 */
function generateMockCoaching(request) {
  const { profile, all_sessions_summary, today } = request;

  // Get tomorrow's day of week
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayOfWeek = tomorrow.getDay(); // 0=Sunday, 1=Monday, etc.
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Determine if rest is needed based on recent activity or day of week
  const needsRest = all_sessions_summary.consecutive_days_trained >= 3 ||
                    all_sessions_summary.last7days_avg_rpe > 8 ||
                    dayOfWeek === 2 || // Tuesday (rest day)
                    dayOfWeek === 5;   // Friday (rest day)

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

  // Session templates based on day of week (Midmar program structure)
  const sessionTemplates = {
    1: { // Monday - Technique focus
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
    3: { // Wednesday - Volume/steady pace
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
    4: { // Thursday - Technique drills
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
    6: { // Saturday - Endurance building (longest session)
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
    0: { // Sunday - Recovery swim
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

  // Get template for tomorrow, default to Monday if not found
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
 * Build the system prompt for Claude
 * This defines the AI coach's personality and constraints
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
 * Build the user message with training context
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
 * POST /api/coach
 * Get coaching recommendation based on profile and recent training
 */
app.post('/api/coach', async (req, res) => {
  try {
    // Validate request body
    const { profile, recent_sessions, all_sessions_summary, today } = req.body;

    if (!profile || !recent_sessions || !all_sessions_summary || !today) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['profile', 'recent_sessions', 'all_sessions_summary', 'today']
      });
    }

    console.log(`\n🏊 Coaching request for event: ${profile.eventDate}`);
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

  } catch (error) {
    console.error('❌ Server error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🏊 Let\'s Keep Swimming - Server');
  console.log('================================');
  console.log(`Mode:    ${MOCK_MODE ? '🎭 MOCK (free, dummy data)' : '🤖 LIVE (AI coaching)'}`);
  console.log(`Port:    ${PORT}`);
  console.log(`URL:     http://localhost:${PORT}`);
  if (!MOCK_MODE) {
    console.log(`Model:   ${MODEL}`);
  }
  console.log('\nReady for coaching requests! 🚀\n');
});
