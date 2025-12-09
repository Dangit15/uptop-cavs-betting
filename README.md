# UpTop Cavs Betting

## Project overview
UpTop Cavs Betting is a full-stack prototype for a single-team sportsbook experience focused on the Cleveland Cavaliers. It uses a NestJS backend, a Next.js 14 App Router frontend, MongoDB for persistence, and integrates with The Odds API for live lines. The goal is to demonstrate ingesting and settling a single upcoming game with simple spread betting.

## Minimum Required Environment Variables

| Location              | Variable                   | Purpose                      |
| --------------------- | -------------------------- | ---------------------------- |
| backend/.env          | MONGODB_URI                | Local MongoDB connection     |
| backend/.env          | ODDS_API_KEY               | Required for odds-based betting |
| backend/.env          | JWT_SECRET                 | Auth signing key             |
| frontend/.env.local   | NEXTAUTH_SECRET            | Required for login           |
| frontend/.env.local   | NEXT_PUBLIC_BACKEND_URL    | Connect frontend to backend  |
| frontend/.env.local   | NEXTAUTH_URL               | Required for NextAuth callback URLs |

## High-level architecture
- Backend: NestJS modules for Games, Bets, Auth; MongoDB via Mongoose; DTO validation; JWT auth with admin vs regular roles.
- Frontend: Next.js 14 App Router with server + client components; lightweight Rain-style theme; API helpers for backend calls.
- External: The Odds API as the upstream lines provider (FanDuel spreads).

## Features
- User login/logout with JWT-backed sessions; admin vs regular user roles.
- Admin-only “next game” seeding from live Odds API data.
- Admin odds ingestion trigger: `POST /games/next` (admin-only) fetches the next Cavs game with odds from The Odds API and upserts it before betting.
- Dev-only fake demo seeding (Cavs vs random realistic opponent) when no live market exists.
- Bet placement on Cavs side vs opponent side.
- Spread-based settlement with correct grading using final scores and spread.
- Points awarding and bet history per user.
- Reset demo data to clear all games and bets.

## Odds API integration and fallback behavior
- Backend GamesService calls The Odds API `/odds` for `basketball_nba` with `bookmakers=fanduel`, `markets=spreads`.
- Filtering: only events where home or away matches the configured focus team (defaults to Cleveland Cavaliers via `FOCUS_TEAM_NAME`), and only future games. Picks the soonest upcoming game. Spread is normalized to the app convention (negative = Cavs favored).
- Fallback: if no upcoming Cavs game with odds is available, `POST /games/dev/seed` returns `404` with `{ message: 'No upcoming Cavs game found from Odds API' }`; the frontend surfaces this neutrally and keeps the “No active game available” state.
- Fake demo seed: separate dev-only endpoint seeds a Cavs home game vs a random opponent (Bulls, Wizards, Hornets, Knicks, Heat, Celtics) at a realistic tipoff in the next few days with `bookmakerKey: demo`—for demos when no live market exists.

## Local Development Setup

### Environment Variables
Backend (`backend/.env`)
```
MONGODB_URI=mongodb://localhost:27017/cavs-betting-dev
ODDS_API_KEY=YOUR_ODDS_API_KEY_HERE # I'll send my personal key if needed
JWT_SECRET=super-secret-jwt-key-change-this
NODE_ENV=development
PORT=3001
DEV_SEED_ENABLED=true
FOCUS_TEAM_NAME="Cleveland Cavaliers"
ODDS_AUTO_REFRESH_ENABLED=false
ODDS_REFRESH_MS=900000
```
Note: You will need an OddsAPI key only if you want odds-based betting to activate. If you don’t have one, ESPN fallback scheduling still works. Dan will email you his temporary key if needed.

Frontend Environment Variables

frontend/.env.local (required)  
Used by NextAuth and all backend API calls:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXTAUTH_SECRET=some-long-random-string-here
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_DEV_SEED_ENABLED=true
```

frontend/.env (optional fallback for build/dev)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Both `.env.local` and `.env` may be required depending on how your environment boots.  
`.env.local` is mandatory for NextAuth — without these values, login will not work.  
Frontend API calls read `NEXT_PUBLIC_BACKEND_URL`; set it to your backend origin and restart `npm run dev` after changes.  
Dan will email the OddsAPI key separately. Do not commit any `.env` files to source control.

### Installation & Startup
Clone & install
```
git clone <repo-url>
cd uptop-cavs-betting
```

Backend setup
```
cd backend
npm install
npm run start:dev
```
Ensure MongoDB is running locally (e.g., `mongod` against `mongodb://localhost:27017`).

Frontend setup
```
# in another terminal
cd frontend
npm install
npm run dev
```

App runs at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Testing Notes
- E2E tests use `mongodb-memory-server`; if your environment blocks binding, set `E2E_USE_MEMORY_MONGO=false` to skip that suite.
- Watchman can be disabled by ensuring `watchman: false` in Jest config (already set) or exporting `JEST_USE_WATCHMAN=0` when running tests.

### Seeding / Dev Tools
- Reset demo data  
  `POST /admin/reset`  
  Clears all bets, points, and games.
- Admin odds ingestion  
  `POST /games/next` (admin-only)  
  Fetches the next Cavs game with odds from The Odds API and upserts it so betting is enabled on that matchup.
- Seed fake Cavs game  
  `POST /games/dev/seed-fake`  
  Adds a fake Cavaliers matchup with odds so betting can be demonstrated even when no live odds are available.
- Admin settlement (alias)  
  `POST /bets/settle` (admin-only)  
  `POST /games/:gameId/settle` (admin-only)  
  Alias to the existing settlement logic used by `POST /bets/settle`; accepts `{ finalHomeScore, finalAwayScore }` and returns the same response.

The app auto-selects live OddsAPI data when available, otherwise falls back to ESPN scheduling. The fake-game endpoint lets you instantly show the spread/betting workflow.

### Logic Summary (Quick Overview)
- `/games/next` → returns the next Cavs game only if OddsAPI has odds (populated via admin `POST /games/next`). Enables betting UI.
- `/games/next-schedule` → ESPN fallback when no odds exist.  
  The frontend automatically picks odds first, fallback second; no manual toggle required.

### Authentication Overview
The system uses a simple email/password admin login powered by JWT.  
Default logins for local development:  
- Admin: `admin@example.com / admin`  
- User: `user@example.com / password`

### Disclaimer
This project is a coding challenge prototype. Environment variables should not be committed. For Ross/Alex: Dan will email the OddsAPI key needed for live odds testing.

## Workflows and how to use the app
- As admin:
  - Log in.
  - Call `POST /games/next` to ingest the next Cavs game with odds from The Odds API (required before betting on a new matchup).
  - Use “Seed dev game” to pull the next Cavs game from The Odds API (when odds exist).
  - Use “Seed demo game (fake data)” to create a Cavs vs random opponent demo matchup when no live market exists.
  - Enter final scores and settle the game via `POST /bets/settle` (or alias `POST /games/:gameId/settle`).
  - Optionally reset demo data to clear games/bets.
- As a regular user:
  - Log in.
  - View the next game card.
  - Place a bet on Cavs or opponent side.
  - After admin settlement, view bet result and points total.
  - Fetch bet history via `GET /bets` (or legacy `GET /bets/me`).

## Implementation notes / design decisions
- Live Odds API seeding and fake demo seeding are separated and flag-guarded to avoid polluting data and to allow demos when markets are unavailable.
- Spread settlement grades against the stored spread: target margin is `-spread`; final margin vs target determines win/loss/push.
- “No upcoming Cavs game” surfaces as a 404 (not 500) to keep the UI stable and informative.
- DTOs, validation, and consistent logging aim to keep the backend production-like.

## Future improvements / nice-to-haves
- Deploy to managed hosting (e.g., Vercel for frontend, Render/Fly.io for backend).
- Scheduled job to refresh odds automatically instead of manual seeding.
- Additional bet types (moneyline, totals).
- Multi-game history and pagination.
- Real auth provider integration.
