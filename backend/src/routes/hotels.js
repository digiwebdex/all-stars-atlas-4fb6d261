const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { notifyBookingConfirm } = require('../services/notify');
const { safeJsonParse } = require('../utils/json');

const router = express.Router();

// GET /hotels/search
router.get('/search', async (req, res) => {
  try {
    const { city, checkIn, checkOut, minPrice, maxPrice, starRating, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM hotels WHERE available = 1';
    const params = [];

    if (city) { sql += ' AND city LIKE ?'; params.push(`%${city}%`); }
    if (minPrice) { sql += ' AND price_per_night >= ?'; params.push(parseFloat(minPrice)); }
    if (maxPrice) { sql += ' AND price_per_night <= ?'; params.push(parseFloat(maxPrice)); }
    if (starRating) { sql += ' AND star_rating >= ?'; params.push(parseInt(starRating)); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [countResult] = await db.query(sql.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
    sql += ` ORDER BY user_rating DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(sql, params);
    const data = rows.map(r => ({
      id: r.id, name: r.name, city: r.city, country: r.country, address: r.address,
      starRating: r.star_rating, userRating: r.user_rating ? parseFloat(r.user_rating) : null,
      reviewCount: r.review_count, pricePerNight: parseFloat(r.price_per_night), currency: r.currency,
      images: safeJsonParse(r.images, []), amenities: safeJsonParse(r.amenities, []), description: r.description,
    }));

    res.json({ data, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(countResult[0].total / parseInt(limit)) });
  } catch (err) {
    console.error('Hotel search error:', err);
    res.status(500).json({ message: 'Something went wrong', status: 500 });
  }
});

// GET /hotels/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM hotels WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Hotel not found', status: 404 });
    const r = rows[0];
    res.json({
      id: r.id, name: r.name, city: r.city, country: r.country, address: r.address,
      starRating: r.star_rating, userRating: r.user_rating ? parseFloat(r.user_rating) : null,
      reviewCount: r.review_count, pricePerNight: parseFloat(r.price_per_night), currency: r.currency,
      images: safeJsonParse(r.images, []), amenities: safeJsonParse(r.amenities, []),
      description: r.description, latitude: r.latitude, longitude: r.longitude,
    });
  } catch (err) {
    console.error('Hotel detail error:', err);
    res.status(500).json({ message: 'Something went wrong', status: 500 });
  }
});

// POST /hotels/book
router.post('/book', authenticate, async (req, res) => {
  try {
    const { hotelId, checkIn, checkOut, rooms, guests, contactInfo, paymentMethod } = req.body;
    const bookingId = uuidv4();
    const bookingRef = `ST-HT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random()*999)).padStart(3,'0')}`;

    const [hotels] = await db.query('SELECT * FROM hotels WHERE id = ?', [hotelId]);
    const nights = checkIn && checkOut ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000)) : 1;
    const totalAmount = hotels.length > 0 ? parseFloat(hotels[0].price_per_night) * nights * (rooms || 1) : 0;

    await db.query(
      `INSERT INTO bookings (id, user_id, booking_type, booking_ref, status, total_amount, payment_method, payment_status, details, passenger_info, contact_info)
       VALUES (?, ?, 'hotel', ?, 'confirmed', ?, ?, 'paid', ?, ?, ?)`,
      [bookingId, req.user.sub, bookingRef, totalAmount, paymentMethod || 'card',
       JSON.stringify({ hotel: hotels[0]?.name, checkIn, checkOut, rooms }), JSON.stringify(guests || []), JSON.stringify(contactInfo || {})]
    );

    await db.query(
      `INSERT INTO transactions (id, user_id, booking_id, type, amount, status, payment_method, reference, description)
       VALUES (?, ?, ?, 'payment', ?, 'completed', ?, ?, ?)`,
      [uuidv4(), req.user.sub, bookingId, totalAmount, paymentMethod || 'card', bookingRef, `Hotel booking at ${hotels[0]?.name || 'Hotel'}`]
    );

    notifyBookingConfirm(req.user.sub, { bookingRef, type: 'Hotel', amount: totalAmount }).catch(console.error);
    res.status(201).json({ id: bookingId, bookingRef, status: 'confirmed', totalAmount, currency: 'BDT', bookingType: 'hotel', createdAt: new Date().toISOString() });
  } catch (err) {
    console.error('Hotel booking error:', err);
    res.status(500).json({ message: 'Something went wrong', status: 500 });
  }
});

module.exports = router;
