import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAdmin, RequireAuth } from './app/AuthContext';
import { AppShell } from './components/AppShell';
import { AdminTeamPage } from './pages/AdminTeamPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ForbiddenPage, NotFoundPage } from './pages/ErrorPages';
import { LoginPage } from './pages/LoginPage';
import { NotesPage } from './pages/NotesPage';
import { PublicNotePage } from './pages/PublicNotePage';
import { SettingsPage } from './pages/SettingsPage';
import { TrashPage } from './pages/TrashPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/p/:token" element={<PublicNotePage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/notes" replace />} />
          <Route path="/notes" element={<NotesPage scope="mine" />} />
          <Route path="/notes/:noteId" element={<NotesPage scope="mine" />} />
          <Route path="/shared" element={<NotesPage scope="shared" />} />
          <Route path="/shared/:noteId" element={<NotesPage scope="shared" />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/team" element={<AdminTeamPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
