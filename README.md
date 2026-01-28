# 🏊 Let's Keep Swimming

**An LLM-powered swim training companion for Midmar Mile preparation**

Built with vanilla JavaScript, Node.js, Express, and Claude AI.

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [What Is This?](#-what-is-this)
- [How It Works](#-how-it-works)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the App](#-running-the-app)
- [Using the App](#-using-the-app)
- [Getting an API Key](#-getting-an-api-key)
- [Backup Your Data](#-backup-your-data)
- [Versioning & Rollback](#-versioning--rollback)
- [Future Vision: Smartwatch Integration](#-future-vision-smartwatch-integration)
- [Troubleshooting](#-troubleshooting)
- [Testing Checklist](#-testing-checklist)
- [Architecture](#-architecture)

---

## 🚀 Quick Start

**For people who just want to try it:**

```bash
# 1. Install dependencies
cd server
npm install

# 2. Set up environment (use mock mode - no API key needed!)
cp .env.example .env
# The .env file is already set to MOCK_MODE=true

# 3. Start the server
npm start

# 4. Open the web app
# Open web/index.html in your browser
# On Mac: open web/index.html
# On Windows: start web/index.html
# Or just double-click web/index.html
```

That's it! The app runs in **mock mode** (free, dummy AI responses) so you can test everything without an API key.

---

## 💡 What Is This?

Let's Keep Swimming helps you train for the Midmar Mile (or any open water swim event) with:

- **📊 Training Dashboard** - See your progress, stats, and countdown to event day
- **🏊 Session Logging** - Track every swim (distance, time, RPE, notes)
- **🤖 AI Coach** - Get personalized tomorrow session recommendations
- **💾 Data Safety** - Everything stored locally in your browser + export/import backups
- **📱 Mobile-Friendly** - Works great on phones and tablets

### Key Features

✅ **Local-First** - Your data never leaves your computer
✅ **No Login** - No accounts, no passwords, no cloud
✅ **Conservative Coaching** - AI prioritizes your safety and gradual progress
✅ **Export/Import** - Download backups anytime
✅ **Beautiful Charts** - Visualize your training with Chart.js
✅ **Mock Mode** - Test without API costs

---

## 🧠 How It Works

### Storage: Where Your Data Lives

**The Problem:** Most web apps forget everything when you close them.

**Our Solution:**

1. **Browser Storage** - Your browser (Chrome, Safari, Firefox) saves data on your computer
   - Like a notebook that stays with the app
   - Data persists when you close the browser
   - Only YOU can see it (completely private)
   - Uses IndexedDB (preferred) or LocalStorage (fallback)

2. **Export/Import** - Your safety net
   - **Export** = Download all your data as a JSON file
   - Keep this file safe (email it, save to cloud)
   - **Import** = Upload that file to restore your data
   - Use when switching computers or browsers

**Visual Flow:**
```
You log swims → Saved in browser → Export to file → Keep safe
                                  ↓
               Browser cleared? → Import file → Data restored ✅
```

### AI Coaching: How It Works

1. You log your training sessions (distance, time, RPE, notes)
2. Click "Get Tomorrow's Session"
3. App sends your data to the server
4. Server asks Claude AI for a recommendation
5. AI analyzes your training and creates a safe, personalized plan
6. Server sends it back to you

**The AI considers:**
- How much you've trained recently
- How hard your workouts were (RPE)
- Days until your event
- Your goals and availability
- Any fatigue signals in your notes

---

## 📦 Prerequisites

You need **Node.js** installed on your computer.

### Check If You Have Node.js

Open Terminal (Mac) or Command Prompt (Windows) and type:

```bash
node --version
```

If you see a version number (like `v20.x.x`), you're good!

### Install Node.js

If you don't have it:

1. Go to [nodejs.org](https://nodejs.org)
2. Download the **LTS version** (recommended)
3. Run the installer
4. Restart your terminal/command prompt
5. Check again with `node --version`

---

## 💻 Installation

1. **Download this project**
   - If from GitHub: Click "Code" → "Download ZIP"
   - Extract the ZIP file

2. **Open Terminal/Command Prompt**
   - Mac: Open "Terminal" app
   - Windows: Open "Command Prompt" or "PowerShell"

3. **Navigate to the project folder**
   ```bash
   cd path/to/lets-keep-swimming
   ```

4. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

   This downloads the required packages:
   - `express` - Web server
   - `cors` - Allows browser to talk to server
   - `dotenv` - Manages environment variables
   - `@anthropic-ai/sdk` - Claude AI integration

5. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   This creates a `.env` file with configuration.

---

## 🏃 Running the App

### Start the Server

```bash
cd server
npm start
```

You should see:
```
🏊 Let's Keep Swimming - Server
================================
Mode:    🎭 MOCK (free, dummy data)
Port:    3000
URL:     http://localhost:3000

Ready for coaching requests! 🚀
```

**Keep this terminal window open!** The server needs to run while you use the app.

### Open the Web App

**Option 1: Double-click**
- Navigate to the `web` folder
- Double-click `index.html`
- It opens in your default browser

**Option 2: Command line**
```bash
# Mac
open web/index.html

# Windows
start web/index.html

# Linux
xdg-open web/index.html
```

**Option 3: File menu**
- Open your web browser
- File → Open File
- Select `web/index.html`

You should see the app! 🎉

---

## 📱 Using the App

### 1. Set Up Your Profile

Click **Profile** tab and fill in:

- **Event Date** - When is your Midmar Mile?
- **Goal** - Finish comfortably, or target a specific time?
- **Availability** - Which days can you train?
- **Access** - Do you have pool and/or open water access?
- **Longest Recent Swim** - Your current fitness level
- **Weekly Volume** - How much do you typically swim?
- **Coaching Tone** - Neutral, calm, or tough love?

Click **Save Profile**.

### 2. Log Your Sessions

Click **Sessions** tab:

- **Date** - When did you swim?
- **Type** - Pool or open water?
- **Distance** - How far? (in meters)
- **Time** - How long? (in minutes)
- **RPE** - How hard was it? (1-10 scale)
  - 1-3 = Easy
  - 4-6 = Moderate
  - 7-9 = Hard
  - 10 = Maximum effort
- **Notes** - How did it feel? Any technique focus?
- **Conditions** - Water temp, chop, etc. (optional)

Click **Log Session**.

You can edit or delete sessions anytime.

### 3. View Your Dashboard

Click **Dashboard** tab to see:

- **Countdown** - Days until your event
- **Stats** - Last 7 days, last 14 days, average RPE
- **Charts** - Beautiful visualizations of your training
- **Recent Sessions** - Your last 3 workouts

### 4. Get Coaching

On the Dashboard:

1. Click **Get Tomorrow's Session Recommendation**
2. Wait a few seconds (AI is thinking!)
3. Read your personalized recommendation:
   - Tomorrow's workout structure
   - Why this session makes sense
   - Technique focus
   - Event prep tips

4. Click **Copy** to save it to your clipboard

**Note:** In mock mode, you get realistic dummy responses. For real AI coaching, set up your API key (see below).

### 5. Backup Your Data

Click **Data** tab:

- **Export** - Download a backup file
  - Save this file somewhere safe!
  - It contains your profile + all sessions
  - You can import it anytime to restore data

- **Import** - Restore from a backup
  - Choose "Replace All" to overwrite everything
  - Choose "Merge" to combine with existing data

**Pro Tip:** Export regularly (weekly or after big training blocks)!

---

## 🔑 Getting an API Key

To get **real AI coaching** (not mock mode), you need an Anthropic API key.

### What Is an API Key?

Think of it as a password that lets the server talk to Claude AI on your behalf.

### Cost

- Approximately **$0.01 USD (one cent)** per coaching request
- You control spending limits
- Claude 3.5 Sonnet is very affordable for personal use

### How to Get One

1. **Sign up at Anthropic**
   - Go to [console.anthropic.com](https://console.anthropic.com)
   - Click "Sign Up"
   - You'll need a credit card (for billing, but you set limits)

2. **Create an API Key**
   - Once logged in, go to "API Keys"
   - Click "Create Key"
   - Give it a name (e.g., "Let's Keep Swimming")
   - Copy the key (starts with `sk-ant-...`)
   - **Important:** You can only see this once! Save it somewhere safe.

3. **Add to Your App**
   - Open `server/.env` in a text editor
   - Find the line: `ANTHROPIC_API_KEY=your_api_key_here`
   - Replace `your_api_key_here` with your actual key
   - Find the line: `MOCK_MODE=true`
   - Change it to: `MOCK_MODE=false`
   - Save the file

4. **Restart the Server**
   - Stop the server (Ctrl+C in terminal)
   - Start it again: `npm start`
   - You should see: `Mode: 🤖 LIVE (AI coaching)`

5. **Test It**
   - Go to Dashboard
   - Click "Get Tomorrow's Session"
   - You'll get real AI coaching! 🎉

### Managing Costs

Set spending limits in your Anthropic console:
- Settings → Usage Limits
- Set a monthly limit (e.g., $5/month)
- You'll get notified if you approach it

Typical usage: 1-2 coaching requests per day = $0.30-$0.60/month

---

## 💾 Backup Your Data

**IMPORTANT:** Your data lives in your browser. If you clear browser data, switch browsers, or switch computers, you'll lose your training log unless you have a backup.

### When to Export

- ✅ After setting up your profile
- ✅ Weekly (make it a Sunday habit!)
- ✅ Before clearing browser data
- ✅ After big training blocks
- ✅ Before switching computers

### How to Export

1. Click **Data** tab
2. Click **Download Backup**
3. A file downloads: `lets-keep-swimming-backup-YYYY-MM-DD.json`
4. Save it somewhere safe:
   - Email it to yourself
   - Save to Google Drive / Dropbox / iCloud
   - Keep on external hard drive
   - Multiple backups = even safer!

### How to Import

1. Click **Data** tab
2. Choose import strategy:
   - **Replace All** - Delete existing data, use backup (for restoring)
   - **Merge** - Combine backup with existing data (for syncing)
3. Click "Choose File" and select your backup
4. Click **Import Backup**
5. Confirm the action
6. Done! Your data is restored.

---

## 🔄 Versioning & Rollback

### What Is Git?

Git is like "Track Changes" in Microsoft Word, but for code. It lets you:
- Save checkpoints (called "commits")
- Go back to any previous version
- Tag important milestones

### Why Use Git?

- **Safety** - You can undo mistakes
- **History** - See what changed and when
- **Collaboration** - Work with others (future)
- **Experimentation** - Try new features without fear

### Basic Git Workflow

#### 1. Initialize Git (one time)

```bash
cd lets-keep-swimming
git init
```

This creates a `.git` folder (hidden) that tracks changes.

#### 2. Make Your First Commit

```bash
# Add all files to staging
git add .

# Create a commit (checkpoint)
git commit -m "Initial commit: Working swim tracker"
```

#### 3. Make Changes and Commit

After modifying files:

```bash
# See what changed
git status

# See specific changes
git diff

# Add changes
git add .

# Commit with a descriptive message
git commit -m "Added new feature: RPE descriptions"
```

#### 4. Tag Milestones

Mark important versions:

```bash
# Tag current version
git tag -a v1.0.0 -m "First working version"

# List all tags
git tag

# View specific tag
git show v1.0.0
```

Suggested tags:
- `v0.1.0` - Initial working prototype
- `v0.2.0` - Added all CRUD operations
- `v1.0.0` - Fully functional with AI coaching
- `v1.1.0` - Added export/import
- `v2.0.0` - Major feature (e.g., PWA support)

#### 5. Rollback If Needed

**Option A: Revert (safe, creates new commit)**
```bash
# Find commit hash
git log --oneline

# Revert specific commit
git revert <commit-hash>
```

**Option B: Reset (destructive, rewrites history)**
```bash
# Go back to specific commit (CAREFUL!)
git reset --hard <commit-hash>
```

**Option C: Reset to Tag**
```bash
# Go back to tagged version
git reset --hard v1.0.0
```

### Push to GitHub (Optional)

Share your project or back it up online:

```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/yourusername/lets-keep-swimming.git
git branch -M main
git push -u origin main --tags
```

---

## 🌐 Future Vision: Smartwatch Integration

### Current State

**Manual Entry**
- You swim with any device (Garmin, Apple Watch, Samsung Galaxy Watch, etc.)
- After your swim, manually enter the data into the app
- Works with any tracker!

### Future Option 1: Progressive Web App (PWA)

**What It Is:**
- "Install" the web app on your phone like a native app
- Works offline
- Faster access (home screen icon)
- Still manual data entry

**Benefits:**
- No app store needed
- Works on all platforms
- Updates automatically

**Implementation Time:** +2-3 hours

**Steps:**
1. Add a `manifest.json` file
2. Create service worker for offline support
3. Add install prompt
4. Test on mobile device

### Future Option 2: Direct Smartwatch Sync

**What It Is:**
- App connects directly to your smartwatch
- Automatically imports swim data after each session
- No manual entry needed!

**Technologies:**
- **Web Bluetooth API** - Connect to watch from browser
- **Native Android App** - For deeper Samsung Galaxy Watch integration
- **HealthKit / Google Fit API** - Access fitness data

**Challenges:**
- Different watches use different protocols
- Bluetooth permissions
- Battery usage
- Platform-specific (iOS vs Android)

**Implementation Time:** +2-4 weeks

### Recommended Path

**Phase 1: Mobile-Friendly Web (✅ Done)**
- Responsive design works great on phones
- Manual entry is fast and reliable

**Phase 2: PWA (Optional - Near Future)**
- Add offline support
- Install to home screen
- Feels more like a native app

**Phase 3: Watch Sync (Future Project)**
- Start with one platform (Samsung Galaxy Watch or Apple Watch)
- Build native companion app
- Add sync button in web app
- Expand to other devices

**Data Flow (Future):**
```
Smartwatch → Bluetooth → Phone App → Web App Storage
                                    ↓
                              AI Coaching
```

### How to Contribute to Watch Sync

If you're a developer interested in adding watch sync:

1. Fork this repository
2. Choose a target platform (Samsung, Apple, Garmin, etc.)
3. Research the watch's data export API
4. Build a bridge between watch data and our JSON format
5. Submit a pull request!

---

## 🔧 Troubleshooting

### Server won't start

**Error: "ANTHROPIC_API_KEY not found"**
- Solution: Make sure `MOCK_MODE=true` in `.env`, OR add your API key

**Error: "Port 3000 is already in use"**
- Solution: Change port in `.env`: `PORT=3001`
- Or stop the process using port 3000

**Error: "Cannot find module"**
- Solution: Run `npm install` again in the server folder

### Web app won't load

**Blank page**
- Solution: Check browser console for errors (F12 or Cmd+Option+I)
- Make sure server is running
- Try opening in a different browser

**"Failed to fetch" error**
- Solution: Server not running. Start with `npm start`
- Check server URL in `app.js` (should be `http://localhost:3000`)

### Data disappeared

**After clearing browser data**
- Solution: Import your last backup (Data tab → Import)
- Prevention: Export regularly!

**Switching browsers/computers**
- Solution: Export from old browser, import to new one

### Coaching not working

**Mock mode works but live mode doesn't**
- Check API key is correct in `.env`
- Check `MOCK_MODE=false`
- Restart server
- Check Anthropic console for API errors

**"Invalid JSON" error**
- This is rare - the AI returned malformed data
- Try again (AI responses vary slightly)
- Check server logs for details

### Charts not showing

**Empty charts**
- Need at least 1-2 sessions logged
- Make sure profile is set up
- Check browser console for Chart.js errors

### Mobile issues

**Text too small**
- Use pinch-to-zoom
- App should be mobile-optimized already

**Buttons hard to tap**
- All buttons are 44px minimum (Apple's guideline)
- Report specific issues!

---

## ✅ Testing Checklist

Use this to verify everything works:

### Initial Setup
- [ ] Server installs without errors (`npm install`)
- [ ] Server starts in mock mode
- [ ] Web app opens in browser
- [ ] Storage method displays (IndexedDB or LocalStorage)

### Profile
- [ ] Can create profile with all fields
- [ ] Profile saves and persists after refresh
- [ ] Can edit profile and changes save

### Sessions
- [ ] Can log a new session
- [ ] Session appears in list
- [ ] Can edit a session
- [ ] Can delete a session (with confirmation)
- [ ] Sessions persist after refresh
- [ ] Sessions show on dashboard

### Dashboard
- [ ] Event countdown shows correct days
- [ ] Stats calculate correctly (7-day, 14-day volumes)
- [ ] Volume chart shows last 14 days
- [ ] Progress chart displays percentage
- [ ] Recent sessions list shows last 3

### Coaching
- [ ] "Get Coaching" button works in mock mode
- [ ] Coaching response displays correctly
- [ ] Copy button works
- [ ] If live mode: Real AI response received

### Data Management
- [ ] Export creates a JSON file
- [ ] Export file contains profile and sessions
- [ ] Import with "replace" restores data
- [ ] Import with "merge" combines data correctly
- [ ] Clear all data works (with confirmations)

### Responsive Design
- [ ] Works on desktop
- [ ] Works on tablet
- [ ] Works on phone
- [ ] All buttons are tap-friendly

---

## 🏗️ Architecture

### Tech Stack

**Frontend (web/)**
- Pure HTML/CSS/JavaScript (no frameworks!)
- Chart.js for visualizations
- IndexedDB for primary storage
- LocalStorage for fallback

**Backend (server/)**
- Node.js + Express
- Anthropic SDK for Claude AI
- CORS enabled for local development
- Environment variables via dotenv

### File Structure

```
lets-keep-swimming/
├── README.md                 ← You are here
├── server/
│   ├── package.json          ← Dependencies
│   ├── server.js             ← Express server + AI integration
│   ├── .env.example          ← Environment template
│   ├── .env                  ← Your actual config (not in git)
│   └── README.md             ← Server-specific notes
└── web/
    ├── index.html            ← Main HTML structure
    ├── styles.css            ← Modern card-based design
    ├── app.js                ← Main application logic
    ├── db.js                 ← Storage layer (IndexedDB + fallback)
    ├── prompts.js            ← LLM prompt building
    └── charts.js             ← Chart.js visualizations
```

### Data Flow

```
┌──────────────┐
│   Browser    │
│  (web/...)   │
└──────┬───────┘
       │
       ├─ User Action (log session, get coaching)
       │
       ├─ app.js handles it
       │
       ├─ db.js saves to IndexedDB/LocalStorage
       │
       └─ fetch() calls server
              │
              ↓
     ┌─────────────────┐
     │  Express Server │
     │  (server.js)    │
     └────────┬────────┘
              │
              ├─ Mock Mode? → Return dummy data
              │
              └─ Live Mode  → Call Anthropic API
                              │
                              ↓
                         ┌──────────────┐
                         │  Claude AI   │
                         │ (Anthropic)  │
                         └──────────────┘
```

### Security Notes

- API key stored only in `server/.env` (never exposed to browser)
- CORS allows localhost only
- No authentication (local-only app)
- No user data sent to third parties (except Anthropic for coaching)
- Data stays in your browser

---

## 📄 License

MIT License - Feel free to use, modify, and share!

---

## 🤝 Contributing

Want to improve this project?

1. Fork the repository
2. Create a branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit (`git commit -m 'Add amazing feature'`)
5. Push (`git push origin feature/amazing-feature`)
6. Open a pull request

---

## 💬 Support

Having issues? Ideas for improvement?

- Check the [Troubleshooting](#-troubleshooting) section
- Review the [Testing Checklist](#-testing-checklist)
- Open an issue on GitHub (if public repo)

---

## 🏊 Good Luck with Your Training!

Remember:
- **Consistency** beats intensity
- **Rest** is part of training
- **Listen** to your body
- **Export** your data regularly
- **Trust** the process

See you at the Midmar Mile! 🎉
