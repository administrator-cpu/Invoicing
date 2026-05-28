import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Building2, LogOut, Menu, X, Sun, Moon, Loader2 } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useThemeStore from '@/store/useThemeStore';
import { logoutApi } from '@/features/auth/api/authApi';

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [isThemeChanging, setIsThemeChanging] = useState(false);
  const [targetIcon, setTargetIcon] = useState(theme);

  const handleThemeToggle = () => {
    setIsThemeChanging(true);
    setTargetIcon(theme === 'light' ? 'dark' : 'light');

    setTimeout(() => {
      toggleTheme();
      
      setTimeout(() => {
        setIsThemeChanging(false);
      }, 300);
    }, 300);
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('Logout failed on server, clearing local state anyway', error);
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Company Profiles', path: '/company-profiles', icon: Building2 },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-500 relative">
      
      <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-all duration-300 pointer-events-none ${
        isThemeChanging ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
      }`}>
        <div className="relative flex items-center justify-center">
          {/* Outer ring spin */}
          {/* <Loader2 className="w-16 h-16 text-primary dark:text-indigo-400 animate-spin opacity-40" /> */}
          
          {/* Core transforming icon */}
          <div className="absolute animate-bounce">
            {targetIcon === 'dark' ? (
              <Moon className="w-6 h-6 text-indigo-400 transition-transform duration-300 rotate-12" />
            ) : (
              <Sun className="w-6 h-6 text-amber-500 transition-transform duration-300 rotate-45" />
            )}
          </div>
        </div>
        <p className="text-xs font-semibold tracking-widest text-slate-400 dark:text-slate-500 uppercase mt-4 animate-pulse">
          Calibrating Workspace...
        </p>
      </div>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">
            Invoice<span className="text-primary">Pro</span>
          </span>
          <button 
            className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname.includes(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg font-medium transition-all ${
                  isActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || 'admin@company.com'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10 transition-colors duration-300">
          <div className="flex items-center">
            <button 
              className="md:hidden mr-4 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white capitalize">
              {location.pathname.split('/')[1] || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Theme Toggle Button Linked to New Lifecycle */}
            <button
              onClick={handleThemeToggle}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full transition-all duration-300 hover:rotate-12 cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700" />
              )}
            </button>

            <span className="hidden md:inline-flex text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
              Financial Year 26-27
            </span>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
};

export default DashboardLayout;