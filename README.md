# UpTop Cavs Betting

## Project overview
UpTop Cavs Betting is a full-stack prototype for a single-team sportsbook experience focused on the Cleveland Cavaliers. It uses a NestJS backend, a Next.js 14 App Router frontend, MongoDB for persistence, and integrates with The Odds API for live lines. The goal is to demonstrate ingesting and settling a single upcoming game with simple spread betting.

## High-level architecture
- Backend: NestJS modules for Games, Bets, Auth; MongoDB via Mongoose; DTO validation; JWT auth with admin vs regular roles.
- Frontend: Next.js 14 App Router with server + client components; lightweight Rain-style theme; API helpers for backend calls.
- External: The Odds API as the upstream lines provider (FanDuel spreads).

## Features
- User login/logout with JWT-backed sessions; admin vs regular user roles.
- Admin-only “next game” seeding from live Odds API data.
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

## Environment variables
Backend (`backend/.env`):
- `MONGODB_URI` – MongoDB connection string.
- `ODDS_API_KEY` – The Odds API key for live odds ingestion.
- `JWT_SECRET` – Secret for signing JWTs.
- `NODE_ENV` – Node environment flag.
- `PORT` – Backend HTTP port (default 3001).
- `DEV_SEED_ENABLED` – Enables dev seed endpoints (live seed and fake demo seed) when `true`.
- `FOCUS_TEAM_NAME` – Team to target for odds (defaults to `Cleveland Cavaliers`; e.g., set to `Indiana Pacers` to test another team).

Frontend (`frontend/.env.local` or similar):
- `NEXT_PUBLIC_API_BASE_URL` – Base URL for the backend API (e.g., `http://localhost:3001`).
- `NEXT_PUBLIC_DEV_SEED_ENABLED` – Toggles visibility of admin seed controls when `true`.

## Running the project locally
1) Clone the repo.  
2) Install dependencies in `backend/` and `frontend/` (`npm install`).  
3) Create `.env` files for backend and frontend using the variables above.  
4) Start MongoDB locally.  
5) Run the backend: `cd backend && npm run start:dev`.  
6) Run the frontend: `cd frontend && npm run dev`.  
7) Useful scripts: backend `npm run start:dev`; frontend `npm run dev` (add tests/scripts as needed).

## Workflows and how to use the app
- As admin:
  - Log in.
  - Use “Seed dev game” to pull the next Cavs game from The Odds API (when odds exist).
  - Use “Seed demo game (fake data)” to create a Cavs vs random opponent demo matchup when no live market exists.
  - Enter final scores and settle the game.
  - Optionally reset demo data to clear games/bets.
- As a regular user:
  - Log in.
  - View the next game card.
  - Place a bet on Cavs or opponent side.
  - After admin settlement, view bet result and points total.

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
