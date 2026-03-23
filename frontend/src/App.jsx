import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ApplicationList from './pages/ApplicationList';
import ApplicationDetail from './pages/ApplicationDetail';
import NewApplication from './pages/NewApplication';
import Login from './pages/Login';
import SpecialistWorkbench from './pages/SpecialistWorkbench';
import AdminDashboard from './pages/AdminDashboard';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

function AppContent() {
  const { isDark } = useTheme();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0B1929' : '#F3F6FB',
      fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif'
    }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/applications" element={<ApplicationList />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/new" element={<NewApplication />} />
        <Route path="/login" element={<Login />} />
        <Route path="/workbench" element={<SpecialistWorkbench />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
