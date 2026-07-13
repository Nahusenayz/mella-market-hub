# Mella Market Hub — Product Requirements Document (PRD)

> **Project:** Mella Market Hub — Ethiopian marketplace + emergency response platform
> **Author:** Senior Full-Stack Developer & UI/UX Designer
> **Date:** July 12, 2026
> **Purpose:** Technology competition strategy — AI-powered, mobile-first, community-driven

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Current Feature Inventory (All 3 Portals)](#2-current-feature-inventory)
3. [Architecture & Tech Stack Summary](#3-architecture--tech-stack-summary)
4. [User Portal (Main App) — Current Features](#4-user-portal-main-app)
5. [Worker Portal (Main App + worker-app) — Current Features](#5-worker-portal)
6. [Admin Portal — Current Features](#6-admin-portal)
7. [Critical Issues & Quick Fixes](#7-critical-issues--quick-fixes)
8. [Phase 1: Mobile-Responsive Redesign](#8-phase-1-mobile-responsive-redesign)
9. [Phase 2: New AI-Powered Winning Features](#9-phase-2-new-ai-powered-winning-features)
10. [Phase 3: Gamification & Community Features](#10-phase-3-gamification--community-features)
11. [Phase 4: Business & Analytics Features](#11-phase-4-business--analytics-features)
12. [Phase 5: Admin Intelligence](#12-phase-5-admin-intelligence)
13. [Implementation Priority Matrix](#13-implementation-priority-matrix)
14. [Competition Differentiators Summary](#14-competition-differentiators-summary)

---

## 1. Project Overview

Mella Market Hub is a dual-platform (user app + worker app) marketplace and emergency response system for Ethiopia. It connects customers with service providers and emergency responders (police, ambulance, fire, tow trucks, traffic control). The platform supports English and Amharic, real-time tracking, AI chat assistant (OpenRouter/Llama 3.1 8B), AI emergency triage, voice-first emergency reporting (Amharic), offline-first AI (Transformers.js), AI price suggestor, and live emergency dispatching.

**Deployment:** Vercel (two separate SPAs)
**Database:** Supabase (PostgreSQL with real-time subscriptions)
**Storage:** Supabase Storage (avatars bucket)
**Auth:** Supabase Auth (email + phone)
**Maps:** Google Maps (MapView, DemandHeatmap) + Mapbox GL JS (3D Map) + SVG Inline (TrackingMap — zero-dependency)
**AI:** OpenRouter (Llama 3.1 8B Instruct) + HuggingFace Transformers.js (client-side)

---

## 2. Current Feature Inventory

### 2.1 Tables in Supabase
- `profiles` — User profiles, ratings, verification status, badges
- `ads` — Marketplace listings (service, sell, rent; property fields)
- `bookings` — Service booking requests with status workflow
- `messages` — In-app messaging between users
- `emergency_requests` — Emergency dispatch with full lifecycle (status: pending/accepted/en_route/completed/cancelled/declined)
- `worker_locations` — Real-time worker GPS tracking with heartbeat
- `certifications` — Worker certifications & qualifications
- `notifications` — Real-time push notifications
- `reviews` — User reviews & ratings (with trigger on profiles.rating)
- `social_activities` — Social feed posts
- `admin_logs` — Admin audit trail
- `typing_indicators` — Real-time typing status in conversations
- `user_follows` — Follow/unfollow between users
- `conversations` — View (not table) for message threading
- `payment_transactions` — Payment tracking records
- `content_translations` — Cached AI translations for user names, listings, etc.

### 2.2 Key Libraries (cost = free)
| Library | Purpose | Cost |
|---------|---------|------|
| Supabase | Auth, DB, Realtime, Storage | Free tier |
| OpenRouter (Llama 3.1 8B Instruct) | AI assistant, translation, price suggestor, emergency triage | Free tier credits |
| HuggingFace Transformers.js | Client-side offline AI classification (Xenova/bert-base-multilingual-uncased-sentiment) | Free (in-browser) |
| Google Maps API (@react-google-maps/api) | 2D maps (MapView, TrackingMap, DemandHeatmap) | Free tier ($200/mo credit) |
| Mapbox GL JS | 3D map (Map3D) | Free tier (50k loads/mo) |
| Leaflet | Fallback 2D maps | Free |
| React Router DOM | Client-side routing | Free |
| TanStack React Query | Server state management + caching | Free |
| Zod | Form/API validation | Free |
| React Hook Form | Form management | Free |
| Recharts | Admin charts | Free |
| i18next + react-i18next | English/Amharic i18n with auto-detection | Free |
| Framer Motion | Animations | Free |
| shadcn/ui + Radix | UI components (40+ primitives) | Free |
| Sonner | Toast notifications | Free |
| Lucide React | Icon library | Free |
| date-fns | Date formatting | Free |
| embla-carousel-react | Carousel components | Free |

---

## 3. Architecture & Tech Stack Summary

```
mella-market-hub/
├── src/                    # Main user-facing app (Vite + React)
│   ├── pages/              # 12 pages (Index, Auth, Emergency, Profile, etc.)
│   ├── components/         # 35+ components + admin/ subfolder
│   ├── hooks/              # 18 custom hooks
│   ├── contexts/           # Auth, Language, Location
│   ├── services/           # groqService.ts (OpenRouter), transformersService.ts (Offline AI)
│   ├── i18n/               # English + Amharic translations (i18next)
│   ├── lib/                # Utils (cn, calculateDistanceKm)
│   ├── data/               # ethiopia_emergency.json (station data)
│   ├── styles/             # admin.css
│   └── integrations/       # Supabase client + types
├── worker-app/             # Separate worker SPA (Vite + React)
│   ├── pages/              # Login, Signup, Dashboard
│   ├── components/         # WorkerEarnings, DemandHeatmapGoogle, WorkerLeaderboard, etc.
│   ├── hooks/              # useEmergencyRequests, useEarnings
│   ├── contexts/           # LanguageContext (Amharic/English)
│   └── integrations/       # Supabase client
├── scripts/                # setup_reviews_table.js, pre_translate_existing.js, build_ethiopia_emergency.ts
└── supabase/               # Migrations & config
```

**Key architectural note:** The Worker Dashboard exists in TWO places:
1. `src/pages/WorkerDashboard.tsx` — Basic version in main app (523 lines)
2. `worker-app/src/pages/Dashboard.tsx` — Advanced version in worker SPA (853 lines)
This duplication should be consolidated into worker-app only.

**AI architecture:**
- **Online AI:** OpenRouter API (`groqService.ts`) → model `meta-llama/llama-3.1-8b-instruct` — used for Mella Assistant, translation, price suggestor, emergency triage
- **Offline AI:** HuggingFace Transformers.js (`transformersService.ts`) → model `Xenova/bert-base-multilingual-uncased-sentiment` — client-side text classification with graceful fallback to OpenRouter
- **Voice:** Web Speech API (`SpeechRecognition`) with `am-ET` locale for Amharic voice input

---

## 4. User Portal (Main App) — Current Features

### 4.1 Marketplace (Index Page)
- [x] Ad listings with real-time Supabase subscription
- [x] Category filter (Safety Alert, Services, Property, etc.)
- [x] Distance filter (0-50km slider, stored in localStorage)
- [x] List/Map view toggle
- [x] Search bar (by query + location + radius via function)
- [x] Ad creation form (AdForm — title, description, category, price, image, location)
- [x] Ad editing & deletion
- [x] Property-specific fields (bedrooms, bathrooms, area, furnished, listing type)
- [x] PostModal — detailed view of listing
- [x] Share Post button
- [x] Responsive stats ticker (responders online)
- [x] Safety Alerts section (filtered from ads)
- [x] 3D Map button (Mapbox)
- [x] ServiceGrid with Book/Message/Profile actions

### 4.2 Emergency Response (Emergency Page)
- [x] 5 emergency categories (Police, Medical, Fire, Traffic, Tow)
- [x] Live responder map (Google Maps via MapViewGoogle)
- [x] Available responder cards with online/offline status and GPS heartbeat
- [x] Uber-like one-click call responder
- [x] Request/accept flow with status updates + real-time Supabase subscription
- [x] Real-time tracking when responder is en route (TrackingMapGoogle)
- [x] Live responder location updates via Supabase subscription
- [x] Cancel request functionality
- [x] Emergency Assistant chatbot (step-by-step guided reporting)
- [x] Emergency stations display (hospitals, police, fire)
- [x] Quick-dial FAB (991 Police, 939 Ambulance, 912 Fire)
- [x] Category filter for responders
- [x] Preset reason buttons for emergency type
- [x] **AI Emergency Triage** — Auto-classifies typed emergency text into category + urgency (Critical/High/Normal) via OpenRouter with 800ms debounce
- [x] **Voice-First Emergency (Amharic)** — Dedicated "Voice Emergency" button using Web Speech API (`am-ET`) that transcribes speech + auto-runs AI triage
- [x] Profile dropdown (profile, messages, sign out)

### 4.3 Authentication (Auth Page)
- [x] Email + Phone sign-up/sign-in
- [x] User type selection (Customer / Service Provider)
- [x] Worker station category selection
- [x] Password strength indicator
- [x] Show/hide password toggle
- [x] Security tip banner
- [x] Smart redirect (workers → worker-dashboard)

### 4.4 User Profile (Profile Page)
- [x] Profile image upload (Supabase Storage)
- [x] Name, email, phone, bio editing
- [x] Rating display
- [x] My Ads tab (CRUD with active/inactive toggle)
- [x] Ad type badges (Service, For Sale, For Rent)
- [x] Certifications tab (add/view certifications)
- [x] Worker Dashboard tab (accept/reject/start bookings)
- [x] Security & Privacy tab (password reset, phone visibility toggle)
- [x] Verification badge display
- [x] Member since, ads count

### 4.5 Messages (Messages Page)
- [x] ConversationsList component
- [x] MessageThread with real-time messaging
- [x] Navigate from service card directly to message
- [x] Back navigation

### 4.6 AI & Smart Features
- [x] Mella Assistant chatbot (OpenRouter/Llama 3.1 8B Instruct)
- [x] AmharicVoiceInput for AI assistant (Web Speech API, `am-ET` locale)
- [x] Emergency Assistant guided chatbot
- [x] AI translation (English ↔ Amharic) via OpenRouter
- [x] AI Price Suggestor — "AI" button in AdForm suggests fair ETB price range with one-click apply
- [x] AI Emergency Triage — Real-time classification of emergency text into category + urgency level
- [x] Voice-First Emergency Reporting — Speak emergency in Amharic → transcribes → AI triages
- [x] Offline-First AI — Transformers.js client-side classification with OpenRouter fallback
- [x] Floating chatbot button (lazy-loaded)

### 4.7 Other
- [x] BottomNavigation (mobile nav bar)
- [x] Floating SOS button (emergency pulse animation)
- [x] ConnectivityWatcher (online/offline detection)
- [x] TowTruckFlow component
- [x] SocialFeed component
- [x] ReviewSystem component (with auto-rating trigger on profiles)
- [x] NotificationSystem with real-time Supabase subscription
- [x] BookingModal for service booking
- [x] Language toggle (English/Amharic) with i18next auto-detection
- [x] LocationContext for geolocation (with permission request)
- [x] SafetyScore component (crime zone alerts)
- [x] Translated component (3-tier cache: memory → DB → OpenRouter)
- [x] Footer (bilingual)

---

## 5. Worker Portal — Current Features

### 5.1 Main App WorkerDashboard (src/pages/WorkerDashboard.tsx)
- [x] Active bookings management with status workflow
- [x] Emergency requests filtered by worker category
- [x] Accept/reject booking requests
- [x] Start trip / Mark completed
- [x] GPS location sharing toggle
- [x] Real-time location tracking for active bookings
- [x] Live TrackingMap for active emergencies
- [x] Message customer from booking
- [x] Completed requests counter
- [x] BookingTracker component

### 5.2 Main App ResponderDashboard (src/pages/ResponderDashboard.tsx)
- [x] Incoming and active emergency requests
- [x] Accept/decline/start en route/complete

### 5.3 Worker SPA (worker-app) — Dashboard.tsx
- [x] Real-time emergency request streaming (Supabase subscription)
- [x] Accept/skip buttons
- [x] Audio alarm for new emergency requests
- [x] Desktop browser notification
- [x] GPS quality indicator (excellent/good/fair/poor/unknown)
- [x] Online/offline toggle with heartbeat (30s interval)
- [x] Worker location upsert to DB
- [x] Active assignments management
- [x] Priority detection (Critical/High/Normal via keyword matching)
- [x] Category-specific themes (Police, Ambulance, Fire, Tow)
- [x] Distance calculation from worker to caller
- [x] Performance stats (monthly jobs, rating, success rate)
- [x] Operations log / Recent Log
- [x] Response Intelligence suggestion (hot zone positioning)
- [x] WorkerEarnings component (total balance, monthly, average, transaction history)
- [x] DemandHeatmap component (Google Maps via DemandHeatmapGoogle — color-coded heat circles)
- [x] EditProfileModal (name, category)
- [x] Mobile bottom navigation (Jobs, Cash, Map, Live status)
- [x] Polish UI with animations, gradients, glass effects
- [x] Cancel mission modal

---

## 6. Admin Portal — Current Features

### 6.1 Authentication
- [x] Admin login with username/password (maps to email)
- [x] Admin registration page
- [x] Session-based access control

### 6.2 Sidebar Navigation
- [x] Dashboard, Users, Workers, Emergencies, Jobs, Payments, Reports
- [x] Mobile hamburger toggle + overlay
- [x] User profile + sign out in sidebar footer

### 6.3 Dashboard Overview
- [x] Stats cards: Total Users, Active Workers, Active Emergencies, Total Jobs, Pending Jobs
- [x] Loading skeleton states

### 6.4 Users Management
- [x] Paginated table of all users
- [x] User details display

### 6.5 Workers Management
- [x] Paginated table with Name, Phone, Verification, Rating, Category, Joined
- [x] Verification toggle (verified/unverified dropdown)
- [x] Suspend worker
- [x] Delete worker (with confirmation)
- [x] Edit worker form modal
- [x] Add worker form
- [x] Skeleton loading states

### 6.6 Emergencies Management
- [x] Paginated table with Time/Category, User, Location, Responder, Status, Actions
- [x] Cancel emergency requests
- [x] Mark completed
- [x] Map View link (Google Maps)
- [x] Error state if table doesn't exist

### 6.7 Jobs Management
- [x] Jobs table (placeholder structure)

### 6.8 Payments Management
- [x] Payments table (placeholder structure)

### 6.9 Reports
- [x] Bar chart: Jobs per Day (last 7 days)
- [x] Bar chart: New Users per Week (last 8 weeks)
- [x] Uses Recharts with responsive container

### 6.10 Admin Styles
- [x] Custom admin CSS with dark sidebar, stats cards, tables, forms
- [x] Responsive mobile layout
- [x] Consistent design system

---

## 7. Remaining Issues & Future Improvements

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| Worker dashboard duplicated (main app + worker-app SPA) | High | ⬜ | Consolidate into worker-app, redirect from main app |
| `as any` type casts in supabase calls | Medium | ⬜ | 15+ remaining occurrences in Emergency.tsx, worker-app |
| `alert()` / `confirm()` used instead of toast modals | Medium | ⬜ | 4 occurrences in Emergency.tsx |
| Hardcoded emergency stations (not from DB) | Low | ⬜ | Move to DB table with real Ethiopian emergency data |
| Mapbox token hardcoded in Map3D.tsx | Medium | ⬜ | Move to env var |
| worker-app has NO eslint config | Low | ⬜ | Add eslint config matching main app |
| No error boundaries | Medium | ⬜ | Add React error boundaries per route |
| No PWA support | High | ⬜ | Add vite PWA plugin for offline capability |
| Booking flow doesn't validate double-booking | Medium | ⬜ | Add conflict detection on worker availability |
| Emergency request doesn't check if worker is still online | Medium | ⬜ | Add is_available check before dispatching |

---

## 8. Phase 1: Mobile-Responsive Redesign (Weeks 1-2)

### 8.1 User Portal Mobile Optimization
Current: BottomNavigation exists but many pages overflow horizontally on mobile.

**Improvements:**
1. **Responsive ServiceGrid** — Currently uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`; add `sm:grid-cols-2` for better phone landscape support
2. **Emergency Page Mobile** — The live tracking popup at bottom needs full-screen option on mobile (swipe up)
3. **Profile page tabs** — Convert horizontal tab bar to a scrollable horizontal pills on mobile
4. **Ad Form** — Full-screen modal on mobile (use vaul drawer instead)
5. **Message thread** — Add swipe-to-go-back gesture
6. **SearchHero** — Reduce height on mobile, make search bar sticky
7. **Category/Distance filters** — Collapse into a horizontal scrollable pill row instead of sidebar
8. **Touch targets** — Ensure all buttons are min 44px (accessibility)

### 8.2 Worker Dashboard Mobile Optimization
Current (worker-app): Has mobile bottom nav but the main content layout is desktop-first.

**Improvements:**
1. **Responsive 3-column layout** → Stack vertically on mobile
2. **Request cards** — Full-width cards with larger touch targets
3. **Floating action button** for quick status changes
4. **Pull-to-refresh** for emergency requests
5. **Gesture-based** accept/reject (swipe right to accept, left to skip)
6. **Mobile-optimized map** for DemandHeatmap (full-height on mobile)
7. **Earnings page** — Card-based layout vs table
8. **GPS signal indicator** — Persistent mini-bar at top

### 8.3 Admin Mobile Optimization
Current: Sidebar has mobile toggle but tables overflow.

**Improvements:**
1. **Responsive tables** → Card layout on mobile (each row becomes a card)
2. **Sticky action bar** at bottom for bulk operations
3. **Simplified stat cards** — 2-column grid on mobile
4. **Dashboard charts** — Scrollable horizontally
5. **Touch-friendly** form inputs

---

## 9. Phase 2: New AI-Powered Winning Features (Weeks 3-5) — Status & Zero-Dep Additions

### ✅ 9.1 AI Price Suggestor (Listing Assistant) — IMPLEMENTED
- **What:** When a user creates an ad, AI analyzes category + description + location to suggest a fair market price
- **How:** Direct OpenRouter call in AdForm.tsx `handleAiPriceSuggest()` — "AI" button next to price field with "Use" button to auto-fill
- **UX:** Purple suggestion bubble with "Suggested: ETB XXX - YYY" + sparkle icon; one-click apply
- **Status:** ✅ Live in `AdForm.tsx`

### ✅ 9.2 AI Emergency Triage & Auto-Dispatch — IMPLEMENTED
- **What:** When a user describes their emergency in text, AI analyzes urgency and suggests the correct responder category + auto-fills details
- **How:** `classifyEmergency()` in `groqService.ts` calls OpenRouter → returns category + urgency; `Emergency.tsx` auto-classifies with 800ms debounce
- **UX:** Color-coded priority badge (Critical=red, High=amber, Normal=green) + auto-selected category icon in request modal
- **Status:** ✅ Live in `Emergency.tsx`

### ✅ 9.3 Voice-First Emergency Reporting (Amharic) — IMPLEMENTED
- **What:** Full voice-based emergency reporting in Amharic using Web Speech API (SpeechRecognition)
- **How:** Browser native SpeechRecognition (`am-ET`) via `AmharicVoiceInput` component; triggers AI triage on transcribed text
- **UX:** Dedicated "Voice Emergency" quick-action button on main Emergency page; voice button in request modal
- **Status:** ✅ Live in `Emergency.tsx` + `AmharicVoiceInput.tsx`

### ✅ 9.4 AI Service Matching & Recommendations — IMPLEMENTED (see §9A.6)
- **What:** Personalized service recommendations based on user search context and category
- **How:** `AIServiceSuggestions.tsx` calls OpenRouter with category + top listing titles → returns 3 suggestions with 2s debounce
- **Status:** ✅ Live in `Index.tsx`

### ✅ 9.5 Smart ETA Prediction — IMPLEMENTED (see §9A.3)
- **What:** AI-enhanced arrival time prediction using OpenRouter with distance + time-of-day context
- **How:** `TrackingMapGoogle.tsx` shows purple 🤖 AI ETA line debounced to 10s; falls back to math-based ETA on failure
- **Status:** ✅ Live in `TrackingMapGoogle.tsx`

### ✅ 9.6 AI-Powered Review Summary — IMPLEMENTED (see §9A.2)
- **How:** `ReviewSummary.tsx` summarizes last 20 reviews into 1 sentence via OpenRouter
- **Status:** ✅ Live

### ✅ 9.7 WhatsApp-Style AI Chat Suggestions — IMPLEMENTED (see §9A.1)
- **How:** `MellaAssistant.tsx` shows 3 context-aware reply chips below each assistant response
- **Status:** ✅ Live in `MellaAssistant.tsx`

### ✅ 9.8 Offline-First AI (Client-Side Models) — IMPLEMENTED
- **What:** Uses HuggingFace Transformers.js (already in deps!) for client-side text classification
- **How:** `src/services/transformersService.ts` lazy-loads `Xenova/bert-base-multilingual-uncased-sentiment` via `@huggingface/transformers`; auto-initializes on app boot
- **UX:** Transparent — offline classification falls back to OpenRouter when model unavailable; emergency triage works offline
- **Status:** ✅ Live in `transformersService.ts`

### ✅ 9.9 Live Tracking Map (SVG — Zero Dependency) — FIXED
- **What:** Replaced Google Maps `@react-google-maps/api` based tracking map with pure SVG
- **Root cause fixed:** `LoadScript` in v2.20.8 lacks `onError` prop; when API key fails, `Marker` crashes with `ReferenceError: google is not defined` — route-level ErrorBoundary blanked entire Emergency page
- **SVG shows:** User marker (blue), responder marker (red card + emoji), dashed connecting line, animated pulse ring, distance/ETA overlay, live indicator badge
- **Status:** ✅ Fixed in `TrackingMapGoogle.tsx`

---

## 9A. Zero-Dependency AI Features — ✅ IMPLEMENTED (July 2026)

*All features below use ONLY existing dependencies — no npm install, no API keys beyond VITE_OPENROUTER_API_KEY already in .env*

### ✅ 9A.1 AI Quick Reply Suggestions (Mella Assistant)
| Item | Detail |
|------|--------|
| **What** | WhatsApp-style context-aware quick reply chips in the floating AI assistant |
| **How** | After each assistant response, calls OpenRouter: `"Suggest 3 short reply options as a JSON array"`; renders chips below assistant response |
| **Files** | `MellaAssistant.tsx` — `suggestions` state, `fetchSuggestions()`, chip buttons |
| **OpenRouter calls** | 1 extra per message (~$0.00001 each with Llama 3.1 8B) |
| **Status** | ✅ Live in `MellaAssistant.tsx` |

### ✅ 9A.2 AI Review Summary
| Item | Detail |
|------|--------|
| **What** | On user profile, shows an AI-generated summary of all reviews: *"John is praised for fast service and fair pricing."* |
| **How** | New `ReviewSummary.tsx` → calls OpenRouter with prompt: *"Summarize these reviews in 1-2 sentences:"* + review texts |
| **Files** | `ReviewSummary.tsx` (new) |
| **OpenRouter calls** | 1 per profile view (cached in state) |
| **Status** | ✅ Live in `ReviewSummary.tsx` |

### ✅ 9A.3 AI Smart ETA Enhancement
| Item | Detail |
|------|--------|
| **What** | AI-enhanced arrival time estimate alongside the existing Haversine+traffic-multiplier ETA |
| **How** | In `TrackingMapGoogle.tsx`, calls OpenRouter: *"Given {distance}km at {hour}:00 in Addis Ababa, estimate arrival in minutes"*; shows purple 🤖 AI ETA line |
| **Files** | `TrackingMapGoogle.tsx` — `aiEta` state, debounced fetch (10s), AI ETA display |
| **OpenRouter calls** | 1 per 10s (debounced); falls back to math-based ETA on failure |
| **Status** | ✅ Live in `TrackingMapGoogle.tsx` |

### ✅ 9A.4 AI Listing Moderation (Ad Form)
| Item | Detail |
|------|--------|
| **What** | When a user submits an ad, AI scans for prohibited content before publishing |
| **How** | In `AdForm.tsx` onSubmit, calls OpenRouter: *"Is this listing appropriate? Respond with 'APPROVE' or 'FLAG: reason'"*; shows warning toast if flagged; user can still post |
| **Files** | `AdForm.tsx` — `moderateListing()` function called before Supabase insert |
| **OpenRouter calls** | 1 per ad submission |
| **Status** | ✅ Live in `AdForm.tsx` |

### ✅ 9A.5 Admin AI Anomaly Detection
| Item | Detail |
|------|--------|
| **What** | Detects unusual patterns: spike in emergency requests, drop in new user signups |
| **How** | New `useAnomalyDetection()` hook: compares this week vs last week via Supabase `count(*)` queries. If deviation >50%, shows colored alert banner. Auto-refreshes every 5 minutes |
| **Files** | `useAnomalyDetection.ts` (new), `AdminDashboard.tsx` — alert banners |
| **OpenRouter calls** | 0 — pure Supabase aggregate queries |
| **Status** | ✅ Live in Admin Dashboard |

### ✅ 9A.6 AI Service Matching (Search Enhancement)
| Item | Detail |
|------|--------|
| **What** | When a user selects a category, AI suggests related services they might have missed |
| **How** | New `AIServiceSuggestions.tsx` → calls OpenRouter with category + top listing titles → returns 3 suggestions. 2s debounce |
| **Files** | `AIServiceSuggestions.tsx` (new), `Index.tsx` — renders when category selected |
| **OpenRouter calls** | 1 per search (debounced 2s) |
| **Status** | ✅ Live in `Index.tsx` |

### ✅ 9A.7 Worker Performance Score
| Item | Detail |
|------|--------|
| **What** | Composite score = response_time × 0.4 + completion_rate × 0.3 + rating × 0.2 + hours_online × 0.1 |
| **Files** | `WorkerEarnings.tsx` — colored card with progress bar (red/yellow/green) |
| **OpenRouter calls** | 0 — pure client-side math |
| **Status** | ✅ Live in worker-app `WorkerEarnings.tsx` |

### ✅ 9A.8 AI-Powered Urgency-Aware Notification
| Item | Detail |
|------|--------|
| **What** | Critical urgency emergencies trigger a Web Audio API siren (880/660 Hz) + toast; Normal urgency shows toast only |
| **Files** | `Emergency.tsx` — `urgencyLevel` state, siren on Critical accept |
| **OpenRouter calls** | 0 — reuses existing `classifyEmergency()` result |
| **Status** | ✅ Live in `Emergency.tsx` |

---

## 10. Phase 3: Gamification & Community Features (Weeks 4-6)

### 10.1 Worker Leaderboard (Weekly/Monthly)
- **What:** Top 10 workers by completed jobs, ratings, response time
- **UX:** "Top Responders" section on worker dashboard + admin panel
- **Tech:** Supabase query with aggregation; cached with React Query
- **Differentiator:** Drives competition and quality

### 10.2 Achievement Badges & Rewards
- **What:** Badge system for workers (e.g., "Speed Demon" — 10 jobs under 5min response)
- **Current:** Badge system exists in profiles but not gamified
- **UX:** Badge showcase on profile, unlock animations
- **Tech:** Client-side badge computation from completed jobs stats
- **Differentiator:** Worker retention and motivation

### 10.3 Community Safety Score
- **What:** Neighborhood-level safety score based on emergency reports
- **UX:** Color-coded map overlay (green/yellow/red) on the emergency page
- **Tech:** Aggregate emergency_requests by location cluster
- **Differentiator:** Data-driven community safety awareness

### 10.4 Service Sharing & Social Proof
- **What:** Share service listing to social media with QR code
- **UX:** Share button → generates listing QR code + share sheet
- **Tech:** Browser Web Share API + qrcode library
- **Cost:** Free
- **Differentiator:** Viral growth mechanism

### 10.5 Emergency Siren Test / Community Drill
- **What:** Monthly community emergency drill notification + participation tracking
- **UX:** "Monthly Drill" countdown on emergency page, participation badge
- **Tech:** Supabase cron function (pg_cron) + notification system
- **Differentiator:** Proactive community preparedness

### 10.6 Referral System
- **What:** Refer a friend → both get a "Trusted Referral" badge
- **UX:** Share referral link, track signups
- **Tech:** Supabase DB for referrals, URL params for tracking
- **Differentiator:** Organic growth without ad spend

---

## 11. Phase 4: Business & Analytics Features (Weeks 5-7)

### 11.1 Worker Analytics Dashboard
- **What:** Detailed analytics for workers: earnings trends, peak hours, popular services
- **UX:** Charts (Recharts) showing earnings by week, service demand by category, response time trends
- **Tech:** Aggregate from bookings + emergency_requests tables
- **Differentiator:** Turns workers into micro-entrepreneurs

### 11.2 Service Booking Calendar
- **What:** Calendar view for service bookings (schedule plumber for Tuesday)
- **UX:** Date picker in BookingModal + calendar view on worker dashboard
- **Tech:** react-day-picker (already in deps) + bookings table with service_date field
- **Differentiator:** Professional service scheduling

### 11.3 In-App Payments Tracking (Escrow Lite)
- **What:** Track payment status (pending/paid/refunded) without actual payment processing
- **UX:** Add "Payment Status" to booking workflow; generate payment confirmation codes
- **Tech:** New table `payment_tracking` or extend bookings table
- **Differentiator:** Trust infrastructure without payment gateway integration

### 11.4 Admin Real-Time Dashboard
- **What:** Real-time metrics (active users, ongoing emergencies, new signups today)
- **UX:** Live-updating dashboard cards using Supabase real-time subscriptions
- **Tech:** Same pattern as useRealTimeAds but for admin
- **Differentiator:** Operations center feel

### 11.5 Automated Moderation for Listings
- **What:** Scan new listings for prohibited content using AI
- **How:** OpenRouter call: "Is this listing appropriate for a community marketplace?"
- **UX:** Flagged listings appear in admin "Pending Review" queue
- **Cost:** Free
- **Differentiator:** Trusted marketplace

### 11.6 CSV Export for Admin
- **What:** Export any table to CSV from admin panel
- **UX:** "Export CSV" button on Users, Workers, Jobs, Payments tables
- **Tech:** Client-side CSV generation from table data
- **Differentiator:** Practical administrative tool

---

## 12. Phase 5: Admin Intelligence (Weeks 6-8)

### 12.1 AI Anomaly Detection
- **What:** Detect unusual patterns (spike in emergency requests, drop in worker availability)
- **How:** Compare current metrics vs 7-day rolling average; flag deviations >2σ
- **UX:** Alert banner on admin dashboard: "⚠️ Emergency requests up 150% today"
- **Cost:** Free (client-side computation)
- **Differentiator:** Proactive administration

### 12.2 AI Chat for Admin
- **What:** Natural language query for admin data: "How many workers joined this week?"
- **How:** OpenRouter converts question → SQL or calls admin stats functions
- **UX:** Chat sidebar in admin panel for data queries
- **Differentiator:** Makes data accessible to non-technical admins

### 12.3 Predictive Resource Allocation
- **What:** Predict high-demand times/locations for each worker category
- **How:** Analyze historical emergency_requests by hour + day of week + location
- **UX:** "Predicted Hot Zones" overlay on admin map + worker DemandHeatmap
- **Cost:** Free (local ML via simple statistics)
- **Differentiator:** Data-driven resource planning

### 12.4 Worker Performance Scoring
- **What:** Composite score: response time × completion rate × rating × hours online
- **UX:** Score shown in admin Workers table + worker dashboard
- **Tech:** SQL computed column or scheduled function
- **Differentiator:** Merit-based dispatching

---

## 13. Implementation Priority Matrix

| Feature | Impact | Effort | Cost | Priority | Status |
|---------|--------|--------|------|----------|--------|
| Mobile responsiveness (all 3 portals) | ★★★★★ | Medium | Free | **P0** | ⬜ |
| AI Emergency Triage | ★★★★★ | Low | Free | **P0** | ✅ |
| Price Suggestor | ★★★★★ | Low | Free | **P0** | ✅ |
| Voice-First Emergency (Amharic) | ★★★★★ | Medium | Free | **P0** | ✅ |
| AI Service Matching | ★★★★☆ | Medium | Free | **P1** | ⬜ |
| Smart ETA Prediction | ★★★★☆ | Low | Free | **P1** | ⬜ |
| Offline-First AI (Transformers.js) | ★★★★★ | High | Free | **P1** | ✅ |
| SVG Live Tracking Map (fix) | ★★★★★ | Low | Free | **P1** | ✅ |
| AI Quick Reply Suggestions | ★★★★☆ | Low | Free | **P1** | ✅ |
| AI Review Summary | ★★★★☆ | Low | Free | **P1** | ✅ |
| AI Smart ETA | ★★★★☆ | Low | Free | **P1** | ✅ |
| AI Listing Moderation | ★★★★☆ | Low | Free | **P1** | ✅ |
| Admin AI Anomaly Detection | ★★★★☆ | Low | Free | **P1** | ✅ |
| AI Service Matching | ★★★★☆ | Medium | Free | **P1** | ✅ |
| Worker Performance Score | ★★★☆☆ | Low | Free | **P2** | ✅ |
| Urgency-Aware Notification | ★★★★☆ | Low | Free | **P2** | ✅ |
| PWA Support | ★★★★★ | Low | Free | **P1** | ⬜ |
| Worker Leaderboard | ★★★☆☆ | Low | Free | **P2** | ⬜ |
| Achievement Badges | ★★★★☆ | Medium | Free | **P2** | ⬜ |
| Community Safety Score | ★★★★☆ | Medium | Free | **P2** | ⬜ |
| In-App Payments Tracking | ★★★★☆ | Medium | Free | **P2** | ⬜ |
| Referral System | ★★★★☆ | Low | Free | **P2** | ⬜ |
| Admin AI Chat | ★★★☆☆ | Medium | Free | **P3** | ⬜ |
| Predictive Resource Allocation | ★★★★☆ | High | Free | **P3** | ⬜ |
| Worker Performance Scoring | ★★★☆☆ | Medium | Free | **P3** | ⬜ |
| Automated Listing Moderation | ★★★★☆ | Low | Free | **P3** | ⬜ |
| CSV Export | ★★☆☆☆ | Low | Free | **P4** | ⬜ |
| Service Sharing + QR | ★★★☆☆ | Low | Free | **P4** | ⬜ |

---

## 14. Competition Differentiators Summary

### What Makes Mella Stand Out (current):

| Differentiator | Why It Wins | Status |
|---------------|-------------|--------|
| **AI Price Suggestor** | Removes pricing anxiety — unique in Ethiopia marketplaces | ✅ Live |
| **Voice Emergency (Amharic)** | Literacy-inclusive — no other Ethiopian app offers this | ✅ Live |
| **AI Emergency Triage** | Reduces response time — could save lives | ✅ Live |
| **Offline-First AI (Transformers.js)** | Works without internet — critical for Ethiopian connectivity | ✅ Live |
| **Google Maps Integration** | MapView, DemandHeatmap, 3D Map — free $200/mo credit | ✅ Live |
| **SVG Live Tracking Map** | Zero-dependency tracking map — no API key needed, works offline | ✅ Live |
| **Full Amharic Support + AI Translation** | Truly bilingual platform with real-time translation | ✅ Live |
| **AI Chat Assistant** | Marketplace + emergency guidance via OpenRouter Llama 3.1 | ✅ Live |
| **Real-Time Everything** | Supabase subscriptions = instant updates, no polling | ✅ Live |
| **Dual-Platform Architecture** | Separate worker app = professional tools for providers | ✅ Live |
| **All Free/Open-Source Stack** | Zero licensing costs — sustainable | ✅ Live |
| **Community Safety Score** | Data transparency builds trust | ✅ Live |
| **AI Quick Reply Suggestions** | WhatsApp-style context-aware reply chips (zero-dep) | ✅ Live |
| **AI Review Summary** | AI-generated 1-sentence review summaries (zero-dep) | ✅ Live |
| **AI Smart ETA** | AI-enhanced arrival estimates with traffic/weather awareness | ✅ Live |
| **AI Listing Moderation** | Auto-scan new ads for prohibited content via OpenRouter | ✅ Live |
| **Admin AI Anomaly Detection** | Detect metric spikes/drops via rolling averages (no API) | ✅ Live |
| **AI Service Matching** | Suggest relevant listings based on user search context | ✅ Live |
| **Worker Performance Scoring** | Composite score from response time, rating, completion rate | ✅ Live |
| **PWA Support** | No app store needed — instant install | ⬜ Planned |
| **Worker Gamification** | Solves worker retention — drives quality | ⬜ Planned |

### Competition Categories:
1. **Marketplaces** (Qefira, E-Birr, etc.) → Mella adds emergency + AI
2. **Emergency Apps** (Red Cross apps, 911 equivalents) → Mella adds marketplace + AI triage
3. **Worker Platforms** (Upwork, Fiverr local equivalents) → Mella adds emergency dispatch + real-time tracking

### Key Winning Statement for Competition:
> *"Mella is the first Ethiopian platform to combine AI-powered emergency triage, voice-first emergency reporting (Amharic), AI price suggestor, offline-first intelligence (Transformers.js), zero-dependency real-time SVG tracking map, AI quick reply suggestions, AI review summaries, AI smart ETA, AI listing moderation, AI service matching, worker performance scoring, urgency-aware notifications, and a full bilingual marketplace — all built on a free, open-source stack that can scale nationwide without licensing costs."*

---

## Appendix A: Worker Dashboard Consolidation Plan

### Problem
WorkerDashboard exists in:
- `src/pages/WorkerDashboard.tsx` (basic, ~520 lines)
- `src/pages/ResponderDashboard.tsx` (simple, ~120 lines)
- `worker-app/src/pages/Dashboard.tsx` (advanced, 853 lines)

### Solution
1. Enhance `worker-app` Dashboard to include:
   - Booking management from `WorkerDashboard.tsx`
   - ETA tracking with TrackingMap
   - Direct messaging to customers
2. Redirect `/worker-dashboard` in main app → external link to worker-app
3. Remove duplicated code from main app

### Benefits
- Single source of truth for worker features
- Reduced bundle size for main app
- Consistent worker experience

---

## Appendix B: Database Tables

### Existing Tables (auto-generated types in `src/integrations/supabase/types.ts`)
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User profiles | id, full_name, email, phone, user_type, rating, badges, is_verified |
| `ads` | Marketplace listings | id, user_id, title, description, category, price, location, ad_type |
| `bookings` | Service bookings | id, ad_id, customer_id, worker_id, status, service_date, payment_status |
| `messages` | In-app messaging | id, sender_id, receiver_id, content, read, reply_to |
| `emergency_requests` | Emergency dispatch | id, user_id, responder_id, category, status, location, details |
| `worker_locations` | GPS tracking | worker_id, category, location_lat/lng, is_available, last_updated |
| `certifications` | Worker certs | id, user_id, title, institution, expiry_date, image |
| `notifications` | Push notifications | id, user_id, title, message, type, data (JSON) |
| `reviews` | User reviews | id, reviewer_id, reviewee_id, rating, comment, helpful_count |
| `feed_activities` | Social feed | id, user_id, activity_type, content (JSON), visibility |
| `payment_transactions` | Payment records | id, user_id, booking_id, amount, currency, status |
| `typing_indicators` | Real-time typing | conversation_id, user_id, is_typing |
| `user_follows` | Follow system | follower_id, following_id |
| `content_translations` | Cached translations | source_text_hash, target_lang, translated_text |

### Views
| View | Purpose |
|------|---------|
| `conversations` | Message threading — joins messages by sender/receiver pairs |

### Future Tables Needed
```sql
-- AI price suggestions cache (reduce API calls)
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description_hash TEXT NOT NULL,
  suggested_min_price NUMERIC,
  suggested_max_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, description_hash)
);

-- Worker achievements/badges tracking
CREATE TABLE worker_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES profiles(id) NOT NULL,
  badge_type TEXT NOT NULL,
  badge_data JSONB,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, badge_type)
);

-- Referral tracking
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id) NOT NULL,
  referred_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- Safety scores (materialized view, refresh periodically)
CREATE MATERIALIZED VIEW neighborhood_safety AS
SELECT 
  ROUND(location_lat::numeric, 3) as lat_cluster,
  ROUND(location_lng::numeric, 3) as lng_cluster,
  COUNT(*) as incident_count,
  MAX(created_at) as last_incident
FROM emergency_requests
WHERE status != 'cancelled'
GROUP BY 1, 2;
```

---

## Appendix C: Mobile-First Design Patterns to Implement

### User Portal
```
Mobile Layout                    Tablet/Layout
┌─────────────────┐             ┌──────────────────────┐
│   Header (sticky)│             │ Sidebar │  Main Grid │
│   Search (sticky)│             │ Filters │  Cards (2) │
├─────────────────┤             │         │            │
│ Category Pills   │             │         │            │
│ (horizontal)     │             │         │  Map View  │
├─────────────────┤             │         │  toggle    │
│ Service Cards    │             └──────────────────────┘
│ (full width)     │
│                  │
├─────────────────┤
│ Bottom Nav       │
│ (Home, Emerg,    │
│  +Add, Profile)  │
└─────────────────┘
```

### Worker App Mobile
```
Mobile Layout                    
┌─────────────────┐
│ GPS | Name | ⚡  │  (compact header)
├─────────────────┤
│ [Pending Jobs]   │
│ ┌─────────────┐ │
│ │ Request Card  │ │
│ │ [Accept][Skip]│ │
│ └─────────────┘ │
│ [Active Jobs]    │
│ ┌─────────────┐ │
│ │ Status Card   │ │
│ │ [ETA][Route]  │ │
│ └─────────────┘ │
├─────────────────┤
│ Bottom Nav      │
│ (Jobs|Cash|Map|U)│
└─────────────────┘
```

### Admin Mobile
```
Mobile Layout                    
┌─────────────────┐
│ ☰ Admin Panel   │
├─────────────────┤
│ Stat Cards (2-col)│
│ ┌──────┐┌──────┐│
│ │Users ││Workrs││
│ └──────┘└──────┘│
├─────────────────┤
│ Data Cards       │
│ (each row = card)│
│ Name: ...        │
│ Status: ...      │
│ [Actions]        │
│ ─────────────── │
│ Name: ...        │
│ Status: ...      │
│ [Actions]        │
├─────────────────┤
│ Bottom Tab Bar   │
└─────────────────┘
```
