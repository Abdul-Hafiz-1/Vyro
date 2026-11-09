import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './Avatar';
import { ModeSwitch } from './ModeSwitch';
import { CommandPalette } from './CommandPalette';
import { 
  Sun, 
  Handshake, 
  Store, 
  User, 
  Plus, 
  LogOut, 
  Bell, 
  Search,
  Moon,
  SunMedium
} from 'lucide-react';

export const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, isSellerWorkspace, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(() => {
    return document.documentElement.classList.contains('light');
  });

  const toggleTheme = () => {
    if (isLightMode) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsLightMode(false);
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      setIsLightMode(true);
    }
  };

  const isSeller = isSellerWorkspace;

  const navItems = isSeller
    ? [
        { to: '/app', label: 'Today', icon: Sun },
        { to: '/app/deals', label: 'Deals', icon: Handshake },
        { to: '/app/listings', label: 'Listings', icon: Store },
        { to: '/app/settings', label: 'Account', icon: User },
      ]
    : [
        { to: '/app', label: 'Today', icon: Sun },
        { to: '/app/deals', label: 'Deals', icon: Handshake },
        { to: '/app/marketplace', label: 'Market', icon: Store },
        { to: '/app/settings', label: 'Account', icon: User },
      ];

  const handleNewAction = () => {
    if (isSeller) {
      navigate('/app/listings/new');
    } else {
      navigate('/app/requests/new');
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col selection:bg-volt selection:text-[#0C0E0D]">
      {/* 1. TOP BAR (DESKTOP) */}
      <header className="sticky top-0 bg-surface/90 border-b border-border-subtle z-40 px-4 md:px-8 h-14 flex items-center">
        <div className="w-full max-w-[1120px] mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Logo & Mode Switch */}
          <div className="flex items-center gap-4">
            <NavLink to="/app" className="flex items-center gap-2 select-none group">
              <span className="font-display font-bold text-[22px] tracking-tight text-text-primary">
                VYRO
              </span>
              <span className="w-2 h-2 rounded-full bg-volt" />
            </NavLink>

            <div className="hidden sm:block">
              <ModeSwitch />
            </div>
          </div>

          {/* Center: Command Palette Bar (⌘K / Ctrl+K) */}
          <div className="flex-1 max-w-[440px] hidden md:block">
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="w-full h-9 px-3 bg-raised border border-border-subtle rounded-control text-secondary text-text-muted hover:text-text-primary flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-text-muted" strokeWidth={2} />
                <span>Search or jump to...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-secondary text-text-muted bg-surface border border-border-subtle rounded">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Actions, Notifications, Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Search Button */}
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="md:hidden p-2 text-text-muted hover:text-text-primary rounded-control cursor-pointer"
              title="Search"
            >
              <Search className="w-5 h-5" strokeWidth={2} />
            </button>

            {/* Notification Bell */}
            <NavLink
              to="/app/notifications"
              className="p-2 text-text-muted hover:text-text-primary rounded-control hover:bg-raised transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4.5 h-4.5" strokeWidth={2} />
            </NavLink>

            {/* User Avatar Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="cursor-pointer focus:outline-none rounded-full"
                title={user?.displayName || 'Account'}
              >
                <Avatar name={user?.displayName || 'User'} size="md" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-surface border border-border-subtle rounded-surface shadow-decision p-2 z-50 flex flex-col gap-1">
                  <div className="px-3 py-2 border-b border-border-subtle mb-1">
                    <p className="font-semibold text-secondary text-text-primary truncate">
                      {user?.displayName || 'My Account'}
                    </p>
                    <p className="text-secondary text-text-muted truncate">
                      {user?.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                      setShowUserMenu(false);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-control hover:bg-raised text-secondary text-text-primary cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {isLightMode ? (
                        <Moon className="w-4 h-4 text-text-muted" strokeWidth={2} />
                      ) : (
                        <SunMedium className="w-4 h-4 text-text-muted" strokeWidth={2} />
                      )}
                      <span>{isLightMode ? 'Dark theme' : 'Light theme'}</span>
                    </span>
                  </button>

                  <NavLink
                    to="/app/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-control hover:bg-raised text-secondary text-text-primary"
                  >
                    <User className="w-4 h-4 text-text-muted" strokeWidth={2} />
                    <span>Account settings</span>
                  </NavLink>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-control hover:bg-status-declined/10 text-secondary text-status-declined text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={2} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* 2. MAIN CONTENT (MAX ~1120px) */}
      <main className="flex-1 w-full max-w-[1120px] mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-12">
        {children || <Outlet />}
      </main>

      {/* 3. MOBILE BOTTOM TABS */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 border-t border-border-subtle px-4 flex items-center justify-around z-40">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || 
            (item.to !== '/app' && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center min-w-[50px] transition-colors ${
                isActive ? 'text-volt font-medium' : 'text-text-muted'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.8} />
              <span className="text-secondary leading-tight mt-1">{item.label}</span>
            </NavLink>
          );
        })}

        {/* Mobile New Action Pill */}
        <button
          type="button"
          onClick={handleNewAction}
          className="w-10 h-10 rounded-full bg-volt text-[#0C0E0D] flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
          title={isSeller ? 'New listing' : 'New request'}
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </nav>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </div>
  );
};
