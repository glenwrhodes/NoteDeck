// /api/notes/* : create, list, read, update and delete notes.
//
// Notes are addressed by their per-user number (/api/notes/1 is YOUR first
// note), never by the database's global id. Every query includes
// "user_id = <logged-in user>", so a user can only ever see or change their
// own notes, and nothing in a response reveals anything about other users.
import { Router } from 'express';
import { pool } from '../db.js';
import { requireUser } from '../auth.js';

const router = Router();
router.use(requireUser); // every route below needs a logged-in user

const MAX_TITLE = 200;
const MAX_BODY = 50_000;

function readNote(body) {
  const title = String(body?.title ?? '').trim();
  const text = String(body?.body ?? '');
  if (!title) return { error: 'A note needs a title.' };
  if (title.length > MAX_TITLE) return { error: `Title must be ${MAX_TITLE} characters or fewer.` };
  if (text.length > MAX_BODY) return { error: `Note text must be ${MAX_BODY} characters or fewer.` };
  return { title, body: text };
}

// Note numbers are positive integers; anything else can't match a note.
function readNumber(req) {
  return /^\d{1,9}$/.test(req.params.number) ? Number(req.params.number) : null;
}

const COLUMNS = 'number, title, body, created_at, updated_at';

const toJson = (n) => ({
  number: n.number,
  title: n.title,
  body: n.body,
  createdAt: n.created_at,
  updatedAt: n.updated_at,
});

const notFound = (res) => res.status(404).json({ error: 'Note not found.' });

// List: newest first, with a short preview instead of the full text.
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT number, title, left(body, 160) AS preview, created_at, updated_at
       FROM notes WHERE user_id = $1
      ORDER BY updated_at DESC, number DESC`,
    [req.user.id],
  );
  res.json({
    notes: rows.map((n) => ({
      number: n.number,
      title: n.title,
      preview: n.preview,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    })),
  });
});

// Create. One statement does both steps: bump this user's counter, then
// insert the note with the new number. Updating the user row locks it, so two
// notes saved at the same moment still get different numbers. Numbers are
// never reused, even after a note is deleted.
router.post('/', async (req, res) => {
  const note = readNote(req.body);
  if (note.error) return res.status(400).json({ error: note.error });
  const { rows } = await pool.query(
    `WITH counter AS (
       UPDATE users SET note_counter = note_counter + 1 WHERE id = $1 RETURNING note_counter
     )
     INSERT INTO notes (user_id, number, title, body)
     SELECT $1, note_counter, $2, $3 FROM counter
     RETURNING ${COLUMNS}`,
    [req.user.id, note.title, note.body],
  );
  res.status(201).json({ note: toJson(rows[0]) });
});

router.get('/:number', async (req, res) => {
  const number = readNumber(req);
  if (!number) return notFound(res);
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM notes WHERE user_id = $1 AND number = $2`, [
    req.user.id,
    number,
  ]);
  if (!rows[0]) return notFound(res);
  res.json({ note: toJson(rows[0]) });
});

router.put('/:number', async (req, res) => {
  const number = readNumber(req);
  if (!number) return notFound(res);
  const note = readNote(req.body);
  if (note.error) return res.status(400).json({ error: note.error });
  const { rows } = await pool.query(
    `UPDATE notes SET title = $1, body = $2, updated_at = now()
      WHERE user_id = $3 AND number = $4
     RETURNING ${COLUMNS}`,
    [note.title, note.body, req.user.id, number],
  );
  if (!rows[0]) return notFound(res);
  res.json({ note: toJson(rows[0]) });
});

router.delete('/:number', async (req, res) => {
  const number = readNumber(req);
  if (!number) return notFound(res);
  const { rowCount } = await pool.query('DELETE FROM notes WHERE user_id = $1 AND number = $2', [
    req.user.id,
    number,
  ]);
  if (!rowCount) return notFound(res);
  res.status(204).end();
});

export default router;
