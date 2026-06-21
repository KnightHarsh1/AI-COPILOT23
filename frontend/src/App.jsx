import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import ForecastPage from './pages/ForecastPage';
import IngestionPage from './pages/IngestionPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import CommandCenterPage from './pages/CommandCenterPage';
import UploadPage from './pages/UploadPage';
import ReportsPage from './pages/ReportsPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppearanceProvider } from './context/AppearanceContext';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <AppearanceProvider>
      <AppProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/app/dashboard" element={<ProtectedRoute><CommandCenterPage /></ProtectedRoute>} />
              <Route path="/app/dashboard-classic" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/app/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
              <Route path="/app/ingestion" element={<ProtectedRoute><IngestionPage /></ProtectedRoute>} />
              <Route path="/app/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
             <Route path="/app/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />

<Route
  path="/app/chat"
  element={
    <ProtectedRoute>
      <ChatPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/app/forecast"
  element={
    <ProtectedRoute>
      <ForecastPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/app/settings"
  element={
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  }
/>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </AppProvider>
      </AppearanceProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
