// HotelBeds API Integration
// Reads credentials from system_settings table (api_hotel_supplier)
// Admin Panel → Settings → API Integrations → HotelBeds

const crypto = require('crypto');
const db = require('../config/db');

let cachedConfig = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getHotelBedsConfig() {
  if (cachedConfig && Date.now() - cacheTime < CACHE_TTL) return cachedConfig;
  try {
    const [rows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'api_hotel_supplier'");
    if (rows.length === 0 || !rows[0].setting_value) return null;
    const cfg = JSON.parse(rows[0].setting_value);
    if (cfg.enabled !== 'true' && cfg.enabled !== true) return null;
    if (!cfg.api_key || !cfg.api_secret) return null;

    cachedConfig = {
      apiKey: cfg.api_key,
      apiSecret: cfg.api_secret,
      baseUrl: (cfg.api_url || 'https://api.test.hotelbeds.com/hotel-api/1.0').replace(/\/$/, ''),
    };
    cacheTime = Date.now();
    return cachedConfig;
  } catch (err) {
    console.error('[HotelBeds] Config error:', err.message);
    return null;
  }
}

function clearHotelBedsConfigCache() { cachedConfig = null; cacheTime = 0; }

// HotelBeds requires X-Signature header = SHA256(apiKey + secret + timestamp_seconds)
function generateSignature(config) {
  const utcDate = Math.floor(Date.now() / 1000);
  return crypto.createHash('sha256').update(config.apiKey + config.apiSecret + utcDate).digest('hex');
}

async function searchHotels({ city, checkIn, checkOut, adults = 1, children = 0, rooms = 1, minRate, maxRate, minStars, maxStars }) {
  const config = await getHotelBedsConfig();
  if (!config) return [];

  const occupancies = [];
  for (let i = 0; i < parseInt(rooms); i++) {
    occupancies.push({ rooms: 1, adults: parseInt(adults), children: parseInt(children), paxes: [] });
  }

  // Search by destination (city name → destination code lookup)
  // HotelBeds uses destination codes; we'll search by keyword for simplicity
  const requestBody = {
    stay: { checkIn, checkOut },
    occupancies,
    filter: {},
  };

  // Add destination filter
  if (city) {
    requestBody.destination = { code: city.toUpperCase().slice(0, 3) }; // Simplified — real impl needs mapping
  }
  if (minStars) requestBody.filter.minCategory = parseInt(minStars);
  if (maxStars) requestBody.filter.maxCategory = parseInt(maxStars);
  if (minRate) requestBody.filter.minRate = parseFloat(minRate);
  if (maxRate) requestBody.filter.maxRate = parseFloat(maxRate);

  try {
    const res = await fetch(`${config.baseUrl}/hotels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Api-key': config.apiKey,
        'X-Signature': generateSignature(config),
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.error('[HotelBeds] Search HTTP', res.status, await res.text().catch(() => ''));
      return [];
    }

    const data = await res.json();
    return normalizeHotelBedsResponse(data);
  } catch (err) {
    console.error('[HotelBeds] Search error:', err.message);
    return [];
  }
}

function normalizeHotelBedsResponse(response) {
  const hotels = response.hotels?.hotels || [];
  return hotels.map((h, idx) => {
    const cheapestRoom = h.rooms?.[0]?.rates?.[0] || {};
    const allRooms = (h.rooms || []).map(r => ({
      name: r.name || 'Standard Room',
      code: r.code,
      rates: (r.rates || []).map(rate => ({
        rateKey: rate.rateKey,
        rateClass: rate.rateClass,
        rateType: rate.rateType,
        net: parseFloat(rate.net || 0),
        sellingRate: parseFloat(rate.sellingRate || rate.net || 0),
        boardName: rate.boardName || '',
        cancellationPolicies: rate.cancellationPolicies || [],
        rooms: rate.rooms || 1,
        adults: rate.adults || 1,
        children: rate.children || 0,
      })),
    }));

    return {
      id: `hb-${h.code || idx}`,
      source: 'hotelbeds',
      name: h.name || '',
      city: h.destinationName || h.destinationCode || '',
      country: h.countryCode || '',
      address: '',
      starRating: parseInt(h.categoryCode?.replace(/[^0-9]/g, '')) || 0,
      userRating: null,
      reviewCount: 0,
      pricePerNight: parseFloat(cheapestRoom.net || cheapestRoom.sellingRate || 0),
      currency: response.hotels?.currency || 'BDT',
      images: (h.images || []).map(img => `https://photos.hotelbeds.com/giata/${img.path}`),
      amenities: [],
      description: '',
      rooms: allRooms,
      latitude: h.latitude || null,
      longitude: h.longitude || null,
      _hotelbedsCode: h.code,
    };
  });
}

async function getHotelDetails(code) {
  const config = await getHotelBedsConfig();
  if (!config) return null;

  try {
    const res = await fetch(`${config.baseUrl}/hotels/${code}/details`, {
      headers: {
        'Accept': 'application/json',
        'Api-key': config.apiKey,
        'X-Signature': generateSignature(config),
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const h = data.hotel || {};
    return {
      id: `hb-${h.code}`,
      source: 'hotelbeds',
      name: h.name?.content || h.name || '',
      city: h.city?.content || '',
      country: h.country?.description?.content || h.countryCode || '',
      address: h.address?.content || '',
      starRating: parseInt(h.categoryCode?.replace(/[^0-9]/g, '')) || 0,
      description: h.description?.content || '',
      images: (h.images || []).map(img => `https://photos.hotelbeds.com/giata/${img.path}`),
      amenities: (h.facilities || []).map(f => f.description?.content || f.facilityCode).filter(Boolean),
      latitude: h.coordinates?.latitude,
      longitude: h.coordinates?.longitude,
      phones: (h.phones || []).map(p => p.phoneNumber),
      email: h.email,
      web: h.web,
    };
  } catch (err) {
    console.error('[HotelBeds] Detail error:', err.message);
    return null;
  }
}

module.exports = { searchHotels, getHotelDetails, getHotelBedsConfig, clearHotelBedsConfigCache };
