/**
 * Sabre GDS API integration for international flight search & booking
 * Credentials stored in system_settings DB table (key: 'api_sabre')
 * Admin Panel → Settings → API Integrations → Sabre GDS
 *
 * Sabre REST API Docs: https://developer.sabre.com/docs/rest_apis
 * Uses Bargain Finder Max (BFM) for flight search
 */

const db = require('../config/db');

// ── Config cache (5 min TTL) ──
let _configCache = null;
let _configCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getSabreConfig() {
  if (_configCache && Date.now() - _configCacheTime < CACHE_TTL) return _configCache;
  try {
    const [rows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'api_sabre'");
    if (rows.length === 0 || !rows[0].setting_value) return null;
    const cfg = JSON.parse(rows[0].setting_value);
    if (cfg.enabled !== 'true' && cfg.enabled !== true) return null;

    const isProd = cfg.environment === 'production';
    const baseUrl = isProd
      ? (cfg.prod_url || 'https://api.sabre.com')
      : (cfg.sandbox_url || 'https://api-crt.cert.havail.sabre.com');
    const clientId = isProd ? cfg.prod_client_id : cfg.sandbox_client_id;
    const clientSecret = isProd ? cfg.prod_client_secret : cfg.sandbox_client_secret;
    if (!clientId || !clientSecret) return null;

    _configCache = {
      baseUrl: baseUrl.replace(/\/$/, ''),
      clientId,
      clientSecret,
      pcc: cfg.pcc || '',
      environment: cfg.environment || 'cert',
    };
    _configCacheTime = Date.now();
    return _configCache;
  } catch (err) {
    console.error('[Sabre] Config load error:', err.message);
    return null;
  }
}

function clearSabreConfigCache() { _configCache = null; _configCacheTime = 0; }

// ── OAuth2 Token Management ──
let tokenCache = { token: null, expiresAt: 0 };

async function getAccessToken(config) {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60000) return tokenCache.token;

  try {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    const res = await fetch(`${config.baseUrl}/v2/auth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[Sabre] Auth failed:', res.status, errText.slice(0, 300));
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 604800) * 1000,
      };
      return tokenCache.token;
    }
    return null;
  } catch (err) {
    console.error('[Sabre] Auth error:', err.message);
    return null;
  }
}

// ── Sabre API Request Helper ──
async function sabreRequest(config, endpoint, body, method = 'POST') {
  const token = await getAccessToken(config);
  if (!token) throw new Error('Sabre authentication failed');

  const url = `${config.baseUrl}${endpoint}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(30000),
  };

  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Sabre API ${res.status}: ${errText.slice(0, 500)}`);
  }
  return res.json();
}

// ── Flight Search (Bargain Finder Max) ──
async function searchFlights(params) {
  const config = await getSabreConfig();
  if (!config) return [];

  const {
    origin, destination, departDate, returnDate,
    adults = 1, children = 0, infants = 0,
    cabinClass,
  } = params;

  if (!origin || !destination || !departDate) return [];

  // Map cabin class to Sabre codes
  const cabinMap = {
    'Economy': 'Y', 'Premium Economy': 'S', 'Business': 'C', 'First': 'F',
    'economy': 'Y', 'premium_economy': 'S', 'business': 'C', 'first': 'F',
  };
  const sabreCabin = cabinMap[cabinClass] || 'Y';

  // Build passenger types
  const passengers = [];
  if (adults > 0) passengers.push({ Code: 'ADT', Quantity: adults });
  if (children > 0) passengers.push({ Code: 'CNN', Quantity: children });
  if (infants > 0) passengers.push({ Code: 'INF', Quantity: infants });

  // Build origin-destination info
  const originDest = [{
    RPH: '1',
    DepartureDateTime: `${departDate}T00:00:00`,
    OriginLocation: { LocationCode: origin },
    DestinationLocation: { LocationCode: destination },
  }];

  if (returnDate) {
    originDest.push({
      RPH: '2',
      DepartureDateTime: `${returnDate}T00:00:00`,
      OriginLocation: { LocationCode: destination },
      DestinationLocation: { LocationCode: origin },
    });
  }

  // Bargain Finder Max request body
  const requestBody = {
    OTA_AirLowFareSearchRQ: {
      Version: '5',
      POS: {
        Source: [{
          PseudoCityCode: config.pcc || 'F9CE',
          RequestorID: { Type: '1', ID: '1', CompanyName: { Code: 'TN' } },
        }],
      },
      OriginDestinationInformation: originDest,
      TravelPreferences: {
        TPA_Extensions: {
          NumTrips: { Number: 50 },
          DataSources: {
            NDC: 'Enable',
            ATPCO: 'Enable',
            LCC: 'Enable',
          },
        },
        CabinPref: [{ Cabin: sabreCabin, PreferLevel: 'Preferred' }],
      },
      TravelerInfoSummary: {
        AirTravelerAvail: [{
          PassengerTypeQuantity: passengers,
        }],
      },
      TPA_Extensions: {
        IntelliSellTransaction: {
          RequestType: { Name: '50ITINS' },
        },
      },
    },
  };

  try {
    console.log(`[Sabre] Searching ${origin} → ${destination} on ${departDate}...`);
    const raw = await sabreRequest(config, '/v5/offers/shop', requestBody);
    return normalizeSabreResponse(raw, params);
  } catch (err) {
    console.error('[Sabre] Search failed:', err.message);
    return [];
  }
}

// ── Normalize Sabre BFM response to standard flight format ──
function normalizeSabreResponse(raw, params) {
  const flights = [];

  try {
    const response = raw?.OTA_AirLowFareSearchRS || raw?.groupedItineraryResponse || raw;
    const pricedItins = response?.PricedItineraries?.PricedItinerary
      || response?.itineraryGroups?.[0]?.itineraries
      || [];

    if (pricedItins.length === 0 && response?.statistics) {
      // Grouped itinerary response format
      return normalizeGroupedResponse(response, params);
    }

    for (let idx = 0; idx < pricedItins.length; idx++) {
      const itin = pricedItins[idx];
      const airItinerary = itin.AirItinerary || {};
      const pricingInfo = itin.AirItineraryPricingInfo || {};
      const odOptions = airItinerary.OriginDestinationOptions?.OriginDestinationOption || [];

      // Extract pricing
      const totalFare = pricingInfo.ItinTotalFare || {};
      const totalAmount = parseFloat(totalFare.TotalFare?.Amount || totalFare.Amount || 0);
      const baseFareAmt = parseFloat(totalFare.BaseFare?.Amount || 0);
      const taxesAmt = parseFloat(totalFare.Taxes?.Tax?.[0]?.Amount || totalFare.Taxes?.Amount || 0) || (totalAmount - baseFareAmt);
      const currency = totalFare.TotalFare?.CurrencyCode || totalFare.CurrencyCode || 'BDT';

      // Extract fare rules
      let isRefundable = false;
      let cancellationPolicy = null;
      let dateChangePolicy = null;
      const fareInfos = pricingInfo.FareInfos?.FareInfo || [];
      for (const fi of fareInfos) {
        if (fi.TPA_Extensions?.Refundable?.Ind === true || fi.IsRefundable === true) {
          isRefundable = true;
        }
        if (fi.TPA_Extensions?.Penalties) {
          const penalties = fi.TPA_Extensions.Penalties;
          if (penalties.Penalty) {
            for (const p of (Array.isArray(penalties.Penalty) ? penalties.Penalty : [penalties.Penalty])) {
              if (p.Type === 'Refund' || p.Type === 'Cancel') {
                cancellationPolicy = {
                  beforeDeparture: p.Amount ? parseFloat(p.Amount) : null,
                  afterDeparture: 'Non-refundable',
                  noShow: 'Non-refundable',
                  currency,
                };
              }
              if (p.Type === 'Exchange' || p.Type === 'Reissue') {
                dateChangePolicy = {
                  changeAllowed: !p.NotPermitted,
                  changeFee: p.Amount ? parseFloat(p.Amount) : null,
                  currency,
                };
              }
            }
          }
        }
      }

      // Process each origin-destination (outbound / return)
      for (let odIdx = 0; odIdx < odOptions.length; odIdx++) {
        const od = odOptions[odIdx];
        const segments = od.FlightSegment || [];
        if (segments.length === 0) continue;

        const legs = segments.map(seg => {
          const depAirport = seg.DepartureAirport || {};
          const arrAirport = seg.ArrivalAirport || {};
          const operatingAirline = seg.OperatingAirline || {};
          const marketingAirline = seg.MarketingAirline || {};
          const equipment = seg.Equipment || {};

          return {
            origin: depAirport.LocationCode || '',
            destination: arrAirport.LocationCode || '',
            departureTime: seg.DepartureDateTime || null,
            arrivalTime: seg.ArrivalDateTime || null,
            durationMinutes: seg.ElapsedTime || 0,
            duration: formatDuration(seg.ElapsedTime || 0),
            flightNumber: `${marketingAirline.Code || ''}${seg.FlightNumber || ''}`,
            airlineCode: marketingAirline.Code || operatingAirline.Code || '',
            operatingAirline: operatingAirline.Code || marketingAirline.Code || '',
            aircraft: equipment.AirEquipType || '',
            originTerminal: depAirport.Terminal || '',
            destinationTerminal: arrAirport.Terminal || '',
            stops: [],
          };
        });

        const firstLeg = legs[0];
        const lastLeg = legs[legs.length - 1];

        // Total duration including layovers
        let totalDurationMin = 0;
        for (const leg of legs) totalDurationMin += leg.durationMinutes;
        for (let i = 1; i < legs.length; i++) {
          if (legs[i].departureTime && legs[i - 1].arrivalTime) {
            const layover = (new Date(legs[i].departureTime).getTime() - new Date(legs[i - 1].arrivalTime).getTime()) / 60000;
            if (layover > 0) totalDurationMin += layover;
          }
        }

        const direction = odIdx === 0 ? 'outbound' : 'return';
        const pricePerDirection = odOptions.length > 1 ? Math.round(totalAmount / odOptions.length) : totalAmount;

        // Extract booking class and seat availability
        let bookingClass = '';
        let minSeats = Infinity;
        let checkedBaggage = null;
        for (const fi of fareInfos) {
          if (fi.FareReference) bookingClass = fi.FareReference;
          if (fi.TPA_Extensions?.SeatsRemaining?.Number !== undefined) {
            const seats = parseInt(fi.TPA_Extensions.SeatsRemaining.Number);
            if (seats < minSeats) minSeats = seats;
          }
          // Baggage
          if (fi.TPA_Extensions?.BaggageInformationList?.BaggageInformation) {
            const bagInfos = fi.TPA_Extensions.BaggageInformationList.BaggageInformation;
            for (const bi of (Array.isArray(bagInfos) ? bagInfos : [bagInfos])) {
              const allowance = bi.Allowance || {};
              if (allowance.Weight) {
                checkedBaggage = `${allowance.Weight}${allowance.Unit || 'kg'}`;
              } else if (allowance.Pieces !== undefined) {
                checkedBaggage = `${allowance.Pieces} piece${allowance.Pieces > 1 ? 's' : ''}`;
              }
            }
          }
        }
        const availableSeats = minSeats === Infinity ? null : minSeats;

        // Extract time limit
        let timeLimit = null;
        if (pricingInfo.TPA_Extensions?.TicketingTimeLimit) {
          timeLimit = pricingInfo.TPA_Extensions.TicketingTimeLimit;
        } else if (itin.TPA_Extensions?.ValidatingCarrier?.TicketingTimeLimit) {
          timeLimit = itin.TPA_Extensions.ValidatingCarrier.TicketingTimeLimit;
        }

        const validatingCarrier = itin.TPA_Extensions?.ValidatingCarrier?.Code
          || itin.ValidatingAirlineCode
          || firstLeg.airlineCode;

        flights.push({
          id: `sabre-${idx}-${direction}`,
          source: 'sabre',
          direction,
          isRoundTrip: odOptions.length > 1,
          airline: getAirlineName(firstLeg.airlineCode),
          airlineCode: firstLeg.airlineCode,
          airlineLogo: null,
          flightNumber: firstLeg.flightNumber,
          origin: firstLeg.origin,
          destination: lastLeg.destination,
          departureTime: firstLeg.departureTime,
          arrivalTime: lastLeg.arrivalTime,
          duration: formatDuration(totalDurationMin),
          durationMinutes: totalDurationMin,
          stops: legs.length - 1,
          stopCodes: legs.length > 1 ? legs.slice(0, -1).map(l => l.destination) : [],
          cabinClass: getCabinName(fareInfos[0]?.TPA_Extensions?.Cabin?.Cabin || 'Y'),
          bookingClass,
          availableSeats,
          price: pricePerDirection,
          baseFare: odOptions.length > 1 ? Math.round(baseFareAmt / odOptions.length) : baseFareAmt,
          taxes: odOptions.length > 1 ? Math.round(taxesAmt / odOptions.length) : taxesAmt,
          totalRoundTripPrice: odOptions.length > 1 ? totalAmount : undefined,
          currency,
          refundable: isRefundable,
          baggage: checkedBaggage || null,
          handBaggage: null,
          aircraft: firstLeg.aircraft,
          legs,
          fareDetails: fareInfos.map(fi => ({
            fareBasis: fi.FareBasis?.Code || fi.FareReference || '',
            bookingClass: fi.FareReference || '',
            cabinClass: fi.TPA_Extensions?.Cabin?.Cabin || '',
            availableSeats: fi.TPA_Extensions?.SeatsRemaining?.Number ?? null,
          })),
          timeLimit,
          cancellationPolicy,
          dateChangePolicy,
          validatingAirline: validatingCarrier,
          _sabreSeqNumber: itin.SequenceNumber || idx,
        });
      }
    }
  } catch (err) {
    console.error('[Sabre] Normalization error:', err.message);
  }

  return flights;
}

// ── Grouped Itinerary Response (newer Sabre format) ──
function normalizeGroupedResponse(response, params) {
  const flights = [];
  try {
    const legDescs = response.legDescs || [];
    const scheduleDescs = response.scheduleDescs || [];
    const fareComponentDescs = response.fareComponentDescs || [];
    const itinGroups = response.itineraryGroups || [];

    for (const group of itinGroups) {
      const groupDesc = group.groupDescription || {};
      const itineraries = group.itineraries || [];

      for (let idx = 0; idx < itineraries.length; idx++) {
        const itin = itineraries[idx];
        const pricingInfo = itin.pricingInformation || [];
        if (pricingInfo.length === 0) continue;

        const pricing = pricingInfo[0];
        const fare = pricing.fare || {};
        const totalFare = fare.totalFare || {};
        const totalAmount = parseFloat(totalFare.totalPrice || 0);
        const baseFareAmt = parseFloat(totalFare.baseFareAmount || 0);
        const taxesAmt = parseFloat(totalFare.totalTaxAmount || 0);
        const currency = totalFare.currency || 'BDT';

        const itinLegs = itin.legs || [];
        for (let legIdx = 0; legIdx < itinLegs.length; legIdx++) {
          const leg = itinLegs[legIdx];
          const legRef = leg.ref;
          const legDesc = legDescs.find(ld => ld.id === legRef) || {};
          const schedules = legDesc.schedules || [];

          const legs = schedules.map(sched => {
            const schedRef = sched.ref;
            const schedDesc = scheduleDescs.find(sd => sd.id === schedRef) || {};
            const dep = sched.departure || schedDesc.departure || {};
            const arr = sched.arrival || schedDesc.arrival || {};
            const carrier = schedDesc.carrier || {};

            return {
              origin: dep.airport || '',
              destination: arr.airport || '',
              departureTime: dep.dateTime || dep.time || null,
              arrivalTime: arr.dateTime || arr.time || null,
              durationMinutes: schedDesc.elapsedTime || 0,
              duration: formatDuration(schedDesc.elapsedTime || 0),
              flightNumber: `${carrier.marketing || carrier.operating || ''}${carrier.marketingFlightNumber || ''}`,
              airlineCode: carrier.marketing || carrier.operating || '',
              operatingAirline: carrier.operating || carrier.marketing || '',
              aircraft: carrier.equipment?.code || '',
              originTerminal: dep.terminal || '',
              destinationTerminal: arr.terminal || '',
              stops: [],
            };
          });

          if (legs.length === 0) continue;
          const firstLeg = legs[0];
          const lastLeg = legs[legs.length - 1];

          let totalDurationMin = legDesc.elapsedTime || legs.reduce((s, l) => s + l.durationMinutes, 0);
          const direction = legIdx === 0 ? 'outbound' : 'return';
          const pricePerDirection = itinLegs.length > 1 ? Math.round(totalAmount / itinLegs.length) : totalAmount;

          // Seat availability from fare components
          let minSeats = Infinity;
          let bookingClass = '';
          const fareComponents = fare.passengerInfoList?.[0]?.passengerInfo?.fareComponents || [];
          for (const fc of fareComponents) {
            const segments = fc.segments || [];
            for (const seg of segments) {
              if (seg.seatsAvailable !== undefined && seg.seatsAvailable < minSeats) {
                minSeats = seg.seatsAvailable;
              }
              if (seg.bookingCode) bookingClass = seg.bookingCode;
            }
          }

          flights.push({
            id: `sabre-g-${group.groupDescription?.legDescriptions?.[0]?.departureDate || idx}-${legIdx}-${idx}`,
            source: 'sabre',
            direction,
            isRoundTrip: itinLegs.length > 1,
            airline: getAirlineName(firstLeg.airlineCode),
            airlineCode: firstLeg.airlineCode,
            airlineLogo: null,
            flightNumber: firstLeg.flightNumber,
            origin: firstLeg.origin,
            destination: lastLeg.destination,
            departureTime: firstLeg.departureTime,
            arrivalTime: lastLeg.arrivalTime,
            duration: formatDuration(totalDurationMin),
            durationMinutes: totalDurationMin,
            stops: legs.length - 1,
            stopCodes: legs.length > 1 ? legs.slice(0, -1).map(l => l.destination) : [],
            cabinClass: getCabinName(fareComponents[0]?.segments?.[0]?.cabin?.cabin || 'Y'),
            bookingClass,
            availableSeats: minSeats === Infinity ? null : minSeats,
            price: pricePerDirection,
            baseFare: itinLegs.length > 1 ? Math.round(baseFareAmt / itinLegs.length) : baseFareAmt,
            taxes: itinLegs.length > 1 ? Math.round(taxesAmt / itinLegs.length) : taxesAmt,
            totalRoundTripPrice: itinLegs.length > 1 ? totalAmount : undefined,
            currency,
            refundable: fare.passengerInfoList?.[0]?.passengerInfo?.nonRefundable === false,
            baggage: null,
            handBaggage: null,
            aircraft: firstLeg.aircraft,
            legs,
            fareDetails: [],
            timeLimit: fare.lastTicketDate || null,
            cancellationPolicy: null,
            dateChangePolicy: null,
            validatingAirline: fare.validatingCarrierCode || firstLeg.airlineCode,
            _sabreSeqNumber: idx,
          });
        }
      }
    }
  } catch (err) {
    console.error('[Sabre] Grouped normalization error:', err.message);
  }
  return flights;
}

// ── Helpers ──
function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m > 0 ? `${m}m` : ''}`.trim();
}

function getCabinName(code) {
  const map = { 'Y': 'Economy', 'S': 'Premium Economy', 'C': 'Business', 'J': 'Business', 'F': 'First', 'W': 'Premium Economy' };
  return map[code] || code || 'Economy';
}

function getAirlineName(code) {
  const names = {
    'EK': 'Emirates', 'QR': 'Qatar Airways', 'SQ': 'Singapore Airlines',
    'TG': 'Thai Airways', 'MH': 'Malaysia Airlines', 'TK': 'Turkish Airlines',
    'CX': 'Cathay Pacific', 'AI': 'Air India', 'SV': 'Saudi Arabian Airlines',
    'EY': 'Etihad Airways', 'LH': 'Lufthansa', 'BA': 'British Airways',
    'AF': 'Air France', 'KL': 'KLM', 'LO': 'LOT Polish Airlines',
    'SK': 'SAS', 'ET': 'Ethiopian Airlines', 'WY': 'Oman Air',
    'GF': 'Gulf Air', 'PG': 'Bangkok Airways', 'OZ': 'Asiana Airlines',
    'KE': 'Korean Air', 'NH': 'ANA', 'JL': 'Japan Airlines',
    'AA': 'American Airlines', 'UA': 'United Airlines', 'DL': 'Delta',
    'AC': 'Air Canada', 'FZ': 'flydubai', 'G9': 'Air Arabia',
    'UL': 'SriLankan Airlines', '6E': 'IndiGo', 'BG': 'Biman Bangladesh',
    'BS': 'US-Bangla Airlines', 'VQ': 'Novoair', '2A': 'Air Astra',
    'S2': 'Air Astra', 'RX': 'Regent Airways', 'PK': 'PIA',
    'BR': 'EVA Air', 'CI': 'China Airlines', 'CA': 'Air China',
    'MU': 'China Eastern', 'CZ': 'China Southern', 'GA': 'Garuda Indonesia',
    'VN': 'Vietnam Airlines', 'QF': 'Qantas', 'NZ': 'Air New Zealand',
    'PR': 'Philippine Airlines', 'AK': 'AirAsia', 'FR': 'Ryanair',
    'U2': 'easyJet', 'W6': 'Wizz Air', 'IB': 'Iberia',
    'AY': 'Finnair', 'LX': 'SWISS', 'OS': 'Austrian Airlines',
    'W5': 'Mahan Air', 'HU': 'Hainan Airlines', 'WS': 'WestJet',
  };
  return names[code] || code || 'Unknown';
}

module.exports = { searchFlights, getSabreConfig, clearSabreConfigCache };
