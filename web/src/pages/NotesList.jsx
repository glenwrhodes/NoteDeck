import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { api } from '../lib/api.js';
import { stamp, recordCode } from '../lib/format.js';
import ScreenHeader from '../components/ScreenHeader.jsx';
import Pill from '../components/Pill.jsx';
import { Alert, Loading, Notice } from '../components/Feedback.jsx';

// The tab colours cycle down the list.
const TAB_COLORS = ['sky', 'peach', 'lilac', 'apricot'];

export default function NotesList() {
  const location = useLocation();
  const [notes, setNotes] = useState(null); // null = still loading
  const [error, setError] = useState('');

  // An effect runs after the component appears on screen: a good place to
  // fetch data. The cleanup function stops a late response from updating a
  // page the user has already left.
  useEffect(() => {
    let ignore = false;
    api
      .listNotes()
      .then((data) => !ignore && setNotes(data.notes))
      .catch((err) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <>
      <ScreenHeader code="ND-01 // Archive" title="Notes">
        <Pill to="/notes/new" color="peach">
          + New note
        </Pill>
      </ScreenHeader>

      <Notice>{location.state?.flash}</Notice>
      <Alert>{error}</Alert>

      {!notes && !error && <Loading label="Retrieving records" />}

      {notes && notes.length === 0 && (
        <div className="empty">
          <div className="empty__title">No records on file</div>
          <p className="empty__text">Your notes will appear here. Start with your first one.</p>
          <Pill to="/notes/new" color="amber">
            Create first note
          </Pill>
        </div>
      )}

      {notes && notes.length > 0 && (
        <>
          <div className="count" aria-live="polite">
            <span className="count__num">{String(notes.length).padStart(2, '0')}</span>
            {notes.length === 1 ? 'record on file' : 'records on file'}
          </div>
          <ul className="records">
            {notes.map((note, i) => (
              <li key={note.id}>
                <Link to={`/notes/${note.id}`} className={`record c-${TAB_COLORS[i % TAB_COLORS.length]}`}>
                  <span className="record__tab">{recordCode(note.id)}</span>
                  <span className="record__main">
                    <span className="record__title">{note.title}</span>
                    {note.preview && <span className="record__preview">{note.preview}</span>}
                  </span>
                  <span className="record__stamp">{stamp(note.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
