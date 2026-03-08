# Changelog — Seven Trip

All notable changes to this project are documented in this file.

---

## [1.8.0] — 2026-03-08 — Social Login & Full Production Audit

### Added
- **Google Sign-In** — Full OAuth 2.0 integration via Google Identity Services (GSI)
- **Facebook Login** — OAuth via Facebook SDK v19.0
- **Social Login Admin Config** — Admin → Settings → Social Login panel (Google Client ID/Secret + Facebook App ID/Secret)
- **Mandatory ID Upload Modal** (`IdUploadModal.tsx`) — Shown after social signup; users must upload NID/Passport before booking
- **Backend social-auth routes** (`backend/src/routes/social-auth.js`) — Server-side token verification for Google & Facebook
- **Social auth DB migration** (`backend/database/social-auth-migration.sql`) — `social_provider` + `social_provider_id` columns
- **Social config API** (`GET /auth/social/config`) — Returns public client IDs for frontend SDK init
- **`sitemap.xml`** — Full SEO sitemap with 20 pages

### Changed
- Login, Register, and AuthGateModal now have real working Google/Facebook buttons
- `AuthContext` — Added `socialLogin(provider)` method
- Admin Settings PUT route handles `social_oauth` section persistence
- `server.js` — Mounted `/api/auth/social` route group

### Fixed
- Homepage `trustStrip` section double-render bug (was rendering twice: in sortedSections loop AND explicitly after hero)

---

## [1.7.0] — 2026-03-08 — CMS Blog Editor & Popups Module

### Added
- **Popups & Banners CMS** — Exit-intent popups, announcement banners, push notification templates with live preview
- **Blog Visual Editor** — Full WYSIWYG + HTML editor tabs with 16 default articles
- Centralized Discounts & Pricing (removed redundant Promotions sidebar link)

### Fixed
- Flight Booking Step 3 (payment) now renders when `fields.length === 0`
- Blog CMS initialized with structured HTML content

---

## [1.6.0] — 2026-03-07 — Enterprise CMS Suite

### Added
- 40+ CMS-managed pages via `useCmsPageContent` hook
- Homepage CMS: section reordering, visibility toggles, text/image editing
- Dynamic booking form builder
- SEO, Footer, Media, Email Templates, Destinations management
- Admin Payment Approvals with receipt viewer
- Discounts & Pricing module
- Google Drive integration for visa documents

---

## [1.5.0] — 2026-03-06 — Complete User Dashboard

### Added
- 12 fully functional user dashboard pages (zero "Coming Soon")
- E-Tickets with PDF download (jsPDF)
- E-Transactions, Pay Later, Invoices, Search History
- Traveller profiles, Wishlist, Payment receipt upload
- 2FA toggle, notification preferences, account deletion

---

## [1.4.0] — 2026-03-05 — Search Widget & Booking Flow

### Added
- 10-tab unified search widget
- Multi-city flight search (2-5 segments)
- 740+ airports database
- 3-step flight booking form
- Hotel results (grid/list + wishlist)
- AuthGateModal for unauthenticated booking
- Booking confirmation with PDF/print/email

---

## [1.3.0] — 2026-03-04 — Admin Panel

### Added
- 17 admin modules
- Revenue analytics (Recharts)
- User/booking/payment management
- Hidden admin login (`/admin/login`)

---

## [1.2.0] — 2026-03-03 — Authentication

### Added
- JWT auth (15min access + 7-day refresh)
- Email registration with mandatory NID/Passport
- OTP password reset
- Role-based routing

---

## [1.1.0] — 2026-03-02 — Service Pages

### Added
- All 10 service pages
- Static pages (About, Contact, Blog, FAQ, etc.)
- Responsive header/footer
- Dark/light theme

---

## [1.0.0] — 2026-03-01 — Initial Release

### Added
- React + TypeScript + Vite scaffolding
- Tailwind CSS + shadcn/ui design system
- Homepage with hero video & parallax
- Basic routing & error handling
