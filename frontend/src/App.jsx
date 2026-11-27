import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Public Layout Components
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { Contact } from './pages/public/Contact';
import { LoginPage } from './pages/public/LoginPage';

// App Layout & Pages
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/app/DashboardPage';
import { AnalyzePage } from './pages/app/AnalyzePage';
import { MapPage } from './pages/app/MapPage';
import { CompliancePage } from './pages/app/CompliancePage';
import { AnalyticsPage } from './pages/app/AnalyticsPage';
import { ReportsPage } from './pages/app/ReportsPage';
import { SensorsPage } from './pages/app/SensorsPage';
import { SettingsPage } from './pages/app/SettingsPage';

// Citizen Specific Pages
import { CitizenDashboardPage } from './pages/app/CitizenDashboardPage';
import { CitizenComplaintPage } from './pages/app/CitizenComplaintPage';
import { CitizenCheckNoisePage } from './pages/app/CitizenCheckNoisePage';
import { CitizenGuidelinesPage } from './pages/app/CitizenGuidelinesPage';

// Public Layout Wrapper
const PublicLayout = ({ children }) => (
  <div className="min-h-screen bg-paper text-ink flex flex-col justify-between transition-colors">
    <Navbar />
    <main className="flex-grow">{children}</main>
    <Footer />
  </div>
);

// Smart Role-based index redirect
const AppIndexRedirect = () => {
  const { user, isAdmin } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={isAdmin ? "/app/dashboard" : "/app/citizen"} replace />;
};

// Admin Guard: ensures citizen cannot access admin modules without authenticating as an Officer
const AdminGuard = ({ children }) => {
  const { user, isAdmin } = useAuth();
  if (!user) {
    return <Navigate to="/login" state={{ hint: 'officer' }} replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/app/citizen" state={{ requireAdminLogin: true }} replace />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Website Routes */}
            <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
            <Route path="/how-it-works" element={<Navigate to="/#how-it-works" replace />} />
            <Route path="/features" element={<Navigate to="/#features" replace />} />
            <Route path="/research" element={<Navigate to="/#research" replace />} />
            <Route path="/about" element={<Navigate to="/#about" replace />} />
            <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
            <Route path="/login" element={<LoginPage />} />

            {/* Application Portal Routes */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<AppIndexRedirect />} />
              
              {/* Admin Core Pages (Protected: requires Officer / Admin login) */}
              <Route path="dashboard" element={<AdminGuard><DashboardPage /></AdminGuard>} />
              <Route path="analyze" element={<AdminGuard><AnalyzePage /></AdminGuard>} />
              <Route path="map" element={<MapPage />} />
              <Route path="compliance" element={<AdminGuard><CompliancePage /></AdminGuard>} />
              <Route path="analytics" element={<AdminGuard><AnalyticsPage /></AdminGuard>} />
              <Route path="reports" element={<AdminGuard><ReportsPage /></AdminGuard>} />
              <Route path="sensors" element={<AdminGuard><SensorsPage /></AdminGuard>} />
              <Route path="settings" element={<AdminGuard><SettingsPage /></AdminGuard>} />

              {/* Citizen & Public Pages */}
              <Route path="citizen" element={<CitizenDashboardPage />} />
              <Route path="complaint" element={<CitizenComplaintPage />} />
              <Route path="check-noise" element={<CitizenCheckNoisePage />} />
              <Route path="guidelines" element={<CitizenGuidelinesPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
