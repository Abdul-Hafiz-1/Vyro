import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  Inbox,
  Scale,
  Globe2,
  Store,
  Settings,
  Plus,
  Bell,
  ChevronRight,
  LogOut,
  ArrowRightLeft,
  User
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth, getInitials } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { formatName } from '../../lib/present';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { user, isBuyerWorkspace, switchWorkspace, logout } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account menu on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notificationsCount'],
    queryFn: api.getNotifications,
    refetchInterval: 15000
  });

  const unreadCount = notifications.filter(n => !n.read && !n.isRead).length;

  // Slim Desktop Navigation: Max 4 items (Today · Deals · Marketplace · Account)
  const buyerNavigation = [
    { name: 'Today', href: '/app', icon: Inbox },
    { name: 'Deals', href: '/app/deals', icon: Scale },
    { name: 'Marketplace', href: '/app/marketplace', icon: Globe2 },
    { name: 'Account', href: '/app/settings', icon: Settings },
  ];

  const sellerNavigation = [
    { name: 'Today', href: '/app', icon: Inbox },
    { name: 'Deals', href: '/app/deals', icon: Scale },
    { name: 'Listings', href: '/app/listings', icon: Store },
    { name: 'Account', href: '/app/settings', icon: Settings },
  ];

  const currentNavItems = isBuyerWorkspace ? buyerNavigation : sellerNavigation;

  // Route-derived title
  const getBreadcrumbTitle = (): string => {
    const p = location.pathname;
    if (p === '/app' || p === '/app/') return 'Today';
    if (p.startsWith('/app/deals/') || p.startsWith('/app/negotiations/')) return 'Deal';
    if (p === '/app/deals' || p === '/app/negotiations') return 'Deals';
    if (p === '/app/marketplace') return 'Marketplace';
    if (p.startsWith('/app/listings/new')) return 'New Listing';
    if (p.startsWith('/app/listings/')) return 'Listing';
    if (p === '/app/listings') return 'Listings';
    if (p === '/app/rules' || p === '/app/memory') return 'Rules';
    if (p === '/app/requests/new') return 'New Request';
    if (p.startsWith('/app/transactions/')) return 'Receipt';
    if (p === '/app/transactions') return 'Receipts';
    if (p === '/app/settings') return 'Account';
    if (p === '/app/notifications') return 'Notifications';
    return 'Today';
  };

  const breadcrumb = getBreadcrumbTitle();
  const initials = getInitials(user?.displayName);
  const cleanDisplayName = formatName(user?.displayName, 'User');

  return (
    <div className="min-h-screen bg-vyro-bg flex flex-col lg:flex-row text-vyro-text selection:bg-vyro-accent/20">
      {/* Desktop Slim Left Navigation (Icons + Labels, Max 4 items) */}
      <aside className="hidden lg:flex fixed top-0 bottom-0 left-0 w-64 z-40 flex-col bg-vyro-surface border-r border-vyro-line">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-vyro-line gap-3">
          <div className="w-8 h-8 rounded-control bg-vyro-accent flex items-center justify-center text-white font-bold text-sm">
            V
          </div>
          <span className="font-bold tracking-tight text-lg text-vyro-text">VYRO</span>
          <span className="ml-auto text-sm px-2.5 py-0.5 rounded-control bg-vyro-bg border border-vyro-line text-vyro-muted font-medium">
            {isBuyerWorkspace ? 'Buying' : 'Selling'}
          </span>
        </div>

        {/* Primary Action Button */}
        <div className="p-4 border-b border-vyro-line">
          {isBuyerWorkspace ? (
            <Link
              to="/app/requests/new"
              className="w-full h-11 flex items-center justify-center gap-2 rounded-control bg-vyro-accent hover:bg-vyro-accent-hover text-white text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-vyro-accent shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New request</span>
            </Link>
          ) : (
            <Link
              to="/app/listings/new"
              className="w-full h-11 flex items-center justify-center gap-2 rounded-control bg-vyro-accent hover:bg-vyro-accent-hover text-white text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-vyro-accent shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New listing</span>
            </Link>
          )}
        </div>

        {/* Primary Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5" aria-label="Main Navigation">
          {currentNavItems.map((item) => {
            const isActive =
              (item.href === '/app' && (location.pathname === '/app' || location.pathname === '/app/')) ||
              (item.href !== '/app' && (location.pathname === item.href || location.pathname.startsWith(item.href + '/')));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-control text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-vyro-bg text-vyro-text font-semibold border border-vyro-line'
                    : 'text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface-hover'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-vyro-accent' : 'text-vyro-muted'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Workspace Switcher in Left Sidebar */}
        <div className="p-4 border-t border-vyro-line">
          <button
            onClick={() => switchWorkspace(isBuyerWorkspace ? 'seller' : 'buyer')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-control text-sm text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-vyro-accent" />
              <span>Switch to {isBuyerWorkspace ? 'Selling' : 'Buying'}</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64 pb-20 lg:pb-0">
        {/* Top Header */}
        <header className="h-16 bg-vyro-bg/90 backdrop-blur-sm border-b border-vyro-line sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8">
          {/* Breadcrumb Title */}
          <div className="flex items-center gap-2 text-sm text-vyro-muted">
            <span className="font-semibold text-vyro-text">VYRO</span>
            <ChevronRight className="w-4 h-4 text-vyro-subtle" />
            <span className="text-vyro-text font-medium">{breadcrumb}</span>
          </div>

          {/* Right Controls: Theme Toggle, Bell, Account */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Notifications Bell */}
            <Link
              to="/app/notifications"
              className="relative p-2 rounded-control text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface transition-colors focus-visible:ring-2 focus-visible:ring-vyro-accent min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-vyro-accent" />
              )}
            </Link>

            {/* Account Profile Trigger */}
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-control hover:bg-vyro-surface transition-colors focus-visible:ring-2 focus-visible:ring-vyro-accent min-h-[44px]"
                aria-label="Account options"
                aria-expanded={accountMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-vyro-surface border border-vyro-line flex items-center justify-center text-sm font-semibold text-vyro-text">
                  {initials}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-vyro-text">
                  {cleanDisplayName}
                </span>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-card bg-vyro-surface border border-vyro-line shadow-xl py-2 z-50 text-sm">
                  <div className="px-4 py-2 border-b border-vyro-line">
                    <p className="font-semibold text-vyro-text">{cleanDisplayName}</p>
                    <p className="text-vyro-muted text-sm mt-0.5 truncate">{user?.email}</p>
                  </div>

                  <div className="p-1 border-b border-vyro-line">
                    <button
                      onClick={() => {
                        switchWorkspace(isBuyerWorkspace ? 'seller' : 'buyer');
                        setAccountMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-control text-vyro-text hover:bg-vyro-surface-hover text-left transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-vyro-accent" />
                        <span>Switch to {isBuyerWorkspace ? 'Selling' : 'Buying'}</span>
                      </div>
                    </button>
                  </div>

                  <div className="p-1 border-b border-vyro-line">
                    <Link
                      to="/app/settings"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-control text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface-hover transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Account Settings</span>
                    </Link>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-control text-status-declined hover:bg-vyro-surface-hover text-left transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area (Max width ~1040px for lists, ~720px for task pages) */}
        <main className="flex-1 p-6 sm:p-10 max-w-[1040px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (Today, Deals, New, Marketplace, Account) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-vyro-surface border-t border-vyro-line z-40 flex items-center justify-around px-2"
        aria-label="Mobile Navigation"
      >
        <Link
          to="/app"
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] py-1 text-sm font-medium transition-colors ${
            location.pathname === '/app' || location.pathname === '/app/' ? 'text-vyro-accent font-semibold' : 'text-vyro-muted hover:text-vyro-text'
          }`}
        >
          <Inbox className="w-5 h-5" />
          <span>Today</span>
        </Link>

        <Link
          to="/app/deals"
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] py-1 text-sm font-medium transition-colors ${
            location.pathname.startsWith('/app/deals') ? 'text-vyro-accent font-semibold' : 'text-vyro-muted hover:text-vyro-text'
          }`}
        >
          <Scale className="w-5 h-5" />
          <span>Deals</span>
        </Link>

        {/* Center Primary Action: New Request or New Listing */}
        <Link
          to={isBuyerWorkspace ? '/app/requests/new' : '/app/listings/new'}
          className="w-12 h-12 rounded-full bg-vyro-accent hover:bg-vyro-accent-hover active:scale-95 transition-all flex items-center justify-center text-white shadow-md mx-1 shrink-0 focus-visible:ring-2 focus-visible:ring-vyro-accent"
          aria-label={isBuyerWorkspace ? 'New request' : 'New listing'}
        >
          <Plus className="w-6 h-6" />
        </Link>

        <Link
          to={isBuyerWorkspace ? '/app/marketplace' : '/app/listings'}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] py-1 text-sm font-medium transition-colors ${
            location.pathname.startsWith('/app/marketplace') || location.pathname.startsWith('/app/listings')
              ? 'text-vyro-accent font-semibold'
              : 'text-vyro-muted hover:text-vyro-text'
          }`}
        >
          {isBuyerWorkspace ? <Globe2 className="w-5 h-5" /> : <Store className="w-5 h-5" />}
          <span>{isBuyerWorkspace ? 'Market' : 'Listings'}</span>
        </Link>

        <Link
          to="/app/settings"
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] py-1 text-sm font-medium transition-colors ${
            location.pathname.startsWith('/app/settings') ? 'text-vyro-accent font-semibold' : 'text-vyro-muted hover:text-vyro-text'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Account</span>
        </Link>
      </nav>
    </div>
  );
};
