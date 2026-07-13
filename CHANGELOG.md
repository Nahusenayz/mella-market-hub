# Changelog

## [Unreleased] - 2026-07-13

### Added
- **Voice Call (WebRTC)**: Peer-to-peer voice calls via Google STUN + Supabase Realtime broadcast. User app initiates `call_request` event, worker sees Incoming Call modal with Accept/Decline. `useVoiceCall` hooks in both apps with `callStatus` state machine (idle → calling → ringing → connected → ended).
- **Incoming Call Modal**: Worker Dashboard shows Accept/Decline buttons when a call request arrives, with caller info and pulsing phone animation.
- **En-Route Location Simulation**: `startEnRouteSim()` in worker Dashboard moves `responder_location_lat/lng` in 60 steps (2s interval) from worker location toward user location. Auto-falls back to a +0.02° offset when start ≈ end for visible movement.
- **Real-Time Status Sync**: Worker MARK COMPLETED / CANCEL updates propagate instantly to the user via real-time subscription on `emergency_requests`. Fixed bug where toast exception swallowed `setActiveRequest(null)`.
- **Live Tracking Map**: `TrackingMapGoogle.tsx` renders user + responder markers with polyline and ETA overlay (Haversine + traffic multiplier).
- **Sound Notification**: Replaced `<audio>` element siren with Web Audio API oscillator (880/660 Hz alternating). Pre-created `AudioContext` on first click to satisfy autoplay policy.
- **Emergency Category Counts**: Hero buttons in `SearchHero.tsx` show per-category responder counts from `useWorkerLocations`.
- **Dark Mode**: Full dark mode support via Tailwind `dark:` class strategy. New `ThemeContext` with localStorage persistence, system preference detection, toggle button in Navbar (Moon/Sun icon), and complete dark CSS variable palette for all shadcn/ui components.
- **Favorites/Bookmarks**: Heart icon button on ServiceCard image overlay to save/unsave ads via `useFavorites` hook (localStorage-based). Badge count on BottomNavigation "Saved" tab with haptic feedback on toggle.
- **PWA Support**: `vite-plugin-pwa` with auto-update service worker, Web App Manifest (name, icons, theme_color `#f97316`), `apple-mobile-web-app-capable` meta tags, and Workbox precaching for offline-capable installable app.
- **Error Boundary**: `ErrorBoundary` component wrapping all routes displays a friendly error UI with "Reload Page" button instead of crashing the entire app.
- **Page Transitions**: `AnimatePresence` + `framer-motion` fade/slide transitions between route changes for a native app-like feel.
- **Messages Loading Skeleton**: Skeleton loader while Messages page initializes, showing 4 placeholder conversation items with avatar + text shimmer.
- **Toast Replacements**: Replaced 6 `alert()` calls in Emergency.tsx with proper Sonner toast notifications (sign-in required, active request exists, request sent, error handling).
- **User Rating System**: ReviewSystem component wired into UserProfile modal with Listings/Reviews tabs. Users can submit reviews with star ratings, title, and comments.
- **AI Price Suggestor**: "AI" button next to price field in AdForm that calls OpenRouter to suggest fair ETB price range with a "Use" button to auto-fill.
- **Smart ETA Prediction**: Haversine distance calculation with time-of-day traffic multiplier (rush hour 1.8x, night 0.8x) overlaid on TrackingMap.
- **Worker Leaderboard**: Top 10 workers ranked by completed jobs with trophy icons, integrated into worker-app Dashboard right sidebar.
- **Service Share (Web Share API)**: Functional share button on PostModal with native share sheet and clipboard fallback.
- **Community Safety Score**: Color-coded badge (Very Safe → Caution) on Emergency page based on 7-day emergency incident count.
- **AI Chat Quick Replies**: 5 one-tap suggestion buttons (How much? / Is it available? / Can you deliver? / Tell me more / I am interested) above message input in MessageThread.
- **Database migration**: `20260704000000_create_reviews_table.sql` — creates `reviews` table with RLS policies and real-time publication.
- **Database migration**: `20260704000001_reviews_rating_trigger.sql` — auto-updates `profiles.rating` and `profiles.total_ratings` whenever a review is inserted/updated/deleted, with backfill for existing reviews.
- **Content translation system**: `content_translations` table migration (`20260704000002_content_translations.sql`), `useTranslatedText` hook with 3-tier caching (in-memory → DB → OpenRouter API), and `<Translated>` component for translating user names/job titles when Amharic is active.
- **Pre-translate script**: `scripts/pre_translate_existing.js` batch-translates existing profiles, ads, and worker names via OpenRouter.
- **Google Maps integration**: `MapViewGoogle.tsx` replaces Leaflet `MapView` in Index and Emergency pages. `TrackingMapGoogle.tsx` replaces Leaflet `TrackingMap` in Emergency page. `DemandHeatmapGoogle.tsx` replaces Leaflet `DemandHeatmap` in worker-app Dashboard. `Map3D.tsx` rewritten with Google Maps (no Mapbox tokens needed). All files are local-only (not committed).
- **AI Emergency Triage**: `classifyEmergency()` in groqService.ts auto-classifies typed emergency text into category (police/ambulance/fire_truck/traffic_police/tow_truck) and urgency (Critical/High/Normal) with real-time badge display in the request modal.
- **Voice-First Emergency (Amharic)**: Dedicated "Voice Emergency" quick-action button on Emergency page using AmharicVoiceInput with Web Speech API (am-ET). Voice input auto-opens request modal + runs AI triage on the transcribed text.
- **Offline-First AI (Transformers.js)**: `src/services/transformersService.ts` lazy-loads `Xenova/bert-base-multilingual-uncased-sentiment` via `@huggingface/transformers` for client-side text classification. Auto-initializes on app boot with graceful fallback to OpenRouter when offline or model unavailable.
- **Amharic translations**: Full translation keys for Emergency page (categories, responder stats, live updates, error/loading/toast texts) and Index responder stats (responders online, community safety).
- **Footer Amharic translation**: Footer "Made by" and copyright text now translate when Amharic is active.
- **Crime heat demo**: Mock crime hotspot data (10 zones across Addis Ababa) displayed as color-coded heat circles on both main app MapView and worker-app DemandHeatmap.
- **Crime zone alert**: Dismissible notification banner on Index page when user is in a high or medium crime zone, showing incident count and safety link.

### Fixed
- **SVG Tracking Map (Google Maps crash)**: Replaced `@react-google-maps/api` `TrackingMapGoogle.tsx` with zero-dependency SVG. `LoadScript` in v2.20.8 lacks `onError` prop — when API key was missing, `Marker` crashed with `ReferenceError: google is not defined` and the route-level `ErrorBoundary` blanked the entire Emergency page. SVG map renders immediately with user/responder markers, connecting line, animated pulse ring, and distance/ETA overlay.
- **Call button simultaneous-offer (glare) bug**: Worker no longer sends a WebRTC offer; only the user initiates. Worker is responder-only.
- **Microphone icon persisting after call ends**: Unconditional `cleanup()` on unmount calls `getTracks().forEach(t => t.stop())` and sets `srcObject = null` in both hooks.
- **Mark Completed / Cancel not clearing user UI**: Completed/cancelled status handler now always calls `setActiveRequest(null)` before returning, even if `toast()` throws.
- **Worker geolocation watch re-sub loop**: Removed `loc` from effect dependency so `watchPosition` isn't torn down and re-created on every GPS reading.
- **Simulation showing no movement**: Start and end coordinates were both the default (9.032, 38.7469). Added auto-offset when `|start − end| < 0.001` to guarantee visible path.
- **data-lov-id Fragment warning**: Replaced `<React.Fragment>` with `<div style={{display:'contents'}}>` in `MapViewGoogle.tsx` crime hotspot map.
- **Stale closure in channel handlers**: Added `callStatusRef` to both `useVoiceCall` hooks so broadcast callbacks read the latest status instead of the value at subscription time.
- **UserProfile blank screen crash**: Restored missing `useEffect` import that caused the modal to crash on open.
- **Reviews 404 error**: Added graceful `PGRST205` (table-not-found) error handling in `useReviews` hook so it shows a setup prompt instead of crashing.
- **Profile rating display**: Ratings now appear correctly in UserProfile header, home page service cards, and all profile-adjacent components after review submission.
- **Real-time rating updates**: Added real-time subscription on `profiles` table changes in `useRealTimeAds` hook so home page cards update live when a profile rating changes.
- **Emergency page scrolling UX**: Removed sticky positioning and overflow-hidden on the map section so it no longer overlays the responders list on mobile. Map flows naturally in the page layout.

### Added: AI Features (prototype — July 2026)
- **AI Quick Reply Suggestions** (`MellaAssistant.tsx`): Context-aware reply chips appear below each assistant response. Uses OpenRouter to generate 3 reply options as JSON array. Gracefully hides on failure.
- **AI Review Summary** (`ReviewSummary.tsx`): New component on Profile page showing an AI-generated 1-sentence summary of the user's last 20 reviews with 🤖 icon and gradient card.
- **AI Smart ETA Enhancement** (`TrackingMapGoogle.tsx`): AI-powered arrival estimate alongside math-based ETA. Calls OpenRouter with distance + time-of-day context, debounced to 10s. Falls back silently if OpenRouter fails.
- **AI Listing Moderation** (`AdForm.tsx`): Before publishing an ad, scans title/description/category via OpenRouter for prohibited content. If flagged, shows a warning toast with the reason; user can still proceed to post.
- **Admin AI Anomaly Detection** (`useAnomalyDetection.ts` + `AdminDashboard.tsx`): Compares emergency requests and new user signups this week vs last week. Shows colored alert banners (warning/danger) when deviation >50%. Auto-refreshes every 5 minutes. Zero API calls — pure Supabase aggregate queries.
- **AI Service Matching** (`AIServiceSuggestions.tsx` + `Index.tsx`): When a category is selected on the marketplace, suggests 3 related services using OpenRouter with 2s debounce. Shows gradient card with 🤖 "You might also like" header.
- **Worker Performance Score** (`WorkerEarnings.tsx`): Composite score = response_time × 0.4 + completion_rate × 0.3 + rating × 0.2 + hours_online × 0.1. Displayed as a colored card with progress bar (red/yellow/green). Zero API calls — pure client-side math.
- **Urgency-Aware Audio Notifications** (`Emergency.tsx`): When responder accepts a Critical urgency request, plays a Web Audio API siren (880/660 Hz alternating) + toast. Normal urgency shows toast only. Reuses existing `classifyEmergency()` output.

### Changed
- **Voice Call button only in user app**: Removed CALL button from worker Dashboard active job card. Worker only receives incoming call notifications.
- **Worker useVoiceCall auto-listens**: Hook subscribes to broadcast channel on mount via `listen()` instead of requiring manual `startCall()`.
- **Main app useVoiceCall sends call_request**: Instead of sending a WebRTC offer immediately, now sends `call_request` and waits for `call_accepted` before creating an offer.
- **ReviewSystem** (`src/components/ReviewSystem.tsx`): Added `onReviewSubmitted` callback prop to notify parent components to refresh profile data.
- **UserProfile** (`src/components/UserProfile.tsx`): Passes `onReviewSubmitted={fetchUserProfile}` so the modal re-fetches profile data (including updated rating) immediately after a review is submitted.
- **useRealTimeAds** (`src/hooks/useRealTimeAds.tsx`): Added `profiles` UPDATE subscription to update ratings in-place without full page reload.
- **Navbar icons**: Main app navbar uses `logo.png`, worker-app navbar uses `worker.png`.
- **Favicon**: Both apps updated to reference correct icons (`logo.png` / `worker.png`).
- **Footer** (`src/components/Footer.tsx`): Now uses `useLanguage()` to translate "Made by" and copyright text.
- **Emergency page** (`src/pages/Emergency.tsx`): Map layout split into its own container, removed `sticky`/`fixed` positioning for natural mobile scrolling.
