#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Seven Trip — Comprehensive 30-Route Booking Test Suite
# Tests ALL booking modes across domestic + international routes
# Usage: bash backend/test-bookings.sh
# ═══════════════════════════════════════════════════════════════════

BASE="https://seven-trip.com/api"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
PASS=0; FAIL=0; TOTAL=0
ALL_PNRS=()

echo -e "\n${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   SEVEN TRIP — 30-ROUTE BOOKING TEST SUITE${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}\n"

# ─── Login ───
echo -e "${CYAN}[AUTH] Logging in as rahim@gmail.com ...${NC}"
LOGIN=$(curl -s "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"rahim@gmail.com","password":"User@123456"}')
TOKEN=$(echo "$LOGIN" | jq -r '.accessToken // empty')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Login failed:${NC} $LOGIN"
  exit 1
fi
echo -e "${GREEN}✓ Login OK${NC}\n"

# ─── Pre-flight: Check Sabre Config ───
echo -e "${CYAN}[CONFIG] Checking Sabre API configuration...${NC}"
HEALTH=$(curl -s "$BASE/health" 2>/dev/null)
echo -e "  API Health: $(echo "$HEALTH" | jq -r '.status // "unknown"' 2>/dev/null)"

# Quick booking test to verify config (will show gdsError if misconfigured)
echo -e "${CYAN}[CONFIG] Testing Sabre connectivity with minimal booking...${NC}"
CONFIG_TEST=$(curl -s "$BASE/flights/book" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
  "flightData":{"source":"sabre","_sabreSource":true,"airline":"Test","airlineCode":"EK","flightNumber":"EK585","origin":"DAC","destination":"DXB","departureTime":"2026-04-15T21:55:00","arrivalTime":"2026-04-16T01:30:00","bookingClass":"Y","cabinClass":"Economy","price":1,"baseFare":1,"taxes":0,"legs":[{"origin":"DAC","destination":"DXB","departureTime":"2026-04-15T21:55:00","arrivalTime":"2026-04-16T01:30:00","flightNumber":"EK585","airlineCode":"EK","bookingClass":"Y"}]},
  "passengers":[{"title":"Mr","firstName":"TEST","lastName":"CONFIG","dob":"1990-01-01","gender":"Male","nationality":"Bangladeshi","passport":"Z99999999","passportExpiry":"2030-01-01","documentCountry":"BD","email":"test@test.com","phone":"01700000000","type":"adult"}],
  "contactInfo":{"email":"test@test.com","phone":"01700000000"},
  "isRoundTrip":false,"isDomestic":false,"payLater":true,"totalAmount":1,"baseFare":1,"taxes":0,"serviceCharge":0,
  "specialServices":{"perPassenger":[{"meal":"none","wheelchair":"none","frequentFlyer":{}}]}
}')
CT_PNR=$(echo "$CONFIG_TEST" | jq -r '.pnr // "null"')
CT_BOOKED=$(echo "$CONFIG_TEST" | jq -r '.gdsBooked // false')
CT_ERROR=$(echo "$CONFIG_TEST" | jq -r '.gdsError // "none"')
if [ "$CT_BOOKED" = "true" ]; then
  echo -e "  ${GREEN}✓ Sabre PRODUCTION is working!${NC} PNR: $CT_PNR"
  ALL_PNRS+=("$CT_PNR")
else
  echo -e "  ${RED}✗ Sabre booking failed: $CT_ERROR${NC}"
  echo -e "  ${YELLOW}Check PM2 logs: pm2 logs seventrip-api --lines 50${NC}"
  echo -e "  ${YELLOW}The remaining tests will still run to collect all errors.${NC}"
fi
echo ""

# ─── Passenger Templates ───
PAX_ADULT1='{
  "title":"Ms","firstName":"MST RAFIZA","lastName":"MOSTOFA",
  "dob":"2003-03-26","gender":"Female","nationality":"Bangladeshi",
  "passport":"A13888697","passportExpiry":"2029-03-10","documentCountry":"BD",
  "email":"rahim@gmail.com","phone":"01724597352","type":"adult"
}'
PAX_ADULT2='{
  "title":"Mr","firstName":"MD GOLAM","lastName":"MOSTOFA",
  "dob":"1975-06-15","gender":"Male","nationality":"Bangladeshi",
  "passport":"B98765432","passportExpiry":"2030-01-20","documentCountry":"BD",
  "email":"rahim@gmail.com","phone":"01724597352","type":"adult"
}'
PAX_CHILD='{
  "title":"Master","firstName":"AHMED","lastName":"MOSTOFA",
  "dob":"2018-09-10","gender":"Male","nationality":"Bangladeshi",
  "passport":"C11223344","passportExpiry":"2031-05-15","documentCountry":"BD",
  "email":"","phone":"","type":"child"
}'
PAX_INFANT='{
  "title":"Ms","firstName":"BABY","lastName":"MOSTOFA",
  "dob":"2024-08-15","gender":"Female","nationality":"Bangladeshi",
  "passport":"D55667788","passportExpiry":"2034-08-15","documentCountry":"BD",
  "email":"","phone":"","type":"infant"
}'
CONTACT='{"email":"rahim@gmail.com","phone":"01724597352"}'

# ─── Helper function to book and report ───
book_flight() {
  local TEST_NUM=$1
  local LABEL=$2
  local PAYLOAD=$3

  TOTAL=$((TOTAL + 1))
  echo -e "\n${BOLD}── TEST $TEST_NUM: $LABEL ──${NC}"

  RESULT=$(curl -s -w "\n%{http_code}" "$BASE/flights/book" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "$PAYLOAD")

  HTTP_CODE=$(echo "$RESULT" | tail -1)
  BODY=$(echo "$RESULT" | sed '$d')

  SRC=$(echo "$PAYLOAD" | jq -r '.flightData.source // "unknown"')
  PNR=$(echo "$BODY" | jq -r '.pnr // "null"')
  AIRLINE_PNR=$(echo "$BODY" | jq -r '.airlinePnr // "null"')
  GDS_BOOKING_ID=$(echo "$BODY" | jq -r '.gdsBookingId // "null"')
  GDS_BOOKED=$(echo "$BODY" | jq -r '.gdsBooked // false')
  GDS_ERROR=$(echo "$BODY" | jq -r '.gdsError // "none"')
  BREF=$(echo "$BODY" | jq -r '.bookingRef // "?"')
  STATUS=$(echo "$BODY" | jq -r '.status // "?"')

  HAS_DUAL_PNR=true
  if [[ "$SRC" == *"tti"* ]] || [[ "$SRC" == *"astra"* ]]; then
    if [ "$AIRLINE_PNR" = "null" ] || [ "$GDS_BOOKING_ID" = "null" ] || [ "$AIRLINE_PNR" = "$GDS_BOOKING_ID" ]; then
      HAS_DUAL_PNR=false
    fi
  else
    if [ "$PNR" = "null" ] || [ "$AIRLINE_PNR" = "null" ] || [ "$PNR" = "$AIRLINE_PNR" ]; then
      HAS_DUAL_PNR=false
    fi
  fi

  if [ "$GDS_BOOKED" = "true" ] && [ "$HAS_DUAL_PNR" = "true" ]; then
    echo -e "  ${GREEN}✓ SUCCESS${NC} | GDS PNR: ${GREEN}$PNR${NC} | Airline PNR: ${CYAN}$AIRLINE_PNR${NC} | GDS Ref: $GDS_BOOKING_ID | Ref: $BREF | Status: $STATUS"
    PASS=$((PASS + 1))
    ALL_PNRS+=("$PNR")
  else
    echo -e "  ${RED}✗ FAILED${NC} | HTTP: $HTTP_CODE | Source: $SRC | Ref: $BREF"
    echo -e "    GDS Error: ${RED}$GDS_ERROR${NC}"
    echo -e "    PNR: $PNR | AirlinePNR: $AIRLINE_PNR | GDS Ref: $GDS_BOOKING_ID | DualPNR: $HAS_DUAL_PNR"
    FAIL=$((FAIL + 1))
  fi
}

SSR1='{"perPassenger":[{"meal":"MOML","wheelchair":"none","frequentFlyer":{}}]}'
SSR2='{"perPassenger":[{"meal":"MOML","wheelchair":"none","frequentFlyer":{}},{"meal":"VGML","wheelchair":"none","frequentFlyer":{}}]}'
SSR3='{"perPassenger":[{"meal":"MOML","wheelchair":"none","frequentFlyer":{}},{"meal":"VGML","wheelchair":"none","frequentFlyer":{}},{"meal":"CHML","wheelchair":"none","frequentFlyer":{}}]}'

echo -e "\n${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   SECTION 1: ONE-WAY INTERNATIONAL (Sabre)${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

# Test 1: DAC→DXB 1 pax
book_flight 1 "ONE-WAY DAC→DXB (Emirates, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Emirates\",\"airlineCode\":\"EK\",\"flightNumber\":\"EK585\",\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-04-15T21:55:00\",\"arrivalTime\":\"2026-04-16T01:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":45000,\"baseFare\":38000,\"taxes\":7000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-04-15T21:55:00\",\"arrivalTime\":\"2026-04-16T01:30:00\",\"flightNumber\":\"EK585\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":45000,\"baseFare\":38000,\"taxes\":7000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 2: DAC→SIN 1 pax
book_flight 2 "ONE-WAY DAC→SIN (Singapore Airlines, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Singapore Airlines\",\"airlineCode\":\"SQ\",\"flightNumber\":\"SQ447\",\"origin\":\"DAC\",\"destination\":\"SIN\",\"departureTime\":\"2026-04-20T10:30:00\",\"arrivalTime\":\"2026-04-20T18:45:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":52000,\"baseFare\":44000,\"taxes\":8000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"SIN\",\"departureTime\":\"2026-04-20T10:30:00\",\"arrivalTime\":\"2026-04-20T18:45:00\",\"flightNumber\":\"SQ447\",\"airlineCode\":\"SQ\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":52000,\"baseFare\":44000,\"taxes\":8000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 3: DAC→BKK 2 pax
book_flight 3 "ONE-WAY DAC→BKK (Thai Airways, 2 adults)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Thai Airways\",\"airlineCode\":\"TG\",\"flightNumber\":\"TG322\",\"origin\":\"DAC\",\"destination\":\"BKK\",\"departureTime\":\"2026-04-18T08:00:00\",\"arrivalTime\":\"2026-04-18T12:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":78000,\"baseFare\":66000,\"taxes\":12000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"BKK\",\"departureTime\":\"2026-04-18T08:00:00\",\"arrivalTime\":\"2026-04-18T12:30:00\",\"flightNumber\":\"TG322\",\"airlineCode\":\"TG\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1,$PAX_ADULT2],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":78000,\"baseFare\":66000,\"taxes\":12000,\"serviceCharge\":0,\"specialServices\":$SSR2
}"

# Test 4: DAC→KUL 1 adult + 1 child
book_flight 4 "ONE-WAY DAC→KUL (Malaysia Airlines, 1 adult + 1 child)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Malaysia Airlines\",\"airlineCode\":\"MH\",\"flightNumber\":\"MH195\",\"origin\":\"DAC\",\"destination\":\"KUL\",\"departureTime\":\"2026-04-22T14:00:00\",\"arrivalTime\":\"2026-04-22T22:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":55000,\"baseFare\":46000,\"taxes\":9000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"KUL\",\"departureTime\":\"2026-04-22T14:00:00\",\"arrivalTime\":\"2026-04-22T22:00:00\",\"flightNumber\":\"MH195\",\"airlineCode\":\"MH\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1,$PAX_CHILD],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":55000,\"baseFare\":46000,\"taxes\":9000,\"serviceCharge\":0,\"specialServices\":$SSR2
}"

# Test 5: DAC→DOH 1 adult
book_flight 5 "ONE-WAY DAC→DOH (Qatar Airways, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Qatar Airways\",\"airlineCode\":\"QR\",\"flightNumber\":\"QR639\",\"origin\":\"DAC\",\"destination\":\"DOH\",\"departureTime\":\"2026-04-25T02:30:00\",\"arrivalTime\":\"2026-04-25T05:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":48000,\"baseFare\":40000,\"taxes\":8000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"DOH\",\"departureTime\":\"2026-04-25T02:30:00\",\"arrivalTime\":\"2026-04-25T05:30:00\",\"flightNumber\":\"QR639\",\"airlineCode\":\"QR\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":48000,\"baseFare\":40000,\"taxes\":8000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 6: DAC→IST 1 adult
book_flight 6 "ONE-WAY DAC→IST (Turkish Airlines, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Turkish Airlines\",\"airlineCode\":\"TK\",\"flightNumber\":\"TK713\",\"origin\":\"DAC\",\"destination\":\"IST\",\"departureTime\":\"2026-05-01T01:45:00\",\"arrivalTime\":\"2026-05-01T08:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":65000,\"baseFare\":55000,\"taxes\":10000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"IST\",\"departureTime\":\"2026-05-01T01:45:00\",\"arrivalTime\":\"2026-05-01T08:30:00\",\"flightNumber\":\"TK713\",\"airlineCode\":\"TK\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":65000,\"baseFare\":55000,\"taxes\":10000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 7: DAC→CCU 1 adult (short-haul)
book_flight 7 "ONE-WAY DAC→CCU (Air India, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Air India\",\"airlineCode\":\"AI\",\"flightNumber\":\"AI238\",\"origin\":\"DAC\",\"destination\":\"CCU\",\"departureTime\":\"2026-04-16T09:00:00\",\"arrivalTime\":\"2026-04-16T10:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":18000,\"baseFare\":14000,\"taxes\":4000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"CCU\",\"departureTime\":\"2026-04-16T09:00:00\",\"arrivalTime\":\"2026-04-16T10:00:00\",\"flightNumber\":\"AI238\",\"airlineCode\":\"AI\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":18000,\"baseFare\":14000,\"taxes\":4000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 8: DAC→LHR 2 adults + 1 child (long-haul)
book_flight 8 "ONE-WAY DAC→LHR (Emirates via DXB, 2 adults + 1 child)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Emirates\",\"airlineCode\":\"EK\",\"flightNumber\":\"EK585\",\"origin\":\"DAC\",\"destination\":\"LHR\",\"departureTime\":\"2026-05-05T21:55:00\",\"arrivalTime\":\"2026-05-06T14:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":245000,\"baseFare\":210000,\"taxes\":35000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-05-05T21:55:00\",\"arrivalTime\":\"2026-05-06T01:30:00\",\"flightNumber\":\"EK585\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"},{\"origin\":\"DXB\",\"destination\":\"LHR\",\"departureTime\":\"2026-05-06T07:30:00\",\"arrivalTime\":\"2026-05-06T11:30:00\",\"flightNumber\":\"EK001\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1,$PAX_ADULT2,$PAX_CHILD],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":245000,\"baseFare\":210000,\"taxes\":35000,\"serviceCharge\":0,\"specialServices\":$SSR3
}"

echo -e "\n${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   SECTION 2: ROUND-TRIP INTERNATIONAL (Sabre)${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

# Test 9: DAC↔DXB 1 pax
book_flight 9 "ROUND-TRIP DAC↔DXB (Emirates, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Emirates\",\"airlineCode\":\"EK\",\"flightNumber\":\"EK585\",\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-04-15T21:55:00\",\"arrivalTime\":\"2026-04-16T01:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":90000,\"baseFare\":76000,\"taxes\":14000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-04-15T21:55:00\",\"arrivalTime\":\"2026-04-16T01:30:00\",\"flightNumber\":\"EK585\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"}]},
  \"returnFlightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Emirates\",\"airlineCode\":\"EK\",\"flightNumber\":\"EK586\",\"origin\":\"DXB\",\"destination\":\"DAC\",\"departureTime\":\"2026-04-20T03:30:00\",\"arrivalTime\":\"2026-04-20T13:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":45000,\"legs\":[{\"origin\":\"DXB\",\"destination\":\"DAC\",\"departureTime\":\"2026-04-20T03:30:00\",\"arrivalTime\":\"2026-04-20T13:00:00\",\"flightNumber\":\"EK586\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":90000,\"baseFare\":76000,\"taxes\":14000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 10: DAC↔SIN 2 pax
book_flight 10 "ROUND-TRIP DAC↔SIN (Singapore Airlines, 2 adults)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Singapore Airlines\",\"airlineCode\":\"SQ\",\"flightNumber\":\"SQ447\",\"origin\":\"DAC\",\"destination\":\"SIN\",\"departureTime\":\"2026-04-20T10:30:00\",\"arrivalTime\":\"2026-04-20T18:45:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":104000,\"baseFare\":88000,\"taxes\":16000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"SIN\",\"departureTime\":\"2026-04-20T10:30:00\",\"arrivalTime\":\"2026-04-20T18:45:00\",\"flightNumber\":\"SQ447\",\"airlineCode\":\"SQ\",\"bookingClass\":\"Y\"}]},
  \"returnFlightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Singapore Airlines\",\"airlineCode\":\"SQ\",\"flightNumber\":\"SQ448\",\"origin\":\"SIN\",\"destination\":\"DAC\",\"departureTime\":\"2026-04-27T23:00:00\",\"arrivalTime\":\"2026-04-28T01:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":52000,\"legs\":[{\"origin\":\"SIN\",\"destination\":\"DAC\",\"departureTime\":\"2026-04-27T23:00:00\",\"arrivalTime\":\"2026-04-28T01:30:00\",\"flightNumber\":\"SQ448\",\"airlineCode\":\"SQ\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1,$PAX_ADULT2],\"contactInfo\":$CONTACT,\"isRoundTrip\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":104000,\"baseFare\":88000,\"taxes\":16000,\"serviceCharge\":0,\"specialServices\":$SSR2
}"

# Test 11: DAC↔BKK 1 adult + 1 child
book_flight 11 "ROUND-TRIP DAC↔BKK (Thai Airways, 1 adult + 1 child)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Thai Airways\",\"airlineCode\":\"TG\",\"flightNumber\":\"TG322\",\"origin\":\"DAC\",\"destination\":\"BKK\",\"departureTime\":\"2026-04-18T08:00:00\",\"arrivalTime\":\"2026-04-18T12:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":70000,\"baseFare\":59000,\"taxes\":11000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"BKK\",\"departureTime\":\"2026-04-18T08:00:00\",\"arrivalTime\":\"2026-04-18T12:30:00\",\"flightNumber\":\"TG322\",\"airlineCode\":\"TG\",\"bookingClass\":\"Y\"}]},
  \"returnFlightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Thai Airways\",\"airlineCode\":\"TG\",\"flightNumber\":\"TG323\",\"origin\":\"BKK\",\"destination\":\"DAC\",\"departureTime\":\"2026-04-25T13:30:00\",\"arrivalTime\":\"2026-04-25T15:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":35000,\"legs\":[{\"origin\":\"BKK\",\"destination\":\"DAC\",\"departureTime\":\"2026-04-25T13:30:00\",\"arrivalTime\":\"2026-04-25T15:30:00\",\"flightNumber\":\"TG323\",\"airlineCode\":\"TG\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1,$PAX_CHILD],\"contactInfo\":$CONTACT,\"isRoundTrip\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":70000,\"baseFare\":59000,\"taxes\":11000,\"serviceCharge\":0,\"specialServices\":$SSR2
}"

# Test 12: DAC↔DOH 2 adults + 1 child + 1 infant
book_flight 12 "ROUND-TRIP DAC↔DOH (Qatar, 2 adults + 1 child + 1 infant)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Qatar Airways\",\"airlineCode\":\"QR\",\"flightNumber\":\"QR639\",\"origin\":\"DAC\",\"destination\":\"DOH\",\"departureTime\":\"2026-05-01T02:30:00\",\"arrivalTime\":\"2026-05-01T05:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":200000,\"baseFare\":170000,\"taxes\":30000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"DOH\",\"departureTime\":\"2026-05-01T02:30:00\",\"arrivalTime\":\"2026-05-01T05:30:00\",\"flightNumber\":\"QR639\",\"airlineCode\":\"QR\",\"bookingClass\":\"Y\"}]},
  \"returnFlightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Qatar Airways\",\"airlineCode\":\"QR\",\"flightNumber\":\"QR638\",\"origin\":\"DOH\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-10T08:00:00\",\"arrivalTime\":\"2026-05-10T17:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":100000,\"legs\":[{\"origin\":\"DOH\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-10T08:00:00\",\"arrivalTime\":\"2026-05-10T17:00:00\",\"flightNumber\":\"QR638\",\"airlineCode\":\"QR\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1,$PAX_ADULT2,$PAX_CHILD,$PAX_INFANT],\"contactInfo\":$CONTACT,\"isRoundTrip\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":200000,\"baseFare\":170000,\"taxes\":30000,\"serviceCharge\":0,
  \"specialServices\":{\"perPassenger\":[{\"meal\":\"MOML\",\"wheelchair\":\"none\",\"frequentFlyer\":{}},{\"meal\":\"VGML\",\"wheelchair\":\"none\",\"frequentFlyer\":{}},{\"meal\":\"CHML\",\"wheelchair\":\"none\",\"frequentFlyer\":{}},{\"meal\":\"BBML\",\"wheelchair\":\"none\",\"frequentFlyer\":{}}]}
}"

# Test 13: DAC↔IST 1 adult (Turkish)
book_flight 13 "ROUND-TRIP DAC↔IST (Turkish Airlines, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Turkish Airlines\",\"airlineCode\":\"TK\",\"flightNumber\":\"TK713\",\"origin\":\"DAC\",\"destination\":\"IST\",\"departureTime\":\"2026-05-05T01:45:00\",\"arrivalTime\":\"2026-05-05T08:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":130000,\"baseFare\":110000,\"taxes\":20000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"IST\",\"departureTime\":\"2026-05-05T01:45:00\",\"arrivalTime\":\"2026-05-05T08:30:00\",\"flightNumber\":\"TK713\",\"airlineCode\":\"TK\",\"bookingClass\":\"Y\"}]},
  \"returnFlightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Turkish Airlines\",\"airlineCode\":\"TK\",\"flightNumber\":\"TK712\",\"origin\":\"IST\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-15T22:00:00\",\"arrivalTime\":\"2026-05-16T09:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":65000,\"legs\":[{\"origin\":\"IST\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-15T22:00:00\",\"arrivalTime\":\"2026-05-16T09:30:00\",\"flightNumber\":\"TK712\",\"airlineCode\":\"TK\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":130000,\"baseFare\":110000,\"taxes\":20000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 14: DAC↔KUL 2 adults
book_flight 14 "ROUND-TRIP DAC↔KUL (Malaysia Airlines, 2 adults)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Malaysia Airlines\",\"airlineCode\":\"MH\",\"flightNumber\":\"MH195\",\"origin\":\"DAC\",\"destination\":\"KUL\",\"departureTime\":\"2026-05-10T14:00:00\",\"arrivalTime\":\"2026-05-10T22:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":96000,\"baseFare\":80000,\"taxes\":16000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"KUL\",\"departureTime\":\"2026-05-10T14:00:00\",\"arrivalTime\":\"2026-05-10T22:00:00\",\"flightNumber\":\"MH195\",\"airlineCode\":\"MH\",\"bookingClass\":\"Y\"}]},
  \"returnFlightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Malaysia Airlines\",\"airlineCode\":\"MH\",\"flightNumber\":\"MH194\",\"origin\":\"KUL\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-17T08:00:00\",\"arrivalTime\":\"2026-05-17T10:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":48000,\"legs\":[{\"origin\":\"KUL\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-17T08:00:00\",\"arrivalTime\":\"2026-05-17T10:00:00\",\"flightNumber\":\"MH194\",\"airlineCode\":\"MH\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1,$PAX_ADULT2],\"contactInfo\":$CONTACT,\"isRoundTrip\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":96000,\"baseFare\":80000,\"taxes\":16000,\"serviceCharge\":0,\"specialServices\":$SSR2
}"

echo -e "\n${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   SECTION 3: MULTI-CITY INTERNATIONAL (Sabre)${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

# Test 15: DAC→DXB→SIN 1 adult
book_flight 15 "MULTI-CITY DAC→DXB→SIN (Emirates, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Emirates\",\"airlineCode\":\"EK\",\"flightNumber\":\"EK585\",\"origin\":\"DAC\",\"destination\":\"SIN\",\"departureTime\":\"2026-04-15T21:55:00\",\"arrivalTime\":\"2026-04-18T21:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":95000,\"baseFare\":80000,\"taxes\":15000,\"isMultiCity\":true,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-04-15T21:55:00\",\"arrivalTime\":\"2026-04-16T01:30:00\",\"flightNumber\":\"EK585\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"},{\"origin\":\"DXB\",\"destination\":\"SIN\",\"departureTime\":\"2026-04-18T09:00:00\",\"arrivalTime\":\"2026-04-18T21:00:00\",\"flightNumber\":\"EK354\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"}]},
  \"multiCityFlights\":[{\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-04-15T21:55:00\",\"arrivalTime\":\"2026-04-16T01:30:00\",\"flightNumber\":\"EK585\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"},{\"origin\":\"DXB\",\"destination\":\"SIN\",\"departureTime\":\"2026-04-18T09:00:00\",\"arrivalTime\":\"2026-04-18T21:00:00\",\"flightNumber\":\"EK354\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"}],
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isMultiCity\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":95000,\"baseFare\":80000,\"taxes\":15000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 16: DAC→DXB→LHR→DAC 2 adults
book_flight 16 "MULTI-CITY DAC→DXB→LHR→DAC (Emirates, 2 adults)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Emirates\",\"airlineCode\":\"EK\",\"flightNumber\":\"EK585\",\"origin\":\"DAC\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-01T21:55:00\",\"arrivalTime\":\"2026-05-15T13:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":350000,\"baseFare\":300000,\"taxes\":50000,\"isMultiCity\":true,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-05-01T21:55:00\",\"arrivalTime\":\"2026-05-02T01:30:00\",\"flightNumber\":\"EK585\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"},{\"origin\":\"DXB\",\"destination\":\"LHR\",\"departureTime\":\"2026-05-05T07:30:00\",\"arrivalTime\":\"2026-05-05T11:30:00\",\"flightNumber\":\"EK001\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"},{\"origin\":\"LHR\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-15T09:00:00\",\"arrivalTime\":\"2026-05-16T06:00:00\",\"flightNumber\":\"EK002\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"}]},
  \"multiCityFlights\":[{\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-05-01T21:55:00\",\"arrivalTime\":\"2026-05-02T01:30:00\",\"flightNumber\":\"EK585\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"},{\"origin\":\"DXB\",\"destination\":\"LHR\",\"departureTime\":\"2026-05-05T07:30:00\",\"arrivalTime\":\"2026-05-05T11:30:00\",\"flightNumber\":\"EK001\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"},{\"origin\":\"LHR\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-15T09:00:00\",\"arrivalTime\":\"2026-05-16T06:00:00\",\"flightNumber\":\"EK002\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"}],
  \"passengers\":[$PAX_ADULT1,$PAX_ADULT2],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isMultiCity\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":350000,\"baseFare\":300000,\"taxes\":50000,\"serviceCharge\":0,\"specialServices\":$SSR2
}"

# Test 17: DAC→BKK→SIN 1 adult + 1 child
book_flight 17 "MULTI-CITY DAC→BKK→SIN (Thai/SQ, 1 adult + 1 child)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Thai Airways\",\"airlineCode\":\"TG\",\"flightNumber\":\"TG322\",\"origin\":\"DAC\",\"destination\":\"SIN\",\"departureTime\":\"2026-04-20T08:00:00\",\"arrivalTime\":\"2026-04-25T18:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":85000,\"baseFare\":72000,\"taxes\":13000,\"isMultiCity\":true,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"BKK\",\"departureTime\":\"2026-04-20T08:00:00\",\"arrivalTime\":\"2026-04-20T12:30:00\",\"flightNumber\":\"TG322\",\"airlineCode\":\"TG\",\"bookingClass\":\"Y\"},{\"origin\":\"BKK\",\"destination\":\"SIN\",\"departureTime\":\"2026-04-25T14:00:00\",\"arrivalTime\":\"2026-04-25T17:30:00\",\"flightNumber\":\"SQ713\",\"airlineCode\":\"SQ\",\"bookingClass\":\"Y\"}]},
  \"multiCityFlights\":[{\"origin\":\"DAC\",\"destination\":\"BKK\",\"departureTime\":\"2026-04-20T08:00:00\",\"arrivalTime\":\"2026-04-20T12:30:00\",\"flightNumber\":\"TG322\",\"airlineCode\":\"TG\",\"bookingClass\":\"Y\"},{\"origin\":\"BKK\",\"destination\":\"SIN\",\"departureTime\":\"2026-04-25T14:00:00\",\"arrivalTime\":\"2026-04-25T17:30:00\",\"flightNumber\":\"SQ713\",\"airlineCode\":\"SQ\",\"bookingClass\":\"Y\"}],
  \"passengers\":[$PAX_ADULT1,$PAX_CHILD],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isMultiCity\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":85000,\"baseFare\":72000,\"taxes\":13000,\"serviceCharge\":0,\"specialServices\":$SSR2
}"

# Test 18: DAC→CCU→DEL→DAC 2 adults + 1 child
book_flight 18 "MULTI-CITY DAC→CCU→DEL→DAC (Air India, 2 adults + 1 child)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Air India\",\"airlineCode\":\"AI\",\"flightNumber\":\"AI238\",\"origin\":\"DAC\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-10T09:00:00\",\"arrivalTime\":\"2026-05-20T23:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":95000,\"baseFare\":80000,\"taxes\":15000,\"isMultiCity\":true,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"CCU\",\"departureTime\":\"2026-05-10T09:00:00\",\"arrivalTime\":\"2026-05-10T10:00:00\",\"flightNumber\":\"AI238\",\"airlineCode\":\"AI\",\"bookingClass\":\"Y\"},{\"origin\":\"CCU\",\"destination\":\"DEL\",\"departureTime\":\"2026-05-14T12:00:00\",\"arrivalTime\":\"2026-05-14T14:30:00\",\"flightNumber\":\"AI402\",\"airlineCode\":\"AI\",\"bookingClass\":\"Y\"},{\"origin\":\"DEL\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-20T18:00:00\",\"arrivalTime\":\"2026-05-20T20:00:00\",\"flightNumber\":\"AI237\",\"airlineCode\":\"AI\",\"bookingClass\":\"Y\"}]},
  \"multiCityFlights\":[{\"origin\":\"DAC\",\"destination\":\"CCU\",\"departureTime\":\"2026-05-10T09:00:00\",\"arrivalTime\":\"2026-05-10T10:00:00\",\"flightNumber\":\"AI238\",\"airlineCode\":\"AI\",\"bookingClass\":\"Y\"},{\"origin\":\"CCU\",\"destination\":\"DEL\",\"departureTime\":\"2026-05-14T12:00:00\",\"arrivalTime\":\"2026-05-14T14:30:00\",\"flightNumber\":\"AI402\",\"airlineCode\":\"AI\",\"bookingClass\":\"Y\"},{\"origin\":\"DEL\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-20T18:00:00\",\"arrivalTime\":\"2026-05-20T20:00:00\",\"flightNumber\":\"AI237\",\"airlineCode\":\"AI\",\"bookingClass\":\"Y\"}],
  \"passengers\":[$PAX_ADULT1,$PAX_ADULT2,$PAX_CHILD],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isMultiCity\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":95000,\"baseFare\":80000,\"taxes\":15000,\"serviceCharge\":0,\"specialServices\":$SSR3
}"

echo -e "\n${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   SECTION 4: DOMESTIC FLIGHTS (TTI / Air Astra)${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

# Test 19: DAC→CXB one-way (Air Astra)
book_flight 19 "ONE-WAY DAC→CXB (Air Astra, 1 adult)" "{
  \"flightData\":{\"source\":\"tti\",\"airline\":\"Air Astra\",\"airlineCode\":\"2A\",\"flightNumber\":\"2A141\",\"origin\":\"DAC\",\"destination\":\"CXB\",\"departureTime\":\"2026-04-18T10:00:00\",\"arrivalTime\":\"2026-04-18T11:05:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":6500,\"baseFare\":5500,\"taxes\":1000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"CXB\",\"departureTime\":\"2026-04-18T10:00:00\",\"arrivalTime\":\"2026-04-18T11:05:00\",\"flightNumber\":\"2A141\",\"airlineCode\":\"2A\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":true,\"payLater\":true,\"totalAmount\":6500,\"baseFare\":5500,\"taxes\":1000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 20: DAC↔CXB round-trip (Air Astra) 2 pax
book_flight 20 "ROUND-TRIP DAC↔CXB (Air Astra, 2 adults)" "{
  \"flightData\":{\"source\":\"tti\",\"airline\":\"Air Astra\",\"airlineCode\":\"2A\",\"flightNumber\":\"2A141\",\"origin\":\"DAC\",\"destination\":\"CXB\",\"departureTime\":\"2026-04-18T10:00:00\",\"arrivalTime\":\"2026-04-18T11:05:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":13000,\"baseFare\":11000,\"taxes\":2000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"CXB\",\"departureTime\":\"2026-04-18T10:00:00\",\"arrivalTime\":\"2026-04-18T11:05:00\",\"flightNumber\":\"2A141\",\"airlineCode\":\"2A\",\"bookingClass\":\"Y\"}]},
  \"returnFlightData\":{\"source\":\"tti\",\"airline\":\"Air Astra\",\"airlineCode\":\"2A\",\"flightNumber\":\"2A142\",\"origin\":\"CXB\",\"destination\":\"DAC\",\"departureTime\":\"2026-04-22T15:00:00\",\"arrivalTime\":\"2026-04-22T16:05:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":6500,\"legs\":[{\"origin\":\"CXB\",\"destination\":\"DAC\",\"departureTime\":\"2026-04-22T15:00:00\",\"arrivalTime\":\"2026-04-22T16:05:00\",\"flightNumber\":\"2A142\",\"airlineCode\":\"2A\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1,$PAX_ADULT2],\"contactInfo\":$CONTACT,\"isRoundTrip\":true,\"isDomestic\":true,\"payLater\":true,\"totalAmount\":13000,\"baseFare\":11000,\"taxes\":2000,\"serviceCharge\":0,\"specialServices\":$SSR2
}"

# Test 21: DAC→CGP one-way 1 adult + 1 child
book_flight 21 "ONE-WAY DAC→CGP (Air Astra, 1 adult + 1 child)" "{
  \"flightData\":{\"source\":\"tti\",\"airline\":\"Air Astra\",\"airlineCode\":\"2A\",\"flightNumber\":\"2A151\",\"origin\":\"DAC\",\"destination\":\"CGP\",\"departureTime\":\"2026-04-20T07:30:00\",\"arrivalTime\":\"2026-04-20T08:25:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":9000,\"baseFare\":7500,\"taxes\":1500,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"CGP\",\"departureTime\":\"2026-04-20T07:30:00\",\"arrivalTime\":\"2026-04-20T08:25:00\",\"flightNumber\":\"2A151\",\"airlineCode\":\"2A\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1,$PAX_CHILD],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":true,\"payLater\":true,\"totalAmount\":9000,\"baseFare\":7500,\"taxes\":1500,\"serviceCharge\":0,\"specialServices\":$SSR2
}"

# Test 22: DAC→ZYL one-way (Air Astra)
book_flight 22 "ONE-WAY DAC→ZYL (Air Astra, 1 adult)" "{
  \"flightData\":{\"source\":\"tti\",\"airline\":\"Air Astra\",\"airlineCode\":\"2A\",\"flightNumber\":\"2A161\",\"origin\":\"DAC\",\"destination\":\"ZYL\",\"departureTime\":\"2026-04-22T09:00:00\",\"arrivalTime\":\"2026-04-22T09:50:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":5500,\"baseFare\":4500,\"taxes\":1000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"ZYL\",\"departureTime\":\"2026-04-22T09:00:00\",\"arrivalTime\":\"2026-04-22T09:50:00\",\"flightNumber\":\"2A161\",\"airlineCode\":\"2A\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":true,\"payLater\":true,\"totalAmount\":5500,\"baseFare\":4500,\"taxes\":1000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

echo -e "\n${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   SECTION 5: ADDITIONAL ROUTES & EDGE CASES${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

# Test 23: Business class one-way
book_flight 23 "ONE-WAY DAC→DXB BUSINESS (Emirates, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Emirates\",\"airlineCode\":\"EK\",\"flightNumber\":\"EK585\",\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-04-28T21:55:00\",\"arrivalTime\":\"2026-04-29T01:30:00\",\"bookingClass\":\"C\",\"cabinClass\":\"Business\",\"price\":185000,\"baseFare\":160000,\"taxes\":25000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-04-28T21:55:00\",\"arrivalTime\":\"2026-04-29T01:30:00\",\"flightNumber\":\"EK585\",\"airlineCode\":\"EK\",\"bookingClass\":\"C\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":185000,\"baseFare\":160000,\"taxes\":25000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 24: DAC→JED (Saudi, 1 adult)
book_flight 24 "ONE-WAY DAC→JED (Saudi Airlines, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Saudi Arabian Airlines\",\"airlineCode\":\"SV\",\"flightNumber\":\"SV804\",\"origin\":\"DAC\",\"destination\":\"JED\",\"departureTime\":\"2026-05-01T04:00:00\",\"arrivalTime\":\"2026-05-01T08:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":55000,\"baseFare\":46000,\"taxes\":9000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"JED\",\"departureTime\":\"2026-05-01T04:00:00\",\"arrivalTime\":\"2026-05-01T08:00:00\",\"flightNumber\":\"SV804\",\"airlineCode\":\"SV\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":55000,\"baseFare\":46000,\"taxes\":9000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 25: DAC→CMB (SriLankan, 1 adult)
book_flight 25 "ONE-WAY DAC→CMB (SriLankan Airlines, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"SriLankan Airlines\",\"airlineCode\":\"UL\",\"flightNumber\":\"UL194\",\"origin\":\"DAC\",\"destination\":\"CMB\",\"departureTime\":\"2026-05-03T16:00:00\",\"arrivalTime\":\"2026-05-03T19:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":35000,\"baseFare\":29000,\"taxes\":6000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"CMB\",\"departureTime\":\"2026-05-03T16:00:00\",\"arrivalTime\":\"2026-05-03T19:30:00\",\"flightNumber\":\"UL194\",\"airlineCode\":\"UL\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":35000,\"baseFare\":29000,\"taxes\":6000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 26: DAC↔MCT Round-trip (Oman Air, 1 adult)
book_flight 26 "ROUND-TRIP DAC↔MCT (Oman Air, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Oman Air\",\"airlineCode\":\"WY\",\"flightNumber\":\"WY344\",\"origin\":\"DAC\",\"destination\":\"MCT\",\"departureTime\":\"2026-05-08T03:00:00\",\"arrivalTime\":\"2026-05-08T06:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":80000,\"baseFare\":68000,\"taxes\":12000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"MCT\",\"departureTime\":\"2026-05-08T03:00:00\",\"arrivalTime\":\"2026-05-08T06:00:00\",\"flightNumber\":\"WY344\",\"airlineCode\":\"WY\",\"bookingClass\":\"Y\"}]},
  \"returnFlightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Oman Air\",\"airlineCode\":\"WY\",\"flightNumber\":\"WY343\",\"origin\":\"MCT\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-15T22:00:00\",\"arrivalTime\":\"2026-05-16T04:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":40000,\"legs\":[{\"origin\":\"MCT\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-15T22:00:00\",\"arrivalTime\":\"2026-05-16T04:30:00\",\"flightNumber\":\"WY343\",\"airlineCode\":\"WY\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":80000,\"baseFare\":68000,\"taxes\":12000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 27: DAC↔BAH (Gulf Air, 2 adults + 1 infant)
book_flight 27 "ROUND-TRIP DAC↔BAH (Gulf Air, 2 adults + 1 infant)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Gulf Air\",\"airlineCode\":\"GF\",\"flightNumber\":\"GF554\",\"origin\":\"DAC\",\"destination\":\"BAH\",\"departureTime\":\"2026-05-12T01:00:00\",\"arrivalTime\":\"2026-05-12T04:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":110000,\"baseFare\":92000,\"taxes\":18000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"BAH\",\"departureTime\":\"2026-05-12T01:00:00\",\"arrivalTime\":\"2026-05-12T04:30:00\",\"flightNumber\":\"GF554\",\"airlineCode\":\"GF\",\"bookingClass\":\"Y\"}]},
  \"returnFlightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Gulf Air\",\"airlineCode\":\"GF\",\"flightNumber\":\"GF553\",\"origin\":\"BAH\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-20T20:00:00\",\"arrivalTime\":\"2026-05-21T04:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":55000,\"legs\":[{\"origin\":\"BAH\",\"destination\":\"DAC\",\"departureTime\":\"2026-05-20T20:00:00\",\"arrivalTime\":\"2026-05-21T04:00:00\",\"flightNumber\":\"GF553\",\"airlineCode\":\"GF\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1,$PAX_ADULT2,$PAX_INFANT],\"contactInfo\":$CONTACT,\"isRoundTrip\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":110000,\"baseFare\":92000,\"taxes\":18000,\"serviceCharge\":0,
  \"specialServices\":{\"perPassenger\":[{\"meal\":\"MOML\",\"wheelchair\":\"none\",\"frequentFlyer\":{}},{\"meal\":\"VGML\",\"wheelchair\":\"none\",\"frequentFlyer\":{}},{\"meal\":\"BBML\",\"wheelchair\":\"none\",\"frequentFlyer\":{}}]}
}"

# Test 28: Multi-city 4 segments (DAC→DXB→IST→LHR→DAC)
book_flight 28 "MULTI-CITY 4-SEG DAC→DXB→IST→LHR→DAC (Mixed airlines, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Emirates\",\"airlineCode\":\"EK\",\"flightNumber\":\"EK585\",\"origin\":\"DAC\",\"destination\":\"DAC\",\"departureTime\":\"2026-06-01T21:55:00\",\"arrivalTime\":\"2026-06-20T06:00:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":320000,\"baseFare\":270000,\"taxes\":50000,\"isMultiCity\":true,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-06-01T21:55:00\",\"arrivalTime\":\"2026-06-02T01:30:00\",\"flightNumber\":\"EK585\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"},{\"origin\":\"DXB\",\"destination\":\"IST\",\"departureTime\":\"2026-06-05T08:00:00\",\"arrivalTime\":\"2026-06-05T12:30:00\",\"flightNumber\":\"TK763\",\"airlineCode\":\"TK\",\"bookingClass\":\"Y\"},{\"origin\":\"IST\",\"destination\":\"LHR\",\"departureTime\":\"2026-06-10T14:00:00\",\"arrivalTime\":\"2026-06-10T16:00:00\",\"flightNumber\":\"TK1987\",\"airlineCode\":\"TK\",\"bookingClass\":\"Y\"},{\"origin\":\"LHR\",\"destination\":\"DAC\",\"departureTime\":\"2026-06-20T09:00:00\",\"arrivalTime\":\"2026-06-21T06:00:00\",\"flightNumber\":\"EK002\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"}]},
  \"multiCityFlights\":[{\"origin\":\"DAC\",\"destination\":\"DXB\",\"departureTime\":\"2026-06-01T21:55:00\",\"arrivalTime\":\"2026-06-02T01:30:00\",\"flightNumber\":\"EK585\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"},{\"origin\":\"DXB\",\"destination\":\"IST\",\"departureTime\":\"2026-06-05T08:00:00\",\"arrivalTime\":\"2026-06-05T12:30:00\",\"flightNumber\":\"TK763\",\"airlineCode\":\"TK\",\"bookingClass\":\"Y\"},{\"origin\":\"IST\",\"destination\":\"LHR\",\"departureTime\":\"2026-06-10T14:00:00\",\"arrivalTime\":\"2026-06-10T16:00:00\",\"flightNumber\":\"TK1987\",\"airlineCode\":\"TK\",\"bookingClass\":\"Y\"},{\"origin\":\"LHR\",\"destination\":\"DAC\",\"departureTime\":\"2026-06-20T09:00:00\",\"arrivalTime\":\"2026-06-21T06:00:00\",\"flightNumber\":\"EK002\",\"airlineCode\":\"EK\",\"bookingClass\":\"Y\"}],
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isMultiCity\":true,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":320000,\"baseFare\":270000,\"taxes\":50000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 29: DAC→DEL via CCU connecting (Sabre, 2 legs)
book_flight 29 "ONE-WAY DAC→DEL via CCU (Air India connecting, 1 adult)" "{
  \"flightData\":{\"source\":\"sabre\",\"_sabreSource\":true,\"airline\":\"Air India\",\"airlineCode\":\"AI\",\"flightNumber\":\"AI238\",\"origin\":\"DAC\",\"destination\":\"DEL\",\"departureTime\":\"2026-05-15T09:00:00\",\"arrivalTime\":\"2026-05-15T14:30:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":25000,\"baseFare\":20000,\"taxes\":5000,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"CCU\",\"departureTime\":\"2026-05-15T09:00:00\",\"arrivalTime\":\"2026-05-15T10:00:00\",\"flightNumber\":\"AI238\",\"airlineCode\":\"AI\",\"bookingClass\":\"Y\"},{\"origin\":\"CCU\",\"destination\":\"DEL\",\"departureTime\":\"2026-05-15T12:00:00\",\"arrivalTime\":\"2026-05-15T14:30:00\",\"flightNumber\":\"AI402\",\"airlineCode\":\"AI\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1],\"contactInfo\":$CONTACT,\"isRoundTrip\":false,\"isDomestic\":false,\"payLater\":true,\"totalAmount\":25000,\"baseFare\":20000,\"taxes\":5000,\"serviceCharge\":0,\"specialServices\":$SSR1
}"

# Test 30: DAC↔CGP domestic round-trip (Air Astra, 1 adult + 1 child + 1 infant)
book_flight 30 "ROUND-TRIP DAC↔CGP (Air Astra, 1 adult + 1 child + 1 infant)" "{
  \"flightData\":{\"source\":\"tti\",\"airline\":\"Air Astra\",\"airlineCode\":\"2A\",\"flightNumber\":\"2A151\",\"origin\":\"DAC\",\"destination\":\"CGP\",\"departureTime\":\"2026-04-25T07:30:00\",\"arrivalTime\":\"2026-04-25T08:25:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":15000,\"baseFare\":12500,\"taxes\":2500,\"legs\":[{\"origin\":\"DAC\",\"destination\":\"CGP\",\"departureTime\":\"2026-04-25T07:30:00\",\"arrivalTime\":\"2026-04-25T08:25:00\",\"flightNumber\":\"2A151\",\"airlineCode\":\"2A\",\"bookingClass\":\"Y\"}]},
  \"returnFlightData\":{\"source\":\"tti\",\"airline\":\"Air Astra\",\"airlineCode\":\"2A\",\"flightNumber\":\"2A152\",\"origin\":\"CGP\",\"destination\":\"DAC\",\"departureTime\":\"2026-04-28T16:00:00\",\"arrivalTime\":\"2026-04-28T16:55:00\",\"bookingClass\":\"Y\",\"cabinClass\":\"Economy\",\"price\":7500,\"legs\":[{\"origin\":\"CGP\",\"destination\":\"DAC\",\"departureTime\":\"2026-04-28T16:00:00\",\"arrivalTime\":\"2026-04-28T16:55:00\",\"flightNumber\":\"2A152\",\"airlineCode\":\"2A\",\"bookingClass\":\"Y\"}]},
  \"passengers\":[$PAX_ADULT1,$PAX_CHILD,$PAX_INFANT],\"contactInfo\":$CONTACT,\"isRoundTrip\":true,\"isDomestic\":true,\"payLater\":true,\"totalAmount\":15000,\"baseFare\":12500,\"taxes\":2500,\"serviceCharge\":0,\"specialServices\":$SSR3
}"

echo -e "\n${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   SECTION 6: SEAT MAP & ANCILLARIES${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

# Test seat map
echo -e "\n${CYAN}── SEAT MAP: Pre-booking EK585 DAC→DXB (SOAP) ──${NC}"
SEATMAP=$(curl -s "$BASE/flights/seats-rest?origin=DAC&destination=DXB&departureDate=2026-04-15&airlineCode=EK&flightNumber=585")
SM_SUCCESS=$(echo "$SEATMAP" | jq -r '.success // false')
SM_ROWS=$(echo "$SEATMAP" | jq -r '.totalRows // .rows // 0' 2>/dev/null)
SM_SOURCE=$(echo "$SEATMAP" | jq -r '.source // "none"')
if [ "$SM_SUCCESS" = "true" ]; then
  echo -e "  ${GREEN}✓ Seat Map OK${NC} | Source: $SM_SOURCE | Rows: $SM_ROWS"
else
  echo -e "  ${RED}✗ Seat Map FAILED${NC} | Source: $SM_SOURCE"
fi

# Test ancillaries diagnostic
echo -e "\n${CYAN}── ANCILLARIES: Sabre SOAP Diagnostic EK585 ──${NC}"
ANCILLARY=$(curl -s "$BASE/flights/sabre-soap-diagnostic?origin=DAC&destination=DXB&departureDate=2026-04-15&airlineCode=EK&flightNumber=585")
ANC_SM=$(echo "$ANCILLARY" | jq -r '.seatMap.success // false')
ANC_MEALS=$(echo "$ANCILLARY" | jq -r '.ancillaries.meals | length' 2>/dev/null || echo 0)
ANC_BAG=$(echo "$ANCILLARY" | jq -r '.ancillaries.baggage | length' 2>/dev/null || echo 0)
echo -e "  SeatMap: $([ "$ANC_SM" = "true" ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}") | Meals: $ANC_MEALS | Baggage: $ANC_BAG"

# Test seat map with created PNR if available
if [ ${#ALL_PNRS[@]} -gt 0 ]; then
  FIRST_PNR=${ALL_PNRS[0]}
  echo -e "\n${CYAN}── SEAT MAP: Post-booking with PNR $FIRST_PNR ──${NC}"
  SEATMAP_PNR=$(curl -s "$BASE/flights/seats-rest?origin=DAC&destination=DXB&departureDate=2026-04-15&airlineCode=EK&flightNumber=585&pnr=$FIRST_PNR")
  SMP_SUCCESS=$(echo "$SEATMAP_PNR" | jq -r '.success // false')
  SMP_SOURCE=$(echo "$SEATMAP_PNR" | jq -r '.source // "none"')
  echo -e "  $([ "$SMP_SUCCESS" = "true" ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}") | Source: $SMP_SOURCE"
fi

# ═══════════════════════════════════════════════════════════════════
# VERIFY PNRs via GetBooking
# ═══════════════════════════════════════════════════════════════════
if [ ${#ALL_PNRS[@]} -gt 0 ]; then
  echo -e "\n${BOLD}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}   SECTION 7: PNR VERIFICATION (GetBooking)${NC}"
  echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

  for PNR in "${ALL_PNRS[@]}"; do
    echo -e "\n${CYAN}── GetBooking: $PNR ──${NC}"
    BOOKING=$(curl -s "$BASE/flights/booking/$PNR" -H "Authorization: Bearer $TOKEN")
    B_SUCCESS=$(echo "$BOOKING" | jq -r '.success // false')
    B_FLIGHTS=$(echo "$BOOKING" | jq -r '.flights | length' 2>/dev/null || echo 0)
    B_PAX=$(echo "$BOOKING" | jq -r '.passengers | length' 2>/dev/null || echo 0)
    echo -e "  Success: $([ "$B_SUCCESS" = "true" ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}") | Flights: $B_FLIGHTS | Passengers: $B_PAX"
  done
fi

# ═══════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   FINAL SUMMARY${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Total Tests:  ${BOLD}$TOTAL${NC}"
echo -e "  ${GREEN}Passed:${NC}       ${GREEN}$PASS${NC}"
echo -e "  ${RED}Failed:${NC}       ${RED}$FAIL${NC}"
echo -e "  Success Rate: ${BOLD}$(( PASS * 100 / (TOTAL > 0 ? TOTAL : 1) ))%${NC}"
echo ""
echo -e "  PNRs Created: ${#ALL_PNRS[@]}"
for PNR in "${ALL_PNRS[@]}"; do
  echo -e "    → ${GREEN}$PNR${NC}"
done
echo ""
echo -e "${YELLOW}PM2 logs for debugging:${NC}"
echo -e "  pm2 logs seventrip-api --lines 200 | grep -E 'DOCS|segment|Round-trip|Multi-city|Airline PNR|Creating PNR|CreatePNR|Sabre.*fail|Sabre.*error|TTI.*fail'"
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
