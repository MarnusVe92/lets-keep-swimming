# Let's Keep Swimming - Server

Express server providing AI coaching endpoints for the swim training app.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start server (mock mode - no API key needed)
npm start
```

Server runs on `http://localhost:3000`

## Environment Variables

Edit `.env` file:

```bash
# Required: Anthropic API key (only needed in live mode)
ANTHROPIC_API_KEY=your_api_key_here

# Mock Mode: Set to true for free testing without API key
MOCK_MODE=true

# Server Port (default: 3000)
PORT=3000

# Model (optional)
MODEL=claude-3-5-sonnet-latest
```

## API Endpoints

### `GET /`

Health check

**Response:**
```json
{
  "status": "ok",
  "service": "Let's Keep Swimming API",
  "mode": "mock" | "live",
  "version": "1.0.0"
}
```

### `POST /api/coach`

Get coaching recommendation

**Request Body:**
```json
{
  "profile": {
    "eventDate": "2026-02-14",
    "goal": "finish_comfortably",
    "tone": "neutral",
    ...
  },
  "recent_sessions": [
    {
      "date": "2026-01-27",
      "type": "pool",
      "distance_m": 1500,
      "time_min": 45,
      "rpe": 7,
      ...
    }
  ],
  "all_sessions_summary": {
    "last7days_m": 4500,
    "last14days_m": 9000,
    "last7days_avg_rpe": 6.5,
    "consecutive_days_trained": 2
  },
  "today": "2026-01-28"
}
```

**Response:**
```json
{
  "tomorrow_session": {
    "type": "pool",
    "duration_min": 45,
    "distance_m": 1500,
    "structure": [
      "300m warm-up",
      "6x100m at moderate pace",
      "200m cool-down"
    ],
    "intensity": "moderate",
    "technique_focus": ["bilateral breathing", "high elbow catch"]
  },
  "why_this": "Building endurance after rest. Volume increase is gradual.",
  "flags": [],
  "event_prep_tip": "Focus on consistency over intensity."
}
```

## Mock Mode

When `MOCK_MODE=true`:
- Returns realistic dummy coaching data
- No API calls to Anthropic
- Zero cost
- Perfect for testing and development

Logic:
- Recommends rest if 3+ consecutive training days
- Recommends rest if average RPE > 8
- Otherwise suggests a moderate training session
- Adjusts based on days until event

## Live Mode

When `MOCK_MODE=false`:
- Requires valid `ANTHROPIC_API_KEY`
- Calls Claude AI for real coaching
- Cost: ~$0.01 USD per request
- Uses temperature 0.2 for consistency
- Default model: `claude-3-5-sonnet-latest`

## Error Handling

### 400 Bad Request
Missing required fields in request body

### 500 Internal Server Error
Server-side error (check logs)

### 502 Bad Gateway
AI returned invalid JSON (rare model error)

## Coaching Philosophy

The AI coach is configured to:

✅ Be conservative with recommendations
✅ Avoid sharp volume/intensity jumps
✅ Detect fatigue signals and recommend rest
✅ Never provide medical advice
✅ Adapt tone based on user preference
✅ Respect event proximity (taper appropriately)

## Logging

Server logs to console:
- All requests (method + path)
- Coaching requests with context
- API calls (when in live mode)
- Errors with details

## CORS

Configured to allow:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `null` (for file:// protocol)

Credentials enabled for local development.

## Dependencies

- `express` (^4.21.2) - Web server framework
- `cors` (^2.8.5) - Cross-origin resource sharing
- `dotenv` (^16.4.5) - Environment variable management
- `@anthropic-ai/sdk` (^0.32.1) - Anthropic API client

## Development

```bash
# Install dependencies
npm install

# Run with auto-restart (requires nodemon)
npm install -g nodemon
nodemon server.js
```

## Production Considerations

For deploying to production:

1. **Environment**
   - Set `NODE_ENV=production`
   - Use secure API key storage (vault, secrets manager)
   - Disable MOCK_MODE

2. **Security**
   - Add rate limiting (e.g., express-rate-limit)
   - Add request validation (e.g., joi, zod)
   - Use HTTPS
   - Restrict CORS to specific domain
   - Add authentication if multi-user

3. **Monitoring**
   - Add logging service (e.g., Winston, Pino)
   - Track API usage and costs
   - Monitor error rates
   - Set up alerts

4. **Scaling**
   - Add caching for repeated requests
   - Use serverless functions (optional)
   - Load balancing if needed

## Troubleshooting

**Port already in use**
```bash
# Change port in .env
PORT=3001
```

**API key error**
```bash
# Make sure MOCK_MODE=true OR add valid API key
# Check .env file exists and is formatted correctly
```

**Module not found**
```bash
npm install
```

**CORS errors**
```bash
# Check server is running
# Check browser is requesting from allowed origin
```

## License

MIT
