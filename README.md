# INE Product Price Tracker (Web Scraping)

A resilient full-stack web application that tracks product prices and stock availability from INE's mock storefront ([https://demo.inelabteamdev.com](https://demo.inelabteamdev.com)) across scheduled intervals.

Built for the **INE Software Engineer Intern Assignment**.

---

## 🚀 Live Deployment & Links

* **Live Frontend (Vercel):** *[Insert your Vercel URL here]*
* **Live Backend (Render):** *[Insert your Render URL here]*
* **Target Mock Storefront:** [https://demo.inelabteamdev.com](https://demo.inelabteamdev.com)
* **Design Note:** [docs/DESIGN_NOTE.md](docs/DESIGN_NOTE.md)
* **Screen Recording Walkthrough:** [docs/RECORDING_GUIDE.md](docs/RECORDING_GUIDE.md)

---

## 🛠️ Tech Stack

* **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Recharts (Chart & Table visualization)
* **Backend:** Node.js (Express), Playwright (Chromium browser engine), Axios (Lightweight catalog client)
* **Database:** Supabase (PostgreSQL) with automatic local persistent store fallback for offline execution
* **Scheduler:** Webhook endpoint (`POST /api/cron/scrape`) for `cron-job.org` + internal background scheduler
* **CI/CD:** GitHub Actions workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))

---

## 🌟 Key Features

1. **Lightweight Catalog Search:** Instant search across 1,000+ mock store products by partial or full name, brand, SKU, and category using lightweight HTTP calls without browser overhead.
2. **Resilient Browser Scraping Engine:**
   * **Simulated Human Interaction:** Executes 12-point curved mouse trajectories and 800ms hover dwell over `.price-block` to pass the client-side gatekeeper.
   * **Dropped Click Chaos Recovery:** Bypasses the store's 17.5% dropped-click filter by actively detecting idle states and re-issuing clicks.
   * **Storefront Error Recovery:** Automatically detects *"Couldn't load the price"* messages and clicks *"Try again"* with backoff.
   * **Honeypot Decoy Immunity:** Filters out hidden decoy elements (`.price-value`, `[data-price="true"]`, and `display: none`) to capture only the authentic visible price.
   * **Text & Unicode Normalization:** Cleans zero-width spaces (`\u200B`), non-breaking spaces, full-width unicode numerals (`\uFF10`–`\uFF19`), and Euro decimal formatting.
   * **Dynamic Stock Parser:** Extracts integer stock quantities across all 5 copy patterns or flags Out of Stock.
3. **Observable (Headed) Mode:** CLI runner with slow-motion execution (`npm run scrape:headed -- <id>`) for visual inspection and screen recording.
4. **Honest Scrape History & Logs:** Records every single scrape attempt with timestamp, attempt count, latency in milliseconds, outcome badge (`SUCCESS`, `RETRIED`, `FAILED`), and diagnostic error messages.
5. **Bonus Capabilities:**
   * In-app alerts for price drops and restocked items.
   * Storefront structure change detection (DOM integrity monitor).
   * Configurable scrape cadence per product (1h, 2h, 4h, 12h, 24h).

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
# Server Port
PORT=5000
NODE_ENV=development

# Target Mock Storefront
MOCK_STORE_URL=https://demo.inelabteamdev.com

# Supabase (PostgreSQL)
# (Optional locally; if omitted, backend transparently uses persistent local store at backend/data/db.json)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-or-service-key

# Secret token protecting external cron webhook POST /api/cron/scrape
CRON_SECRET=super-secret-cron-token-123
```

### Frontend (`frontend/.env`)

```env
# Optional: defaults to local proxy in dev or relative /api
VITE_API_URL=http://localhost:5000
```

---

## 📦 Setup & Local Development Instructions

### Prerequisites
* Node.js v20+ and npm v10+

### 1. Clone Repository & Install Dependencies
```bash
git clone <your-repo-url>
cd ScrapperAssingment

# Install dependencies across root, backend, and frontend:
npm run install:all
```

### 2. Install Playwright Chromium Browser
```bash
cd backend
npx playwright install chromium
cd ..
```

### 3. Start Both Services in Development
```bash
npm run dev
```
* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend:** [http://localhost:5000](http://localhost:5000)

---

## 🎥 Running the Headed Scraper (Observable Mode)

To watch the browser navigate, hover, dwell, click, recover from retries, and extract genuine prices in real time:

```bash
# Run against product #533 (Nordkraft Smart Plug Two):
npm run scrape:headed -- 533

# Or test any other product ID (e.g. 447, 587):
npm run scrape:headed -- 447
```

Follow the step-by-step guide in [docs/RECORDING_GUIDE.md](docs/RECORDING_GUIDE.md) to record your 2–4 minute video demonstration.

---

## 🧪 Running Automated Tests

Run the automated verification test suite:

```bash
npm test
```
*Verifies lightweight catalog search, details retrieval, database operations, Playwright human simulation against the live mock store, and honest scrape logging.*

---

## ⏰ Scraping Schedule & Free-Tier Backend Handling

### The Problem: Free-Tier Backends Sleep
Free-tier hosting providers (like Render.com) spin down instances after 15 minutes of idle time, which would stop an internal `setInterval` loop.

### The Solution: External Cron Webhook
1. The backend exposes:
   ```http
   POST /api/cron/scrape
   Header: x-cron-secret: <CRON_SECRET>
   ```
2. In **[cron-job.org](https://cron-job.org)**:
   * **URL:** `https://your-render-backend.onrender.com/api/cron/scrape`
   * **Schedule:** Every 2 hours (`0 */2 * * *`)
   * **Header:** `x-cron-secret: <your-cron-secret>`
3. The incoming HTTP request wakes up the Render container, runs the scrape cycle for all due products, updates price history, and logs every attempt honestly.

---

## 🗄️ Database Setup (Supabase PostgreSQL)

If connecting to Supabase:
1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy and run the DDL script from [`backend/src/db/schema.sql`](backend/src/db/schema.sql).
4. Paste your `SUPABASE_URL` and `SUPABASE_KEY` into `backend/.env`.

---

## 🚢 Deployment Guide

### Backend on Render.com
1. Create a new **Web Service** on Render connected to this repository.
2. **Root Directory:** `backend`
3. **Build Command:** `npm install && npx playwright install --with-deps chromium`
4. **Start Command:** `npm start`
5. Add environment variables (`SUPABASE_URL`, `SUPABASE_KEY`, `CRON_SECRET`).

### Frontend on Vercel
1. Create a new project on Vercel connected to this repository.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite
4. Add environment variable: `VITE_API_URL` pointing to your deployed Render backend URL.
