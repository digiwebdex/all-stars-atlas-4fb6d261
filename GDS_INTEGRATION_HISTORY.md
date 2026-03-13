# Seven Trip — GDS Integration History & Troubleshooting

> Complete timeline of all GDS provider integrations, issues encountered, and solutions applied.
> Last updated: 2026-03-13 (v3.9.7)

---

## 📋 Provider Overview

| Provider | Type | First Integrated | File | Auth Method |
|----------|------|-----------------|------|-------------|
| TTI/ZENITH | WCF SOAP-like | v2.5 (Mar 9) | `tti-flights.js` | API Key (DB) |
| BDFare | REST API v2 | v2.5 (Mar 9) | `bdf-flights.js` | Token auth (DB) |
| FlyHub | REST API | v2.5 (Mar 9) | `flyhub-flights.js` | Token auth (DB) |
| Sabre REST | REST API v5 | v3.5 (Mar 12) | `sabre-flights.js` | OAuth v3 password grant (DB) |
| Sabre SOAP | SOAP/XML | v3.5 (Mar 12) | `sabre-soap.js` | BinarySecurityToken session |

---

## 🔧 TTI/ZENITH (Air Astra) Integration

### Timeline
| Date | Version | Event |
|------|---------|-------|
| Mar 9 | v2.5 | Initial integration — SearchFlights + CreateBooking |
| Mar 10 | v3.0 | Enhanced seat availability extraction from AirCoupons |
| Mar 11 | v3.3 | Cabin class mapping (case-insensitive) |
| Mar 13 | v3.9.6 | **Critical fix**: Cancel API requires airline PNR, not TTI booking ID |

### Issues & Resolutions

#### Issue #1: Cancel API Wrong ID (v3.9.6)
- **Symptom**: Cancellation requests failing silently
- **Root Cause**: `cancelBooking()` sent internal TTI ID (e.g., `STTTI-xxx`) instead of airline PNR (e.g., `S2240313001234`)
- **Investigation**: Probe matrix of 6 payload combinations:
  1. `{ BookingID: ttiBookingId }` → ❌
  2. `{ BookingID: airlinePNR }` → ✅
  3. `{ PNR: airlinePNR }` → ❌
  4. `{ RecordLocator: airlinePNR }` → ❌
  5. `{ BookingReference: airlinePNR }` → ❌
  6. `{ BookingID: bookingRef }` → ❌
- **Fix**: Extract airline PNR from `booking.details.gdsResponse` with priority chain: `RecordLocator` → `BookingReference` → `PNR` → `ETTicketFares[0].Ref`

#### Issue #2: Cabin Class Always Economy (v3.3)
- **Symptom**: Business/First class searches returned Economy labels
- **Root Cause**: TTI doesn't differentiate cabin classes for ATR 72-600 aircraft
- **Fix**: Case-insensitive cabin mapping; amber banner when searched class unavailable

#### Issue #3: Date Parsing Errors (v3.1)
- **Symptom**: "Invalid Date" in e-ticket PDFs
- **Root Cause**: TTI returns dates in WCF `/Date(ms+offset)/` format
- **Fix**: Robust date parser handling WCF, ISO, and epoch formats

---

## 🔧 BDFare Integration

### Timeline
| Date | Version | Event |
|------|---------|-------|
| Mar 9 | v2.5 | Initial integration |
| Mar 12 | v3.7.7 | **Complete normalizer rewrite** to match actual API v2 structure |

### Issues & Resolutions

#### Issue #1: Zero Results Returned (v3.7.7)
- **Symptom**: BDFare searches returned 0 flights
- **Root Cause**: Normalizer expected v1 response shape (`flights[]`), but API v2 returns `Response.Results[]` with `segments[].Airline`, `segments[].Origin/Destination`, `Fares[].BaseFare/Tax`
- **Fix**: Complete rewrite of `normalizeBDFareResponse`

#### Issue #2: Carrier Filter Not Working (v3.7.7)
- **Symptom**: Preferred airline dropdown had no effect
- **Root Cause**: `carrier` query param not extracted from URL and not applied post-search
- **Fix**: Added `carrier` param extraction and case-insensitive IATA code filtering

#### Issue #3: Duration Parsing (v3.7.7)
- **Symptom**: Flight duration showing "NaN"
- **Root Cause**: BDFare returns duration as `"17h 50m"` string, not minutes
- **Fix**: Added regex parser for BDFare-specific duration format

---

## 🔧 Sabre REST Integration

### Timeline
| Date | Version | Event |
|------|---------|-------|
| Mar 12 | v3.5 | Initial BFM v5 search + PNR creation |
| Mar 12 | v3.7.9 | Branded fares extraction |
| Mar 12 | v3.9.1 | Compressed response fix |
| Mar 12 | v3.9.2 | DateTime schema fix for PNR |
| Mar 12 | v3.9.3 | DOCS schema fix (remove unsupported fields) |
| Mar 13 | v3.9.7 | **NamePrefix removal** — title appended to GivenName |

### Issues & Resolutions

#### Issue #1: Compressed Response — 0 Flights (v3.9.1)
- **Symptom**: All Sabre searches returned 0 flights
- **Root Cause**: `CompressResponse: true` in BFM request caused Sabre to return base64-gzip blob under `compressedResponse` key; normalizer only handled `groupedItineraryResponse`
- **Fix**: Removed `CompressResponse` flag; added `zlib.gunzipSync` fallback decompression

#### Issue #2: PNR DateTime Validation Error (v3.9.2)
- **Symptom**: `NotProcessed` status on PNR creation
- **Root Cause**: Segment datetimes sent with timezone offsets (`2026-04-15T21:55:00+06:00`), violating Sabre schema
- **Fix**: Added `toSabreDateTime()` normalizer to strip timezone suffixes

#### Issue #3: DOCS Schema Validation (v3.9.3)
- **Symptom**: 400 validation error on PNR creation
- **Root Cause**: `AdvancePassenger.Document` included unsupported fields (`DateOfBirth`, `FirstName`, `LastName`, `Gender`)
- **Fix**: Stripped to schema-safe fields only (`Type`, `Number`, `IssueCountry`, `NationalityCountry`, `ExpirationDate`)

#### Issue #4: NamePrefix Rejection (v3.9.7) — LATEST
- **Symptom**: `ERR.SP.CLIENT.VALIDATION_FAILED` — `NamePrefix` property not allowed in `PersonName`
- **Root Cause**: Sabre schema does not accept `NamePrefix` as a property of `PersonName`
- **Fix**: Removed `NamePrefix`; title appended to `GivenName` (e.g., `"JOHN MR"`) per Sabre standard
- **Verification**: PNR `JIUKMY` created successfully via `full_payload` variant

#### Issue #5: Round-Trip Deduplication (v3.7.8)
- **Symptom**: Round-trip search showing only 1 result instead of hundreds
- **Root Cause**: Dedup key used only first-leg flight number + departure time, collapsing all combos sharing same outbound
- **Fix**: Dedup key now includes ALL leg flight numbers, arrival times, direction, and per-leg departure times

#### Issue #6: NDC Fares Not Appearing
- **Status**: Not a code issue — PCC J4YL lacks NDC entitlements
- **Action Required**: Contact Sabre account manager to activate NDC carrier agreements
- **Code Status**: `DataSources: { NDC: "Enable" }` already in BFM request

---

## 🔧 Sabre SOAP Integration

### Timeline
| Date | Version | Event |
|------|---------|-------|
| Mar 12 | v3.5 | SessionCreateRQ, EnhancedSeatMapRQ v6, GetAncillaryOffersRQ v3 |
| Mar 13 | v3.9.6 | Cancel PNR via SOAP fallback (when REST fails) |
| Mar 13 | v3.9.7 | **Seat map retry** with session cache clearing |

### Issues & Resolutions

#### Issue #1: Seat Map Returning Null on Production (v3.9.7)
- **Symptom**: `{ layout: null, source: "none", available: false }` intermittently on production
- **Root Cause**: Cached SOAP BinarySecurityToken expired (14-min TTL) but cache didn't invalidate
- **Fix**: On SOAP fault or `NotProcessed`, clear session cache and retry once with fresh token
- **Verification**: AI (126 seats), EK (276 seats), SQ (159 seats) all returning data

#### Issue #2: Missing getSabreConfig Import (v3.9.6)
- **Symptom**: `cancelPnrViaSoap` crashing — `getSabreConfig is not defined`
- **Root Cause**: `sabre-soap.js` had its own `getSabreConfig` but cancel function used undefined variable
- **Fix**: Added local config loader + exported `cancelPnrViaSoap`

### Session Management
- Token cached with 14-minute TTL (Sabre sessions expire at 15 min)
- `createSession()` → `SessionCreateRQ` → extracts `BinarySecurityToken`
- `closeSession()` → `SessionCloseRQ` → invalidates cache
- All SOAP calls share the cached session token
- Automatic retry with fresh session on fault detection

---

## 🔧 Multi-Provider Search Architecture

### Search Flow
```
GET /flights/search?from=DAC&to=DXB&date=2026-04-15&adults=1

    ┌──────────────────────────────────────────┐
    │           Promise.allSettled              │
    │                                          │
    │  ┌────────┐  ┌────────┐  ┌────────┐     │
    │  │  TTI   │  │ BDFare │  │ FlyHub │     │
    │  └────┬───┘  └────┬───┘  └────┬───┘     │
    │       │           │           │          │
    │  ┌────┴───┐  ┌────┴───┐               │
    │  │ Sabre  │  │Galileo │  (planned)      │
    │  └────┬───┘  └────┴───┘               │
    │       │                                  │
    │  ┌────▼─────────────────────────┐        │
    │  │  Normalize + Dedup + Sort    │        │
    │  └──────────────────────────────┘        │
    └──────────────────────────────────────────┘
```

### Deduplication Key
```
key = flightNumber + departureTime + arrivalTime + destination + stops +
      stopCodes + direction + [all legs' flightNumber@departureTime]
```

### Provider Priority for Ancillaries
```
Seat Map:  Sabre SOAP EnhancedSeatMapRQ → TTI GetSeatMap → "Not Available"
Meals:     Sabre SOAP GetAncillaryOffersRQ → TTI → empty
Baggage:   Sabre SOAP GetAncillaryOffersRQ → TTI → empty
```

---

## 📊 API Response Time Benchmarks (Production VPS)

| Operation | Provider | Typical Response Time |
|-----------|----------|----------------------|
| Flight Search | Sabre BFM | 2-5 seconds |
| Flight Search | BDFare | 3-6 seconds |
| Flight Search | TTI | 1-3 seconds |
| Seat Map | Sabre SOAP | 1-3 seconds |
| Ancillaries | Sabre SOAP GAO | 2-4 seconds |
| PNR Creation | Sabre REST | 3-8 seconds |
| Booking Cancel | Sabre REST | 1-3 seconds |
| Booking Cancel | TTI | 1-2 seconds |

---

## 🔑 Credential Management

All GDS credentials stored in `system_settings` table with key `api_<provider>`:
- `api_tti` — TTI/ZENITH URL, API key, Agency ID
- `api_bdf` — BDFare token, URL
- `api_flyhub` — FlyHub username, API key
- `api_sabre` — Sabre EPR, PCC, agency password, client ID/secret, environment (cert/prod)

**Cache:** All configs cached for 5 minutes with `clearXxxConfigCache()` functions called on admin settings save.

**Security:** No API keys in `.env` files or source code. All read from database at runtime.
