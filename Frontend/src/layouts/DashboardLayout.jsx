import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Building2, LogOut, Menu,
  X, Sun, Moon, Search, Bell, ChevronLeft, ChevronRight
} from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useThemeStore from '@/store/useThemeStore';
import { logoutApi } from '@/features/auth/api/authApi';

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isThemeChanging, setIsThemeChanging] = useState(false);
  const [targetIcon, setTargetIcon] = useState(theme);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

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

  const currentRouteName = location.pathname.split('/')[1] || 'Dashboard';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-500 relative font-sans">

      {/* THEME TRANSITION OVERLAY */}
      <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-all duration-300 pointer-events-none ${isThemeChanging ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}>
        <div className="relative flex items-center justify-center">
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
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out md:relative shadow-xl md:shadow-none ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}>

        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0 shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            {/* FIX 1: Added max-w-0 and overflow-hidden for smooth logo collapse */}
            <span className={`text-xl font-bold text-slate-900 dark:text-white tracking-wide transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
              Invoice<span className="text-[#EA580C]">Pro</span>
            </span>
          </div>
          <button
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        {/* FIX 2: Added overflow-x-hidden to prevent the scrollbar during transition */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1.5 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname.includes(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`relative flex items-center px-3 py-2.5 rounded-xl font-medium transition-all group ${isActive
                    ? 'bg-orange-50 dark:bg-orange-500/10 text-[#EA580C] dark:text-orange-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#EA580C] rounded-r-full" />
                )}

                <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-[#EA580C] dark:text-orange-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  } ${isSidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />

                {/* FIX 3: Replaced w-0 with max-w-0 and overflow-hidden */}
                <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
                  {item.name}
                </span>

                {/* Tooltip for collapsed sidebar */}
                {isSidebarCollapsed && (
                  <div className="absolute left-[70px] px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 hidden md:block">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Collapse Toggle */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className={`flex items-center mb-4 transition-all duration-300 ${isSidebarCollapsed ? 'justify-center' : 'px-2'}`}>
            <div className="w-9 h-9 rounded-full bg-[#EA580C]/10 flex items-center justify-center text-[#EA580C] font-bold text-sm border border-[#EA580C]/20 shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            {/* FIX 4: Applied max-w-0 and overflow-hidden to profile details */}
            <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || 'admin@company.com'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className={`flex items-center py-2 text-sm font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors w-full ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 hover:bg-red-50 dark:hover:bg-red-500/10'}`}
            title="Sign Out"
          >
            <LogOut className={`w-4 h-4 shrink-0 ${isSidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {/* FIX 5: Applied max-w-0 and overflow-hidden to logout text */}
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
              Sign Out
            </span>
          </button>
        </div>

        {/* Desktop Sidebar Toggle */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-[#EA580C] shadow-sm hover:shadow transition-all z-50"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#EAECEF] dark:bg-slate-950">

        {/* TOP HEADER */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10 shrink-0 transition-colors duration-300">

          {/* Left Side: Mobile toggle & Greeting */}
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white capitalize leading-tight">
                {currentRouteName}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {greeting}, {user?.name?.split(' ')[0] || 'Admin'}
              </p>
            </div>
          </div>

          {/* Center: Search Bar (Desktop only) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#EA580C] transition-colors" />
              <input
                type="text"
                placeholder="Search invoices, customers...(In development)"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition-all dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Right Side: Actions */}
          <div className="flex items-center space-x-2 md:space-x-4">

            {/* Financial Year Badge */}
            <div className="hidden md:flex items-center px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20">
              <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse mr-2" />
              <span className="text-xs font-bold text-[#EA580C] dark:text-orange-400 uppercase tracking-wide">
                FY 26-27
              </span>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1" />

            {/* Notifications */}
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full transition-all duration-200">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-slate-900" />
            </button>

            {/* Theme Toggle */}
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
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
};

export default DashboardLayout;