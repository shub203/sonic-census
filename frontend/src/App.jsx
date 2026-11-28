import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Public Layout Components
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Eager public landing route for fast first paint
import { LandingPage } from './pages/public/LandingPage';

// Route-level code-split bundles
const Contact = lazy(() => import('./pages/public/Contact').then((m) => ({ default: m.Contact })));
const LoginPage = lazy(() => import('./pages/public/LoginPage').then((m) => ({ default: m.LoginPage })));
const PrivacyPage = lazy(() => import('./pages/public/LegalPages').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/public/LegalPages').then((m) => ({ default: m.TermsPage })));

const AppLayout = lazy(() => import('./components/layout/AppLayout').then((m) => ({ default: m.AppLayout })));
const DashboardPage = lazy(() => import('./pages/app/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AnalyzePage = lazy(() => import('./pages/app/AnalyzePage').then((m) => ({ default: m.AnalyzePage })));
const MapPage = lazy(() => import('./pages/app/MapPage').then((m) => ({ default: m.MapPage })));
const CompliancePage = lazy(() => import('./pages/app/CompliancePage').then((m) => ({ default: m.CompliancePage })));
const AnalyticsPage = lazy(() => import('./pages/app/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const ReportsPage = lazy(() => import('./pages/app/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SensorsPage = lazy(() => import('./pages/app/SensorsPage').then((m) => ({ default: m.SensorsPage })));
const SettingsPage = lazy(() => import('./pages/app/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const GrievancesPage = lazy(() => import('./pages/app/GrievancesPage').then((m) => ({ default: m.GrievancesPage })));

const CitizenDashboardPage = lazy(() => import('./pages/app/CitizenDashboardPage').then((m) => ({ default: m.CitizenDashboardPage })));
const CitizenComplaintPage = lazy(() => import('./pages/app/CitizenComplaintPage').then((m) => ({ default: m.CitizenComplaintPage })));
const CitizenCheckNoisePage = lazy(() => import('./pages/app/CitizenCheckNoisePage').then((m) => ({ default: m.CitizenCheckNoisePage })));
const CitizenGuidelinesPage = lazy(() => import('./pages/app/CitizenGuidelinesPage').then((m) => ({ default: m.CitizenGuidelinesPage })));

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-xs font-mono text-graphite">
    Loading Sonic Census module...
  </div>
);

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
  return <Navigate to={isAdmin ? '/app/dashboard' : '/app/citizen'} replace />;
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
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public Website Routes */}
              <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
              <Route path="/how-it-works" element={<Navigate to="/#how-it-works" replace />} />
              <Route path="/features" element={<Navigate to="/#features" replace />} />
              <Route path="/research" element={<Navigate to="/#research" replace />} />
              <Route path="/about" element={<Navigate to="/#about" replace />} />
              <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
              <Route path="/privacy" element={<PublicLayout><PrivacyPage /></PublicLayout>} />
              <Route path="/terms" element={<PublicLayout><TermsPage /></PublicLayout>} />
              <Route path="/login" element={<LoginPage />} />

              {/* Application Portal Routes */}
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<AppIndexRedirect />} />

                {/* Admin Core Pages (Protected: requires Officer / Admin login) */}
                <Route path="dashboard" element={<AdminGuard><DashboardPage /></AdminGuard>} />
                <Route path="analyze" element={<AdminGuard><AnalyzePage /></AdminGuard>} />
                <Route path="map" element={<MapPage />} />
                <Route path="compliance" element={<AdminGuard><CompliancePage /></AdminGuard>} />
                <Route path="grievances" element={<AdminGuard><GrievancesPage /></AdminGuard>} />
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
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
