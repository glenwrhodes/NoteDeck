// Database access: one shared connection pool plus the schema setup.
import pg from 'pg';

// Inside Docker Compose, DATABASE_URL points at the host name "db", which is
// the name of the Postgres *service* in docker-compose.yml. Compose's built-in
// DNS turns that name into the db container's IP address on the private network.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Create the tables if they don't exist yet. This runs every time the API
// starts, and is safe to repeat ("IF NOT EXISTS"). The data itself lives in a
// Docker volume, so it is still there after the containers are recreated.
// Postgres runs a multi-statement string like this as ONE transaction, so the
// upgrade steps below either all happen or none do.
//
// Note numbers: notes.id counts across ALL users, so showing it would hint at
// how many notes other people have. Each note therefore also gets a per-user
// `number` (1, 2, 3... for each user), taken from users.note_counter. The API
// and the UI only ever use that number; the global id stays internal.
// For the same reason the session token names a user by a random public_id
// (a UUID), not by users.id.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    public_id     UUID        NOT NULL DEFAULT gen_random_uuid(),
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    note_counter  INTEGER     NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS notes (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    number     INTEGER     NOT NULL,
    title      TEXT        NOT NULL,
    body       TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Upgrade a database created by v1, before per-user numbers existed.
  ALTER TABLE users ADD COLUMN IF NOT EXISTS note_counter INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE notes ADD COLUMN IF NOT EXISTS number INTEGER;
  UPDATE notes SET number = numbered.n
    FROM (SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY id) AS n
            FROM notes WHERE number IS NULL) AS numbered
   WHERE notes.id = numbered.id;
  UPDATE users SET note_counter = top.n
    FROM (SELECT user_id, max(number) AS n FROM notes GROUP BY user_id) AS top
   WHERE users.id = top.user_id AND users.note_counter < top.n;
  ALTER TABLE notes ALTER COLUMN number SET NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS notes_user_number_idx ON notes (user_id, number);
  CREATE INDEX IF NOT EXISTS notes_user_updated_idx ON notes (user_id, updated_at DESC);
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Compose already waits for the db health check before starting the API, but
// retrying here makes the API robust if the database restarts or is slow.
export async function migrate({ attempts = 10 } = {}) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await pool.query(SCHEMA);
      return;
    } catch (err) {
      if (i === attempts) throw err;
      console.log(`Database not ready (${err.code || err.message}), retry ${i}/${attempts}...`);
      await sleep(2000);
    }
  }
}
