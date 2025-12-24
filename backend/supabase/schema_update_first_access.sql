-- Add first_access_token to users table
ALTER TABLE users ADD COLUMN first_access_token VARCHAR(50);
