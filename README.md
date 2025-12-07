# UpTop Cavaliers Betting

## Project Overview
This repo implements a play-to-earn Cavaliers betting demo built for the UpTop coding challenge.  
It uses a Next.js 14 App Router frontend (NextAuth + Tailwind) backed by a NestJS API with JWT authentication and MongoDB.  
The core flow: seed a Cavs game, place spread bets, let an admin settle the game, and view win/loss results in “My Bets.”

---

## Features
- Email/password authentication via NextAuth Credentials Provider + JWTs issued by the NestJS backend.  
- User vs Admin roles (admin@example.com is the only admin).  
- “Next Cavs Game” card with:
  - Dev game seeding (admin only)  
  - Read-only view for logged-out users  
- User-scoped betting with Cavs vs opponent spread selection.  
- “My Bets” history tied to the authenticated user.  
- Admin-only settlement that finalizes a game and updates related bets to won/lost.  
- Clean and consistent loading, empty, logged-out, and finalized-game states.

---

## Tech Stack

### Frontend
- Next.js 14 (App Router)  
- TypeScript  
- Tailwind CSS  
- NextAuth (Credentials provider)

### Backend
- NestJS  
- TypeScript  
- MongoDB + Mongoose  
- JWT-based authentication with AdminGuard

### Tooling
- Monorepo structure (`frontend/` and `backend/`)  
- dotenv-driven configuration  
- MongoDB Compass for debugging  
- Next/Nest dev and build scripts  

---

## Getting Started

### Prerequisites
- Node.js 18+  
- MongoDB running locally (Docker, Homebrew, or MongoDB Compass)

---

### Environment Variables

Create a `.env` file in **backend/**:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/uptop
JWT_SECRET=dev-secret
ODDS_API_KEY=your_key_here
```

Create a `.env.local` file in **frontend/**:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Run the Backend

```bash
cd backend
npm run start:dev
```

Backend runs at:  
http://localhost:3001

### Run the Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at:  
http://localhost:3000

---

## Demo Accounts

**User Account**  
- Email: user@example.com  
- Password: password  
- Can view games, place bets, and see My Bets  
- Cannot seed or settle games  

**Admin Account**  
- Email: admin@example.com  
- Password: admin  
- Can seed dev games, settle games, and place bets  

---

## Core Flows

**Admin Workflow**  
- Log in as admin@example.com  
- Click “Seed dev game”  
- Optionally place a bet  
- Click “Settle Game”  
- Game moves to final and bets become won/lost  

**User Workflow**  
- Log in as user@example.com  
- View the upcoming Cavs game  
- Place a spread bet  
- Check status in My Bets  
- Status updates after admin settlement  

**Logged-Out Experience**  
- Can view upcoming game  
- Cannot place bets  
- Cannot view My Bets  

---

## Architecture Notes

**Monorepo Layout**  
```
root/
  backend/     # NestJS API
  frontend/    # Next.js application
```

**Backend Structure**  
- AuthModule — JWT issuance, in-memory user store  
- GamesModule — dev game seeding + retrieval  
- BetsModule — create bets, fetch bets, settle bets  
- AdminGuard — restricts admin actions  

**Frontend Structure**  
- NextAuth credential login  
- JWT stored in session  
- Homepage loads: next game, user bets, admin tools  
- API helpers wrap backend calls  

---

## Future Enhancements
- Integrate real Odds API instead of dev seeding  
- Add cron-based automatic game refresh  
- Persist real user accounts instead of in-memory auth  
- Improve mobile/responsive UI  
- Add backend unit tests for bet and settlement logic  
