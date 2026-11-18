// /api/notes/* : create, list, read, update and delete notes.
// Every query includes "user_id = $n" with the logged-in user's id, so a user
// can only ever see or change their own notes.
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

// Note ids are positive integers; anything else can't match a note.
function readId(req) {
  return /^\d{1,9}$/.test(req.params.id) ? Number(req.params.id) : null;
}

const toJson = (n) => ({
  id: n.id,
  title: n.title,
  body: n.body,
  createdAt: n.created_at,
  updatedAt: n.updated_at,
});

const notFound = (res) => res.status(404).json({ error: 'Note not found.' });

// List: newest first, with a short preview instead of the full text.
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, left(body, 160) AS preview, created_at, updated_at
       FROM notes WHERE user_id = $1
      ORDER BY updated_at DESC, id DESC`,
    [req.user.id],
  );
  res.json({
    notes: rows.map((n) => ({
      id: n.id,
      title: n.title,
      preview: n.preview,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    })),
  });
});

router.post('/', async (req, res) => {
  const note = readNote(req.body);
  if (note.error) return res.status(400).json({ error: note.error });
  const { rows } = await pool.query(
    `INSERT INTO notes (user_id, title, body) VALUES ($1, $2, $3)
     RETURNING id, title, body, created_at, updated_at`,
    [req.user.id, note.title, note.body],
  );
  res.status(201).json({ note: toJson(rows[0]) });
});

router.get('/:id', async (req, res) => {
  const id = readId(req);
  if (!id) return notFound(res);
  const { rows } = await pool.query(
    'SELECT id, title, body, created_at, updated_at FROM notes WHERE id = $1 AND user_id = $2',
    [id, req.user.id],
  );
  if (!rows[0]) return notFound(res);
  res.json({ note: toJson(rows[0]) });
});

router.put('/:id', async (req, res) => {
  const id = readId(req);
  if (!id) return notFound(res);
  const note = readNote(req.body);
  if (note.error) return res.status(400).json({ error: note.error });
  const { rows } = await pool.query(
    `UPDATE notes SET title = $1, body = $2, updated_at = now()
      WHERE id = $3 AND user_id = $4
     RETURNING id, title, body, created_at, updated_at`,
    [note.title, note.body, id, req.user.id],
  );
  if (!rows[0]) return notFound(res);
  res.json({ note: toJson(rows[0]) });
});

router.delete('/:id', async (req, res) => {
  const id = readId(req);
  if (!id) return notFound(res);
  const { rowCount } = await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [
    id,
    req.user.id,
  ]);
  if (!rowCount) return notFound(res);
  res.status(204).end();
});

export default router;
