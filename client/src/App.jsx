import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/context/AuthContext';
import ErrorBoundary from './shared/components/ErrorBoundary';
import ProtectedRoute from './shared/components/ProtectedRoute';
import AppLayout from './shared/components/AppLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotesLayout from './features/notes/pages/NotesLayout';
import ClipboardLayout from './features/clipboard/pages/ClipboardLayout';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<HomePage />} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/tools/notes" element={<NotesLayout />} />
            <Route path="/tools/notes/:id" element={<NotesLayout />} />
            <Route path="/tools/clipboard" element={<ClipboardLayout />} />
          </Route>

          <Route path="/notes" element={<Navigate to="/tools/notes" replace />} />
          <Route path="/notes/:id" element={<Navigate to="/tools/notes/:id" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
