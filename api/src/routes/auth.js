// /api/auth/* : register, log in, log out, and "who am I".
import { Router } from 'express';
import { pool } from '../db.js';
import {
  hashPassword,
  checkPassword,
  DUMMY_HASH,
  setSessionCookie,
  clearSessionCookie,
} from '../auth.js';

const router = Router();

const USERNAME_RE = /^[a-z0-9_.-]{3,32}$/;

function readCredentials(body) {
  const username = String(body?.username ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  return { username, password };
}

const publicUser = (u) => ({ id: u.id, username: u.username, createdAt: u.created_at });

router.post('/register', async (req, res) => {
  const { username, password } = readCredentials(req.body);
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({
      error: 'Username must be 3-32 characters: letters, numbers, dot, dash or underscore.',
    });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be 8-128 characters.' });
  }

  const hash = await hashPassword(password);
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [username, hash],
    );
    setSessionCookie(res, rows[0]);
    res.status(201).json({ user: publicUser(rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      // 23505 = unique_violation: the username is taken
      return res.status(409).json({ error: 'That username is already taken.' });
    }
    throw err;
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = readCredentials(req.body);
  const { rows } = await pool.query(
    'SELECT id, username, password_hash, created_at FROM users WHERE username = $1',
    [username],
  );
  const user = rows[0];
  const ok = await checkPassword(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  setSessionCookie(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// Returns the logged-in user, or { user: null } when nobody is logged in.
router.get('/me', (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});

export default router;
