/**
 * LCC (Low-Cost Carrier) Direct API Integration
 * Unified module for: Air Arabia (G9), IndiGo (6E), Salam Air (OV),
 * AirAsia (AK/FD/QZ/Z2), NovoAir (VQ), FlyAdeal (F3), Flynas (XY)
 *
 * Each LCC uses Navitaire/Radixx-style REST APIs with similar patterns:
 * 1. Authenticate → get session/token
 * 2. Search flights (availability)
 * 3. Create booking (sell + commit)
 * 4. Add passengers, contacts, payments
 * 5. Issue ticket / Cancel
 */

const db = require('../config/db');

const LCC_PROVIDERS = {
  air_arabia:  { code: 'G9', name: 'Air Arabia',  settingKey: 'api_air_arabia' },
  indigo_ndc:  { code: '6E', name: 'IndiGo',      settingKey: 'api_indigo_ndc' },
  salam_air:   { code: 'OV', name: 'Salam Air',   settingKey: 'api_salam_air' },
  airasia:     { code: 'AK', name: 'AirAsia',     settingKey: 'api_airasia' },
  novoair:     { code: 'VQ', name: 'NovoAir',     settingKey: 'api_novoair' },
  flyadeal:    { code: 'F3', name: 'FlyAdeal',    settingKey: 'api_flyadeal' },
  flynas:      { code: 'XY', name: 'Flynas',      settingKey: 'api_flynas' },
};

// Config cache per provider
const configCaches = {};
const CONFIG_TTL = 5 * 60 * 1000;

// Token cache per provider (session tokens)
const tokenCaches = {};

async function getLCCConfig(providerId) {
  const provider = LCC_PROVIDERS[providerId];
  if (!provider) return null;

  const cache = configCaches[providerId];
  if (cache && Date.now() - cache.time < CONFIG_TTL) return cache.config;

  try {
    const [rows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = ?", [provider.settingKey]);
    if (!rows.length) return null;
    const cfg = typeof rows[0].setting_value === 'string' ? JSON.parse(rows[0].setting_value) : rows[0].setting_value;
    if (cfg.enabled === false || cfg.enabled === 'false') return null;
    const isProd = cfg.environment === 'production';
    const config = {
      providerId,
      code: provider.code,
      name: provider.name,
      baseUrl: isProd ? cfg.prod_url : cfg.sandbox_url,
      apiKey: isProd ? cfg.prod_key : cfg.sandbox_key,
      agentId: cfg.agent_id || '',
      environment: cfg.environment,
    };
    if (!config.baseUrl || !config.apiKey) return null;
    configCaches[providerId] = { config, time: Date.now() };
    return config;
  } catch (e) {
    console.error(`[${provider.name}] Config error:`, e.message);
    return null;
  }
}

function clearLCCConfigCache(providerId) {
  if (providerId) {
    delete configCaches[providerId];
    delete tokenCaches[providerId];
  } else {
    Object.keys(configCaches).forEach(k => delete configCaches[k]);
    Object.keys(tokenCaches).forEach(k => delete tokenCaches[k]);
  }
}

// Generic authenticated API request
async function lccRequest(config, endpoint, body, method = 'POST') {
  const url = `${config.baseUrl}${endpoint}`;
  console.log(`[${config.name}] → ${method} ${endpoint}`);
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add auth — API key based
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    headers['X-Api-Key'] = config.apiKey;
  }
  if (config.agentId) {
    headers['X-Agent-Id'] = config.agentId;
  }

  const options = { method, headers, signal: AbortSignal.timeout(30000) };
  if (body && method !== 'GET') options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  const text = await response.text();
  console.log(`[${config.name}] ← ${endpoint} | Status: ${response.status} | Length: ${text.length}`);

  let data;
  try { data = JSON.parse(text); } catch { data = { rawText: text }; }

  if (!response.ok) {
    throw new Error(`${config.name} ${endpoint} failed (${response.status}): ${text.substring(0, 500)}`);
  }
  return data;
}

// ===================== SEARCH =====================

async function searchFlightsForProvider(providerId, params) {
  const config = await getLCCConfig(providerId);
  if (!config) return [];

  try {
    const { origin, destination, departDate, returnDate, adults = 1, children = 0, infants = 0, cabinClass } = params;

    const searchBody = {
      origin,
      destination,
      departureDate: departDate,
      returnDate: returnDate || undefined,
      passengers: { adults, children, infants },
      cabinClass: cabinClass || 'Economy',
      currencyCode: 'BDT',
    };

    const data = await lccRequest(config, '/flights/search', searchBody);
    return normalizeLCCResponse(data, config, params);
  } catch (err) {
    console.error(`[${LCC_PROVIDERS[providerId]?.name || providerId}] Search error:`, err.message);
    return [];
  }
}

// Search all enabled LCC providers in parallel
async function searchAllLCCs(params) {
  const providerIds = Object.keys(LCC_PROVIDERS);
  const results = await Promise.allSettled(
    providerIds.map(id => searchFlightsForProvider(id, params))
  );

  let allFlights = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled' && results[i].value.length > 0) {
      allFlights.push(...results[i].value);
      console.log(`[LCC] ${providerIds[i]} returned ${results[i].value.length} flights`);
    }
  }
  return allFlights;
}

function normalizeLCCResponse(data, config, params) {
  const flights = [];
  try {
    // Generic normalization — LCC APIs typically return an array of fare/journey objects
    const rawFlights = data?.flights || data?.data || data?.journeys || data?.results ||
                       data?.Availability?.Journeys || data?.Schedules || [];

    const flightArray = Array.isArray(rawFlights) ? rawFlights : [];

    for (const f of flightArray) {
      try {
        const segments = f.segments || f.legs || f.Segments || f.Legs || [f];
        const firstSeg = segments[0] || {};
        const lastSeg = segments[segments.length - 1] || firstSeg;

        const airline = firstSeg.airlineCode || firstSeg.carrier || firstSeg.AirlineCode || config.code;
        const flightNum = firstSeg.flightNumber || firstSeg.FlightNumber || `${airline}${firstSeg.number || ''}`;
        const depTime = firstSeg.departureTime || firstSeg.DepartureTime || firstSeg.departure || null;
        const arrTime = lastSeg.arrivalTime || lastSeg.ArrivalTime || lastSeg.arrival || null;
        const dur = f.duration || f.Duration || f.totalDuration || 0;
        const durMinutes = typeof dur === 'number' ? dur : parseDurationStr(dur);

        const price = f.totalPrice || f.price || f.TotalPrice || f.fare?.total || f.Fare?.Total || 0;
        const baseFare = f.baseFare || f.BaseFare || f.fare?.base || 0;
        const taxes = f.taxes || f.Taxes || f.fare?.taxes || 0;
        const currency = f.currency || f.Currency || 'BDT';

        flights.push({
          id: `${config.providerId}-${flightNum}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          source: config.providerId,
          airline: config.name,
          airlineCode: airline,
          flightNumber: flightNum,
          origin: firstSeg.origin || firstSeg.Origin || firstSeg.departureStation || params.origin,
          destination: lastSeg.destination || lastSeg.Destination || lastSeg.arrivalStation || params.destination,
          departureTime: depTime,
          arrivalTime: arrTime,
          duration: typeof dur === 'string' ? dur : formatDuration(durMinutes),
          durationMinutes: durMinutes,
          stops: Math.max(0, segments.length - 1),
          stopCodes: segments.length > 1 ? segments.slice(0, -1).map(s => s.destination || s.Destination || s.arrivalStation || '') : [],
          cabinClass: params.cabinClass || 'Economy',
          bookingClass: firstSeg.bookingClass || firstSeg.classOfService || '',
          availableSeats: firstSeg.availableSeats || firstSeg.seatsAvailable || null,
          price: parseFloat(price) || 0,
          baseFare: parseFloat(baseFare) || 0,
          taxes: parseFloat(taxes) || 0,
          currency,
          refundable: f.refundable || f.isRefundable || false,
          baggage: f.baggage || f.baggageAllowance || null,
          handBaggage: f.handBaggage || f.cabinBaggage || null,
          _lccOfferId: f.offerId || f.fareId || f.journeyKey || f.JourneyKey || null,
          legs: segments.map(s => ({
            airline: s.airlineCode || s.carrier || config.code,
            flightNumber: s.flightNumber || s.FlightNumber || '',
            origin: s.origin || s.Origin || s.departureStation || '',
            destination: s.destination || s.Destination || s.arrivalStation || '',
            departureTime: s.departureTime || s.DepartureTime || s.departure || null,
            arrivalTime: s.arrivalTime || s.ArrivalTime || s.arrival || null,
            duration: s.duration || null,
          })),
        });
      } catch (e) { /* skip malformed flight */ }
    }
  } catch (err) {
    console.error(`[${config.name}] Parse error:`, err.message);
  }
  console.log(`[${config.name}] Normalized ${flights.length} flights`);
  return flights;
}

function parseDurationStr(str) {
  if (!str || typeof str !== 'string') return 0;
  const hMatch = str.match(/(\d+)\s*h/i);
  const mMatch = str.match(/(\d+)\s*m/i);
  return (parseInt(hMatch?.[1]) || 0) * 60 + (parseInt(mMatch?.[1]) || 0);
}

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

// ===================== BOOKING =====================

async function createBooking(providerId, { offerId, passengers, contactInfo }) {
  const config = await getLCCConfig(providerId);
  if (!config) return { success: false, pnr: null, rawResponse: `${providerId} not configured` };

  try {
    const body = {
      offerId,
      passengers: passengers.map(p => ({
        type: p.type || 'ADT',
        title: p.title,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        nationality: p.nationality,
        passportNumber: p.passportNumber,
        passportExpiry: p.passportExpiry,
      })),
      contact: {
        email: contactInfo.email,
        phone: contactInfo.phone,
      },
    };

    const data = await lccRequest(config, '/flights/book', body);
    const pnr = data?.pnr || data?.PNR || data?.bookingReference || data?.confirmationCode || data?.recordLocator || null;
    return { success: !!pnr, pnr, rawResponse: data };
  } catch (err) {
    console.error(`[${config.name}] CreateBooking error:`, err.message);
    return { success: false, pnr: null, rawResponse: err.message };
  }
}

async function issueTicket(providerId, { pnr }) {
  const config = await getLCCConfig(providerId);
  if (!config) return { success: false, ticketNumbers: [], rawResponse: `${providerId} not configured` };

  try {
    const data = await lccRequest(config, '/flights/ticket', { pnr });
    const tickets = data?.ticketNumbers || data?.tickets?.map(t => t.number) || [];
    return { success: tickets.length > 0, ticketNumbers: tickets, rawResponse: data };
  } catch (err) {
    console.error(`[${config.name}] IssueTicket error:`, err.message);
    return { success: false, ticketNumbers: [], rawResponse: err.message };
  }
}

async function cancelBooking(providerId, { pnr }) {
  const config = await getLCCConfig(providerId);
  if (!config) return { success: false, rawResponse: `${providerId} not configured` };

  try {
    const data = await lccRequest(config, '/flights/cancel', { pnr });
    return { success: true, rawResponse: data };
  } catch (err) {
    console.error(`[${config.name}] CancelBooking error:`, err.message);
    return { success: false, rawResponse: err.message };
  }
}

module.exports = {
  searchAllLCCs,
  searchFlightsForProvider,
  createBooking,
  issueTicket,
  cancelBooking,
  getLCCConfig,
  clearLCCConfigCache,
  LCC_PROVIDERS,
};
