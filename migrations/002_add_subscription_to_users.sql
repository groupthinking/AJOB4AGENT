-- Define the subscription plan enumeration for data integrity
CREATE TYPE subscription_plan AS ENUM ('PILOT', 'PRO', 'ENTERPRISE');

-- Add the new columns to the users table
ALTER TABLE users
ADD COLUMN plan subscription_plan NOT NULL DEFAULT 'PILOT',
ADD COLUMN application_credits INTEGER NOT NULL DEFAULT 5;