# CodeSlam — Production Deployment Guide

No Docker required. Backend → Railway. Frontend → Vercel.

## Prerequisites

- GitHub repo with this code
- Clerk account (clerk.com) — free tier is fine
- Railway account (railway.app) — free tier is fine to start
- Vercel account (vercel.com) — free tier is fine
- Optional: Anthropic API key for AI coach (console.anthropic.com)
- Optional: Judge0 RapidAPI key for higher submission limits (rapidapi.com/judge0-official)

## Step 1 — Deploy the backend to Railway

1. Go to railway.app → New Project → Deploy from GitHub repo
2. Select your repo, set the root directory to: backend/
3. Railway detects the Dockerfile automatically and builds the Spring Boot jar
4. Click "Add Plugin" → MySQL → Railway sets SPRING*DATASOURCE*\* env vars automatically
5. Click "Add Plugin" → Redis → Railway sets SPRING_DATA_REDIS_URL automatically
6. Go to the backend service → Variables tab → add these manually:
   - CLERK_JWKS_URL = (copy from Clerk dashboard → your app → API Keys → JWKS endpoint)
   - CLERK_WEBHOOK_SECRET = (copy from Clerk webhook settings — set this up in Step 3)
   - JUDGE0_URL = https://ce.judge0.com
   - JUDGE0_API_KEY = (leave blank for free tier, or add RapidAPI key for production)
   - FRONTEND_URL = https://your-app.vercel.app (update after Step 2)
   - AUTH_JWT_SECRET_BASE64 = (generate: openssl rand -base64 64)
   - ANTHROPIC_API_KEY = (optional — for AI coach feature)
7. Railway triggers a deploy. Wait for it to go green.
8. Copy your Railway backend URL: https://your-backend.up.railway.app

## Step 2 — Deploy the frontend to Vercel

1. Go to vercel.com → New Project → Import your GitHub repo
2. Set the Root Directory to: frontend/
3. Framework Preset: Next.js (auto-detected)
4. Override the Install Command to: pnpm install
5. Environment Variables — add these:
   - NEXT*PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live*... (from Clerk production instance)
   - CLERK*SECRET_KEY = sk_live*... (from Clerk production instance)
   - NEXT_PUBLIC_API_URL = https://your-backend.up.railway.app (from Step 1)
6. Click Deploy. Vercel builds and deploys automatically.
7. Copy your Vercel URL: https://your-app.vercel.app

## Step 3 — Set up Clerk (production instance)

1. Go to clerk.com → Create application → choose a name
2. Go to API Keys → copy the Publishable Key and Secret Key (used in Step 2)
3. Go to the JWKS URL shown on that page (looks like https://xxx.clerk.accounts.dev/.well-known/jwks.json)
   → copy it → paste into Railway as CLERK_JWKS_URL
4. Go to Webhooks → Add Endpoint:
   - URL: https://your-backend.up.railway.app/api/webhooks/clerk
   - Subscribe to events: user.created, user.updated
   - Copy the Signing Secret → paste into Railway as CLERK_WEBHOOK_SECRET
5. Go to Paths (or JWT Templates) → set:
   - After sign-in URL: https://your-app.vercel.app/dashboard
   - After sign-up URL: https://your-app.vercel.app/onboarding
6. Go back to Railway → update FRONTEND_URL to https://your-app.vercel.app → redeploy

## Step 4 — Add Railway token to GitHub (for CI/CD)

1. Go to railway.app → Account Settings → Tokens → Create token
2. Go to your GitHub repo → Settings → Secrets and variables → Actions
3. Add secret: RAILWAY_TOKEN = (paste the Railway token)
4. From now on, every push to main that touches backend/ will auto-deploy

## Step 5 — Add GitHub Actions secrets for Vercel (optional)

Vercel auto-deploys from GitHub without any Action needed.
The frontend-ci.yml workflow only does a build check on PRs.
No additional secrets needed for the frontend.

## Step 6 — Verify everything works

1. Visit https://your-app.vercel.app
2. Sign up → you should be redirected to /onboarding
3. Complete onboarding → you should land on /dashboard
4. Click "Find Match" — after pairing you should be taken to /arena/{matchId}
5. Submit code → Judge0 should return a verdict and update HP
6. When a player reaches 0 HP → match ends → both players go to /match/{id}/result

## Local development (no Docker needed)

1. Start MySQL locally:
   macOS: brew install mysql && brew services start mysql
   Ubuntu: sudo apt install mysql-server && sudo systemctl start mysql
   Windows: install MySQL Community Server from mysql.com
   Then: mysql -u root -e "CREATE DATABASE codeslam;"

2. Start Redis locally:
   macOS: brew install redis && brew services start redis
   Ubuntu: sudo apt install redis-server && sudo systemctl start redis
   Windows: use WSL or Memurai (redis for windows)

3. Start the backend:
   cd backend
   cp ../DEPLOYMENT.md . # just for reference
   Create src/main/resources/application-local.yml with your local values if needed
   mvn spring-boot:run

4. Start the frontend:
   cd frontend
   cp .env.local.example .env.local

   # Edit .env.local: set your Clerk dev keys and NEXT_PUBLIC_API_URL=http://localhost:8080

   pnpm install
   pnpm dev

5. The Vite proxy in next.config.ts forwards /api/\* and /ws to localhost:8080 in dev mode.

## Environment variables reference

### Backend (Railway)

| Variable                   | Required  | Description                                                             |
| -------------------------- | --------- | ----------------------------------------------------------------------- |
| SPRING_DATASOURCE_URL      | ✅ auto   | Set by Railway MySQL plugin                                             |
| SPRING_DATASOURCE_USERNAME | ✅ auto   | Set by Railway MySQL plugin                                             |
| SPRING_DATASOURCE_PASSWORD | ✅ auto   | Set by Railway MySQL plugin                                             |
| SPRING_DATA_REDIS_URL      | ✅ auto   | Set by Railway Redis plugin                                             |
| CLERK_JWKS_URL             | ✅ manual | From Clerk dashboard                                                    |
| CLERK_WEBHOOK_SECRET       | ✅ manual | From Clerk webhook settings                                             |
| FRONTEND_URL               | ✅ manual | Your Vercel app URL                                                     |
| AUTH_JWT_SECRET_BASE64     | ✅ manual | Run: openssl rand -base64 64                                            |
| JUDGE0_URL                 | ✅ manual | https://ce.judge0.com (free) or https://judge0-ce.p.rapidapi.com (paid) |
| JUDGE0_API_KEY             | optional  | RapidAPI key for Judge0 (not needed for ce.judge0.com)                  |
| ANTHROPIC_API_KEY          | optional  | Enables AI coach on match result page                                   |

### Frontend (Vercel)

| Variable                          | Required | Description              |
| --------------------------------- | -------- | ------------------------ |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | ✅       | From Clerk dashboard     |
| CLERK_SECRET_KEY                  | ✅       | From Clerk dashboard     |
| NEXT_PUBLIC_API_URL               | ✅       | Your Railway backend URL |
| NEXT_PUBLIC_VERCEL_OG_BASE_URL    | optional | For share card OG images |
