# Mella Responder (Worker App)

Separate web app for responders to accept/decline emergency requests.

## Setup
1. Copy `.env.example` to `.env.local` and fill:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
```
2. Install and run:
```
npm install
npm run dev
```

Open http://localhost:5173 and go to /login, then /dashboard.

Note: Use only the anon public key in the frontend. Rotate any leaked service keys.
