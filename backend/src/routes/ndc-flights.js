/**
 * NDC Gateway Integration (IATA NDC 21.3 Standard)
 * Supports: IndiGo (6E), Emirates, Lufthansa, Qatar Airways, etc.
 * Protocol: REST/JSON or XML
 * Docs: https://guides.developer.iata.org
 * Aggregators: Verteil, Farelogix, or Direct airline NDC
 */

const db = require('../config/db');

let configCache = null;
let configCacheTime = 0;
const CONFIG_TTL = 5 * 60 * 1000;

async function getNDCConfig() {
  if (configCache && Date.now() - configCacheTime < CONFIG_TTL) return configCache;
  try {
    const [rows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'api_ndc_gateway'");
    if (!rows.length) return null;
    const cfg = typeof rows[0].setting_value === 'string' ? JSON.parse(rows[0].setting_value) : rows[0].setting_value;
    if (cfg.enabled === false || cfg.enabled === 'false') return null;
    const isProd = cfg.environment === 'production';
    configCache = {
      baseUrl: isProd ? cfg.prod_url : cfg.sandbox_url,
      apiKey: isProd ? cfg.prod_key : cfg.sandbox_key,
      aggregator: cfg.aggregator || 'verteil',
      airlineCodes: (cfg.airline_codes || '').split(',').map(c => c.trim()).filter(Boolean),
      environment: cfg.environment,
    };
    if (!configCache.baseUrl || !configCache.apiKey) { configCache = null; return null; }
    configCacheTime = Date.now();
    return configCache;
  } catch (e) { console.error('[NDC] Config error:', e.message); return null; }
}

function clearNDCConfigCache() { configCache = null; configCacheTime = 0; }

async function ndcRequest(config, endpoint, body) {
  const url = `${config.baseUrl}${endpoint}`;
  console.log(`[NDC] → ${endpoint}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  console.log(`[NDC] ← ${endpoint} | Status: ${response.status}`);
  if (!response.ok) throw new Error(`NDC ${endpoint} failed (${response.status}): ${JSON.stringify(data).substring(0, 500)}`);
  return data;
}

async function searchFlights(params) {
  const config = await getNDCConfig();
  if (!config) return [];

  try {
    const { origin, destination, departDate, returnDate, adults = 1, children = 0, infants = 0, cabinClass } = params;
    const cabinMap = { Economy: 'M', 'Premium Economy': 'W', Business: 'C', First: 'F' };

    // Build NDC AirShopping request
    const request = {
      PointOfSale: { Location: { CountryCode: 'BD' }, RequestTime: new Date().toISOString() },
      CoreQuery: {
        OriginDestinations: [{
          OriginDestinationID: '1',
          DepartureCode: origin,
          ArrivalCode: destination,
          Date: departDate,
          CabinPreference: cabinMap[cabinClass] || 'M',
        }],
      },
      Travelers: [],
      Preference: { CabinPreferences: [{ CabinType: cabinMap[cabinClass] || 'M' }] },
    };

    if (returnDate) {
      request.CoreQuery.OriginDestinations.push({
        OriginDestinationID: '2',
        DepartureCode: destination,
        ArrivalCode: origin,
        Date: returnDate,
        CabinPreference: cabinMap[cabinClass] || 'M',
      });
    }

    for (let i = 0; i < adults; i++) request.Travelers.push({ TravelerID: `T${i + 1}`, PTC: 'ADT' });
    for (let i = 0; i < children; i++) request.Travelers.push({ TravelerID: `T${adults + i + 1}`, PTC: 'CHD' });
    for (let i = 0; i < infants; i++) request.Travelers.push({ TravelerID: `T${adults + children + i + 1}`, PTC: 'INF' });

    const response = await ndcRequest(config, '/AirShopping', request);
    return normalizeNDCResponse(response, params);
  } catch (err) {
    console.error('[NDC] Search error:', err.message);
    return [];
  }
}

function normalizeNDCResponse(response, params) {
  const flights = [];
  try {
    const offers = response?.Offers || response?.AirShoppingRS?.OffersGroup?.AirlineOffers || [];
    const dataLists = response?.DataLists || response?.AirShoppingRS?.DataLists || {};

    for (const offer of Array.isArray(offers) ? offers : [offers]) {
      const items = offer?.AirlineOffer || offer?.OfferItems || offer?.Offer || [];
      for (const item of Array.isArray(items) ? items : [items]) {
        try {
          const price = item?.TotalPrice?.SimpleCurrencyPrice?.value ||
                        item?.OfferPrice?.[0]?.RequestedDate?.PriceDetail?.TotalAmount?.SimpleCurrencyPrice?.value ||
                        item?.Price?.TotalAmount || 0;
          const currency = item?.TotalPrice?.SimpleCurrencyPrice?.Code ||
                          item?.OfferPrice?.[0]?.RequestedDate?.PriceDetail?.TotalAmount?.SimpleCurrencyPrice?.Code || 'BDT';

          const segments = item?.FlightSegments || item?.Service?.[0]?.FlightRefs || [];
          if (!segments.length && !item?.Segment) continue;

          const firstSeg = segments[0] || item?.Segment?.[0] || {};
          const lastSeg = segments[segments.length - 1] || firstSeg;

          flights.push({
            id: `ndc-${item?.OfferID || item?.OfferItemID || Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            source: 'ndc',
            airline: getAirlineName(firstSeg?.MarketingCarrier?.AirlineID || firstSeg?.Carrier || ''),
            airlineCode: firstSeg?.MarketingCarrier?.AirlineID || firstSeg?.Carrier || '',
            flightNumber: `${firstSeg?.MarketingCarrier?.AirlineID || ''}${firstSeg?.MarketingCarrier?.FlightNumber || firstSeg?.FlightNumber || ''}`,
            origin: firstSeg?.Departure?.AirportCode || firstSeg?.Origin || params.origin,
            destination: lastSeg?.Arrival?.AirportCode || lastSeg?.Destination || params.destination,
            departureTime: firstSeg?.Departure?.Date ? `${firstSeg.Departure.Date}T${firstSeg.Departure.Time || '00:00'}` : null,
            arrivalTime: lastSeg?.Arrival?.Date ? `${lastSeg.Arrival.Date}T${lastSeg.Arrival.Time || '00:00'}` : null,
            duration: item?.Duration || null,
            durationMinutes: 0,
            stops: Math.max(0, (Array.isArray(segments) ? segments.length : 1) - 1),
            stopCodes: [],
            cabinClass: params.cabinClass || 'Economy',
            price: parseFloat(price) || 0,
            baseFare: 0,
            taxes: 0,
            currency,
            refundable: false,
            baggage: null,
            handBaggage: null,
            _ndcOfferId: item?.OfferID || item?.OfferItemID || null,
            legs: [],
          });
        } catch (e) { /* skip malformed offer */ }
      }
    }
  } catch (err) {
    console.error('[NDC] Parse error:', err.message);
  }
  console.log(`[NDC] Normalized ${flights.length} flights`);
  return flights;
}

function getAirlineName(code) {
  const names = { '6E': 'IndiGo', 'EK': 'Emirates', 'LH': 'Lufthansa', 'QR': 'Qatar Airways', 'SQ': 'Singapore Airlines', 'TK': 'Turkish Airlines', 'BA': 'British Airways', 'AF': 'Air France', 'KL': 'KLM', 'NH': 'ANA', 'JL': 'Japan Airlines', 'CX': 'Cathay Pacific' };
  return names[code] || code;
}

async function createBooking({ offerId, passengers, contactInfo }) {
  const config = await getNDCConfig();
  if (!config) return { success: false, pnr: null, rawResponse: 'NDC not configured' };
  try {
    const request = { OfferID: offerId, Passengers: passengers, ContactInfo: contactInfo };
    const response = await ndcRequest(config, '/OrderCreate', request);
    const pnr = response?.Order?.OrderID || response?.OrderCreateRS?.Response?.Order?.OrderID || null;
    return { success: !!pnr, pnr, rawResponse: response };
  } catch (err) {
    console.error('[NDC] CreateBooking error:', err.message);
    return { success: false, pnr: null, rawResponse: err.message };
  }
}

async function issueTicket({ orderId }) {
  const config = await getNDCConfig();
  if (!config) return { success: false, ticketNumbers: [], rawResponse: 'NDC not configured' };
  try {
    const response = await ndcRequest(config, '/OrderChange', { OrderID: orderId, ActionType: 'Ticketing' });
    const tickets = response?.TicketDocInfo?.map(t => t.TicketNumber) || [];
    return { success: tickets.length > 0, ticketNumbers: tickets, rawResponse: response };
  } catch (err) {
    console.error('[NDC] IssueTicket error:', err.message);
    return { success: false, ticketNumbers: [], rawResponse: err.message };
  }
}

async function cancelBooking({ orderId }) {
  const config = await getNDCConfig();
  if (!config) return { success: false, rawResponse: 'NDC not configured' };
  try {
    const response = await ndcRequest(config, '/OrderCancel', { OrderID: orderId });
    return { success: true, rawResponse: response };
  } catch (err) {
    console.error('[NDC] CancelBooking error:', err.message);
    return { success: false, rawResponse: err.message };
  }
}

module.exports = { searchFlights, createBooking, issueTicket, cancelBooking, getNDCConfig, clearNDCConfigCache };
