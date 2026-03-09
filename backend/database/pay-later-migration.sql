-- Add payment_deadline column and pay_later payment method to bookings table
-- Run: mysql -u seventrip_user -p seventrip < database/pay-later-migration.sql

-- Add payment_deadline column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_deadline DATETIME DEFAULT NULL;

-- Extend payment_method enum to include pay_later
ALTER TABLE bookings MODIFY COLUMN payment_method ENUM('bkash','nagad','rocket','card','bank_transfer','pay_later');

-- Extend payment_status enum to include pending
ALTER TABLE bookings MODIFY COLUMN payment_status ENUM('unpaid','paid','partial','refunded','pending') DEFAULT 'unpaid';

-- Index for deadline queries (finding expired bookings)
CREATE INDEX IF NOT EXISTS idx_payment_deadline ON bookings(payment_deadline);
