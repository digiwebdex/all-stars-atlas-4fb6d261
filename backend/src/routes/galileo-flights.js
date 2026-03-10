/**
 * Galileo / Travelport Universal API Integration
 * GDS: Galileo (1G), Apollo (1V), Worldspan (1P)
 * Protocol: SOAP/XML (Universal API) or REST (newer endpoints)
 * Docs: https://support.travelport.com/webhelp/uapi/
 */

const db = require('../config/db');

let configCache = null;
let configCacheTime = 0;
const CONFIG_TTL = 5 * 60 * 1000;

async function getGalileoConfig() {
  if (configCache && Date.now() - configCacheTime < CONFIG_TTL) return configCache;
  try {
    const [rows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'api_galileo'");
    if (!rows.length) return null;
    const cfg = typeof rows[0].setting_value === 'string' ? JSON.parse(rows[0].setting_value) : rows[0].setting_value;
    if (cfg.enabled === false || cfg.enabled === 'false') return null;
    const isProd = cfg.environment === 'production';
    configCache = {
      url: isProd ? cfg.prod_url : cfg.preprod_url,
      username: cfg.username,
      password: cfg.password,
      targetBranch: cfg.target_branch,
      provider: cfg.provider || '1G',
      environment: cfg.environment,
    };
    if (!configCache.url || !configCache.username) { configCache = null; return null; }
    configCacheTime = Date.now();
    return configCache;
  } catch (e) { console.error('[Galileo] Config error:', e.message); return null; }
}

function clearGalileoConfigCache() { configCache = null; configCacheTime = 0; }

// Build SOAP envelope for LowFareSearchReq
function buildSearchXML(config, params) {
  const { origin, destination, departDate, returnDate, adults = 1, children = 0, infants = 0, cabinClass } = params;
  const cabinMap = { Economy: 'Economy', 'Premium Economy': 'PremiumEconomy', Business: 'Business', First: 'First' };
  const cabin = cabinMap[cabinClass] || 'Economy';

  let segments = `
    <air:SearchAirLeg>
      <air:SearchOrigin><com:CityOrAirport Code="${origin}"/></air:SearchOrigin>
      <air:SearchDestination><com:CityOrAirport Code="${destination}"/></air:SearchDestination>
      <air:SearchDepTime PreferredTime="${departDate}"/>
      <air:AirLegModifiers><air:PreferredCabins><com:CabinClass Type="${cabin}"/></air:PreferredCabins></air:AirLegModifiers>
    </air:SearchAirLeg>`;

  if (returnDate) {
    segments += `
    <air:SearchAirLeg>
      <air:SearchOrigin><com:CityOrAirport Code="${destination}"/></air:SearchOrigin>
      <air:SearchDestination><com:CityOrAirport Code="${origin}"/></air:SearchDestination>
      <air:SearchDepTime PreferredTime="${returnDate}"/>
      <air:AirLegModifiers><air:PreferredCabins><com:CabinClass Type="${cabin}"/></air:PreferredCabins></air:AirLegModifiers>
    </air:SearchAirLeg>`;
  }

  let paxTypes = '';
  for (let i = 0; i < adults; i++) paxTypes += `<com:SearchPassenger Code="ADT"/>`;
  for (let i = 0; i < children; i++) paxTypes += `<com:SearchPassenger Code="CNN"/>`;
  for (let i = 0; i < infants; i++) paxTypes += `<com:SearchPassenger Code="INF"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:air="http://www.travelport.com/schema/air_v52_0"
  xmlns:com="http://www.travelport.com/schema/common_v52_0">
  <soapenv:Header/>
  <soapenv:Body>
    <air:LowFareSearchReq TargetBranch="${config.targetBranch}" AuthorizedBy="user"
      SolutionResult="true" xmlns:air="http://www.travelport.com/schema/air_v52_0">
      <com:BillingPointOfSaleInfo OriginApplication="UAPI"/>
      ${segments}
      <air:AirSearchModifiers MaxSolutions="50">
        <air:PreferredProviders><com:Provider Code="${config.provider}"/></air:PreferredProviders>
      </air:AirSearchModifiers>
      ${paxTypes}
    </air:LowFareSearchReq>
  </soapenv:Body>
</soapenv:Envelope>`;
}

async function searchFlights(params) {
  const config = await getGalileoConfig();
  if (!config) return [];

  try {
    const xml = buildSearchXML(config, params);
    const endpoint = `${config.url}/AirService`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'Authorization': 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64'),
        'SOAPAction': '',
      },
      body: xml,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Galileo] Search HTTP ${response.status}:`, errText.substring(0, 500));
      return [];
    }

    const responseXml = await response.text();
    return normalizeGalileoResponse(responseXml, params);
  } catch (err) {
    console.error('[Galileo] Search error:', err.message);
    return [];
  }
}

function normalizeGalileoResponse(xml, params) {
  // Parse XML response and normalize to standard flight format
  // Travelport returns AirPricingSolution elements with FlightSegment refs
  const flights = [];
  try {
    // Extract AirSegment data
    const segmentRegex = /<air:AirSegment[^>]*Key="([^"]*)"[^>]*Carrier="([^"]*)"[^>]*FlightNumber="([^"]*)"[^>]*Origin="([^"]*)"[^>]*Destination="([^"]*)"[^>]*DepartureTime="([^"]*)"[^>]*ArrivalTime="([^"]*)"[^>]*FlightTime="([^"]*)"[^>]*/g;
    const segments = {};
    let match;
    while ((match = segmentRegex.exec(xml)) !== null) {
      segments[match[1]] = {
        carrier: match[2],
        flightNumber: `${match[2]}${match[3]}`,
        origin: match[4],
        destination: match[5],
        departureTime: match[6],
        arrivalTime: match[7],
        flightTimeMinutes: parseInt(match[8]) || 0,
      };
    }

    // Extract pricing solutions
    const priceRegex = /<air:AirPricingSolution[^>]*TotalPrice="([^"]*)"[^>]*BasePrice="([^"]*)"[^>]*Taxes="([^"]*)"[^>]*>([\s\S]*?)<\/air:AirPricingSolution>/g;
    while ((match = priceRegex.exec(xml)) !== null) {
      const totalStr = match[1];
      const baseStr = match[2];
      const taxStr = match[3];
      const inner = match[4];

      const total = parsePrice(totalStr);
      const base = parsePrice(baseStr);
      const taxes = parsePrice(taxStr);

      // Get segment refs
      const segRefRegex = /Key="([^"]*)"/g;
      const legSegments = [];
      let segMatch;
      const segRefSection = inner.match(/<air:AirSegmentRef[^>]*Key="([^"]*)"/g) || [];
      for (const ref of segRefSection) {
        const keyMatch = ref.match(/Key="([^"]*)"/);
        if (keyMatch && segments[keyMatch[1]]) {
          legSegments.push(segments[keyMatch[1]]);
        }
      }

      if (legSegments.length === 0) continue;

      const firstSeg = legSegments[0];
      const lastSeg = legSegments[legSegments.length - 1];
      const totalMinutes = legSegments.reduce((sum, s) => sum + s.flightTimeMinutes, 0);

      flights.push({
        id: `galileo-${firstSeg.flightNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: 'galileo',
        airline: getAirlineName(firstSeg.carrier),
        airlineCode: firstSeg.carrier,
        flightNumber: firstSeg.flightNumber,
        origin: firstSeg.origin,
        destination: lastSeg.destination,
        departureTime: firstSeg.departureTime,
        arrivalTime: lastSeg.arrivalTime,
        duration: formatDuration(totalMinutes),
        durationMinutes: totalMinutes,
        stops: legSegments.length - 1,
        stopCodes: legSegments.length > 1 ? legSegments.slice(1).map(s => s.origin) : [],
        cabinClass: params.cabinClass || 'Economy',
        price: total,
        baseFare: base,
        taxes: taxes,
        currency: 'BDT',
        refundable: false,
        baggage: null,
        handBaggage: null,
        legs: legSegments.map(s => ({
          airline: s.carrier,
          flightNumber: s.flightNumber,
          origin: s.origin,
          destination: s.destination,
          departureTime: s.departureTime,
          arrivalTime: s.arrivalTime,
          duration: formatDuration(s.flightTimeMinutes),
        })),
      });
    }
  } catch (err) {
    console.error('[Galileo] Parse error:', err.message);
  }
  console.log(`[Galileo] Normalized ${flights.length} flights`);
  return flights;
}

function parsePrice(str) {
  if (!str) return 0;
  const num = str.replace(/[^0-9.]/g, '');
  return parseFloat(num) || 0;
}

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function getAirlineName(code) {
  const names = { 'AI': 'Air India', '6E': 'IndiGo', 'SG': 'SpiceJet', 'UK': 'Vistara', 'G8': 'GoAir', 'EK': 'Emirates', 'QR': 'Qatar Airways', 'SQ': 'Singapore Airlines', 'TK': 'Turkish Airlines', 'SV': 'Saudia', 'WY': 'Oman Air', 'GF': 'Gulf Air', 'BG': 'Biman Bangladesh', 'BS': 'US-Bangla', 'VQ': 'NovoAir', '2A': 'Air Astra', 'G9': 'Air Arabia', 'AK': 'AirAsia', 'FD': 'Thai AirAsia', 'OV': 'SalamAir', 'F3': 'FlyAdeal', 'XY': 'Flynas', 'LH': 'Lufthansa', 'BA': 'British Airways' };
  return names[code] || code;
}

async function createBooking({ flightData, passengers, contactInfo }) {
  const config = await getGalileoConfig();
  if (!config) return { success: false, pnr: null, rawResponse: 'Galileo not configured' };
  // Build AirCreateReservationReq SOAP
  console.log('[Galileo] CreateBooking — implementation requires active Travelport credentials');
  return { success: false, pnr: null, rawResponse: 'Galileo booking requires active Travelport UAPI credentials' };
}

async function issueTicket({ pnr }) {
  const config = await getGalileoConfig();
  if (!config) return { success: false, ticketNumbers: [], rawResponse: 'Galileo not configured' };
  console.log('[Galileo] IssueTicket — implementation requires active Travelport credentials');
  return { success: false, ticketNumbers: [], rawResponse: 'Galileo ticketing requires active Travelport UAPI credentials' };
}

async function cancelBooking({ pnr }) {
  const config = await getGalileoConfig();
  if (!config) return { success: false, rawResponse: 'Galileo not configured' };
  console.log('[Galileo] CancelBooking — implementation requires active Travelport credentials');
  return { success: false, rawResponse: 'Galileo cancel requires active Travelport UAPI credentials' };
}

module.exports = { searchFlights, createBooking, issueTicket, cancelBooking, getGalileoConfig, clearGalileoConfigCache };
