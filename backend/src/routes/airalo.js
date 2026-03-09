// Airalo eSIM API Integration
// Reads credentials from system_settings table (api_airalo)
// Admin Panel → Settings → API Integrations → Airalo

const db = require('../config/db');

let cachedConfig = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getAiraloConfig() {
  if (cachedConfig && Date.now() - cacheTime < CACHE_TTL) return cachedConfig;
  try {
    const [rows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'api_airalo'");
    if (rows.length === 0 || !rows[0].setting_value) return null;
    const cfg = JSON.parse(rows[0].setting_value);
    if (cfg.enabled !== 'true' && cfg.enabled !== true) return null;

    const isProd = cfg.environment === 'production';
    const baseUrl = isProd ? (cfg.prod_url || 'https://partners-api.airalo.com/v2') : (cfg.sandbox_url || 'https://sandbox-partners-api.airalo.com/v2');
    const token = isProd ? cfg.prod_key : cfg.sandbox_key;
    if (!token) return null;

    cachedConfig = { baseUrl: baseUrl.replace(/\/$/, ''), token, environment: cfg.environment };
    cacheTime = Date.now();
    return cachedConfig;
  } catch (err) {
    console.error('[Airalo] Config error:', err.message);
    return null;
  }
}

function clearAiraloConfigCache() { cachedConfig = null; cacheTime = 0; }

async function airaloRequest(path, method = 'GET', body = null) {
  const config = await getAiraloConfig();
  if (!config) throw new Error('Airalo not configured');

  const opts = {
    method,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${config.token}`,
    },
    signal: AbortSignal.timeout(20000),
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${config.baseUrl}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Airalo ${res.status}: ${text}`);
  }
  return res.json();
}

// Get all available countries with eSIM packages
async function getCountries() {
  try {
    const data = await airaloRequest('/countries');
    return (data.data || []).map(c => ({
      code: c.slug || c.country_code,
      name: c.title || c.name,
      flag: c.image?.url || null,
      packageCount: c.package_count || 0,
    }));
  } catch (err) {
    console.error('[Airalo] Countries error:', err.message);
    return [];
  }
}

// Get eSIM packages for a specific country
async function getPackages(countrySlug) {
  try {
    const data = await airaloRequest(`/countries/${countrySlug}`);
    const packages = data.data?.packages || data.data?.operators?.[0]?.packages || [];
    return packages.map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      data: p.data,
      validity: p.validity || p.day,
      price: parseFloat(p.price || 0),
      currency: 'USD',
      operator: p.operator?.title || p.operator_title || '',
      operatorLogo: p.operator?.image?.url || null,
      type: p.type || 'sim', // sim, esim
      isUnlimited: p.is_unlimited || false,
      speed: p.speed || [],
      amount: p.amount || p.data,
    }));
  } catch (err) {
    console.error('[Airalo] Packages error:', err.message);
    return [];
  }
}

// Place an eSIM order
async function placeOrder({ packageId, quantity = 1, description }) {
  try {
    const data = await airaloRequest('/orders', 'POST', {
      package_id: packageId,
      quantity,
      type: 'sim',
      description: description || 'Seven Trip eSIM Order',
    });
    const order = data.data || {};
    const sims = order.sims || [];
    return {
      orderId: order.id,
      status: order.status,
      totalPrice: order.price,
      currency: order.currency || 'USD',
      sims: sims.map(s => ({
        iccid: s.iccid,
        lpaCode: s.lpa || s.qrcode_url,
        qrCodeUrl: s.qrcode_url || s.qrcode,
        apnType: s.apn_type,
        apnValue: s.apn_value,
        directApple: s.direct_apple_installation_url || null,
        manualCode: s.matching_id || null,
        instructions: s.is_roaming ? 'Enable Data Roaming after installation' : 'eSIM will activate automatically',
      })),
    };
  } catch (err) {
    console.error('[Airalo] Order error:', err.message);
    throw err;
  }
}

// Get order status
async function getOrder(orderId) {
  try {
    const data = await airaloRequest(`/orders/${orderId}`);
    return data.data || null;
  } catch (err) {
    console.error('[Airalo] Get order error:', err.message);
    return null;
  }
}

module.exports = { getCountries, getPackages, placeOrder, getOrder, getAiraloConfig, clearAiraloConfigCache };
