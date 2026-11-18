import { useNavigate } from 'react-router';
import { api } from '../lib/api.js';
import ScreenHeader from '../components/ScreenHeader.jsx';
import NoteForm from '../components/NoteForm.jsx';

export default function NoteNew() {
  const navigate = useNavigate();

  async function create(note) {
    const data = await api.createNote(note);
    navigate(`/notes/${data.note.id}`, { state: { flash: 'Record created' } });
  }

  return (
    <>
      <ScreenHeader code="ND-02 // New entry" title="New note" />
      <NoteForm submitLabel="Save note" onSubmit={create} cancelTo="/notes" />
    </>
  );
}
