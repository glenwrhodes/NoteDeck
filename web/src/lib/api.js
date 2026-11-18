// A small client for the NoteDeck API.
// The browser only ever talks to the web container (same origin). nginx there
// forwards /api/* to the api container, so there is no CORS to configure, and
// the session cookie is sent automatically.

let handleUnauthorized = () => {};

// AuthContext registers a function here so that an expired session anywhere in
// the app logs the user out of the UI.
export function setUnauthorizedHandler(fn) {
  handleUnauthorized = fn;
}

async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // not JSON (for example an nginx error page while the API restarts)
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) handleUnauthorized();
    const error = new Error(data?.error || `Request failed (${res.status}).`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  me: () => request('GET', '/auth/me'),
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  register: (username, password) => request('POST', '/auth/register', { username, password }),
  logout: () => request('POST', '/auth/logout'),

  listNotes: () => request('GET', '/notes'),
  getNote: (id) => request('GET', `/notes/${id}`),
  createNote: (note) => request('POST', '/notes', note),
  updateNote: (id, note) => request('PUT', `/notes/${id}`, note),
  deleteNote: (id) => request('DELETE', `/notes/${id}`),

  health: () => request('GET', '/health'),
  status: () => request('GET', '/status'),
};
