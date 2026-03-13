#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Seven Trip — Comprehensive Booking Test Suite
# Tests ALL booking modes with full passport data against live VPS
# Usage: bash backend/test-bookings.sh
# ═══════════════════════════════════════════════════════════════════

BASE="https://seven-trip.com/api"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

echo -e "\n${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   SEVEN TRIP — BOOKING TEST SUITE (All Modes)${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}\n"

# ─── Step 1: Login ───
echo -e "${CYAN}[1/8] Logging in as rahim@gmail.com ...${NC}"
LOGIN=$(curl -s "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"rahim@gmail.com","password":"User@123456"}')
TOKEN=$(echo "$LOGIN" | jq -r '.accessToken // empty')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Login failed:${NC} $LOGIN"
  exit 1
fi
echo -e "${GREEN}✓ Login OK${NC} — Token: ${TOKEN:0:20}...\n"

# ─── Common passenger data (with full passport) ───
PAX1='{
  "title": "Ms",
  "firstName": "MST RAFIZA",
  "lastName": "MOSTOFA",
  "dob": "2003-03-26",
  "gender": "Female",
  "nationality": "Bangladeshi",
  "passport": "A13888697",
  "passportExpiry": "2029-03-10",
  "documentCountry": "BD",
  "email": "rahim@gmail.com",
  "phone": "01724597352",
  "type": "adult"
}'

PAX2='{
  "title": "Mr",
  "firstName": "MD GOLAM",
  "lastName": "MOSTOFA",
  "dob": "1975-06-15",
  "gender": "Male",
  "nationality": "Bangladeshi",
  "passport": "B98765432",
  "passportExpiry": "2030-01-20",
  "documentCountry": "BD",
  "email": "rahim@gmail.com",
  "phone": "01724597352",
  "type": "adult"
}'

PAX_CHILD='{
  "title": "Master",
  "firstName": "AHMED",
  "lastName": "MOSTOFA",
  "dob": "2018-09-10",
  "gender": "Male",
  "nationality": "Bangladeshi",
  "passport": "C11223344",
  "passportExpiry": "2031-05-15",
  "documentCountry": "BD",
  "email": "",
  "phone": "",
  "type": "child"
}'

CONTACT='{"email":"rahim@gmail.com","phone":"01724597352"}'

SSR_MEAL='{
  "perPassenger": [
    {"meal": "MOML", "wheelchair": "none", "frequentFlyer": {}},
    {"meal": "VGML", "wheelchair": "none", "frequentFlyer": {}}
  ]
}'

SSR_SINGLE='{"perPassenger": [{"meal": "MOML", "wheelchair": "none", "frequentFlyer": {}}]}'

# ═══════════════════════════════════════════════════════════════════
# TEST 2: ONE-WAY Sabre Booking (DAC → DXB) — 1 passenger + passport
# ═══════════════════════════════════════════════════════════════════
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}[2/8] TEST: ONE-WAY Sabre Booking (DAC → DXB, 1 pax)${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

ONEWAY=$(curl -s "$BASE/flights/book" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
  \"flightData\": {
    \"source\": \"sabre\", \"_sabreSource\": true,
    \"airline\": \"Emirates\", \"airlineCode\": \"EK\",
    \"flightNumber\": \"EK585\",
    \"origin\": \"DAC\", \"destination\": \"DXB\",
    \"departureTime\": \"2026-04-15T21:55:00\",
    \"arrivalTime\": \"2026-04-16T01:30:00\",
    \"bookingClass\": \"Y\", \"cabinClass\": \"Economy\",
    \"price\": 45000, \"baseFare\": 38000, \"taxes\": 7000,
    \"legs\": [{
      \"origin\": \"DAC\", \"destination\": \"DXB\",
      \"departureTime\": \"2026-04-15T21:55:00\",
      \"arrivalTime\": \"2026-04-16T01:30:00\",
      \"flightNumber\": \"EK585\", \"airlineCode\": \"EK\",
      \"bookingClass\": \"Y\"
    }]
  },
  \"passengers\": [$PAX1],
  \"contactInfo\": $CONTACT,
  \"isRoundTrip\": false,
  \"isDomestic\": false,
  \"payLater\": true,
  \"totalAmount\": 45000, \"baseFare\": 38000, \"taxes\": 7000, \"serviceCharge\": 0,
  \"specialServices\": $SSR_SINGLE
}")

echo "$ONEWAY" | jq '{
  bookingRef, pnr, airlinePnr, gdsBookingId, gdsBooked, status, payLater,
  paymentDeadline, id
}'
ONEWAY_PNR=$(echo "$ONEWAY" | jq -r '.pnr // "none"')
echo -e "GDS PNR: ${GREEN}$ONEWAY_PNR${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════
# TEST 3: ROUND-TRIP Sabre Booking (DAC → DXB → DAC) — 2 passengers
# ═══════════════════════════════════════════════════════════════════
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}[3/8] TEST: ROUND-TRIP Sabre Booking (DAC ↔ DXB, 2 pax)${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

ROUNDTRIP=$(curl -s "$BASE/flights/book" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
  \"flightData\": {
    \"source\": \"sabre\", \"_sabreSource\": true,
    \"airline\": \"Emirates\", \"airlineCode\": \"EK\",
    \"flightNumber\": \"EK585\",
    \"origin\": \"DAC\", \"destination\": \"DXB\",
    \"departureTime\": \"2026-04-15T21:55:00\",
    \"arrivalTime\": \"2026-04-16T01:30:00\",
    \"bookingClass\": \"Y\", \"cabinClass\": \"Economy\",
    \"price\": 90000, \"baseFare\": 76000, \"taxes\": 14000,
    \"legs\": [{
      \"origin\": \"DAC\", \"destination\": \"DXB\",
      \"departureTime\": \"2026-04-15T21:55:00\",
      \"arrivalTime\": \"2026-04-16T01:30:00\",
      \"flightNumber\": \"EK585\", \"airlineCode\": \"EK\",
      \"bookingClass\": \"Y\"
    }]
  },
  \"returnFlightData\": {
    \"source\": \"sabre\", \"_sabreSource\": true,
    \"airline\": \"Emirates\", \"airlineCode\": \"EK\",
    \"flightNumber\": \"EK586\",
    \"origin\": \"DXB\", \"destination\": \"DAC\",
    \"departureTime\": \"2026-04-20T03:30:00\",
    \"arrivalTime\": \"2026-04-20T13:00:00\",
    \"bookingClass\": \"Y\", \"cabinClass\": \"Economy\",
    \"price\": 45000,
    \"legs\": [{
      \"origin\": \"DXB\", \"destination\": \"DAC\",
      \"departureTime\": \"2026-04-20T03:30:00\",
      \"arrivalTime\": \"2026-04-20T13:00:00\",
      \"flightNumber\": \"EK586\", \"airlineCode\": \"EK\",
      \"bookingClass\": \"Y\"
    }]
  },
  \"passengers\": [$PAX1, $PAX2],
  \"contactInfo\": $CONTACT,
  \"isRoundTrip\": true,
  \"isDomestic\": false,
  \"payLater\": true,
  \"totalAmount\": 90000, \"baseFare\": 76000, \"taxes\": 14000, \"serviceCharge\": 0,
  \"specialServices\": $SSR_MEAL
}")

echo "$ROUNDTRIP" | jq '{
  bookingRef, pnr, airlinePnr, gdsBookingId, gdsBooked, status, payLater
}'
RT_PNR=$(echo "$ROUNDTRIP" | jq -r '.pnr // "none"')
echo -e "GDS PNR: ${GREEN}$RT_PNR${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════
# TEST 4: MULTI-CITY Sabre Booking (DAC → DXB → SIN → DAC)
# ═══════════════════════════════════════════════════════════════════
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}[4/8] TEST: MULTI-CITY Sabre Booking (DAC→DXB→SIN, 2 pax + 1 child)${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

SSR_3PAX='{"perPassenger": [
  {"meal": "MOML", "wheelchair": "none", "frequentFlyer": {}},
  {"meal": "VGML", "wheelchair": "none", "frequentFlyer": {}},
  {"meal": "CHML", "wheelchair": "none", "frequentFlyer": {}}
]}'

MULTICITY=$(curl -s "$BASE/flights/book" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
  \"flightData\": {
    \"source\": \"sabre\", \"_sabreSource\": true,
    \"airline\": \"Emirates\", \"airlineCode\": \"EK\",
    \"flightNumber\": \"EK585\",
    \"origin\": \"DAC\", \"destination\": \"SIN\",
    \"departureTime\": \"2026-04-15T21:55:00\",
    \"arrivalTime\": \"2026-04-18T14:00:00\",
    \"bookingClass\": \"Y\", \"cabinClass\": \"Economy\",
    \"price\": 135000, \"baseFare\": 115000, \"taxes\": 20000,
    \"isMultiCity\": true,
    \"legs\": [
      {
        \"origin\": \"DAC\", \"destination\": \"DXB\",
        \"departureTime\": \"2026-04-15T21:55:00\",
        \"arrivalTime\": \"2026-04-16T01:30:00\",
        \"flightNumber\": \"EK585\", \"airlineCode\": \"EK\",
        \"bookingClass\": \"Y\"
      },
      {
        \"origin\": \"DXB\", \"destination\": \"SIN\",
        \"departureTime\": \"2026-04-18T09:00:00\",
        \"arrivalTime\": \"2026-04-18T21:00:00\",
        \"flightNumber\": \"EK354\", \"airlineCode\": \"EK\",
        \"bookingClass\": \"Y\"
      }
    ]
  },
  \"multiCityFlights\": [
    {
      \"origin\": \"DAC\", \"destination\": \"DXB\",
      \"departureTime\": \"2026-04-15T21:55:00\",
      \"arrivalTime\": \"2026-04-16T01:30:00\",
      \"flightNumber\": \"EK585\", \"airlineCode\": \"EK\",
      \"bookingClass\": \"Y\"
    },
    {
      \"origin\": \"DXB\", \"destination\": \"SIN\",
      \"departureTime\": \"2026-04-18T09:00:00\",
      \"arrivalTime\": \"2026-04-18T21:00:00\",
      \"flightNumber\": \"EK354\", \"airlineCode\": \"EK\",
      \"bookingClass\": \"Y\"
    }
  ],
  \"passengers\": [$PAX1, $PAX2, $PAX_CHILD],
  \"contactInfo\": $CONTACT,
  \"isRoundTrip\": false,
  \"isMultiCity\": true,
  \"isDomestic\": false,
  \"payLater\": true,
  \"totalAmount\": 135000, \"baseFare\": 115000, \"taxes\": 20000, \"serviceCharge\": 0,
  \"specialServices\": $SSR_3PAX
}")

echo "$MULTICITY" | jq '{
  bookingRef, pnr, airlinePnr, gdsBookingId, gdsBooked, status, payLater
}'
MC_PNR=$(echo "$MULTICITY" | jq -r '.pnr // "none"')
echo -e "GDS PNR: ${GREEN}$MC_PNR${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════
# TEST 5: Verify PNR details via GetBooking (for each created PNR)
# ═══════════════════════════════════════════════════════════════════
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}[5/8] TEST: GetBooking — Verify PNR contains all segments + passport${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

for PNR_LABEL in "ONEWAY:$ONEWAY_PNR" "ROUNDTRIP:$RT_PNR" "MULTICITY:$MC_PNR"; do
  LABEL=$(echo "$PNR_LABEL" | cut -d: -f1)
  PNR=$(echo "$PNR_LABEL" | cut -d: -f2)
  if [ "$PNR" != "none" ] && [ -n "$PNR" ]; then
    echo -e "\n${YELLOW}── $LABEL PNR: $PNR ──${NC}"
    BOOKING=$(curl -s "$BASE/flights/booking/$PNR" \
      -H "Authorization: Bearer $TOKEN")
    echo "$BOOKING" | jq '{
      success, pnr, status,
      flightCount: (.flights | length),
      passengerCount: (.passengers | length),
      ticketingCount: (.ticketing | length)
    }' 2>/dev/null || echo "$BOOKING" | head -c 500
  else
    echo -e "${RED}$LABEL: No PNR created — skipping GetBooking${NC}"
  fi
done
echo ""

# ═══════════════════════════════════════════════════════════════════
# TEST 6: Seat Map (pre-booking, SOAP — no PNR needed)
# ═══════════════════════════════════════════════════════════════════
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}[6/8] TEST: Pre-booking Seat Map (SOAP) — EK585 DAC→DXB${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

SEATMAP=$(curl -s "$BASE/flights/seats-rest?origin=DAC&destination=DXB&departureDate=2026-04-15&airlineCode=EK&flightNumber=585")
echo "$SEATMAP" | jq '{
  success, source, variant, warning,
  totalRows, totalSeats,
  debugAttempts: (.debugAttempts | length)
}'
echo ""

# ═══════════════════════════════════════════════════════════════════
# TEST 7: Seat Map with PNR (post-booking REST + SOAP fallback)
# ═══════════════════════════════════════════════════════════════════
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}[7/8] TEST: Post-booking Seat Map (REST+SOAP) — using created PNR${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

if [ "$ONEWAY_PNR" != "none" ] && [ -n "$ONEWAY_PNR" ]; then
  SEATMAP_PNR=$(curl -s "$BASE/flights/seats-rest?origin=DAC&destination=DXB&departureDate=2026-04-15&airlineCode=EK&flightNumber=585&pnr=$ONEWAY_PNR")
  echo "$SEATMAP_PNR" | jq '{
    success, source, variant, warning, hint,
    totalRows, totalSeats
  }'
else
  echo -e "${RED}No one-way PNR — skipping post-booking seat test${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════
# TEST 8: Ancillaries (meals/baggage — via SOAP diagnostic)
# ═══════════════════════════════════════════════════════════════════
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}[8/8] TEST: Ancillaries — Sabre SOAP Diagnostic (EK585)${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

ANCILLARY=$(curl -s "$BASE/flights/sabre-soap-diagnostic?origin=DAC&destination=DXB&departureDate=2026-04-15&airlineCode=EK&flightNumber=585")
echo "$ANCILLARY" | jq '{
  seatMap: {success: .seatMap.success, rows: .seatMap.totalRows, seats: .seatMap.totalSeats, source: .seatMap.source},
  ancillaries: {success: .ancillaries.success, meals: (.ancillaries.meals | length), baggage: (.ancillaries.baggage | length), source: .ancillaries.source}
}' 2>/dev/null || echo "$ANCILLARY" | head -c 500
echo ""

# ═══════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   SUMMARY${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "One-Way PNR:    ${ONEWAY_PNR}"
echo -e "Round-Trip PNR: ${RT_PNR}"
echo -e "Multi-City PNR: ${MC_PNR}"
echo ""
echo -e "${YELLOW}Check PM2 logs for passport DOCS SSR, segment counts, and airline PNR:${NC}"
echo -e "  pm2 logs seventrip-api --lines 100 | grep -E 'DOCS|segment|Round-trip|Multi-city|Airline PNR|Creating PNR with'"
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
