import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const navLinks = [
    { name: 'How It Works', sectionId: 'how-it-works', to: '/#how-it-works' },
    { name: 'Features', sectionId: 'features', to: '/#features' },
    { name: 'Research', sectionId: 'research', to: '/#research' },
    { name: 'About', sectionId: 'about', to: '/#about' },
  ];

  // Track active section while scrolling down the LandingPage
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('');
      return undefined;
    }

    const sectionIds = ['how-it-works', 'features', 'research', 'about'];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visibleEntries.length > 0) {
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      { threshold: [0.15, 0.35], rootMargin: '-80px 0px -35% 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [location.pathname]);

  const handleSectionClick = (e, link) => {
    setMobileOpen(false);
    if (location.pathname === '/') {
      e.preventDefault();
      window.history.replaceState(null, '', `/#${link.sectionId}`);
      setActiveSection(link.sectionId);
      const target = document.getElementById(link.sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    e.preventDefault();
    navigate(link.to);
  };

  const handleLogoClick = (e) => {
    setMobileOpen(false);
    if (location.pathname === '/') {
      e.preventDefault();
      window.history.replaceState(null, '', '/');
      setActiveSection('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isActive = (link) => {
    if (location.pathname === '/') {
      return activeSection === link.sectionId || location.hash === `#${link.sectionId}`;
    }
    return location.pathname === `/${link.sectionId}`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" onClick={handleLogoClick} className="flex items-center gap-3">
            <div className="w-8 h-8 border border-ink flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-ink" strokeWidth={1.75} />
            </div>
            <span className="font-serif font-bold text-xl sm:text-2xl text-ink tracking-tight leading-none">
              Sonic Census
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-xs font-sans">
            {navLinks.map(link => (
              <a
                key={link.sectionId}
                href={link.to}
                onClick={(e) => handleSectionClick(e, link)}
                className={`py-1 border-b-2 transition-colors ${
                  isActive(link)
                    ? 'text-ink font-semibold border-ink'
                    : 'text-graphite border-transparent hover:text-ink'
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to={user ? (isAdmin ? '/app/dashboard' : '/app/citizen') : '/login'}
              className="px-4 py-1.5 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center gap-1.5"
            >
              <span>{user ? (isAdmin ? 'Dashboard' : 'My Portal') : 'Login'}</span>
              <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 text-graphite hover:text-ink border border-sand"
            onClick={() => setMobileOpen(o => !o)}
          >
            {mobileOpen ? <X className="w-4 h-4" strokeWidth={1.5} /> : <Menu className="w-4 h-4" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-sand bg-paper px-4 py-3 space-y-2 text-xs font-sans">
          {navLinks.map(link => (
            <a
              key={link.sectionId}
              href={link.to}
              onClick={(e) => handleSectionClick(e, link)}
              className={`block py-1.5 ${
                isActive(link) ? 'text-ink font-semibold' : 'text-graphite hover:text-ink'
              }`}
            >
              {link.name}
            </a>
          ))}
          <div className="pt-2 border-t border-sand">
            <Link
              to={user ? (isAdmin ? '/app/dashboard' : '/app/citizen') : '/login'}
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center py-2 border border-ink bg-ink text-paper font-mono uppercase text-xs tracking-wider"
            >
              {user ? 'Open Portal' : 'Login / Access'}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
