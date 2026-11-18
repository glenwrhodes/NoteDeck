// NoteDeck API: the entry point.
//
// Express is a small web framework for Node.js. An Express app is a list of
// "middleware" functions. Each request passes through them in order, and each
// one can read the request, change it, send a response, or call next() to hand
// it on. Routers group the routes for one part of the API.
import os from 'node:os';
import express from 'express';
import cookieParser from 'cookie-parser';
import { pool, migrate } from './db.js';
import { loadUser, requireUser } from './auth.js';
import authRoutes from './routes/auth.js';
import noteRoutes from './routes/notes.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;
const startedAt = Date.now();
const app = express();

// 1. Middleware that runs for every request.
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' })); // parse JSON request bodies into req.body
app.use(cookieParser()); // parse the Cookie header into req.cookies
app.use(loadUser); // look up the logged-in user, if any
app.use((req, res, next) => {
  // tiny request log, visible with: docker compose logs -f api
  const t0 = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t0}ms`));
  next();
});

// 2. Routes.
// Health check: used by Docker (see docker-compose.yml) to know the API is up.
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

// System status for the STATUS screen: shows the containers working together.
app.get('/api/status', requireUser, async (req, res) => {
  const t0 = Date.now();
  const { rows } = await pool.query(
    `SELECT current_setting('server_version') AS version,
            (SELECT count(*)::int FROM notes WHERE user_id = $1) AS note_count`,
    [req.user.id],
  );
  res.json({
    api: {
      // Inside a container, the hostname is the container's short ID.
      hostname: os.hostname(),
      node: process.version,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    },
    db: {
      host: new URL(process.env.DATABASE_URL).hostname,
      version: rows[0].version,
      latencyMs: Date.now() - t0,
    },
    user: {
      username: req.user.username,
      joined: req.user.created_at,
      noteCount: rows[0].note_count,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

// 3. Anything else under /api is unknown.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

// 4. Error handler: Express 5 sends errors thrown in async routes here.
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

await migrate();
const server = app.listen(PORT, () => {
  console.log(`NoteDeck API listening on port ${PORT}`);
});

// `docker compose stop` sends SIGTERM. Close cleanly instead of waiting to be killed.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(() => pool.end().then(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
