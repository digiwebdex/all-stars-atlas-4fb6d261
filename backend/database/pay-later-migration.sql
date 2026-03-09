-- Add payment_deadline column and pay_later payment method to bookings table
-- Run: mysql seventrip < database/pay-later-migration.sql

-- Add payment_deadline column (safe: ignores error if already exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'payment_deadline');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE bookings ADD COLUMN payment_deadline DATETIME DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Extend payment_method enum to include pay_later
ALTER TABLE bookings MODIFY COLUMN payment_method ENUM('bkash','nagad','rocket','card','bank_transfer','pay_later');

-- Extend payment_status enum to include pending
ALTER TABLE bookings MODIFY COLUMN payment_status ENUM('unpaid','paid','partial','refunded','pending') DEFAULT 'unpaid';

-- Index for deadline queries (safe: ignores error if already exists)
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND INDEX_NAME = 'idx_payment_deadline');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_payment_deadline ON bookings(payment_deadline)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
