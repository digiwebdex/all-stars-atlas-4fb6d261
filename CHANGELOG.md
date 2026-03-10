# Changelog — Seven Trip

All notable changes to this project are documented in this file.

---

## [3.0.0] — 2026-03-10 — Complete Platform Audit v2 & Production Finalization

### Fixed — Booking Flows Now Call Real APIs
- **eSIM Purchase**: Now calls `POST /esim/purchase` instead of just navigating to confirmation
- **Holiday Booking**: Now calls `POST /holidays/book` with package details and returns bookingRef
- **Medical Booking**: Now calls `POST /medical/book` with hospital and form data
- **Car Booking**: Now calls `POST /cars/book` with car, dates, and form data
- All 4 booking flows now persist bookings in the database and return real booking references

### Fixed — Hardcoded Data Removal (Zero-Mock Policy v2)
- **BookingConfirmation**: Removed hardcoded fallbacks for route (`"Dhaka → Cox's Bazar"`), flightNo (`"BG-435"`), departTime (`"07:30"`), arriveTime (`"08:35"`), stops (`"Non-stop"`), and ticketNo (random `997-xxx`)
- **AdminCurrency**: Removed 5 hardcoded default exchange rates — now shows empty state when no rates configured
- **ESIMPlans**: Removed 4 hardcoded fallback country filters — now uses CMS data only
- **MedicalServices**: Removed 5+6 hardcoded country/treatment fallback arrays
- **HolidayPackages**: Removed 5+4 hardcoded includes/filter fallback arrays
- **Dashboard stats**: Removed fake `"+0%"` change indicator — now only shows change when API provides it
- **Admin Dashboard**: Same fix for stat change indicators

### Fixed — Previous Audit (v2.9.0)
- Baggage fallbacks: `"20kg"` → `"As per airline policy"` (7 locations)
- Meal fallbacks: `"Meals"` → empty (5 locations)
- Dashboard stats: Removed fake `"+12%"`, `"+8%"` growth indicators
- Admin reports: Real calculated growth rate instead of `12.5`
- Admin discounts: No hardcoded default discount codes

### Improved — TTI/ZENITH GDS Integration
- Enhanced seat availability extraction from `AirCoupons[]`, segment-level, and `ETCouponFares[]`
- Enhanced baggage extraction from AirCoupon level and segment level (weight + piece formats)
- Added `[TTI DEBUG]` logging for field-name discovery when data is null

### Improved — GDS Flight Operations (Admin)
- Real-time GDS API calls for ticket issuance, cancellation, and voiding across TTI, BDFare, FlyHub, Sabre
- Ticket records auto-created in DB upon successful GDS issuance
- GDS action results persisted in booking `details.lastGdsAction`

---


## [2.8.0] — 2026-03-09 — Company Rebrand, Invoice & Money Receipt PDFs

### Changed — Company Info System-Wide Update
- **Parent Company**: All references updated to "Evan International" (Seven Trip is a concern of Evan International)
- **Phone**: Updated to +880 1749-373748 across Header (top bar + mobile), Footer (contact section), CMS defaults (/about, /contact, /privacy, FAQ), SEO schema, CMS Footer admin, PDF generator
- **Address**: Updated to "Beena Kanon, Flat-4A, House-03, Road-17, Block-E, Banani, Dhaka-1213" across all pages
- **Footer copyright**: "Seven Trip — A concern of Evan International"
- **PDF headers**: All PDFs now show parent company and updated contact info

### Added — Money Receipt PDF Generator
- **New `generateMoneyReceiptPDF()`** — Matches professional banking receipt format
- Line item table (No, Description, Pax, Unit Price, Total Price)
- Totals section (Total Fair, Due, Discount, Grand Total with amount in words)
- "Received with gratitude" acknowledgment text
- Signature area with date
- **QR Code** verification (via `qrcode` library)
- Available in User Dashboard → Invoices and Admin → Invoices

### Improved — Invoice PDF Revamp
- **Multi-line item support** — Handles 50+ items with auto-pagination
- **Dynamic columns** — Extra columns (Visa, BRN, Transport) rendered automatically
- **QR Code** on every invoice for verification
- **Grand total in words** (Bangladeshi numbering: Lakh, Crore)
- **Company header** with logo, address, phone matching uploaded format

### Fixed
- Removed all hardcoded old phone numbers (+880 1234-567890)
- Removed all hardcoded old addresses (123 Travel Street)
- Fixed duplicate import identifiers in DashboardInvoices
- Updated AdminUsers phone placeholder

---

## [2.7.0] — 2026-03-09 — Enterprise Flight Booking & Mobile Responsive Overhaul

### Fixed — Critical Mobile Responsive Issues
- **White space on right (mobile)** — Fixed oversized logo images (h-36/h-44/h-48 = 144-192px) across Header, Footer, DashboardLayout, and mobile sidebar. Normalized to h-10/h-12 (40-48px)
- **Horizontal overflow** — Added `overflow-x: hidden` to html root element and PublicLayout wrapper
- **Broken CSS class names** — Fixed corrupted Tailwind classes in Header mobile sidebar logo

### Added — Enterprise 4-Step Flight Booking
- **Step 1: Itinerary Review** — Full outbound + return flight details with airline logos
- **Step 2: Passenger Info** — Title, Full Name, Passport Number, DOB, Nationality per passenger
- **Step 3: Extras** — Meal selection (7 options: Standard/Vegetarian/Vegan/Halal/Kosher/Child/Diabetic), Extra Baggage (5-30kg), Seat selection (Window/Aisle/Middle)
- **Step 4: Review & Pay** — Real-time fare breakdown, payment method selection, terms acceptance
- **Auth Gate** — Unauthenticated users prompted to login/register before booking completion

### Added — Round-Trip Flight Selection
- **Outbound/Return sections** — Round-trip results split into two groups with separate selection
- **Paired selection** — Sticky bottom bar shows total when both outbound + return selected
- **Flight data passed via navigation state** — No API dependency for booking page (works offline with TTI results)

### Added — Professional E-Ticket PDF Generator
- **Company branding header** — Dark header with Seven Trip logo, phone, email
- **Airline logos** — Fetched from Kiwi CDN for 60+ carriers
- **Segment boxes** — Origin/Destination with Terminal, Aircraft, Flight Number
- **Passenger list** — LAST/FIRST format with passport numbers
- **Booking reference** — Auto-generated with QR code placeholder

### Updated — Documentation
- **README.md** — Updated feature list with enterprise booking, e-ticket PDF, round-trip pairing
- **CHANGELOG.md** — Added v2.7 release notes
- **.lovable/plan.md** — Updated plan status

---


## [2.5.0] — 2026-03-09 — TTI/ZENITH GDS Integration & Database-Backed Config

### Added — TTI/ZENITH Air Astra Flight API
- **Real-time GDS flight search** via TTI/ZENITH Reservation System (Agency ID 10000240)
- **Backend proxy** (`backend/src/routes/tti-flights.js`) — calls TTI `SearchFlights`, normalizes WCF JSON responses into standard format
- **Parallel data merge** — Local DB flights + TTI API results combined in `flights.js`
- **Google Flights-style UI** — Completely redesigned `FlightResults.tsx` with compact cards, airline logos (40+ airlines mapped), timeline segments, layover badges, and expandable detail panels
- **Advanced flight filters** — Stops (Non-stop / 1 / 2+), price range slider, departure time range, airline checkboxes, sort by price/duration/departure

### Changed — Database-Backed API Configuration (Security Hardening)
- **All API keys moved from `.env` to database** — `system_settings` table stores encrypted configs for TTI, payment gateways, SMS, email, OAuth
- **TTI reads from DB** with 5-minute cache (`getTTIConfig()`) — no env vars needed
- **Admin Settings** — New "Air Astra TTI/ZENITH (Flight GDS)" card in API Integrations tab with URL, key, and agency ID fields
- **Config cache invalidation** — `clearTTIConfigCache()` called when admin saves TTI settings
- **Removed** `TTI_API_URL` and `TTI_API_KEY` from `backend/.env`

### Changed — AdminDiscounts Migrated to API
- **Discounts & Price Rules** — Migrated from localStorage to backend API (`GET/PUT /admin/discounts`)
- Added `discounts` and `price_rules` keys in `system_settings` table
- Full CRUD via React Query mutations with optimistic cache invalidation

---

## [2.4.0] — 2026-03-09 — Complete Data Flow Audit & Mandatory Validations

### Fixed — Search Validation (ALL services now require dates)
- **Holiday Search** — Now requires travel date before searching. Shows toast error if missing.
- **Visa Search** — Now requires both travel date AND return date. Shows toast error if missing.
- **Medical Search** — Now requires travel date for appointment. Shows toast error if missing.
- **eSIM Search** — Now requires activation date. Shows toast error if missing.
- **Recharge** — Now validates operator, phone number, and amount before navigating.
- **Pay Bill** — Now validates category, biller, account number, and amount before navigating.

### Fixed — Results Pages (ALL read URL params + show "No Criteria" guard)
- **HolidayPackages** — Now reads `destination` and `date` from URL. Shows "No Search Criteria" empty state when params missing. Displays destination and date in hero.
- **CarRental** — Now reads `pickupDate` and `dropoffDate` from URL. Shows "No Search Criteria" when dates missing. Passes dates to API. Book buttons include date params in link.
- **MedicalServices** — Now reads `country`, `treatment`, and `date` from URL. Shows "No Search Criteria" when date missing. Passes date to enquiry links.
- **ESIMPlans** — Now reads `country` and `activation` from URL. Shows "No Search Criteria" when activation date missing. Passes activation date to purchase links.
- **VisaServices** — Now reads `country`, `type`, `date`, `return`, and `travellers` from URL. Shows "No Search Criteria" when travel date missing. Passes all params to Apply Now links. Filters countries by URL country if provided.

### Fixed — Data Flow Continuity
- All search handlers in SearchWidget now pass dates in URL params.
- All results pages now read those dates and pass them to the API.
- All "Book Now" / "Apply Now" / "Enquire" buttons pass full context (dates, IDs, locations) to booking pages.
- Booking pages pass complete data to BookingConfirmation via `location.state`.

---

## [2.3.0] — 2026-03-09 — Critical Logic Fixes & Enterprise Flight Cards

### Fixed
- **Mandatory Date Validation** — Flight departure date, hotel check-in/check-out, car pickup/drop-off dates now required before search. Toast errors shown for missing dates. Round-trip requires return date.
- **Hotel Search Param Mismatch** — SearchWidget sends `destination`, HotelResults now reads both `destination` and `location` params correctly.
- **Hotel Results Guard** — Shows "No Search Criteria" empty state when no check-in/check-out dates provided instead of empty list.
- **FlightBooking Hardcoded Data** — Was showing static "07:30 DAC → 08:35 CXB". Now fetches actual flight details via `useFlightDetails(flightId)` and displays real data.
- **Booking Confirmation Data** — FlightBooking, HotelDetail, HolidayDetail, CarBooking, MedicalBooking, and ESIMPurchase now ALL pass complete booking data (route, price, taxes, totals, type) via `location.state` to the confirmation page.
- **CarBooking Hardcoded Data** — Was showing static "Toyota Corolla — Sedan". Now reads car ID from URL params.
- **BookingConfirmation Dynamic Icons** — Shows correct service icon (Plane/Building2/Car/Stethoscope/Smartphone/Globe) based on booking type instead of always showing Plane.
- **HotelDetail Book Now** — Passes hotel name, room price, and calculated taxes to confirmation page.
- **HolidayDetail Book Package** — Passes package destination, price, and taxes to confirmation page.

### Added
- **Enterprise-grade Flight Result Cards** — Airline logo mapping for 15+ airlines (Biman, US-Bangla, Novoair, Emirates, Qatar Airways, Singapore Airlines, etc.), proper time formatting, clock icons, gradient flight path lines, refundable badges, price range filtering.
- **FlightResults "No Criteria" Guard** — Shows empty state when required params (from, to, depart) are missing.

### Refactored
- **FlightResults.tsx** — Extracted `FlightCard` and `FilterPanel` into separate components for maintainability.
- **SearchWidget** — Added `sonner` toast import for validation feedback.

---

## [2.2.0] — 2026-03-08 — Full Production Audit & Final Fixes

### Comprehensive Audit (0-to-100 review of ALL 70+ pages)

**Verified Complete & Working:**
- ✅ Homepage (11 CMS-driven sections, parallax hero, animated counters)
- ✅ All 10 service pages (Flights, Hotels, Holidays, Visa, Medical, Cars, eSIM, Recharge, PayBill, Contact)
- ✅ All 8 static pages (About, Blog, BlogPost, FAQ, Careers, Terms, Privacy, Refund Policy)
- ✅ All 4 auth pages (Login, Register, ForgotPassword, VerifyOTP with 6-digit input)
- ✅ All 12 user dashboard pages (Overview, Bookings, E-Tickets, Transactions, E-Transactions, Payments, Invoices, Pay Later, Travellers, Wishlist, Search History, Settings)
- ✅ All 17 admin modules (Dashboard, Bookings, Users, Payments, Payment Approvals, Discounts, Invoices, Reports, Visa, CMS suite, Settings)
- ✅ Header (responsive, transparent-on-home, user dropdown, mobile sheet)
- ✅ Footer (newsletter subscribe, social links, services/company links, payment methods)
- ✅ SearchWidget (10-tab search with all service types)
- ✅ AuthGateModal (inline auth during booking flow)
- ✅ IdUploadModal (NID/Passport verification)
- ✅ Dark/Light theme with system preference
- ✅ SEO (meta tags, JSON-LD, sitemap, robots.txt)

### Fixed (This Release)
- **DashboardETransactions** — Fixed field mapping: backend returns `method`/`fee`/`date`, UI expected `entryType`/`gatewayFee`/`createdOn`. Now auto-normalizes both formats
- **DashboardSearchHistory** — Fixed missing `summary` and `resultsCount` fields: auto-generates summary from `origin → destination` when not present
- **DashboardPayLater** — Fixed data key priority: now reads `data` first (backend standard), falls back to `items`; formats due dates
- **DashboardHome pie chart** — Fixed: backend returns raw counts, now auto-converts to percentage for the donut chart
- **Newsletter subscribe** — Added backend route `POST /contact/subscribe` (was 404)
- **Booking confirmation email** — Added backend route `POST /dashboard/bookings/send-confirmation`

### Backend Routes Added
- `POST /contact/subscribe` — Newsletter email subscription
- `POST /dashboard/bookings/send-confirmation` — Email booking confirmation to user

---

## [2.1.0] — 2026-03-08 — API Response Alignment & Zero Mock Data

### Critical Fixes
- **All listing pages (Flights, Hotels, Holidays, eSIM, Cars, Medical, Recharge, PayBill)** — Fixed API response shape mismatch: frontend expected `.flights`, `.hotels`, `.packages` etc. but backend returns `.data`. All pages now correctly read `apiData.data || apiData.flights || []`
- **Admin Dashboard** — Mapped backend flat response (`totalUsers`, `totalBookings`, `totalRevenue`) to UI `stats[]` array format
- **User Dashboard** — Fixed `.bookings`, `.transactions`, `.travellers`, `.tickets`, `.wishlist`, `.invoices`, `.payments` to fallback to `.data`
- **Backend: SQL GROUP BY** — Fixed `only_full_group_by` error in `admin.js` and `dashboard.js` monthly revenue queries
- **Backend: JSON.parse crashes** — Created `safeJsonParse()` utility; applied across `hotels.js`, `services.js` for all JSON columns (images, amenities, features, specialties, etc.)
- **eSIM Plans** — Fixed `plan.data` → `plan.dataAmount` field name mismatch
- **AdminVisa** — Removed last `mockAdminVisa` import; now fully API-driven

### Removed
- All mock data imports removed from entire codebase (`mock-data.ts` no longer imported anywhere)

### Performance
- Server warm-up on first visitor load (parallel `/health` + CMS prefetch)
- Route prefetching on nav link hover via `requestIdleCallback`
- CSS `content-visibility: auto` on images/video, `optimizeSpeed` text rendering

---

## [2.0.0] — 2026-03-08 — Full Production Hardening & Audit

### Fixed
- **BlogPost.tsx** — Removed mock data dependency; now uses CMS API via `useCmsPageContent("/blog")`
- **HotelDetail.tsx** — Removed hardcoded fallback hotel data; proper error via `DataLoader`
- **Header.tsx** — Fixed wrong mobile nav icons; added missing "Pay Bill" link
- **BookingConfirmation.tsx** — Fixed fake success toast on API failure

### Changed
- All 18+ dashboard/admin pages: Removed mock data fallbacks; API errors now display descriptive messages
- `DataLoader.tsx` — Enhanced with status-specific error icons and retry buttons
- `api.ts` — Network errors now throw structured `NETWORK_ERROR` code

---

## [1.9.0] — 2026-03-08 — SMS + Email Notification System & Production Hardening

### Added
- **BulkSMSBD SMS Integration** (`backend/src/services/sms.js`) — OTP, booking confirmations, payment receipts, visa updates, welcome SMS to BD numbers
- **Resend Email Integration** (`backend/src/services/email.js`) — 10 beautifully styled HTML email templates: OTP, welcome, booking confirm, booking status, payment receipt, visa update, contact auto-reply, admin alert, password reset
- **Unified Notification Dispatcher** (`backend/src/services/notify.js`) — Sends both SMS + Email in parallel for every trigger
- **Admin Panel: SMS & Email Config** — Admin → Settings → API Integrations → Communication tab (BulkSMSBD + Resend API keys)
- **DB-first API key resolution** — Services read keys from `system_settings` table first, fallback to `.env`
- **Vite manual chunks** — Code-splitting for vendor, UI, charts, PDF, motion (eliminates 500KB+ chunk warning)

### Notification Triggers
| Event | SMS | Email | Admin Alert |
|-------|-----|-------|-------------|
| User registers | ✅ | ✅ | ✅ |
| Password reset OTP | ✅ | ✅ | — |
| Flight/Hotel/Holiday/Medical/Car booked | ✅ | ✅ | ✅ |
| Admin updates booking status | ✅ | ✅ | — |
| Admin approves payment | ✅ | ✅ | — |
| Admin updates visa status | ✅ | ✅ | — |
| Contact form submitted | — | ✅ | ✅ |

### Changed
- `backend/src/routes/auth.js` — Integrated `notifyWelcome` + `notifyPasswordReset`
- `backend/src/routes/flights.js`, `hotels.js`, `services.js` — Integrated `notifyBookingConfirm`
- `backend/src/routes/visa.js` — Integrated `notifyVisaStatus`
- `backend/src/routes/admin.js` — Integrated `notifyBookingStatus` + `notifyPayment`
- Admin Settings — Replaced SMTP config with Resend, updated SMS Gateway to BulkSMSBD
- `.env` / `.env.example` — Added `RESEND_API_KEY`, `BULKSMS_API_KEY`, `BULKSMS_SENDER_ID`

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
