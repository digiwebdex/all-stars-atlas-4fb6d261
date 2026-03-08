-- Social Authentication Migration
-- Run this on your VPS: mysql -u seventrip_user -p seventrip < backend/database/social-auth-migration.sql

-- Add social login columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS social_provider VARCHAR(20) DEFAULT NULL COMMENT 'google, facebook, or NULL for email',
  ADD COLUMN IF NOT EXISTS social_provider_id VARCHAR(255) DEFAULT NULL COMMENT 'Provider user ID';

-- Add index for faster social lookups
CREATE INDEX IF NOT EXISTS idx_users_social ON users(social_provider, social_provider_id);

-- Ensure system_settings table can store social OAuth config
-- (already exists from migration.sql, just insert defaults)
INSERT IGNORE INTO system_settings (setting_key, setting_value, created_at, updated_at)
VALUES
  ('social_oauth_google', '{}', NOW(), NOW()),
  ('social_oauth_facebook', '{}', NOW(), NOW());

SELECT '✅ Social auth migration complete' AS status;
