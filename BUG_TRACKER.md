# Seven Trip — Bug Tracker & Root Cause Analysis

> Complete record of all bugs discovered and fixed during development.
> Last updated: 2026-03-13 (v3.9.7)

---

## 🔴 Critical Bugs (Service Down / Data Loss)

| # | Version | Bug | Root Cause | Fix | Impact |
|---|---------|-----|-----------|-----|--------|
| C01 | v3.9.7 | Sabre PNR creation failing (400) | `NamePrefix` property not allowed in `PersonName` schema | Removed `NamePrefix`, title appended to `GivenName` | All Sabre bookings blocked |
| C02 | v3.9.7 | Seat map returning null on production | Stale SOAP session token in cache | Auto-retry with session cache clearing | Seat selection unavailable |
| C03 | v3.9.6 | TTI cancel using wrong ID | Sent internal TTI ID instead of airline PNR | Extract PNR from gdsResponse with priority chain | Cancellations failing |
| C04 | v3.9.3 | Sabre PNR DOCS validation error | Unsupported fields in `AdvancePassenger.Document` | Stripped to schema-safe fields only | All Sabre bookings blocked |
| C05 | v3.9.2 | Sabre PNR DateTime validation | Timezone offsets in segment datetimes | `toSabreDateTime()` strips timezone | All Sabre bookings blocked |
| C06 | v3.9.1 | Sabre search returning 0 flights | `CompressResponse: true` returned base64-gzip blob | Removed flag + added gzip fallback | No Sabre results |
| C07 | v3.9.6 | `cancelPnrViaSoap` crashing | Missing `getSabreConfig` import in sabre-soap.js | Added local config loader | SOAP cancel broken |
| C08 | v3.7.7 | BDFare returning 0 results | Normalizer used v1 response shape, API is v2 | Complete normalizer rewrite | No BDFare results |
| C09 | v3.7.8 | Round-trip showing 1 result | Dedup key only used first-leg data | Include all legs in dedup key | Usability broken |
| C10 | v3.7.2 | API crash (502) on rewards route | `authenticateToken` undefined (should be `authenticate`) | Fixed import name | Server crash |
| C11 | v3.7.2 | DB migration FK error 3780 | Rewards tables used `INT` user_id, `users.id` is `CHAR(36)` | Changed to `CHAR(36)` | Migration blocked |
| C12 | v3.5 | Booking page crash | `paxTypes` referenced before declaration (TDZ) | Moved declarations before dependent state | Booking unusable |
| C13 | v2.1 | All listing pages empty | Frontend expected `.flights`/`.hotels`, backend sends `.data` | Added fallback: `apiData.data \|\| apiData.flights` | All pages empty |
| C14 | v2.1 | Admin SQL GROUP BY error | `only_full_group_by` mode in MySQL 8 | Added all non-aggregated columns to GROUP BY | Admin dashboard error |
| C15 | v2.1 | JSON.parse crashes | Unparseable JSON in DB columns | Created `safeJsonParse()` utility | Random 500 errors |

---

## 🟡 Major Bugs (Feature Broken)

| # | Version | Bug | Root Cause | Fix |
|---|---------|-----|-----------|-----|
| M01 | v3.7.7 | Carrier filter not working | `carrier` param not extracted from URL | Added param extraction + post-filter |
| M02 | v3.7.7 | Duration showing "NaN" | BDFare returns `"17h 50m"` not minutes | Regex parser for BDFare format |
| M03 | v3.7.2 | Round-trip price filter wrong | Slider used per-direction price, filter used total | Both now use `roundTripPairs.totalPrice` |
| M04 | v3.5.1 | International scope allowing domestic routes | Swap didn't re-validate against scope rules | Centralized `isScopeInvalidRoute()` validator |
| M05 | v3.3 | Cabin class always showing Economy | Frontend override faked searched cabin on results | Show real API cabin class |
| M06 | v3.3 | Taxes using hardcoded 12% | Frontend calculated tax instead of using GDS data | Use `flight.taxes` from API |
| M07 | v3.0 | eSIM/Holiday/Medical/Car booking not persisted | Booking pages navigated to confirmation without API call | Added real `POST /xxx/book` calls |
| M08 | v2.4 | Results pages showing data without search criteria | No validation on URL params | Added "No Search Criteria" guards |
| M09 | v2.3 | FlightBooking showing hardcoded data | Static "07:30 DAC → 08:35 CXB" | Fetch real flight details via API |
| M10 | v2.3 | BookingConfirmation always showing plane icon | No service-type icon mapping | Dynamic icon by booking type |

---

## 🟢 Minor Bugs (UI/UX)

| # | Version | Bug | Root Cause | Fix |
|---|---------|-----|-----------|-----|
| U01 | v3.7.4 | Dark mode too harsh (pure black) | 6% lightness backgrounds | Softened to 14% lightness |
| U02 | v3.7.3 | Search bar too dark | `bg-foreground` on white content | Changed to `bg-card` with `bg-muted` chips |
| U03 | v3.7.2 | Flight cards overflow (1024-1280px) | Fixed-width columns too wide | Reduced widths + `min-w-0` |
| U04 | v3.7.6 | Multi-city airline filter hidden | `!isMultiCity` exclusion condition | Removed exclusion |
| U05 | v3.7.6 | Multi-city details minimal | Only basic info shown | Full 5-tab detail panel |
| U06 | v3.3 | Duplicate cabin mismatch banner | Two alert instances rendered | Removed extra alert outside DataLoader |
| U07 | v3.3 | Document scanner country shows "BD" | ISO code instead of full name | Added 70+ country name mappings |
| U08 | v2.8 | Old phone numbers in PDFs | Hardcoded "+880 1234-567890" | Updated to real company phone |
| U09 | v2.7 | White space on mobile (right side) | Logo images 144-192px height | Normalized to 40-48px |
| U10 | v2.7 | Broken CSS class names in mobile sidebar | Corrupted Tailwind classes | Fixed class names |
| U11 | v2.2 | Homepage trustStrip double render | Rendered in loop AND explicitly | Removed duplicate |
| U12 | v2.2 | Dashboard stats showing fake growth | Hardcoded "+12%", "+8%" | Only show when API provides |

---

## 📊 Bug Statistics

### By Severity
| Severity | Count | % |
|----------|-------|---|
| 🔴 Critical | 15 | 39% |
| 🟡 Major | 10 | 26% |
| 🟢 Minor | 12 | 32% |
| **Total** | **37** | 100% |

### By Category
| Category | Count |
|----------|-------|
| API/Schema validation | 8 |
| Data format mismatch | 7 |
| Missing imports/exports | 4 |
| Hardcoded data | 6 |
| UI rendering | 7 |
| Logic errors | 5 |

### By Component
| Component | Count |
|-----------|-------|
| Sabre REST | 6 |
| Sabre SOAP | 3 |
| TTI/ZENITH | 3 |
| BDFare | 3 |
| Frontend - Flight Results | 5 |
| Frontend - Booking | 4 |
| Frontend - Dashboard | 5 |
| Backend - Admin | 3 |
| Backend - General | 5 |

### Resolution Time
| Speed | Count | Description |
|-------|-------|------------|
| Same-day | 35 | Fixed within the day discovered |
| Next-day | 2 | Required investigation/probe testing |

---

## 🔍 Recurring Patterns

### Pattern 1: Schema Mismatch
- Sabre REST API schema is strict — any extra/wrong field causes 400
- **Lesson**: Always validate payload against Sabre's published schema before sending
- **Occurrences**: C01, C04, C05

### Pattern 2: Response Format Changes
- GDS providers update response formats without notice
- **Lesson**: Add defensive parsing with multiple format fallbacks
- **Occurrences**: C06, C08, M02

### Pattern 3: Cache Staleness
- Cached tokens/configs expire but cache doesn't self-invalidate
- **Lesson**: Always add retry-with-fresh-cache logic for auth tokens
- **Occurrences**: C02, C07

### Pattern 4: Mock Data Leakage
- Placeholder/hardcoded data persisting in production code
- **Lesson**: Zero-mock policy — search entire codebase for hardcoded values
- **Occurrences**: M06, M07, M09, U08, U12

---

## 🛡 Prevention Measures Adopted

| Measure | Implemented In |
|---------|---------------|
| Zero-mock enforcement | v3.0+ — no hardcoded flight/hotel data |
| Schema-safe payload builders | v3.9.3+ — `toSabreDateTime()`, stripped DOCS |
| Retry-with-fresh-session | v3.9.7 — SOAP seat map |
| Priority chain extraction | v3.9.6 — TTI airline PNR |
| Dedup key comprehensive | v3.7.8 — all legs included |
| `safeJsonParse()` utility | v2.1 — prevents JSON.parse crashes |
| Centralized validators | v3.5.1 — `isScopeInvalidRoute()` |
