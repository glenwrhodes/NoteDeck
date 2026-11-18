import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '../lib/api.js';
import { recordCode } from '../lib/format.js';
import ScreenHeader from '../components/ScreenHeader.jsx';
import NoteForm from '../components/NoteForm.jsx';
import Pill from '../components/Pill.jsx';
import { Alert, Loading } from '../components/Feedback.jsx';

export default function NoteEdit() {
  const { number } = useParams(); // the :number part of /notes/:number/edit
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    api
      .getNote(number)
      .then((data) => !ignore && setNote(data.note))
      .catch((err) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [number]);

  async function save(changes) {
    await api.updateNote(number, changes);
    navigate(`/notes/${number}`, { state: { flash: 'Changes saved' } });
  }

  if (error) {
    return (
      <>
        <ScreenHeader code={`${recordCode(number)} // Edit`} title="Record unavailable" />
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
      <ScreenHeader code={`${recordCode(note.number)} // Edit`} title="Edit note" />
      <NoteForm initial={note} submitLabel="Save changes" onSubmit={save} cancelTo={`/notes/${note.number}`} />
    </>
  );
}
