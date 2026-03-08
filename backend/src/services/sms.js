// SMS Service — BulkSMSBD Integration
// Docs: https://bulksmsbd.com/developer/sms-api

const BULKSMS_API = 'https://bulksmsbd.net/api/smsapi';

async function sendSMS(to, message) {
  const apiKey = process.env.BULKSMS_API_KEY;
  const senderId = process.env.BULKSMS_SENDER_ID || 'SevenTrip';

  if (!apiKey) {
    console.warn('[SMS] BULKSMS_API_KEY not configured — skipping SMS to', to);
    return { success: false, reason: 'not_configured' };
  }

  // Normalize BD phone number
  let phone = String(to).replace(/[^0-9+]/g, '');
  if (phone.startsWith('0')) phone = '88' + phone;
  if (!phone.startsWith('880')) phone = '880' + phone;

  try {
    const url = `${BULKSMS_API}?api_key=${encodeURIComponent(apiKey)}&type=text&number=${phone}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.response_code === 202 || data.success) {
      console.log(`[SMS] Sent to ${phone}`);
      return { success: true, messageId: data.message_id };
    } else {
      console.error('[SMS] Failed:', data);
      return { success: false, reason: data.error_message || 'unknown' };
    }
  } catch (err) {
    console.error('[SMS] Error:', err.message);
    return { success: false, reason: err.message };
  }
}

// ============ TEMPLATES ============

function otpSMS(otp) {
  return `Your Seven Trip verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
}

function bookingConfirmSMS(bookingRef, type) {
  return `Seven Trip: Your ${type} booking ${bookingRef} is confirmed! View details in your dashboard. Thank you for choosing Seven Trip.`;
}

function bookingStatusSMS(bookingRef, status) {
  return `Seven Trip: Your booking ${bookingRef} status updated to "${status}". Check your dashboard for details.`;
}

function paymentReceivedSMS(amount, ref) {
  return `Seven Trip: Payment of ৳${amount} received (Ref: ${ref}). Thank you!`;
}

function visaStatusSMS(country, status) {
  return `Seven Trip: Your ${country} visa application is now "${status}". Check your dashboard for details.`;
}

function welcomeSMS(name) {
  return `Welcome to Seven Trip, ${name}! Your account is ready. Explore flights, hotels & more at seventrip.com.bd`;
}

function passwordResetSMS(otp) {
  return `Your Seven Trip password reset code: ${otp}. Valid for 10 minutes.`;
}

module.exports = {
  sendSMS,
  otpSMS,
  bookingConfirmSMS,
  bookingStatusSMS,
  paymentReceivedSMS,
  visaStatusSMS,
  welcomeSMS,
  passwordResetSMS,
};
