// The form for writing a note, shared by "new note" and "edit note".
// The parent decides what happens on save by passing an onSubmit function.
import { useState } from 'react';
import Pill from './Pill.jsx';
import { Alert } from './Feedback.jsx';

const MAX_TITLE = 200;
const MAX_BODY = 50_000;

export default function NoteForm({ initial = { title: '', body: '' }, submitLabel, onSubmit, cancelTo }) {
  // State: the current values of the inputs. Each keystroke updates state,
  // and React re-renders the form with the new values ("controlled inputs").
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser's own page-reloading form submit
    if (!title.trim()) {
      setError('A note needs a title.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ title: title.trim(), body });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  // Ctrl+Enter (or Cmd+Enter) saves from anywhere in the form.
  function handleKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <Alert>{error}</Alert>

      <label className="field">
        <span className="field__label">
          Title <span className="field__count">{title.length}/{MAX_TITLE}</span>
        </span>
        <input
          className="field__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TITLE}
          autoFocus
          required
        />
      </label>

      <label className="field">
        <span className="field__label">
          Note <span className="field__count">{body.length.toLocaleString()} chars</span>
        </span>
        <textarea
          className="field__input field__input--area"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_BODY}
        />
      </label>

      <div className="form__actions">
        <Pill type="submit" color="amber" disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </Pill>
        <Pill to={cancelTo} color="lilac">
          Cancel
        </Pill>
        <span className="hint">Ctrl + Enter to save</span>
      </div>
    </form>
  );
}
