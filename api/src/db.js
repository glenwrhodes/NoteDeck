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
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS notes (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT        NOT NULL,
    body       TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

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
