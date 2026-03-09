// SSL Wireless — Mobile Recharge & Bill Payment Integration
// Reads credentials from system_settings table (api_ssl_recharge / api_bill_payment)
// Admin Panel → Settings → API Integrations → SSL Wireless / Bill Payment Gateway

const db = require('../config/db');

// ==================== RECHARGE ====================

let rechargeConfig = null;
let rechargeCacheTime = 0;

async function getRechargeConfig() {
  if (rechargeConfig && Date.now() - rechargeCacheTime < 300000) return rechargeConfig;
  try {
    const [rows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'api_ssl_recharge'");
    if (rows.length === 0 || !rows[0].setting_value) return null;
    const cfg = JSON.parse(rows[0].setting_value);
    if (cfg.enabled !== 'true' && cfg.enabled !== true) return null;
    if (!cfg.username || !cfg.password) return null;
    rechargeConfig = { apiUrl: (cfg.api_url || 'https://api.sslwireless.com/recharge').replace(/\/$/, ''), username: cfg.username, password: cfg.password };
    rechargeCacheTime = Date.now();
    return rechargeConfig;
  } catch (err) {
    console.error('[SSLRecharge] Config error:', err.message);
    return null;
  }
}

// Submit a mobile recharge via SSL Wireless
async function submitRecharge({ operator, phoneNumber, amount, type }) {
  const config = await getRechargeConfig();
  if (!config) return { success: false, provider: 'local', message: 'SSL Wireless not configured — using local processing' };

  // Normalize phone number
  let phone = String(phoneNumber).replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) phone = '88' + phone;
  if (!phone.startsWith('880')) phone = '880' + phone;

  try {
    const res = await fetch(`${config.apiUrl}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
        msisdn: phone,
        amount: parseFloat(amount),
        operator_code: mapOperatorCode(operator),
        connection_type: type === 'postpaid' ? 'postpaid' : 'prepaid',
        reference: `ST-${Date.now()}`,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    if (data.status === 'success' || data.status_code === '200') {
      return { success: true, provider: 'ssl_wireless', transactionId: data.transaction_id, message: data.message || 'Recharge successful' };
    } else {
      return { success: false, provider: 'ssl_wireless', message: data.message || data.error || 'Recharge failed' };
    }
  } catch (err) {
    console.error('[SSLRecharge] Error:', err.message);
    return { success: false, provider: 'ssl_wireless', message: err.message };
  }
}

function mapOperatorCode(operator) {
  const map = { grameenphone: 'GP', robi: 'RB', banglalink: 'BL', airtel: 'AT', teletalk: 'TT' };
  return map[operator?.toLowerCase()] || operator?.toUpperCase() || '';
}

// ==================== BILL PAYMENT ====================

let billConfig = null;
let billCacheTime = 0;

async function getBillPayConfig() {
  if (billConfig && Date.now() - billCacheTime < 300000) return billConfig;
  try {
    const [rows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'api_bill_payment'");
    if (rows.length === 0 || !rows[0].setting_value) return null;
    const cfg = JSON.parse(rows[0].setting_value);
    if (cfg.enabled !== 'true' && cfg.enabled !== true) return null;
    if (!cfg.merchant_id || !cfg.api_key) return null;
    billConfig = { apiUrl: (cfg.api_url || 'https://api.pgwbd.com/billpay').replace(/\/$/, ''), merchantId: cfg.merchant_id, apiKey: cfg.api_key };
    billCacheTime = Date.now();
    return billConfig;
  } catch (err) {
    console.error('[BillPay] Config error:', err.message);
    return null;
  }
}

async function submitBillPayment({ billerId, accountNumber, amount, month }) {
  const config = await getBillPayConfig();
  if (!config) return { success: false, provider: 'local', message: 'Bill payment gateway not configured — using local processing' };

  try {
    const res = await fetch(`${config.apiUrl}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Merchant-ID': config.merchantId,
      },
      body: JSON.stringify({
        biller_id: billerId,
        account_number: accountNumber,
        amount: parseFloat(amount),
        month: month || new Date().toISOString().slice(0, 7),
        reference: `ST-BILL-${Date.now()}`,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    if (data.status === 'success' || data.status_code === '200') {
      return { success: true, provider: 'pgwbd', transactionId: data.transaction_id, message: data.message || 'Bill payment successful' };
    } else {
      return { success: false, provider: 'pgwbd', message: data.message || 'Bill payment failed' };
    }
  } catch (err) {
    console.error('[BillPay] Error:', err.message);
    return { success: false, provider: 'pgwbd', message: err.message };
  }
}

function clearRechargeConfigCache() { rechargeConfig = null; rechargeCacheTime = 0; }
function clearBillPayConfigCache() { billConfig = null; billCacheTime = 0; }

module.exports = { submitRecharge, submitBillPayment, getRechargeConfig, getBillPayConfig, clearRechargeConfigCache, clearBillPayConfigCache };
