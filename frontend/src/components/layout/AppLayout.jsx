import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Mic2, 
  Map, 
  ShieldCheck, 
  BarChart2, 
  FileText, 
  Radio, 
  Settings, 
  Activity, 
  Menu, 
  X,
  User,
  Shield,
  AlertTriangle,
  HeartHandshake,
  BookOpen,
  LogOut,
  HelpCircle,
  ArrowLeftRight,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ErrorBoundary } from '../common/ErrorBoundary';

// Simple inline guide button that links to landing page guide
const GuideButton = () => (
  <Link
    to="/"
    className="flex items-center gap-1.5 text-[10px] font-mono text-graphite hover:text-ink transition-colors"
    title="Back to overview & guide"
  >
    <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
    <span>Guide</span>
  </Link>
);

// ── In-place Admin Authentication Modal when switching from Citizen → Admin ──
const ENABLE_DEMO_AUTH = import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true';

const AdminLoginModal = ({ isOpen, onClose, onSuccess }) => {
  const { login, switchRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        onSuccess();
      } else {
        setError(res.error || 'Invalid officer credentials');
      }
    } catch {
      setError('Authentication service unreachable. Try Demo Officer Access.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    await switchRole('officer');
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(20,24,27,0.72)' }}>
      <div className="bg-paper border border-ink w-full max-w-md shadow-2xl space-y-5 p-6 animate-fadein" style={{ borderRadius: 2 }}>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-sand pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 border border-ink bg-ink text-paper flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-paper" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase tracking-widest text-graphite block">
                Restricted Access
              </span>
              <h2 className="font-serif font-bold text-lg text-ink">
                Admin / Officer Login
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-graphite hover:text-ink p-1"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-xs text-graphite font-sans leading-relaxed">
          Switching from the Public Citizen Portal to the <strong className="text-ink">CPCB Administrative Portal</strong> requires authorised officer credentials.
        </p>

        {error && (
          <div className="p-3 border border-loud/40 bg-loud/10 text-loud text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-graphite mb-1">
              Officer Email / ID
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs font-mono border border-sand bg-paper-light text-ink focus:outline-none focus:border-ink transition-colors"
              placeholder="officer@soniccensus.ai"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-graphite mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-mono border border-sand bg-paper-light text-ink focus:outline-none focus:border-ink transition-colors pr-9"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-graphite hover:text-ink"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{loading ? 'Authenticating...' : 'Sign In to Admin Portal'}</span>
          </button>
        </form>

        {/* Footer Links & Optional Demo Mode */}
        <div className="pt-3 border-t border-sand space-y-2">
          {ENABLE_DEMO_AUTH && (
            <>
              <div className="text-[10px] font-mono text-graphite uppercase tracking-wider text-center">
                Demo Evaluation Mode
              </div>
              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2 border border-quiet bg-quiet/10 text-quiet hover:bg-quiet hover:text-paper text-xs font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>1-Click Officer Access (Demo)</span>
              </button>
            </>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-mono text-graphite hover:text-ink underline"
            >
              Cancel, stay in Citizen Portal
            </button>
            <Link
              to="/login"
              state={{ hint: 'officer' }}
              onClick={onClose}
              className="text-[10px] font-mono text-graphite hover:text-ink underline"
            >
              Full Login Page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Confirmation Modal when switching from Admin → Citizen ──
const CitizenSwitchModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(20,24,27,0.72)' }}>
      <div className="bg-paper border border-sand w-full max-w-sm space-y-5 p-6 animate-fadein" style={{ borderRadius: 2 }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 border border-sand bg-paper-light flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-graphite" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-graphite block">
              Switch Portal
            </span>
            <h2 className="font-serif font-bold text-base text-ink">
              Enter Citizen Portal?
            </h2>
            <p className="text-xs text-graphite font-sans mt-1 leading-relaxed">
              You are currently logged in as an Officer. Do you want to switch to the public-facing Citizen Soundscape portal?
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-sand">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-sand text-xs font-mono text-graphite hover:border-ink hover:text-ink transition-colors"
          >
            Stay in Admin
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors"
          >
            Switch to Citizen →
          </button>
        </div>
      </div>
    </div>
  );
};

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clockTime, setClockTime] = useState('');
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [showCitizenSwitchModal, setShowCitizenSwitchModal] = useState(false);
  const [backendWaking, setBackendWaking] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, switchRole, logout } = useAuth();

  useEffect(() => {
    const onWaking = (evt) => setBackendWaking(Boolean(evt?.detail?.active));
    window.addEventListener('sonic-backend-waking', onWaking);
    return () => window.removeEventListener('sonic-backend-waking', onWaking);
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClockTime(now.toTimeString().slice(0, 8));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Check if routed with location.state.requireAdminLogin
  useEffect(() => {
    if (location.state?.requireAdminLogin && !isAdmin) {
      setShowAdminLoginModal(true);
    }
  }, [location.state, isAdmin]);

  const adminNav = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Analyze Audio', path: '/app/analyze', icon: Mic2 },
    { name: 'Survey Map', path: '/app/map', icon: Map },
    { name: 'Compliance', path: '/app/compliance', icon: ShieldCheck },
    { name: 'Grievances', path: '/app/grievances', icon: AlertTriangle },
    { name: 'Analytics', path: '/app/analytics', icon: BarChart2 },
    { name: 'Reports', path: '/app/reports', icon: FileText },
    { name: 'Sensors', path: '/app/sensors', icon: Radio },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  const citizenNav = [
    { name: 'Overview', path: '/app/citizen', icon: HeartHandshake },
    { name: 'Check Noise', path: '/app/check-noise', icon: Mic2 },
    { name: 'File Complaint', path: '/app/complaint', icon: AlertTriangle },
    { name: 'Guidelines', path: '/app/guidelines', icon: BookOpen },
    { name: 'Sound Map', path: '/app/map', icon: Map },
  ];

  const nav = isAdmin ? adminNav : citizenNav;
  const isActive = (p) => location.pathname === p;

  // Handles portal switch request
  const handlePortalSwitchClick = () => {
    if (isAdmin) {
      // Officer wanting to go to Citizen Portal
      setShowCitizenSwitchModal(true);
    } else {
      // Citizen wanting to go to Admin Portal -> ALWAYS ASK FOR LOGIN
      setShowAdminLoginModal(true);
    }
  };

  const handleAdminLoginSuccess = () => {
    setShowAdminLoginModal(false);
    navigate('/app/dashboard');
  };

  const handleCitizenSwitchConfirm = () => {
    setShowCitizenSwitchModal(false);
    // Navigate away from <AdminGuard>-wrapped routes BEFORE switching role to avoid spurious modal trigger
    navigate('/app/citizen', { replace: true });
    setTimeout(() => {
      switchRole('citizen');
    }, 0);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-16 px-5 border-b border-sand flex items-center gap-2.5 flex-shrink-0">
        <div className="w-7 h-7 border border-ink flex items-center justify-center flex-shrink-0">
          <Activity className="w-4 h-4 text-ink" strokeWidth={1.75} />
        </div>
        <span className="font-serif font-bold text-lg text-ink tracking-tight leading-none">
          Sonic Census
        </span>
      </div>

      {/* Role badge with switch button */}
      <div className="px-5 py-3 border-b border-sand bg-paper-light flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isAdmin
            ? <Shield className="w-3.5 h-3.5 text-ink" strokeWidth={1.5} />
            : <User className="w-3.5 h-3.5 text-graphite" strokeWidth={1.5} />
          }
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink font-semibold">
            {isAdmin ? 'Admin / Officer' : 'Citizen'}
          </span>
        </div>
        <button
          onClick={handlePortalSwitchClick}
          className="text-[9px] font-mono text-graphite hover:text-ink flex items-center gap-1 transition-colors border border-sand px-1.5 py-0.5 bg-paper hover:border-ink"
          title={isAdmin ? 'Switch to Citizen Portal' : 'Login to Admin Portal'}
        >
          {isAdmin ? (
            <>
              <ArrowLeftRight className="w-2.5 h-2.5" strokeWidth={1.5} />
              <span>Switch</span>
            </>
          ) : (
            <>
              <Lock className="w-2.5 h-2.5 text-loud" strokeWidth={1.5} />
              <span>Admin Login</span>
            </>
          )}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-0.5">
        {nav.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-5 py-2 text-xs transition-colors ${
                active
                  ? 'border-l-2 border-ink bg-sand-light text-ink font-semibold'
                  : 'border-l-2 border-transparent text-graphite hover:text-ink hover:bg-sand-light/40'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* If Citizen, show a distinct Admin Portal button in navigation */}
        {!isAdmin && (
          <div className="pt-4 px-3">
            <button
              onClick={handlePortalSwitchClick}
              className="w-full flex items-center justify-between px-3 py-2 border border-sand bg-paper hover:border-ink text-ink text-xs font-mono transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-graphite group-hover:text-ink" strokeWidth={1.5} />
                <span>Admin Portal</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-graphite border border-sand px-1">Login</span>
            </button>
          </div>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-sand p-4 space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <GuideButton />
          <span className="text-[9px] font-mono text-graphite tabular-nums">{clockTime} IST</span>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] font-mono text-graphite hover:text-loud transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
            Sign Out
          </button>
          <button
            onClick={handlePortalSwitchClick}
            className="flex items-center gap-1.5 text-[10px] font-mono text-graphite hover:text-ink transition-colors"
          >
            {isAdmin ? (
              <>
                <ArrowLeftRight className="w-3 h-3" strokeWidth={1.5} />
                <span>Citizen Portal</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-loud" strokeWidth={1.5} />
                <span>Admin Portal</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Admin Login Modal (opens whenever switching from Citizen to Admin) */}
      <AdminLoginModal
        isOpen={showAdminLoginModal}
        onClose={() => setShowAdminLoginModal(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* Citizen Switch Modal */}
      <CitizenSwitchModal
        isOpen={showCitizenSwitchModal}
        onClose={() => setShowCitizenSwitchModal(false)}
        onConfirm={handleCitizenSwitchConfirm}
      />

      <div className="min-h-screen bg-paper text-ink font-sans flex antialiased">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 z-30 bg-paper border-r border-sand">
          <SidebarContent />
        </aside>

        {/* Main content */}
        <div className="flex-1 md:pl-56 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 border-b border-sand bg-paper sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="md:hidden p-1.5 border border-sand text-graphite hover:text-ink"
              >
                <Menu className="w-4 h-4" strokeWidth={1.5} />
              </button>

              <div className="text-xs font-mono text-graphite">
                <span className="uppercase tracking-wider">
                  {isAdmin ? 'Admin' : 'Citizen'}
                </span>
                <span className="mx-1.5 text-sand-dark">/</span>
                <span className="text-ink capitalize">
                  {location.pathname.replace('/app/', '').replace(/-/g, ' ') || 'Dashboard'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-[10px] font-mono text-graphite tabular-nums">
                {clockTime} IST
              </span>

              {/* Portal switch button in top bar */}
              <button
                onClick={handlePortalSwitchClick}
                className="flex items-center gap-1.5 px-2.5 py-1 border border-sand text-xs font-mono text-graphite hover:border-ink hover:text-ink transition-colors"
                title={isAdmin ? 'Switch to Citizen portal' : 'Click to Login to Admin Portal'}
              >
                {isAdmin ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-quiet" />
                    <span>Admin Mode</span>
                    <ArrowLeftRight className="w-3 h-3" strokeWidth={1.5} />
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-loud" strokeWidth={1.5} />
                    <span>Admin Portal</span>
                    <span className="text-[9px] uppercase tracking-wider text-graphite ml-1">Login</span>
                  </>
                )}
              </button>
            </div>
          </header>

          {/* Mobile Sidebar Drawer */}
          {sidebarOpen && (
            <div className="md:hidden fixed inset-0 z-40 flex">
              <div className="fixed inset-0 bg-ink/30" onClick={() => setSidebarOpen(false)} />
              <div className="relative w-56 bg-paper border-r border-sand flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-sand">
                  <span className="font-serif font-bold text-sm text-ink">Sonic Census</span>
                  <button onClick={() => setSidebarOpen(false)}>
                    <X className="w-4 h-4 text-graphite" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SidebarContent />
                </div>
              </div>
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {backendWaking && (
              <div className="mb-4 px-3 py-2 border border-sand bg-paper-light text-xs font-mono text-graphite flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-ink animate-pulse" strokeWidth={1.5} />
                <span>Waking backend server on Render (cold starts can take up to 50s)...</span>
              </div>
            )}
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </>
  );
};
