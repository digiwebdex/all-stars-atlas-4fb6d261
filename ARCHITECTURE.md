# Seven Trip — System Architecture

> Complete technical architecture documentation for the Seven Trip travel platform.
> Last updated: 2026-03-13 (v3.9.9.5 — Production Sabre + Dual PNR Extraction + 30-Route Test Suite)

---

## 🏗 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 React 18 SPA (Vite)                       │  │
│  │                                                           │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ 70+ Pages│  │ shadcn/ui│  │ AuthCtx  │  │ ThemeCtx │  │  │
│  │  └────┬─────┘  │ 40+ Comps│  │ JWT/OAuth│  │ Dark/Lite│  │  │
│  │       │        └────┬─────┘  └────┬─────┘  └──────────┘  │  │
│  │       │             │             │                       │  │
│  │  ┌────▼─────────────▼─────────────▼───────────────────┐   │  │
│  │  │  React Query (Server State) + React Hook Form      │   │  │
│  │  └────────────────────┬───────────────────────────────┘   │  │
│  │                       │                                   │  │
│  │  ┌────────────────────▼───────────────────────────────┐   │  │
│  │  │  API Client (src/lib/api.ts)                       │   │  │
│  │  │  • Auto JWT headers  • 401 refresh retry           │   │  │
│  │  │  • Error normalization  • File upload              │   │  │
│  │  └────────────────────┬───────────────────────────────┘   │  │
│  └───────────────────────┼───────────────────────────────────┘  │
│                          │ HTTPS (fetch)                        │
└──────────────────────────┼──────────────────────────────────────┘
                           │
              ┌────────────▼────────────────┐
              │   Nginx (Reverse Proxy)      │
              │   • SSL/TLS termination      │
              │   • Static file serving      │
              │   • HTTP/2 + gzip            │
              │   • Rate limiting            │
              ├─────────────┬────────────────┤
              │ Frontend    │ API Proxy      │
              │ /var/www/   │ → :3001        │
              └─────────────┴────────┬───────┘
                                     │
              ┌──────────────────────▼───────────────────────┐
              │          Node.js Express Backend             │
              │          (PM2 managed, port 3001)            │
              │                                             │
              │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
              │  │ Auth     │  │ Flights  │  │ Admin    │  │
              │  │ Routes   │  │ Routes   │  │ Routes   │  │
              │  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
              │       │             │              │         │
              │  ┌────▼─────────────▼──────────────▼─────┐  │
              │  │        Middleware Layer                │  │
              │  │  • JWT verify  • Rate limit  • CORS   │  │
              │  │  • Helmet.js   • Morgan logging        │  │
              │  └────────────────┬───────────────────────┘  │
              │                  │                           │
              │  ┌───────────────▼───────────────────────┐   │
              │  │          Service Layer                │   │
              │  │  • Email (Resend)                     │   │
              │  │  • SMS (BulkSMSBD)                    │   │
              │  │  • Auto-Ticket (GDS → ticket issue)   │   │
              │  │  • Notification Dispatcher            │   │
              │  └───────────────┬───────────────────────┘   │
              │                  │                           │
              └──────────────────┼───────────────────────────┘
                                 │
              ┌──────────────────▼───────────────────────┐
              │           MySQL / MariaDB                 │
              │           24 tables                       │
              │           system_settings (API keys)      │
              └──────────────────────────────────────────┘
```

---

## 🛫 GDS Integration Architecture

```
GET /flights/search?from=DAC&to=DXB&date=2026-04-15&adults=1

    ┌──────────────────────────────────────────────────────┐
    │              Promise.allSettled (Parallel)            │
    │                                                      │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
    │  │   TTI    │  │  BDFare  │  │  FlyHub  │          │
    │  │ (Air     │  │ (BD      │  │ (450+    │          │
    │  │  Astra)  │  │  carriers)│  │  airlines)│          │
    │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
    │       │              │              │                │
    │  ┌────┴──────┐                                      │
    │  │  Sabre    │  ┌──────────┐  ┌──────────┐          │
    │  │  REST     │  │ Galileo  │  │   NDC    │          │
    │  │  (BFM v5) │  │(planned) │  │(pending) │          │
    │  └────┬──────┘  └──────────┘  └──────────┘          │
    │       │                                              │
    │  ┌────▼──────────────────────────────────────────┐   │
    │  │  Normalize → Deduplicate → Sort → Filter      │   │
    │  │                                               │   │
    │  │  Dedup key: flightNo + depTime + arrTime +    │   │
    │  │  dest + stops + stopCodes + direction +       │   │
    │  │  [all legs' flightNo@depTime]                 │   │
    │  └───────────────────────────────────────────────┘   │
    └──────────────────────────────────────────────────────┘
```

### Sabre Hybrid Architecture (REST + SOAP)

```
┌─────────────────────────────────────────────────────────────┐
│                    Sabre Integration                         │
│                                                             │
│  REST API (sabre-flights.js)          SOAP API (sabre-soap.js)
│  ┌─────────────────────────┐         ┌─────────────────────┐
│  │ OAuth v3 (password)     │         │ SessionCreateRQ     │
│  │ → Access Token (cache)  │         │ → BinarySecurityToken│
│  │                         │         │   (14-min TTL cache) │
│  │ BFM v5 Search           │         │                     │
│  │ CreatePNR + SSR + DOCS  │         │ EnhancedSeatMapRQ   │
│  │ AirTicketRQ             │         │ GetAncillaryOffersRQ│
│  │ Cancel/Void             │         │ Cancel (fallback)   │
│  │                         │         │ SessionCloseRQ      │
│  └─────────────────────────┘         └─────────────────────┘
│                                                             │
│  PNR Schema Rules:                                          │
│  • No NamePrefix in PersonName (title → GivenName)          │
│  • DateTime without timezone offsets (toSabreDateTime)       │
│  • DOCS: only Type/Number/IssueCountry/NationalityCountry   │
│  • No CompressResponse flag in BFM request                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂 Frontend Architecture

### Directory Structure

```
src/
├── App.tsx                    # Root router (70+ routes, 3 layout groups)
├── main.tsx                   # Entry point (providers)
├── index.css                  # CSS variables (design tokens)
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx         # Responsive header with transparent-on-home
│   │   ├── Footer.tsx         # Newsletter, social links, payment icons
│   │   └── PublicLayout.tsx   # Header + Outlet + Footer wrapper
│   ├── search/
│   │   └── SearchWidget.tsx   # 9-tab search (Flights/Hotels/Visa/...)
│   ├── flights/
│   │   ├── SeatMap.tsx        # Interactive aircraft seat selection
│   │   └── AnimatedFlightArc.tsx  # SVG flight path animation
│   ├── ui/                    # 40+ shadcn/ui components (DO NOT modify)
│   ├── AdminRoute.tsx         # Admin guard (role check)
│   ├── ProtectedRoute.tsx     # Auth guard (login check)
│   ├── AuthGateModal.tsx      # Inline auth popup (booking flow)
│   ├── DataLoader.tsx         # Skeleton/error/retry wrapper
│   ├── ErrorBoundary.tsx      # Global error boundary
│   └── ThemeProvider.tsx      # Dark/light/system theme
│
├── contexts/
│   └── AuthContext.tsx        # Auth state, login, register, social auth
│
├── hooks/
│   ├── useAuth.ts             # Auth context consumer
│   ├── useApiData.ts          # 40+ React Query hooks
│   ├── useCmsContent.ts       # CMS page content with defaults
│   └── usePaymentGateways.ts  # SSLCommerz/bKash/Nagad hooks
│
├── lib/
│   ├── api.ts                 # HTTP client (JWT, refresh, error handling)
│   ├── config.ts              # VITE_API_BASE_URL resolution
│   ├── constants.ts           # 90+ API endpoint paths
│   ├── airports.ts            # 740+ airport database
│   ├── airlines-database.ts   # 60+ airline data (IATA, name, logo)
│   ├── countries.ts           # 70+ country/nationality mappings
│   ├── pdf-generator.ts       # E-ticket, Invoice, Money Receipt PDFs
│   ├── social-auth.ts         # Google GSI + Facebook SDK
│   ├── keep-alive.ts          # Server warm-up on first visit
│   ├── prefetch.ts            # Route prefetching on hover
│   └── utils.ts               # cn(), formatCurrency, etc.
│
└── pages/
    ├── Index.tsx               # Homepage (CMS-driven, 11 sections)
    ├── auth/                   # Login, Register, ForgotPassword, VerifyOTP
    ├── flights/                # FlightResults, FlightBooking
    ├── hotels/                 # HotelResults, HotelDetail
    ├── holidays/               # HolidayPackages, HolidayDetail
    ├── visa/                   # VisaServices, VisaApplication
    ├── medical/                # MedicalServices, MedicalBooking
    ├── cars/                   # CarRental, CarBooking
    ├── esim/                   # ESIMPlans, ESIMPurchase
    ├── recharge/               # RechargePage
    ├── paybill/                # PayBillPage
    ├── booking/                # BookingConfirmation
    ├── static/                 # About, Contact, Blog, FAQ, etc.
    ├── dashboard/              # 12 user dashboard pages
    └── admin/                  # 17 admin modules + CMS suite
```

### State Management

| Type | Tool | Location |
|------|------|----------|
| **Auth state** | React Context | `AuthContext.tsx` |
| **Server data** | React Query | `useApiData.ts` (40+ hooks) |
| **Form state** | React Hook Form + Zod | Per-form components |
| **Theme** | React Context | `ThemeProvider.tsx` |
| **UI state** | `useState`/`useRef` | Local component state |
| **CMS** | localStorage + API | `useCmsContent.ts` |

### Routing Groups

```
BrowserRouter
├── PublicLayout (Header + Footer)
│   ├── / (Homepage)
│   ├── /flights, /hotels, /visa, /holidays, /medical, ...
│   ├── /about, /contact, /blog, /faq, ...
│   └── /booking/confirmation
├── Auth (no layout)
│   ├── /auth/login, /auth/register
│   ├── /auth/forgot-password, /auth/verify-otp
│   └── /admin/login
├── DashboardLayout (sidebar + breadcrumb)
│   ├── /dashboard (overview)
│   ├── /dashboard/bookings, /dashboard/tickets, ...
│   └── /dashboard/settings
└── AdminLayout (admin sidebar)
    ├── /admin (dashboard)
    ├── /admin/bookings, /admin/users, ...
    └── /admin/cms/*
```

---

## 🗄 Backend Architecture

### Directory Structure

```
backend/
├── server.js                  # Express app entry (CORS, helmet, morgan, routes)
├── package.json
├── .env                       # DB, JWT, SMTP (NOT API keys)
│
├── src/
│   ├── config/
│   │   ├── db.js              # MySQL connection pool (mysql2)
│   │   └── media.js           # Multer file upload config
│   │
│   ├── middleware/
│   │   └── auth.js            # JWT verify, role guards (authenticate, isAdmin)
│   │
│   ├── services/
│   │   ├── email.js           # Resend transactional emails (10 templates)
│   │   ├── sms.js             # BulkSMSBD SMS notifications
│   │   ├── notify.js          # Unified dispatcher (SMS + Email parallel)
│   │   └── auto-ticket.js     # Auto-ticket after payment (GDS → issue)
│   │
│   ├── routes/
│   │   ├── auth.js            # Register, login, OTP, password reset
│   │   ├── social-auth.js     # Google + Facebook OAuth verification
│   │   ├── flights.js         # Multi-GDS parallel search + booking
│   │   ├── tti-flights.js     # TTI/ZENITH (Air Astra) proxy
│   │   ├── bdf-flights.js     # BDFare GDS proxy
│   │   ├── flyhub-flights.js  # FlyHub GDS proxy
│   │   ├── sabre-flights.js   # Sabre REST (BFM, PNR, ticket, cancel)
│   │   ├── sabre-soap.js      # Sabre SOAP (seat map, ancillaries, session)
│   │   ├── galileo-flights.js # Galileo/Travelport (planned)
│   │   ├── ndc-flights.js     # IATA NDC (pending PCC activation)
│   │   ├── lcc-flights.js     # LCC carriers (Air Arabia, IndiGo)
│   │   ├── ancillaries.js     # Priority chain: Sabre SOAP → TTI → fallback
│   │   ├── hotels.js          # Hotel search (DB + HotelBeds)
│   │   ├── hotelbeds.js       # HotelBeds API (SHA256 auth)
│   │   ├── services.js        # Holidays, medical, cars, eSIM, recharge
│   │   ├── airalo.js          # Airalo eSIM API
│   │   ├── ssl-recharge.js    # SSL Wireless recharge + bill pay
│   │   ├── sslcommerz.js      # SSLCommerz payment gateway
│   │   ├── bkash.js           # bKash tokenized checkout
│   │   ├── nagad.js           # Nagad payment gateway
│   │   ├── visa.js            # Visa applications
│   │   ├── dashboard.js       # User dashboard APIs
│   │   ├── admin.js           # Admin panel APIs
│   │   ├── cms.js             # CMS CRUD
│   │   ├── rewards.js         # Reward points system
│   │   └── passport-ocr.js    # OCR + MRZ validation
│   │
│   └── utils/
│       └── json.js            # safeJsonParse utility
│
├── database/
│   ├── migration.sql          # Full schema (20 tables)
│   ├── social-auth-migration.sql
│   ├── pay-later-migration.sql
│   ├── pnr-column-migration.sql
│   ├── reward-points-migration.sql
│   ├── sabre-config-migration.sql
│   └── archive-migration.sql
│
└── uploads/                   # Local file storage
```

### Database Schema (24 Tables)

| Category | Tables |
|----------|--------|
| **Auth** | `users`, `refresh_tokens` |
| **Booking** | `bookings`, `transactions`, `tickets`, `travellers`, `wishlist` |
| **Services** | `flights`, `hotels`, `holiday_packages`, `medical_hospitals`, `cars`, `esim_plans`, `recharge_operators`, `bill_categories` |
| **Visa** | `visa_applications` |
| **CMS** | `cms_pages`, `cms_blog_posts`, `cms_promotions`, `cms_destinations`, `cms_media`, `cms_email_templates` |
| **System** | `system_settings`, `contact_submissions` |
| **Rewards** | `user_points`, `point_transactions`, `reward_coupons`, `points_rules` |

### API Key Management

All API keys stored in `system_settings` table (NOT in `.env` files):

| Key | Provider | Fields |
|-----|----------|--------|
| `api_tti` | TTI/ZENITH | URL, API key, Agency ID |
| `api_bdf` | BDFare | Token, URL |
| `api_flyhub` | FlyHub | Username, API key |
| `api_sabre` | Sabre | EPR, PCC, password, client ID/secret, environment |
| `api_hotelbeds` | HotelBeds | API key, secret |
| `api_airalo` | Airalo | Client ID, secret |
| `api_ssl_recharge` | SSL Wireless | API key |
| `api_sslcommerz` | SSLCommerz | Store ID, password |
| `api_bkash` | bKash | App key, secret, username, password |
| `api_nagad` | Nagad | Merchant ID, key |
| `api_bulksms` | BulkSMSBD | API key, sender ID |
| `api_resend` | Resend | API key |

**Cache:** 5-minute TTL with `clearXxxConfigCache()` on admin settings save.

---

## 🔄 Request Flow Examples

### Flight Search
```
User → SearchWidget → navigate(/flights?from=DAC&to=DXB...)
     → FlightResults → useQuery → api.get('/flights/search')
     → Backend flights.js → Promise.allSettled([TTI, BDFare, FlyHub, Sabre])
     → Each provider: getConfig() → API call → normalize()
     → Merge → Deduplicate → Sort → Return JSON
     → FlightResults renders cards
```

### Flight Booking (4 Steps)
```
Step 1: Itinerary Review (from search data, no API)
Step 2: Passenger Info + SSR forms (client-side)
Step 3: Seat Map (GET /flights/seat-map → Sabre SOAP) + Extras (GET /flights/ancillaries → Sabre SOAP GAO)
Step 4: Review → POST /flights/book → CreatePNR (Sabre REST) with SSR/DOCS → PNR response
     → Navigate to /booking/confirmation
```

### Payment → Auto-Ticket
```
User pays → SSLCommerz IPN / bKash callback / Nagad callback
         → Backend verifies payment
         → autoTicketAfterPayment(bookingId)
            → Check provider (Sabre/BDFare/FlyHub/TTI)
            → Issue ticket via GDS API
            → Update booking status (ticketed/confirmed)
            → Send SMS + Email notification
```

---

## 🔧 Design System

### CSS Variables (index.css)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 84% 5%;
  --card: 0 0% 100%;
  --primary: 173 80% 40%;      /* Teal brand color */
  --secondary: 210 40% 96%;
  --muted: 210 40% 96%;
  --accent: 210 40% 96%;
  --destructive: 0 84% 60%;
  --border: 214 32% 91%;
  --ring: 173 80% 40%;
}

.dark {
  --background: 222 47% 14%;   /* Softened dark (not pure black) */
  --foreground: 210 40% 98%;
  --card: 222 47% 16%;
  --primary: 173 80% 40%;
  /* ... all tokens have dark variants */
}
```

### Component Pattern

```tsx
// Always use semantic tokens, NEVER raw colors
<div className="bg-background text-foreground">
  <Card className="bg-card border-border">
    <Button className="bg-primary text-primary-foreground">
```
