import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeProvider';
import { 
  LogOut, 
  LayoutDashboard, 
  BookOpen, 
  Sparkles, 
  Bookmark, 
  FileText, 
  HelpCircle, 
  Settings, 
  User, 
  Menu, 
  X,
  Search,
  Pin,
  PinOff,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { SearchModal } from './SearchModal';

export const Layout = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  // Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Mobile sidebar open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pin state for desktop sidebar (persisted in localStorage, defaults to open on desktop)
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved !== null ? saved === 'true' : true;
  });

  // Hover expansion state
  const [isHovered, setIsHovered] = useState(false);

  // Sidebar is visually expanded if pinned OR hovered
  const isExpanded = isPinned || isHovered;

  useEffect(() => {
    localStorage.setItem('sidebarPinned', isPinned.toString());
  }, [isPinned]);

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
    { name: 'Overview', path: '/', icon: <LayoutDashboard size={18} strokeWidth={1.9} /> },
    { name: 'Courses', path: '/courses', icon: <BookOpen size={18} strokeWidth={1.9} /> },
    { name: 'AI Studio', path: '/ai-learning', icon: <Sparkles size={18} strokeWidth={1.9} /> },
  ];

  const libraryItems = [
    { name: 'Saved', path: '/saved', icon: <Bookmark size={18} strokeWidth={1.9} /> },
    { name: 'Notes', path: '/notes', icon: <FileText size={18} strokeWidth={1.9} /> },
    { name: 'Quizzes', path: '/quizzes', icon: <HelpCircle size={18} strokeWidth={1.9} /> },
  ];

  const bottomItems = [
    { name: 'Settings', path: '/settings', icon: <Settings size={18} strokeWidth={1.9} /> },
    { name: 'Account', path: '/account', icon: <User size={18} strokeWidth={1.9} /> },
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
          className={`relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-150 group text-sm select-none
            ${isActive 
              ? 'text-[var(--sidebar-active-text)] bg-[var(--sidebar-active-bg)] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.03)]' 
              : 'text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] hover:bg-[var(--sidebar-hover-bg)]'
            }
            ${!isExpanded ? 'justify-center px-0' : ''}`}
        >
          {/* Active Accent Indicator */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--sidebar-active-text)] rounded-r-full" />
          )}
          
          <div className={`${isActive ? 'text-[var(--sidebar-active-text)]' : 'text-[var(--sidebar-text)] group-hover:text-[var(--sidebar-text-hover)]'} transition-colors duration-150 shrink-0`}>
            {item.icon}
          </div>
          
          {isExpanded && (
            <span className="whitespace-nowrap overflow-hidden text-ellipsis tracking-tight">
              {item.name}
            </span>
          )}

          {/* Accessible Tooltip for collapsed state */}
          {!isExpanded && (
            <div className="absolute left-full ml-3.5 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none shadow-xl border border-white/10">
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

      {/* Layout Spacer for Desktop: Keeps main content position smoothly aligned with sidebar */}
      <div 
        style={{ width: isExpanded ? 240 : 68 }} 
        className="hidden md:block shrink-0 transition-[width] duration-280 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none" 
      />

      {/* Desktop Sidebar Attached to Left Corner */}
      <motion.aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={false}
        animate={{ width: isExpanded ? 240 : 68 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col justify-between py-5 px-3 rounded-none bg-[var(--sidebar-bg)] backdrop-blur-2xl border-r border-[var(--sidebar-border)] select-none overflow-hidden"
      >
        <div className="overflow-hidden">
          {/* Brand Header */}
          <div className={`flex items-center ${isExpanded ? 'justify-between px-1.5' : 'justify-center px-0'} mb-7 pt-1`}>
            <Link to="/" className="flex items-center gap-3 group">
              {/* Minimal Brand Mark Tile */}
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-medium)] flex items-center justify-center text-[var(--text-primary)] font-bold text-sm shadow-[0_0_12px_rgba(139,92,246,0.25)] shrink-0 transition-transform duration-200 group-hover:scale-105">
                L
              </div>
              {isExpanded && (
                <div className="whitespace-nowrap overflow-hidden">
                  <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">
                    LEARN FLOW <span className="font-bold text-[var(--text-primary)] opacity-80">AI</span>
                  </span>
                </div>
              )}
            </Link>

            {/* Pin / Unpin Button (Only shown when expanded) */}
            {isExpanded && (
              <button 
                onClick={() => setIsPinned(!isPinned)}
                aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  isPinned 
                    ? 'text-[var(--sidebar-active-text)] bg-[var(--sidebar-active-bg)]' 
                    : 'text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] hover:bg-[var(--sidebar-hover-bg)]'
                }`}
                title={isPinned ? "Unpin sidebar (collapse to hover mode)" : "Pin sidebar"}
              >
                {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
            )}
          </div>
          
          <div className="space-y-6">
            {/* Workspace Section */}
            <div>
              {isExpanded ? (
                <span className="px-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mb-2 block">
                  Workspace
                </span>
              ) : (
                <div className="h-[1px] w-6 mx-auto bg-slate-200/60 dark:bg-white/[0.06] mb-3" />
              )}
              <nav className="space-y-1">
                {renderNavItems(navItems)}
              </nav>
            </div>

            {/* Library Section */}
            <div>
              {isExpanded ? (
                <span className="px-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mb-2 block">
                  Library
                </span>
              ) : (
                <div className="h-[1px] w-6 mx-auto bg-slate-200/60 dark:bg-white/[0.06] mb-3" />
              )}
              <nav className="space-y-1">
                {renderNavItems(libraryItems)}
              </nav>
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div className="space-y-2 pt-3 border-t border-[var(--sidebar-border)] overflow-hidden">
          {/* Preferences Navigation */}
          <nav className="space-y-1">
             {renderNavItems(bottomItems)}
          </nav>

          {/* Theme Toggle: Full 3-state toggle when expanded, compact 1-click toggle when collapsed */}
          {isExpanded ? (
            <div className="flex justify-start px-1 py-1">
               <ThemeToggle />
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] hover:bg-[var(--sidebar-hover-bg)] transition-colors relative group"
                title={`Current theme: ${theme} (click to toggle)`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                <div className="absolute left-full ml-3.5 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none shadow-xl border border-white/10">
                  Toggle theme
                </div>
              </button>
            </div>
          )}
          
          {/* User Account / Logout Profile */}
          {isExpanded ? (
            <div className="flex items-center justify-between px-2 pt-1 gap-2 text-sm">
              <Link 
                to="/account" 
                className="flex items-center gap-2.5 flex-1 min-w-0 text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] transition-colors"
                title={user?.email || 'Account'}
              >
                <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="truncate text-xs font-medium">
                  {user?.full_name || user?.email?.split('@')[0] || 'Learner'}
                </span>
              </Link>
              
              <button 
                onClick={logout}
                className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors shrink-0 p-1.5 rounded-lg hover:bg-rose-500/10"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={16} strokeWidth={1.9} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <Link 
                to="/account" 
                className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center text-[11px] font-bold shrink-0 hover:ring-2 hover:ring-slate-400/40 transition-all group relative"
                aria-label="View Account"
              >
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                <div className="absolute left-full ml-3.5 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none shadow-xl border border-white/10">
                  {user?.email || 'Account'}
                </div>
              </Link>

              <button 
                onClick={logout}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors group relative"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={16} strokeWidth={1.9} />
                <div className="absolute left-full ml-3.5 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none shadow-xl border border-white/10">
                  Log out
                </div>
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-[var(--bg-workspace)] overflow-y-auto relative transition-colors duration-300">
        
        {/* Top Utility Bar */}
        <header className="sticky top-0 z-10 bg-[var(--bg-workspace)]/85 backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              aria-label="Open Navigation"
            >
              <Menu size={18} />
            </button>

            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wider uppercase">
              {getBreadcrumb()}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-[var(--bg-canvas)] border border-[var(--border-medium)] px-3 py-1.5 rounded-lg"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Search videos, courses</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[10px] font-sans">
                ⌘K
              </kbd>
            </button>

            <Link 
              to="/account" 
              className="w-7 h-7 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center text-[10px] font-bold shadow-sm hover:opacity-90 transition-opacity"
              title="View Account"
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-72 bg-[var(--bg-canvas)] border-r border-[var(--border-subtle)] h-full p-6 flex flex-col justify-between z-10 shadow-2xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-medium)] flex items-center justify-center text-[var(--text-primary)] font-bold text-sm shadow-[0_0_12px_rgba(139,92,246,0.25)]">
                        L
                      </div>
                      <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">
                        LEARN FLOW <span className="font-bold text-[var(--text-primary)] opacity-80">AI</span>
                      </span>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-1">
                        Workspace
                      </span>
                      <nav className="space-y-1">
                        {renderNavItems(navItems)}
                      </nav>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-1">
                        Library
                      </span>
                      <nav className="space-y-1">
                        {renderNavItems(libraryItems)}
                      </nav>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-1">
                        Preferences
                      </span>
                      <nav className="space-y-1">
                        {renderNavItems(bottomItems)}
                      </nav>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <ThemeToggle />
                  <button onClick={logout} className="text-xs text-slate-500 hover:text-rose-500 flex items-center gap-1.5 py-1 px-2 rounded-lg">
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Page Content Viewport */}
        <div className="px-6 py-8 lg:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="max-w-[1340px] mx-auto h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
