import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { api } from '../lib/api.js';
import { stamp, recordCode } from '../lib/format.js';
import ScreenHeader from '../components/ScreenHeader.jsx';
import Pill from '../components/Pill.jsx';
import { Alert, Loading, Notice } from '../components/Feedback.jsx';

export default function NoteView() {
  const { number } = useParams(); // the :number part of /notes/:number
  const navigate = useNavigate();
  const location = useLocation();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false); // two-step delete
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    setNote(null);
    setError('');
    setConfirming(false);
    api
      .getNote(number)
      .then((data) => !ignore && setNote(data.note))
      .catch((err) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [number]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteNote(number);
      navigate('/notes', { state: { flash: `Record ${recordCode(number)} deleted` } });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (error && !note) {
    return (
      <>
        <ScreenHeader code={`${recordCode(id)} // Read`} title="Record not found" />
        <Alert>{error}</Alert>
        <Pill to="/notes" color="lilac">
          Back to notes
        </Pill>
      </>
    );
  }
  if (!note) return <Loading label="Retrieving record" />;

  return (
    <>
      <ScreenHeader code={`${recordCode(note.id)} // Read`} title={note.title}>
        {confirming ? (
          <>
            <Pill color="red" className="pill--alert" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Confirm delete'}
            </Pill>
            <Pill color="lilac" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </Pill>
          </>
        ) : (
          <>
            <Pill to={`/notes/${note.id}/edit`} color="sky">
              Edit
            </Pill>
            <Pill color="red" onClick={() => setConfirming(true)}>
              Delete
            </Pill>
          </>
        )}
      </ScreenHeader>

      <Notice>{location.state?.flash}</Notice>
      <Alert>{error}</Alert>

      <dl className="meta">
        <div>
          <dt>Created</dt>
          <dd>{stamp(note.createdAt)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{stamp(note.updatedAt)}</dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{note.body.length.toLocaleString()} chars</dd>
        </div>
      </dl>

      <article className="readout">
        {note.body ? (
          <p className="readout__text">{note.body}</p>
        ) : (
          <p className="readout__text readout__text--empty">This note has no text yet.</p>
        )}
      </article>

      <div className="form__actions page-foot">
        <Pill to="/notes" color="lilac">
          &larr; All notes
        </Pill>
      </div>
    </>
  );
}
