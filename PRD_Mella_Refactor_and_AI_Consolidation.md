# Mella Market Hub PRD

## Overview

Mella Market Hub is a two-app Supabase-backed platform:

- Main customer app: marketplace, profiles, messaging, emergency requests, booking flow, and AI helpers.
- Worker app: responder dashboard, emergency request management, live location sharing, and earnings.
- Admin dashboard: user, worker, job, payment, report, and emergency management.

This PRD documents the refactor requested to:

- Fix the emergency decline flow so it behaves like an Uber-style worker queue.
- Remove duplicate admin login / emergency admin page logic that is not used in production.
- Remove the Gemini first-aid chatbot path and use the shared Groq/OpenRouter assistant only.
- Clean up unnecessary code while keeping the customer app, worker dashboard, and admin dashboard working.

## Current Production Entry Points

- Customer app: `https://mella-xi.vercel.app/`
- Admin dashboard: `https://mella-xi.vercel.app/admin-login`
- Worker dashboard: `https://mella-worker.vercel.app/dashboard`

## Goals

1. Keep the three live experiences stable.
2. Make emergency request decline behavior deterministic and backend-driven.
3. Reduce duplicate, dead, or confusing code paths.
4. Consolidate AI usage so only the Groq/OpenRouter path is used for assistant and first-aid flows.
5. Preserve current UX, realtime updates, and Supabase-driven state changes.

## Implemented Changes

### Emergency Queue Logic

The worker emergency flow now follows an Uber-style pattern:

- A worker declines a request by setting `status = 'declined'`.
- The database trigger on `emergency_requests` reassigns the request to another eligible worker.
- The trigger then resets the request back to `pending` so the new worker can receive it.
- Worker-side client code no longer re-queues the request manually.

This keeps the reassignment logic centralized in the database instead of split between frontend and backend.

### Admin Cleanup

Removed the unused duplicate admin-login page logic:

- Deleted the unused page component that was not part of the deployed dashboard experience.
- Kept `/admin-login` pointing to the real dashboard experience used in production.
- Removed the unused emergency admin panel page file that was not routed.

The admin dashboard remains the actual management surface used after deployment.

### AI Consolidation

Removed the Gemini first-aid service path and switched first-aid guidance to the shared OpenRouter-based assistant:

- General assistant continues to use the shared OpenRouter integration.
- The separate Gemini first-aid chatbot component and service file were removed.
- The global floating assistant now loads only the Groq/OpenRouter-powered Mella assistant.
- Assistant code is lazy-loaded so the chatbot does not bloat the initial page bundle.

### Emergency UX Improvements

Added faster emergency reporting helpers without changing the core request flow:

- One-tap preset reasons were added to the emergency request modal.
- Users can still type a custom emergency description when needed.
- The decline/reassignment flow remains backend-driven so the next responder gets the request after a decline.

### Marketplace Translation

Added lightweight multilingual translation helpers for marketplace content and chat:

- Post drafts can be auto-translated from the composer.
- Message drafts can be translated before sending.
- Translation uses the shared Groq/OpenRouter helper, so no paid external translation service is required.

## Functional Scope

### Customer App

Must continue to support:

- Landing page marketplace browsing
- Search, category, and distance filtering
- Map and list views
- Posting ads/services/products/rentals
- Image uploads to Supabase storage
- Booking requests and booking tracking
- Messaging
- Profile management
- Emergency requests
- Shared AI assistant
- General AI assistant

### Worker App

Must continue to support:

- Worker signup and login
- Live worker location updates
- Emergency request intake
- Accept / decline / en-route / complete flows
- Live map tracking
- Earnings dashboard
- Demand heatmap

### Admin Dashboard

Must continue to support:

- Dashboard metrics
- User management
- Worker management
- Emergency monitoring
- Job management
- Payment monitoring
- Reporting

## Backend Logic Requirements

### Emergency Decline Flow

Source of truth:

- Supabase `emergency_requests` table
- Database trigger in `supabase/migrations/20260511_worker_integration_updates.sql`

Required behavior:

1. Worker receives a request.
2. Worker clicks Decline.
3. Frontend updates the record to `status = 'declined'`.
4. Database trigger finds the next eligible worker who has not already declined the request.
5. Trigger assigns that worker and resets the request to `pending`.
6. Realtime updates notify the next worker instantly.

Acceptance criteria:

- A declined request is not left in a dead state.
- The request is not manually re-queued by the frontend.
- The original worker does not keep getting the same request again in the same session.

### Admin Access

Source of truth:

- `profiles.user_type = 'admin'`
- Admin auth check in Supabase-backed app state

Required behavior:

- `/admin-login` opens the production admin dashboard.
- Unused duplicate admin page code is not part of the shipped experience.

### AI Assistant Flow

Source of truth:

- OpenRouter-based assistant helper

Required behavior:

- General assistant keeps marketplace / platform help.
- The deprecated Gemini first-aid chatbot is not used.
- Voice and language features remain available.

## Non-Goals

- Rebuilding the entire UI design system
- Changing the customer homepage layout
- Changing the worker dashboard domain setup
- Replacing Supabase as the backend
- Adding paid AI dependencies

## Recent Emergency & Response Features (July 2026)

### Emergency Responder Category Buttons
- **Hero section** (`SearchHero.tsx`) shows per-category responder counts fetched from `useWorkerLocations` hook, filtering by police/ambulance/fire_truck/traffic_police/tow_truck.
- Clicking a category navigates to `/emergency` with the category pre-selected.
- **Bottom nav bar**: Removed the saved/favorites button and badge.

### Dark Mode
- App-wide dark mode via Tailwind `dark:` class strategy with `ThemeContext`, localStorage persistence, system-preference detection, and toggle in Navbar.
- Covered: `Navbar.tsx`, `SearchBar.tsx`, `Index.tsx` containers/sections, `Footer.tsx`.

### En-Route Location Simulation
- **Worker Dashboard** (`Dashboard.tsx`): `startEnRouteSim()` runs a 60-step interval (2s each) moving `responder_location_lat/lng` from the worker's current location toward the user's location.
- Updates written directly to `emergency_requests` via Supabase.
- If start ≈ end (both default coords), auto-applies a +0.02° offset for visible movement.
- Simulation logs each step for debugging.

### Live Tracking Map (SVG — No Google Maps Dependency)
- **TrackingMapGoogle.tsx**: Replaced Google Maps `@react-google-maps/api` with a zero-dependency SVG component.
- **Root cause fixed:** `LoadScript` in `@react-google-maps/api` v2.20.8 has **no `onError` prop** — the canvas fallback was silently ignored. When the Google Maps API failed to load, `Marker` crashed with `ReferenceError: google is not defined`, which the route-level `ErrorBoundary` caught, blanking the entire Emergency page with "Something went wrong".
- SVG map renders immediately with: user marker (blue circle), responder marker (red card + emoji), connecting dashed line, animated pulse ring, cross-street lines, distance scale, and live indicator.
- ETA calculated via Haversine distance ÷ 30 km/h × traffic multiplier (rush hour 1.8×, night 0.8×).
- User subscribes to `responder-tracking-{requestId}` channel for real-time `responder_location_lat/lng` updates.

### Voice Call (WebRTC)
- **Flow**: User app initiates call request → Worker receives notification with Accept/Decline → WebRTC peer connection via Google STUN + Supabase Realtime broadcast signaling on channel `call-{requestId}`.
- Main app `useVoiceCall` sends `call_request`, waits for `call_accepted`, then sends WebRTC offer.
- Worker app `useVoiceCall` auto-listens via `listen()` on mount, handles `call_request` → sets `incomingCall=true`, exposes `acceptCall()` and `declineCall()`.
- **Incoming call modal** in worker Dashboard with Accept (green) / Decline (red) buttons.
- Microphone tracks properly stopped on end-call via `getTracks().forEach(t => t.stop())` + `srcObject = null`.
- Fixed stale closure bug in channel handlers by using `callStatusRef`.

### Real-Time Status Sync
- Worker clicks "MARK COMPLETED" or "CANCEL" → `updateStatus()` updates `emergency_requests` → user's real-time subscription on `active-request-{id}` fires.
- User sees Sonner toast and `activeRequest` is cleared.
- Fixed bug where toast exceptions (`try/catch`) swallowed `setActiveRequest(null)`, leaving the UI stuck showing a completed/cancelled request.

### Sound Notification (Web Audio API)
- Replaced `<audio>` element siren with Web Audio API oscillator (880/660 Hz alternating).
- Persistent `AudioContext` created on first user interaction to satisfy browser autoplay policy.

### Voice Call Button Visibility
- Voice Call button only appears in the **user app** tracking popup (when status is `en_route`).
- **Worker app** no longer has a CALL button; instead it receives incoming call notifications.

### Google Maps API
- `MapViewGoogle.tsx` and `DemandHeatmapGoogle.tsx` still use `@react-google-maps/api` with `LoadScript` and `VITE_GOOGLE_MAPS_API_KEY`.
- **`TrackingMapGoogle.tsx` removed Google Maps dependency** — replaced with zero-dependency SVG because `LoadScript` in v2.20.8 lacks `onError` support. When API key is missing/invalid, `Marker` crashes with `ReferenceError: google is not defined`, caught by ErrorBoundary, blanking the page.
- Other Google Maps components (`MapViewGoogle.tsx`, `DemandHeatmapGoogle.tsx`) still work; only the TrackingMap was affected because the user's tracking popup renders inside the route-level ErrorBoundary.

## Verification

Builds completed successfully for:

- Main app (`npx tsc --noEmit` + `vite build`)
- Worker app (`npx tsc --noEmit` + `vite build`)

## Follow-Up Improvements

1. Extract duplicate haversine / distance helpers into one shared utility.
2. Lazy-load heavy map and chatbot components.
3. Add more backend-side validation for emergency request reassignment.
4. Add saved searches and better empty states.
5. Add searchable and filterable admin tables for faster moderation.
6. Consider splitting more heavy map views into lazy-loaded routes if bundle size remains high.
7. Add a call-request timeout so the user sees a "No answer" state if the worker doesn't respond within 30s.
8. Persist the OpenRouter model selection so the admin can switch between models without redeploying.
