// Email Service — Resend Integration
// Docs: https://resend.com/docs/api-reference/emails/send-email

const RESEND_API = 'https://api.resend.com/emails';

async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Seven Trip <noreply@seventrip.com.bd>';

  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY not configured — skipping email to', to);
    return { success: false, reason: 'not_configured' };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || undefined,
        text: text || undefined,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      console.log(`[EMAIL] Sent to ${to}: ${subject}`);
      return { success: true, id: data.id };
    } else {
      console.error('[EMAIL] Failed:', data);
      return { success: false, reason: data.message || 'unknown' };
    }
  } catch (err) {
    console.error('[EMAIL] Error:', err.message);
    return { success: false, reason: err.message };
  }
}

// ============ EMAIL TEMPLATES ============

function otpEmail(name, otp) {
  return {
    subject: 'Your Seven Trip Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0ea5e9;">
          <h1 style="color: #0ea5e9; margin: 0;">Seven Trip</h1>
        </div>
        <div style="padding: 30px 0;">
          <p>Hi ${name || 'there'},</p>
          <p>Your verification code is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; background: #f0f9ff; padding: 15px 30px; border-radius: 8px;">${otp}</span>
          </div>
          <p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Seven Trip. All rights reserved.</p>
        </div>
      </div>`,
  };
}

function welcomeEmail(name) {
  return {
    subject: 'Welcome to Seven Trip! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0ea5e9;">
          <h1 style="color: #0ea5e9; margin: 0;">Seven Trip</h1>
        </div>
        <div style="padding: 30px 0;">
          <h2>Welcome aboard, ${name}! 🎉</h2>
          <p>Your Seven Trip account is ready. Here's what you can do:</p>
          <ul style="line-height: 2;">
            <li>✈️ Search & book flights at the best prices</li>
            <li>🏨 Find perfect hotels worldwide</li>
            <li>🏝️ Explore holiday packages</li>
            <li>🛂 Apply for visas hassle-free</li>
            <li>🏥 Book medical tourism trips</li>
            <li>🚗 Rent cars for your journey</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://seventrip.com.bd'}" style="background: #0ea5e9; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">Start Exploring</a>
          </div>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Seven Trip. All rights reserved.</p>
        </div>
      </div>`,
  };
}

function bookingConfirmEmail(name, booking) {
  return {
    subject: `Booking Confirmed: ${booking.bookingRef}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0ea5e9;">
          <h1 style="color: #0ea5e9; margin: 0;">Seven Trip</h1>
        </div>
        <div style="padding: 30px 0;">
          <h2>Booking Confirmed! ✅</h2>
          <p>Hi ${name},</p>
          <p>Your booking has been confirmed. Here are the details:</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #64748b;">Booking Ref</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${booking.bookingRef}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Type</td><td style="padding: 8px 0; text-align: right;">${booking.type}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Amount</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">৳${booking.amount}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Status</td><td style="padding: 8px 0; text-align: right;"><span style="background: #dcfce7; color: #16a34a; padding: 2px 10px; border-radius: 12px;">Confirmed</span></td></tr>
            </table>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://seventrip.com.bd'}/dashboard/bookings" style="background: #0ea5e9; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Booking</a>
          </div>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Seven Trip. All rights reserved.</p>
        </div>
      </div>`,
  };
}

function bookingStatusEmail(name, bookingRef, status) {
  const colors = { confirmed: '#16a34a', cancelled: '#dc2626', pending: '#f59e0b', processing: '#3b82f6' };
  return {
    subject: `Booking ${bookingRef} — Status: ${status}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0ea5e9;">
          <h1 style="color: #0ea5e9; margin: 0;">Seven Trip</h1>
        </div>
        <div style="padding: 30px 0;">
          <p>Hi ${name},</p>
          <p>Your booking <strong>${bookingRef}</strong> status has been updated to:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 18px; font-weight: bold; color: ${colors[status] || '#64748b'}; background: #f0f9ff; padding: 10px 25px; border-radius: 20px;">${status.toUpperCase()}</span>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://seventrip.com.bd'}/dashboard/bookings" style="background: #0ea5e9; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none;">View Details</a>
          </div>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Seven Trip. All rights reserved.</p>
        </div>
      </div>`,
  };
}

function paymentReceivedEmail(name, amount, ref) {
  return {
    subject: `Payment Received: ৳${amount}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0ea5e9;">
          <h1 style="color: #0ea5e9; margin: 0;">Seven Trip</h1>
        </div>
        <div style="padding: 30px 0;">
          <h2>Payment Received ✅</h2>
          <p>Hi ${name},</p>
          <p>We've received your payment of <strong>৳${amount}</strong>.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0;">Reference: <strong>${ref}</strong></p>
          </div>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Seven Trip. All rights reserved.</p>
        </div>
      </div>`,
  };
}

function visaStatusEmail(name, country, status, notes) {
  return {
    subject: `Visa Application Update: ${country} — ${status}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0ea5e9;">
          <h1 style="color: #0ea5e9; margin: 0;">Seven Trip</h1>
        </div>
        <div style="padding: 30px 0;">
          <h2>Visa Application Update</h2>
          <p>Hi ${name},</p>
          <p>Your <strong>${country}</strong> visa application status has been updated:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 18px; font-weight: bold; padding: 10px 25px; border-radius: 20px; background: ${status === 'approved' ? '#dcfce7' : status === 'rejected' ? '#fef2f2' : '#f0f9ff'}; color: ${status === 'approved' ? '#16a34a' : status === 'rejected' ? '#dc2626' : '#3b82f6'};">${status.toUpperCase()}</span>
          </div>
          ${notes ? `<p style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9;"><strong>Note:</strong> ${notes}</p>` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://seventrip.com.bd'}/dashboard/bookings" style="background: #0ea5e9; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none;">View Application</a>
          </div>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Seven Trip. All rights reserved.</p>
        </div>
      </div>`,
  };
}

function contactAutoReplyEmail(name) {
  return {
    subject: 'We received your message — Seven Trip',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0ea5e9;">
          <h1 style="color: #0ea5e9; margin: 0;">Seven Trip</h1>
        </div>
        <div style="padding: 30px 0;">
          <p>Hi ${name},</p>
          <p>Thank you for contacting Seven Trip! We've received your message and will get back to you within <strong>24 hours</strong>.</p>
          <p>If your matter is urgent, call us at <strong>+880 1234-567890</strong>.</p>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Seven Trip. All rights reserved.</p>
        </div>
      </div>`,
  };
}

function adminNotifyEmail(subject, message) {
  return {
    subject: `[Admin] ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #ef4444;">
          <h1 style="color: #ef4444; margin: 0;">Seven Trip Admin</h1>
        </div>
        <div style="padding: 30px 0;">
          <h2>${subject}</h2>
          <p>${message}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://seventrip.com.bd'}/admin" style="background: #ef4444; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none;">Go to Admin Panel</a>
          </div>
        </div>
      </div>`,
  };
}

function passwordResetEmail(name, otp) {
  return {
    subject: 'Password Reset — Seven Trip',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0ea5e9;">
          <h1 style="color: #0ea5e9; margin: 0;">Seven Trip</h1>
        </div>
        <div style="padding: 30px 0;">
          <p>Hi ${name || 'there'},</p>
          <p>You requested a password reset. Use this code:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; background: #f0f9ff; padding: 15px 30px; border-radius: 8px;">${otp}</span>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #6b7280; font-size: 13px;">If you didn't request this, please ignore this email.</p>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Seven Trip. All rights reserved.</p>
        </div>
      </div>`,
  };
}

module.exports = {
  sendEmail,
  otpEmail,
  welcomeEmail,
  bookingConfirmEmail,
  bookingStatusEmail,
  paymentReceivedEmail,
  visaStatusEmail,
  contactAutoReplyEmail,
  adminNotifyEmail,
  passwordResetEmail,
};
