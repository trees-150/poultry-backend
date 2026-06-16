-- Normalize emails by trimming and lowercasing
-- WARNING: creating a unique index may fail if duplicate normalized emails exist.

BEGIN;

-- Trim and lowercase users emails
UPDATE users SET email = lower(trim(email)) WHERE email IS NOT NULL;

-- Trim and lowercase password_resets emails
UPDATE password_resets SET email = lower(trim(email)) WHERE email IS NOT NULL;

-- Attempt to create a unique index on lower(email). This will fail if duplicates exist.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

COMMIT;

-- If the index creation fails due to duplicates, run the Node script at
-- backend/scripts/normalize_emails.js to inspect and resolve duplicates.
