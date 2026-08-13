SuperVisor: Ms. Bandar Vaishnavi,

Email: vaishnavi1806@vardhaman.org,

Contact: 9966508284

# MINI PROJECT —JWT_Recruitment

Pulls remote job listings from multiple job boards (via Apify Actors),
normalizes them into one schema, de-dupes overlapping postings, and serves
them through a small API + a searchable/filterable frontend.

## Why this project is a good portfolio piece

- Real data pipeline: multiple sources → normalization → de-dupe → storage
- A small but complete full-stack app: Express API + React frontend
- Room to grow: add scheduling, alerts, a real database, auth, etc.

## Architecture

```
backend/
  lib/normalize.js   -> maps each source's raw fields into one common schema
  lib/apify.js        -> calls Apify Actors, normalizes + dedupes, writes data/jobs.json
  routes/jobs.js       -> Express routes: /api/jobs, /api/jobs/tags, /api/jobs/sources
  data/jobs.json       -> sample data so the app runs without Apify configured yet
  server.js            -> Express entry point

frontend/
  src/App.jsx           -> main page, holds filter state
  src/components/       -> JobRow (departures-board style row), FilterBar
  src/api.js             -> fetch wrappers for the backend API
```

## Running it locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then add your Apify token
npm start                # runs on http://localhost:4000
```

The app ships with **sample data** in `data/jobs.json`, so you can run the
frontend immediately without an Apify account.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # runs on http://localhost:5173
```

Vite proxies `/api` requests to `http://localhost:4000`, so just open
`http://localhost:5173`.

## Wiring up real data via Apify

1. Sign up at apify.com and grab your API token (Console → Settings →
   Integrations).
2. Paste it into `backend/.env` as `APIFY_TOKEN`.
3. In `backend/.env`, set `APIFY_ACTORS` to a comma-separated list of Actor
   IDs. Good starting points on Apify Store for remote job boards:
   - a Remote OK scraper
   - a Remotive scraper
   - a Remote.co scraper
4. Run:
   ```bash
   cd backend
   npm run fetch-jobs
   ```
   This calls each Actor, normalizes the results with `lib/normalize.js`,
   de-dupes across sources, and overwrites `data/jobs.json`.
5. Restart the backend (or just refresh — it reads the file fresh on each
   request) and reload the frontend.

## User accounts & saved jobs

There's now a real database: **SQLite**, stored as a single file at
`backend/data/app.db`. This uses Node.js's own **built-in** `node:sqlite`
module (stable since Node 22.13/23.4, no extra flag needed) — not the
`better-sqlite3` npm package, deliberately, because that package requires
compiling native C++ code and needs Visual Studio Build Tools installed on
Windows. The built-in module needs nothing extra: just Node.js itself.

**Requires Node.js 22.13.0 or later** (run `node -v` to check). You'll see
one harmless `ExperimentalWarning: SQLite is an experimental feature`
message in the console — that's expected and doesn't affect functionality.

**What's stored:**
- `users` table — email + bcrypt-hashed password (never plaintext)
- `saved_jobs` table — links a user to the job IDs they've bookmarked

**How auth works:**
- Signup/login return a JWT, stored in the browser's `localStorage`
- Every saved-jobs request sends that token in an `Authorization: Bearer` header
- The backend verifies it on every request via `requireAuth` middleware

**To see the raw database file:**
Install the free **DB Browser for SQLite** (https://sqlitebrowser.org) and
open `backend/data/app.db` — you can click through the `users` and
`saved_jobs` tables visually, like a mini spreadsheet.

**API endpoints added:**
- `POST /api/auth/signup` — `{ email, password }` → `{ token, user }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `GET /api/auth/me` — returns the current user (requires auth header)
- `GET /api/saved-jobs` — full job objects the current user saved (requires auth)
- `POST /api/saved-jobs` — `{ jobId }` → saves a job for the current user
- `DELETE /api/saved-jobs/:jobId` — removes a saved job

**In the UI:** click "Log in / Sign up" in the header, then click the ☆ on
any job row to save it. Toggle "★ Saved" in the header to see just your
saved jobs.

## Protecting against fake jobs / fake companies/posts

Job boards are a common target for scams (fake "recruiters" asking for
upfront fees, wire transfers, etc.), so there are two layers of protection
built in:

1. **Automatic red-flag scoring** (`backend/lib/verify.js`) — every job is
   scanned for common scam patterns (upfront fees, wire-transfer language,
   "no interview needed," personal email contacts, shortened links instead
   of a real company page, etc.) and given a `trustScore` (0–100) plus a
   list of specific `flags`. Listings scoring below 60 get a `⚠ review`
   badge in the UI.

2. **Manual company allowlist** (`backend/data/company-allowlist.json`) —
   this is the only thing that grants the `✓ verified` badge. Add a
   company's exact name once you've personally confirmed it's real (e.g.
   checked their official site, LinkedIn, or a company registry), and every
   job from that company gets marked `verified: true`. The "Verified
   companies only" toggle in the UI filters to just this allowlist.

**Why two layers instead of one automatic check:** there's no reliable,
free way to confirm a company is legitimate purely from a job posting's
text — that needs either a paid verification API (e.g. a business
registry lookup) or human judgement. The scorer catches obvious scam
language automatically; the allowlist is the actual "certified" signal,
and it's on you to curate it.

To extend this further: swap the allowlist for a real database, add an
admin UI for approving companies, or plug in a company-verification API
(e.g. Clearbit, OpenCorporates) to `verify.js` instead of maintaining the
list by hand.

## Adding a new source

1. Write a new mapper function in `backend/lib/normalize.js` that converts
   that source's raw fields into the common job shape.
2. Register it in the `NORMALIZERS` map.
3. Add the matching Actor ID to `APIFY_ACTORS` in `.env`, and extend
   `pickNormalizer()` in `lib/apify.js` to route to your new mapper.

## Next steps / ideas to extend this for your resume

- Swap the flat `jobs.json` file for a real database (Postgres via Prisma,
  or MongoDB) once you're comfortable with the pipeline.
- Add a scheduled job (cron, or a scheduled Apify Actor run) so data
  refreshes automatically instead of running `fetch-jobs` manually.
- Add saved searches + email/Slack alerts for new matching postings.
- Deploy: frontend to Vercel, backend to Railway or Render.
