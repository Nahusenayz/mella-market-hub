# Changelog

## [Unreleased] - 2026-07-04

### Added
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
- **Amharic translations**: Full translation keys for Emergency page (categories, responder stats, live updates, error/loading/toast texts) and Index responder stats (responders online, community safety).
- **Footer Amharic translation**: Footer "Made by" and copyright text now translate when Amharic is active.

### Fixed
- **UserProfile blank screen crash**: Restored missing `useEffect` import that caused the modal to crash on open.
- **Reviews 404 error**: Added graceful `PGRST205` (table-not-found) error handling in `useReviews` hook so it shows a setup prompt instead of crashing.
- **Profile rating display**: Ratings now appear correctly in UserProfile header, home page service cards, and all profile-adjacent components after review submission.
- **Real-time rating updates**: Added real-time subscription on `profiles` table changes in `useRealTimeAds` hook so home page cards update live when a profile rating changes.
- **Emergency page scrolling UX**: Removed sticky positioning and overflow-hidden on the map section so it no longer overlays the responders list on mobile. Map flows naturally in the page layout.

### Changed
- **ReviewSystem** (`src/components/ReviewSystem.tsx`): Added `onReviewSubmitted` callback prop to notify parent components to refresh profile data.
- **UserProfile** (`src/components/UserProfile.tsx`): Passes `onReviewSubmitted={fetchUserProfile}` so the modal re-fetches profile data (including updated rating) immediately after a review is submitted.
- **useRealTimeAds** (`src/hooks/useRealTimeAds.tsx`): Added `profiles` UPDATE subscription to update ratings in-place without full page reload.
- **Navbar icons**: Main app navbar uses `logo.png`, worker-app navbar uses `worker.png`.
- **Favicon**: Both apps updated to reference correct icons (`logo.png` / `worker.png`).
- **Footer** (`src/components/Footer.tsx`): Now uses `useLanguage()` to translate "Made by" and copyright text.
- **Emergency page** (`src/pages/Emergency.tsx`): Map layout split into its own container, removed `sticky`/`fixed` positioning for natural mobile scrolling.
