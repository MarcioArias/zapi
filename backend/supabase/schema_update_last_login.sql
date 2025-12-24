-- Add last_login to users
ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;
