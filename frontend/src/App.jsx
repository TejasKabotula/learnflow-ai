import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import MyCourses from './pages/MyCourses';
import PlaylistDetail from './pages/PlaylistDetail';
import AiLearning from './pages/AiLearning';
import Saved from './pages/Saved';
import Notes from './pages/Notes';
import Quizzes from './pages/Quizzes';
import Settings from './pages/Settings';
import Account from './pages/Account';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="courses" element={<MyCourses />} />
              <Route path="playlist/:id" element={<PlaylistDetail />} />
              <Route path="ai-learning" element={<AiLearning />} />
              <Route path="saved" element={<Saved />} />
              <Route path="notes" element={<Notes />} />
              <Route path="quizzes" element={<Quizzes />} />
              <Route path="settings" element={<Settings />} />
              <Route path="account" element={<Account />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
