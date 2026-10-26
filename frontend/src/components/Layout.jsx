import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  LayoutDashboard, 
  Library, 
  BrainCircuit, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Bookmark, 
  FileText, 
  HelpCircle, 
  Settings, 
  User, 
  Menu, 
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { SearchModal } from './SearchModal';

export const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Mobile sidebar open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize collapsed state from localStorage, defaulting to false (expanded) on large screens
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.innerWidth < 1280;
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: 'Overview', path: '/', icon: <LayoutDashboard size={18} strokeWidth={2} /> },
    { name: 'Courses', path: '/courses', icon: <Library size={18} strokeWidth={2} /> },
    { name: 'AI Studio', path: '/ai-learning', icon: <BrainCircuit size={18} strokeWidth={2} /> },
  ];

  const libraryItems = [
    { name: 'Saved', path: '/saved', icon: <Bookmark size={18} strokeWidth={2} /> },
    { name: 'Notes', path: '/notes', icon: <FileText size={18} strokeWidth={2} /> },
    { name: 'Quizzes', path: '/quizzes', icon: <HelpCircle size={18} strokeWidth={2} /> },
  ];

  const bottomItems = [
    { name: 'Settings', path: '/settings', icon: <Settings size={18} strokeWidth={2} /> },
    { name: 'Account', path: '/account', icon: <User size={18} strokeWidth={2} /> },
  ];

  const getBreadcrumb = () => {
    const p = location.pathname;
    if (p === '/') return 'Workspace / Overview';
    if (p.startsWith('/courses')) return 'Workspace / Courses';
    if (p.startsWith('/playlist')) return 'Workspace / Course Study Room';
    if (p.startsWith('/ai-learning')) return 'Workspace / AI Studio';
    if (p.startsWith('/saved')) return 'Library / Saved Resources';
    if (p.startsWith('/notes')) return 'Library / Notes Manager';
    if (p.startsWith('/quizzes')) return 'Library / Quizzes & Practice';
    if (p.startsWith('/settings')) return 'Preferences / Settings';
    if (p.startsWith('/account')) return 'Profile / Account';
    return 'Workspace';
  };

  const renderNavItems = (items) => (
    items.map((item) => {
      const isActive = location.pathname === item.path || 
                      (item.path !== '/' && location.pathname.startsWith(item.path));
      return (
        <Link
          key={item.name}
          to={item.path}
          className={`relative flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors duration-200 group text-sm
            ${isActive ? 'text-[var(--text-primary)] bg-[rgba(255,255,255,0.06)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.03)]'}
            ${isCollapsed ? 'justify-center' : ''}`}
        >
          {/* Active Indicator Line */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--color-accent-primary)] rounded-r-full" />
          )}
          
          <div className={`${isActive ? 'text-[var(--color-accent-primary)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'} transition-colors duration-200 shrink-0`}>
            {item.icon}
          </div>
          
          {!isCollapsed && (
            <span className="whitespace-nowrap">{item.name}</span>
          )}

          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-2.5 py-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-lg">
              {item.name}
            </div>
          )}
        </Link>
      );
    })
  );

  return (
    <div className="flex h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-300">
      
      {/* Global Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Desktop Sidebar Navigation */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 72 : 260 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:flex bg-[var(--bg-canvas)] border-r border-[var(--border-subtle)] flex-col justify-between py-6 px-3 z-20 shrink-0 relative"
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-8 w-6 h-6 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] z-30 shadow-sm transition-colors"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="overflow-hidden">
          {/* Logo Area */}
          <Link to="/" className={`flex items-center gap-3 mb-10 ${isCollapsed ? 'justify-center px-0' : 'px-2'}`}>
            <div className="w-7 h-7 rounded bg-[var(--bg-surface)] border border-[var(--border-medium)] flex items-center justify-center text-[var(--text-primary)] font-bold text-sm shadow-[0_0_10px_rgba(139,92,246,0.15)] shrink-0">
              L
            </div>
            {!isCollapsed && (
              <h1 className="text-sm font-semibold tracking-wide text-[var(--text-primary)] whitespace-nowrap">
                LEARN FLOW
              </h1>
            )}
          </Link>
          
          <div className="space-y-8">
            {/* Main Navigation */}
            <div>
              {!isCollapsed && <span className="px-2 text-[10px] font-semibold text-[var(--text-tertiary)] tracking-widest uppercase mb-3 block">Workspace</span>}
              {isCollapsed && <div className="h-[1px] w-8 mx-auto bg-[var(--border-subtle)] mb-4" />}
              <nav className="space-y-1">
                {renderNavItems(navItems)}
              </nav>
            </div>

            {/* Secondary Navigation */}
            <div>
              {!isCollapsed && <span className="px-2 text-[10px] font-semibold text-[var(--text-tertiary)] tracking-widest uppercase mb-3 block">Library</span>}
              {isCollapsed && <div className="h-[1px] w-8 mx-auto bg-[var(--border-subtle)] mb-4" />}
              <nav className="space-y-1">
                {renderNavItems(libraryItems)}
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom User Area */}
        <div className="space-y-2 overflow-hidden pb-2">
          <nav className="space-y-1 mb-4">
             {renderNavItems(bottomItems)}
          </nav>

          <div className="flex justify-center mb-4">
             <ThemeToggle />
          </div>
          
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-2'} gap-3 text-sm`}>
            {!isCollapsed && (
              <Link to="/account" className="flex-1 truncate text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                {user?.email || 'Student'}
              </Link>
            )}
            
            <button 
              onClick={logout}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors shrink-0 p-2 group relative"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} strokeWidth={2} />
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-lg">
                  Logout
                </div>
              )}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-[var(--bg-workspace)] overflow-y-auto relative transition-colors duration-300">
        
        {/* Top Utility Bar */}
        <header className="sticky top-0 z-10 bg-[var(--bg-workspace)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] px-6 lg:px-16 2xl:px-24 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              aria-label="Open Navigation"
            >
              <Menu size={18} />
            </button>

            <div className="text-xs text-[var(--text-tertiary)] font-medium tracking-widest uppercase">
              {getBreadcrumb()}
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-canvas)] border border-[var(--border-medium)] px-3 py-1.5 rounded-lg"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 rounded bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[10px] font-sans">
                ⌘K
              </kbd>
            </button>

            <Link 
              to="/account" 
              className="w-7 h-7 rounded-full bg-[var(--bg-surface)] border border-[var(--border-medium)] flex items-center justify-center overflow-hidden hover:border-[var(--color-accent-primary)] transition-colors"
              title="View Account"
            >
              <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </span>
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                className="relative w-64 bg-[var(--bg-canvas)] border-r border-[var(--border-subtle)] h-full p-6 flex flex-col justify-between z-10"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-[var(--bg-surface)] border border-[var(--border-medium)] flex items-center justify-center font-bold text-sm">
                        L
                      </div>
                      <span className="font-semibold text-sm">LEARN FLOW</span>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-[var(--text-tertiary)]">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest block mb-2">Workspace</span>
                      <nav className="space-y-1">
                        {renderNavItems(navItems)}
                      </nav>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest block mb-2">Library</span>
                      <nav className="space-y-1">
                        {renderNavItems(libraryItems)}
                      </nav>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest block mb-2">Settings</span>
                      <nav className="space-y-1">
                        {renderNavItems(bottomItems)}
                      </nav>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <ThemeToggle />
                  <button onClick={logout} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1.5">
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="px-6 py-10 lg:px-16 2xl:px-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-[1280px] mx-auto h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
