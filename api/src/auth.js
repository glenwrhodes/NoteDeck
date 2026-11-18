// Authentication helpers: password hashing, the session cookie, and the
// middleware that protects routes.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'notedeck_session';
const SESSION_DAYS = 7;

export const hashPassword = (password) => bcrypt.hash(password, 12);
export const checkPassword = (password, hash) => bcrypt.compare(password, hash);

// Used when a username doesn't exist, so a failed login takes about as long
// either way and doesn't reveal which usernames are registered.
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

// The session is a signed token (JWT) in an httpOnly cookie. httpOnly means
// page JavaScript can't read it, which protects it from injected scripts.
export function setSessionCookie(res, user) {
  const token = jwt.sign({ sub: String(user.id), username: user.username }, JWT_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true', // turn on when served over HTTPS
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// Reads the cookie and, if it is valid, puts the user on req.user.
// Never fails the request: routes decide for themselves whether login is needed.
export async function loadUser(req, _res, next) {
  req.user = null;
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Check the account still exists (and is the same account): the database
    // may have been reset since the cookie was issued.
    const { rows } = await pool.query(
      'SELECT id, username, created_at FROM users WHERE id = $1 AND username = $2',
      [Number(payload.sub), payload.username],
    );
    req.user = rows[0] || null;
  } catch {
    req.user = null; // expired or tampered token: treat as logged out
  }
  next();
}

// Middleware for routes that need a logged-in user.
export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in first.' });
  next();
}
