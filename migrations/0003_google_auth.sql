-- SQLite migration: add google columns to users table (using create-copy-rename pattern)
-- SQLite doesn't support ALTER TABLE ADD COLUMN UNIQUE, so we create a new table

-- Step 1: Create new table with google columns
CREATE TABLE users_new (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  google_sub    TEXT UNIQUE,
  avatar        TEXT NOT NULL DEFAULT '',
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Step 2: Copy existing data (google_sub will be NULL for existing users, avatar gets default '')
INSERT INTO users_new (id, email, password_hash, name, google_sub, avatar, created_at)
SELECT id, email, password_hash, name, NULL, '', created_at FROM users;

-- Step 3: Drop old table
DROP TABLE users;

-- Step 3: Rename new table
ALTER TABLE users_new RENAME TO users;

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email COLLATE NOCASE);
