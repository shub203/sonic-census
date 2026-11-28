import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Activity,
  Shield,
  User,
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ENABLE_DEMO_AUTH = import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, switchRole } = useAuth();

  const hint = location.state?.hint;
  const initialRole = (hint === 'officer' || hint === 'citizen') ? hint : null;

  const [view, setView] = useState(initialRole ? 'form' : 'select'); // 'select' | 'form'
  const [selectedRole, setSelectedRole] = useState(initialRole); // 'officer' | 'citizen'

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hint && (hint === 'officer' || hint === 'citizen')) {
      setSelectedRole(hint);
      setView('form');
    }
  }, [hint]);

  const handleQuickAccess = async (role) => {
    if (!ENABLE_DEMO_AUTH) return;
    await switchRole(role);
    if (role === 'officer' || role === 'admin') {
      navigate('/app/dashboard');
    } else {
      navigate('/app/citizen');
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setView('form');
    setMode('login');
    setError(null);
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!acceptedTerms) {
        setError('Please accept the Privacy Policy and Terms of Service to register.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res.success) {
          const u = JSON.parse(localStorage.getItem('noise_user') || '{}');
          if (u.role === 'officer' || u.role === 'admin' || u.role === 'analyst') {
            navigate('/app/dashboard');
          } else {
            navigate('/app/citizen');
          }
        } else {
          setError(res.error || 'Invalid credentials');
        }
      } else {
        // Public registration always creates a Citizen account; officers are promoted by an admin.
        const res = await register(name, email, password, 'citizen');
        if (res.success) {
          navigate('/app/citizen');
        } else {
          setError(res.error || 'Registration failed');
        }
      }
    } catch {
      setError('Unable to reach authentication server. Please verify connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = selectedRole === 'officer';

  return (
    <div className="min-h-screen bg-paper text-ink font-sans antialiased flex flex-col">
      {/* Top bar */}
      <header className="h-16 border-b border-sand px-6 flex items-center justify-between flex-shrink-0">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 border border-ink flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-ink" strokeWidth={1.75} />
          </div>
          <span className="font-serif font-bold text-xl text-ink tracking-tight leading-none">Sonic Census</span>
        </Link>
        <Link to="/" className="text-xs font-mono text-graphite hover:text-ink transition-colors">
          ← Back to Overview
        </Link>
      </header>

      {/* Main centered content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {/* VIEW: Role Selector */}
        {view === 'select' && (
          <div className="w-full max-w-2xl space-y-8 animate-fadein">
            <div className="text-center space-y-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-graphite block">
                Access Gateway
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
                Select Your Portal
              </h1>
              <p className="text-sm text-graphite font-sans">
                Choose your role to access the relevant monitoring interface.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Admin / Officer Card */}
              <button
                onClick={() => handleRoleSelect('officer')}
                className="group text-left p-7 border border-ink bg-paper hover:bg-ink hover:text-paper transition-colors duration-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Shield className="w-6 h-6 text-ink group-hover:text-paper transition-colors" strokeWidth={1.5} />
                  <span className="text-[9px] font-mono uppercase tracking-widest border border-sand group-hover:border-paper/40 px-1.5 py-0.5">
                    Officer Login
                  </span>
                </div>
                <div>
                  <div className="font-serif font-bold text-base text-ink group-hover:text-paper transition-colors">
                    Admin / Officer Portal
                  </div>
                  <div className="text-xs text-graphite group-hover:text-paper/70 font-sans mt-1 transition-colors">
                    CPCB Environmental Officer, Acoustic Analyst, or Municipal Inspector
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono text-graphite group-hover:text-paper/60 transition-colors pt-2">
                  <span>Sign in as Officer</span>
                  <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                </div>
              </button>

              {/* Citizen Card */}
              <button
                onClick={() => handleRoleSelect('citizen')}
                className="group text-left p-7 border border-sand bg-paper hover:bg-paper-light transition-colors duration-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <User className="w-6 h-6 text-graphite group-hover:text-ink transition-colors" strokeWidth={1.5} />
                  <span className="text-[9px] font-mono uppercase tracking-widest border border-sand px-1.5 py-0.5 text-graphite">
                    Public
                  </span>
                </div>
                <div>
                  <div className="font-serif font-bold text-base text-ink">
                    Citizen Portal
                  </div>
                  <div className="text-xs text-graphite font-sans mt-1">
                    Public observer, resident, or neighborhood noise reporter
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono text-graphite group-hover:text-ink transition-colors pt-2">
                  <span>Access Citizen Portal</span>
                  <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
                </div>
              </button>
            </div>

            {ENABLE_DEMO_AUTH && (
              <div className="border-t border-sand pt-6 text-center space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-graphite block">
                  Local Demo Quick Access
                </span>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleQuickAccess('officer')}
                    className="px-4 py-2 border border-ink bg-ink text-paper text-xs font-mono hover:bg-ink-light transition-colors flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Enter as Admin Officer →</span>
                  </button>
                  <button
                    onClick={() => handleQuickAccess('citizen')}
                    className="px-4 py-2 border border-sand bg-paper-light text-ink text-xs font-mono hover:border-ink transition-colors flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Enter as Citizen →</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: Login / Register Form */}
        {view === 'form' && (
          <div className="w-full max-w-sm space-y-6 animate-fadein">
            <button
              onClick={() => { setView('select'); setError(null); }}
              className="text-xs font-mono text-graphite hover:text-ink transition-colors flex items-center gap-1"
            >
              ← Choose different role
            </button>

            {hint === 'officer' && (
              <div className="p-3 border border-ink bg-paper-light flex items-center gap-2 text-xs font-mono text-ink">
                <Lock className="w-4 h-4 text-loud flex-shrink-0" strokeWidth={1.5} />
                <span>Admin authorisation required to access officer tools.</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {isAdmin ? (
                <Shield className="w-4 h-4 text-ink" strokeWidth={1.5} />
              ) : (
                <User className="w-4 h-4 text-graphite" strokeWidth={1.5} />
              )}
              <span className="text-[9px] font-mono uppercase tracking-widest text-graphite">
                {isAdmin && mode === 'login' ? 'Admin / Officer Portal' : 'Public Citizen Portal'}
              </span>
            </div>

            <div>
              <h1 className="font-serif text-2xl font-bold text-ink">
                {mode === 'login'
                  ? (isAdmin ? 'Officer Sign In' : 'Citizen Sign In')
                  : 'Create Citizen Account'}
              </h1>
              <p className="text-xs text-graphite font-sans mt-1">
                {mode === 'register'
                  ? 'New accounts start with Citizen access. Existing officers can assign Analyst or Officer roles inside Admin Settings.'
                  : (isAdmin
                      ? 'Sign in with your authorised CPCB officer credentials.'
                      : 'Access the residential sound evaluator and file noise grievance tickets.')}
              </p>
            </div>

            {error && (
              <div className="p-3 border border-sand bg-paper flex items-start gap-2 text-xs font-mono text-loud">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-[10px] uppercase font-mono text-graphite mb-1.5 tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3 py-2.5 border border-sand bg-paper text-ink text-sm font-sans focus:border-ink outline-none transition-colors placeholder:text-graphite/50"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-mono text-graphite mb-1.5 tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2.5 border border-sand bg-paper text-ink text-sm font-sans focus:border-ink outline-none transition-colors placeholder:text-graphite/50"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-graphite mb-1.5 tracking-wider">
                  Password {mode === 'register' && '(min 8 chars)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'register' ? 8 : 1}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 border border-sand bg-paper text-ink text-sm font-sans focus:border-ink outline-none transition-colors placeholder:text-graphite/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite hover:text-ink"
                  >
                    {showPassword
                      ? <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                      : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <label className="flex items-start gap-2 text-xs text-graphite font-sans cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 accent-ink"
                  />
                  <span>
                    I accept the{' '}
                    <Link to="/privacy" className="text-ink underline">Privacy Policy</Link>
                    {' '}and{' '}
                    <Link to="/terms" className="text-ink underline">Terms of Service</Link>.
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>
                  {loading
                    ? 'Authenticating...'
                    : mode === 'login' ? `Enter ${isAdmin ? 'Admin' : 'Citizen'} Portal` : 'Create Citizen Account'}
                </span>
              </button>
            </form>

            <div className="flex items-center justify-between pt-2 border-t border-sand text-xs font-mono text-graphite">
              <span>{mode === 'login' ? "Don't have an account?" : 'Already registered?'}</span>
              <button
                onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(null); }}
                className="text-ink underline hover:no-underline"
              >
                {mode === 'login' ? 'Register' : 'Sign In'}
              </button>
            </div>

            {ENABLE_DEMO_AUTH && (
              <div className="pt-4 border-t border-sand text-center space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-graphite block">
                  Local Demo Access
                </span>
                <button
                  onClick={() => handleQuickAccess(isAdmin ? 'officer' : 'citizen')}
                  className="w-full py-2 border border-sand bg-paper-light hover:border-ink text-xs font-mono text-ink transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-quiet" strokeWidth={1.5} />
                  <span>1-Click Access as {isAdmin ? 'Admin Officer' : 'Citizen'} →</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-sand py-4 px-6 text-center text-[10px] font-mono text-graphite flex-shrink-0 flex flex-wrap items-center justify-center gap-4">
        <span>Sonic Census · Central Pollution Control Board, 2000 Noise Rules</span>
        <Link to="/privacy" className="underline hover:text-ink">Privacy</Link>
        <Link to="/terms" className="underline hover:text-ink">Terms</Link>
      </footer>
    </div>
  );
};
