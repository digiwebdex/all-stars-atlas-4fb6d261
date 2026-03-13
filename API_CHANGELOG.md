# Seven Trip — API Changelog

> All backend API changes, new endpoints, breaking changes, and schema updates per version.
> Last updated: 2026-03-13 (v3.9.9.4)

---

## v3.9.9.4 — 2026-03-13

### Fixed
- `GET /flights/seats-rest` now probes **both** Sabre contracts: v3 (`/v3/offers/getseats/byPnrLocator`) and v1 (`/v1/offers/getseats`)
- Added explicit handling for PNR ownership/viewership errors (`code 700102`) with actionable `hint` in response
- Added automatic fallback to SOAP `EnhancedSeatMapRQ` when REST variants fail, so seat maps still return for supported carriers
- `debugAttempts` now includes endpoint-qualified variant names for faster root-cause analysis

### Confirmed Sabre Endpoints (from developer portal)
- Auth: `/v2/auth/token`
- Search: `/v4/offers/shop`
- Revalidate: `/v4/shop/flights/revalidate`
- Book: `/v2.4.0/passenger/records?mode=create`
- Cancel: `/v1/trip/orders/cancelBooking`
- Retrieve: `/v1/trip/orders/getBooking`
- Ticket: `/v1.3.0/air/ticket`
- Ticket Status: `/v1/trip/orders/checkFlightTickets`
- **Seats: `/v1/offers/getseats`**
- SOAP: `https://webservices.cert.platform.sabre.com`

### Verified — Airline Support Matrix
- **Pre-booking seat maps working**: EK (33 rows), SQ (35), AI (23), TG (26), TK (35), CZ (35) — all via Sabre SOAP
- **Not working from DAC**: BG, BS, 2A, QR, SV, GF, KU, WY, EY, FZ, G9, MH, CX, 6E, UL (Sabre limitation, not code bug)
- **Post-booking ancillaries**: GAO requires active PNR (auto-cancelled PNRs return "Proper request mode" error)

---

## v3.9.9 — 2026-03-13

### New Endpoints
- `POST /flights/revalidate-price` — Sabre BFM revalidation (`/v4/shop/flights/revalidate`) to verify fare before booking
- `GET /flights/booking/:pnr` — Retrieve PNR details via Sabre REST (`/v1/trip/orders/getBooking`)
- `GET /flights/ticket-status/:pnr` — Check ticket issuance status (`/v1/trip/orders/checkFlightTickets`)
- `GET /flights/seats-rest` — REST seat map via `/v2/offers/getseats` (requires PNR)

### Backend Changes
- **Ticketing upgraded**: `issueTicket()` now uses `/v1.3.0/air/ticket` (was v1.2.1)
- **3-tier seat map fallback**: SOAP EnhancedSeatMapRQ → REST GetSeats → TTI in `ancillaries.js`
- **New exports from `sabre-flights.js`**: `revalidatePrice`, `getBooking`, `checkTicketStatus`, `getSeatsRest`

---

## v3.9.7 — 2026-03-13

### Backend Changes
- **Sabre PNR fix**: Removed `NamePrefix` from `PersonName` in `CreatePassengerNameRecordRQ` — title appended to `GivenName` (e.g., `"JOHN MR"`)
- **SOAP retry logic**: `sabre-soap.js` now clears BinarySecurityToken cache on SOAP fault/NotProcessed and retries once with fresh session
- **shouldRetry regex**: Updated in `sabre-flights.js` to catch `PersonName`, `NamePrefix`, and `not allowed` validation errors

### No New Endpoints

---

## v3.9.6 — 2026-03-13

### Backend Changes
- **TTI cancel fix**: `cancelBooking()` now sends airline PNR (not internal TTI ID) — extracts from `gdsResponse` priority chain: `RecordLocator` → `BookingReference` → `PNR` → `ETTicketFares[0].Ref`
- **Sabre SOAP cancel**: Fixed missing `getSabreConfig` import, added `cancelPnrViaSoap` to exports

### No New Endpoints

---

## v3.9.3 — 2026-03-12

### Backend Changes
- **Sabre DOCS fix**: Stripped unsupported fields from `AdvancePassenger.Document` (`DateOfBirth`, `FirstName`, `LastName`, `Gender`) — now sends only `Type`, `Number`, `IssueCountry`, `NationalityCountry`, `ExpirationDate`

---

## v3.9.2 — 2026-03-12

### Backend Changes
- **DateTime normalization**: Added `toSabreDateTime()` to strip timezone offsets from segment datetimes before PNR creation

---

## v3.9.1 — 2026-03-12

### Backend Changes
- **Compressed response fix**: Removed `CompressResponse: true` from BFM request; added `zlib.gunzipSync` fallback decompression

---

## v3.9.0 — 2026-03-12

### New Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard/bookings/:id/ancillaries` | Yes | Fetch Sabre GAO meal/baggage offers for a booking's PNR |

### Backend Changes
- **Auto-ticketing**: Payment callbacks (SSLCommerz/bKash/Nagad) now call `autoTicketAfterPayment()` — issues real GDS tickets on payment confirmation
- **Pay Later deadlines**: Removed hardcoded fallbacks; deadlines now exclusively from airline GDS `timeLimit`

### New Files
- `backend/src/services/auto-ticket.js`

---

## v3.8.0 — 2026-03-12

### No API Changes
Frontend-only: animated flight timeline

---

## v3.7.9 — 2026-03-12

### Backend Changes
- **Branded fares**: BFM normalizer extracts brand names from `fareComponentDescs` — returns `fareDetails[]` with `brandName`, `baggage`, `handBaggage`, `mealIncluded`, `seatSelection`, `rebookingAllowed`, `cancellationAllowed`
- **Dedup fix**: Key now includes ALL leg flight numbers, arrival time, direction, per-leg departure times

---

## v3.7.7 — 2026-03-12

### Backend Changes
- **BDFare normalizer rewrite**: Matches actual API v2 structure (`Response.Results[]`, `segments[].Airline`, `Fares[].BaseFare/Tax`)
- **Carrier filter**: Added `carrier` query param to `/flights/search` — post-aggregation IATA code filter
- **Duration parser**: Handles BDFare `"17h 50m"` format

---

## v3.7.2 — 2026-03-12

### New Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/rewards/balance` | Yes | Current points balance |
| GET | `/rewards/history` | Yes | Transaction history (paginated) |
| GET | `/rewards/coupons` | Yes | User's coupon list |
| POST | `/rewards/redeem` | Yes | Convert points → coupon |
| POST | `/rewards/validate-coupon` | Yes | Check coupon validity |
| POST | `/rewards/apply-coupon` | Yes | Apply coupon to booking |
| GET | `/rewards/earn-rate` | No | Public earn rates |

### New Database Tables
- `user_points` — Per-user balance
- `point_transactions` — Earn/redeem ledger
- `reward_coupons` — Generated coupons
- `points_rules` — Admin earn rates per service

### Migration
```bash
mysql seventrip < backend/database/reward-points-migration.sql
```

---

## v3.5.0 — 2026-03-12

### New Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/flights/seat-map` | Yes | Real-time seat map (Sabre SOAP EnhancedSeatMapRQ) |
| GET | `/flights/ancillaries` | Yes | Meal + baggage offers (Sabre SOAP GAO) |

### Backend Changes
- **Sabre SOAP session manager** (`sabre-soap.js`): SessionCreateRQ, EnhancedSeatMapRQ v6, GetAncillaryOffersRQ v3, SessionCloseRQ
- **Sabre REST PNR**: SSR injection (meals, wheelchair, medical, UMNR, pets, FF#, DOCA, OSI)
- **Ancillaries priority chain**: Sabre SOAP → TTI → Standard fallback

### New Files
- `backend/src/routes/sabre-soap.js`

---

## v3.3.0 — 2026-03-11

### Backend Changes
- **Admin markup config**: Settings PUT handles `markup_config` JSON
- **Invoice reminders**: `POST /admin/invoices/:id/remind` sends real email
- **Cabin class**: Sent to all GDS providers (TTI, BDFare, FlyHub, Sabre)

---

## v3.1.0 — 2026-03-10

### New Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PATCH | `/admin/bookings/:id/archive` | Admin | Soft-archive booking |
| DELETE | `/admin/bookings/:id` | Admin | Permanently delete booking |

### Backend Changes
- **GDS operations**: Admin can ticket/cancel/void via real GDS APIs (TTI, BDFare, FlyHub, Sabre)
- **Archived booking filter**: All 8 booking-related queries exclude archived bookings

---

## v3.0.0 — 2026-03-10

### Backend Changes
- **Booking APIs**: eSIM, Holiday, Medical, Car booking endpoints now persist to database and return real booking references
- **Zero-mock audit v2**: Removed all hardcoded fallback data

---

## v2.8.0 — 2026-03-09

### Backend Changes
- Company info update across all email templates and PDF generators

---

## v2.5.0 — 2026-03-09

### New Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/flights/search` | No | Multi-GDS parallel flight search |
| POST | `/flights/book` | Yes | Create booking + PNR |
| POST | `/flights/upload-travel-docs` | Yes | Upload passport/visa |
| GET | `/flights/travel-docs/:bookingId` | Yes | Get uploaded documents |

### New Files
- `backend/src/routes/tti-flights.js`
- `backend/src/routes/bdf-flights.js`
- `backend/src/routes/flyhub-flights.js`
- `backend/src/routes/sabre-flights.js`

### Backend Changes
- **Database-backed API config**: All API keys moved from `.env` to `system_settings` table
- **TTI/BDFare/FlyHub/Sabre** integrated with parallel search via `Promise.allSettled`

---

## v2.2.0 — 2026-03-08

### New Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/contact/subscribe` | No | Newsletter subscription |
| POST | `/dashboard/bookings/send-confirmation` | Yes | Email booking confirmation |

### Backend Changes
- **E-Transactions field mapping**: Returns `method`, `fee`, `date`
- **Dashboard pie chart**: Returns raw counts (frontend converts to %)

---

## v2.1.0 — 2026-03-08

### Backend Changes
- **Response shape standardization**: All listing endpoints return `{ data: [...] }`
- **SQL GROUP BY fix**: `only_full_group_by` compatibility
- **`safeJsonParse()`**: Prevents JSON.parse crashes on malformed DB data

### New Files
- `backend/src/utils/json.js`

---

## v1.9.0 — 2026-03-08

### New Files
- `backend/src/services/email.js` (Resend)
- `backend/src/services/sms.js` (BulkSMSBD)
- `backend/src/services/notify.js` (unified dispatcher)

### Backend Changes
- 10 notification triggers (register, OTP, booking, payment, visa, contact)

---

## v1.8.0 — 2026-03-08

### New Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/social/google` | No | Google OAuth verification |
| POST | `/auth/social/facebook` | No | Facebook OAuth verification |
| GET | `/auth/social/config` | No | Public OAuth client IDs |

### New Files
- `backend/src/routes/social-auth.js`

### Database Migration
```bash
mysql seventrip < backend/database/social-auth-migration.sql
```

---

## v1.2.0 — 2026-03-03

### Initial API
All core endpoints created:
- Auth: login, register, logout, refresh, forgot-password, verify-otp, reset-password
- Dashboard: stats, bookings, transactions, travellers, payments, tickets, wishlist, settings
- Admin: dashboard, users, bookings, payments, reports, settings, visa
- CMS: pages, blog, promotions, destinations, media, email-templates
- Services: flights, hotels, holidays, visa, medical, cars, esim, recharge, paybill
- Contact: submit
