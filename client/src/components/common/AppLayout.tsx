import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { EASE_STANDARD } from '../../lib/motion';
import { Avatar } from './Avatar';
import { ModeSwitch } from './ModeSwitch';
import { CommandPalette } from './CommandPalette';
import { api } from '../../api/client';
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
  SunMedium,
  CreditCard,
  FileText,
  SlidersHorizontal,
  HelpCircle,
  Tag
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

  const menuRef = useRef<HTMLDivElement>(null);

  // Redirect newly created accounts through first-run onboarding once
  useEffect(() => {
    if (user && user.onboardingCompleted === false && location.pathname.startsWith('/app')) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Close avatar menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Query live counts for Deals badge and Notifications bell
  const { data: homeData } = useQuery({
    queryKey: ['home'],
    queryFn: api.getHome,
    refetchInterval: 10000,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.getNotifications,
    refetchInterval: 15000,
  });

  const needsCount = homeData?.needsYou?.length || 0;
  const unreadNotificationsCount = notifications?.filter((n) => !n.read)?.length || 0;

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

  // Labeled desktop tabs
  const buyingTabs = [
    { to: '/app', label: 'Today', exact: true },
    { to: '/app/requests/new', label: 'Requests', exact: false },
    { to: '/app/deals', label: 'Deals', exact: false, badge: needsCount > 0 ? needsCount : null },
    { to: '/app/marketplace', label: 'Marketplace', exact: false },
    { to: '/app/transactions', label: 'Payments', exact: false },
  ];

  const sellingTabs = [
    { to: '/app', label: 'Today', exact: true },
    { to: '/app/listings', label: 'Listings', exact: false },
    { to: '/app/deals', label: 'Deals', exact: false, badge: needsCount > 0 ? needsCount : null },
    { to: '/app/transactions', label: 'Payments', exact: false },
  ];

  const desktopTabs = isSeller ? sellingTabs : buyingTabs;

  // Mobile bottom bar items (5 max, icon + word, center primary action)
  const mobileNavItems = isSeller
    ? [
        { to: '/app', label: 'Today', icon: Sun, exact: true },
        { to: '/app/listings', label: 'Listings', icon: Store, exact: false },
        { 
          isCenterAction: true, 
          label: 'Listing', 
          action: () => navigate('/app/listings/new'),
          icon: Plus
        },
        { to: '/app/deals', label: 'Deals', icon: Handshake, exact: false, badge: needsCount > 0 ? needsCount : null },
        { to: '/app/transactions', label: 'Payments', icon: CreditCard, exact: false },
      ]
    : [
        { to: '/app', label: 'Today', icon: Sun, exact: true },
        { to: '/app/marketplace', label: 'Market', icon: Store, exact: false },
        { 
          isCenterAction: true, 
          label: 'Request', 
          action: () => navigate('/app/requests/new'),
          icon: Plus
        },
        { to: '/app/deals', label: 'Deals', icon: Handshake, exact: false, badge: needsCount > 0 ? needsCount : null },
        { to: '/app/transactions', label: 'Payments', icon: CreditCard, exact: false },
      ];

  const handlePrimaryNewAction = () => {
    if (isSeller) {
      navigate('/app/listings/new');
    } else {
      navigate('/app/requests/new');
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col selection:bg-volt selection:text-[#0C0E0D]">
      {/* 1. TOP BAR (ALWAYS VISIBLE) */}
      <header className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-border-subtle z-40 px-3 sm:px-6 md:px-8 h-14 flex items-center">
        <div className="w-full max-w-[1120px] mx-auto flex items-center justify-between gap-3 md:gap-4">
          
          {/* Left: Logo · [Buying | Selling] Mode Switch */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <NavLink to="/app" className="flex items-center gap-2 select-none group">
              <span className="font-display font-bold text-[20px] sm:text-[22px] tracking-tight text-text-primary">
                VYRO
              </span>
              <span className="w-2 h-2 rounded-full bg-volt" />
            </NavLink>

            <div className="flex items-center">
              <ModeSwitch />
            </div>
          </div>

          {/* Center: Labeled Tabs (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {desktopTabs.map((tab) => {
              const isActive = tab.exact
                ? location.pathname === tab.to
                : location.pathname.startsWith(tab.to);

              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={`px-3 py-1.5 rounded-control text-secondary font-medium transition-colors flex items-center gap-1.5 relative ${
                    isActive
                      ? 'text-text-primary font-semibold'
                      : 'text-text-muted hover:text-text-primary hover:bg-raised/50'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="vyro-nav-indicator"
                      transition={{ duration: 0.2, ease: EASE_STANDARD }}
                      className="absolute inset-0 rounded-control bg-raised border border-border-subtle shadow-sm -z-10"
                    />
                  )}
                  <span>{tab.label}</span>
                  {tab.badge !== null && tab.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-chip text-[11px] font-bold bg-volt text-[#0C0E0D] ml-0.5">
                      {tab.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right: Search Icon · Bell with Count · Avatar Menu · Primary Action Button */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Search Icon Button with Tooltip */}
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-raised rounded-control transition-colors cursor-pointer relative group"
              title="Search ⌘K"
              aria-label="Search or command palette"
            >
              <Search className="w-4.5 h-4.5" strokeWidth={2} />
              <span className="sr-only">Search ⌘K</span>
            </button>

            {/* Notification Bell with Count */}
            <NavLink
              to="/app/notifications"
              className="p-2 text-text-muted hover:text-text-primary hover:bg-raised rounded-control transition-colors relative"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5" strokeWidth={2} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-status-declined text-[#FFFFFF] text-[10px] font-bold flex items-center justify-center leading-none">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </NavLink>

            {/* Avatar Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="cursor-pointer focus:outline-none rounded-full flex items-center"
                title={user?.displayName || 'Account menu'}
                aria-label="User profile menu"
                aria-expanded={showUserMenu}
              >
                <Avatar name={user?.displayName || 'User'} size="md" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-surface border border-border-subtle rounded-surface shadow-decision p-1.5 z-50 flex flex-col gap-0.5">
                  {/* User identity banner */}
                  <div className="px-3 py-2.5 border-b border-border-subtle mb-1">
                    <p className="font-semibold text-body text-text-primary truncate">
                      {user?.displayName || 'My Account'}
                    </p>
                    <p className="text-secondary text-text-muted truncate">
                      {user?.email}
                    </p>
                  </div>

                  {/* 1. Profile */}
                  <NavLink
                    to="/app/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-control hover:bg-raised text-secondary text-text-primary transition-colors"
                  >
                    <User className="w-4 h-4 text-text-muted" strokeWidth={2} />
                    <span>Profile</span>
                  </NavLink>

                  {/* 2. Spending limits and rules */}
                  <NavLink
                    to="/app/rules"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-control hover:bg-raised text-secondary text-text-primary transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-text-muted" strokeWidth={2} />
                    <span>Spending limits and rules</span>
                  </NavLink>

                  {/* 3. Notifications */}
                  <NavLink
                    to="/app/notifications"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-control hover:bg-raised text-secondary text-text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Bell className="w-4 h-4 text-text-muted" strokeWidth={2} />
                      <span>Notifications</span>
                    </span>
                    {unreadNotificationsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-chip text-[11px] font-semibold bg-raised border border-border-subtle text-text-muted">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </NavLink>

                  {/* 4. Theme */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                      setShowUserMenu(false);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-control hover:bg-raised text-secondary text-text-primary cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      {isLightMode ? (
                        <Moon className="w-4 h-4 text-text-muted" strokeWidth={2} />
                      ) : (
                        <SunMedium className="w-4 h-4 text-text-muted" strokeWidth={2} />
                      )}
                      <span>Theme</span>
                    </span>
                    <span className="text-secondary text-text-muted">
                      {isLightMode ? 'Dark' : 'Light'}
                    </span>
                  </button>

                  {/* 5. Help */}
                  <NavLink
                    to="/app/help"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-control hover:bg-raised text-secondary text-text-primary transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-text-muted" strokeWidth={2} />
                    <span>Help</span>
                  </NavLink>

                  <div className="my-1 border-t border-border-subtle" />

                  {/* 6. Sign out */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-control hover:bg-status-declined/10 text-secondary text-status-declined text-left cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={2} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Primary Action Button ("New request" when Buying, "New listing" when Selling) */}
            <div className="hidden sm:block">
              <button
                type="button"
                onClick={handlePrimaryNewAction}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-control font-semibold text-secondary bg-volt text-[#0C0E0D] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span>{isSeller ? 'New listing' : 'New request'}</span>
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* 2. MAIN CONTENT (MAX ~1120px) */}
      <main className="flex-1 w-full max-w-[1120px] mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-12">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_STANDARD }}
        >
          {children || <Outlet />}
        </motion.div>
      </main>

      {/* 3. MOBILE BOTTOM BAR (MAX 5 LABELED TABS, ICON + WORD, CENTER PRIMARY BUTTON) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-md border-t border-border-subtle px-2 flex items-center justify-around z-40 shadow-decision">
        {mobileNavItems.map((item, idx) => {
          if (item.isCenterAction) {
            const Icon = item.icon!;
            return (
              <button
                key="center-action"
                type="button"
                onClick={item.action}
                className="flex flex-col items-center justify-center -mt-3.5 cursor-pointer group active:scale-95 transition-transform"
                title={item.label}
              >
                <div className="w-11 h-11 rounded-full bg-volt text-[#0C0E0D] flex items-center justify-center shadow-md">
                  <Icon className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <span className="text-secondary font-semibold text-text-primary mt-0.5 leading-tight">
                  {item.label}
                </span>
              </button>
            );
          }

          const Icon = item.icon!;
          const toPath = item.to || '/app';
          const isActive = item.exact 
            ? location.pathname === toPath
            : location.pathname.startsWith(toPath);

          return (
            <NavLink
              key={toPath}
              to={toPath}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors relative ${
                isActive ? 'text-volt font-semibold' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.8} />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1 rounded-full bg-volt text-[#0C0E0D] text-[10px] font-bold leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-secondary leading-tight mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </div>
  );
};
