// The route table: which page component shows for which URL.
import { Routes, Route, Navigate } from 'react-router';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotesList from './pages/NotesList.jsx';
import NoteNew from './pages/NoteNew.jsx';
import NoteView from './pages/NoteView.jsx';
import NoteEdit from './pages/NoteEdit.jsx';
import Status from './pages/Status.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      {/* Layout draws the frame (top bar, sidebar); the page appears in its <Outlet /> */}
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/notes" replace />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        {/* Everything inside RequireAuth needs a logged-in user */}
        <Route element={<RequireAuth />}>
          <Route path="notes" element={<NotesList />} />
          <Route path="notes/new" element={<NoteNew />} />
          <Route path="notes/:id" element={<NoteView />} />
          <Route path="notes/:id/edit" element={<NoteEdit />} />
          <Route path="status" element={<Status />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
