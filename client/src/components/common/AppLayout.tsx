import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  Inbox,
  Scale,
  Globe2,
  Sliders,
  Plus,
  Bell,
  ChevronRight,
  Store,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Check,
  ArrowRightLeft,
  Receipt
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth, getInitials } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { user, isBuyerWorkspace, isSellerWorkspace, switchWorkspace, logout } = useAuth();
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

  // Buyer navigation: Today · Deals · Marketplace · Rules · Receipts
  const buyerNavigation = [
    { name: 'Today', href: '/app', icon: Inbox },
    { name: 'Deals', href: '/app/deals', icon: Scale },
    { name: 'Marketplace', href: '/app/marketplace', icon: Globe2 },
    { name: 'Rules', href: '/app/rules', icon: Sliders },
    { name: 'Receipts', href: '/app/transactions', icon: Receipt },
  ];

  // Seller navigation: Today · Listings · Deals · Rules · Receipts
  const sellerNavigation = [
    { name: 'Today', href: '/app', icon: Inbox },
    { name: 'Listings', href: '/app/listings', icon: Store },
    { name: 'Deals', href: '/app/deals', icon: Scale },
    { name: 'Rules', href: '/app/rules', icon: Sliders },
    { name: 'Receipts', href: '/app/transactions', icon: Receipt },
  ];

  const currentNavItems = isBuyerWorkspace ? buyerNavigation : sellerNavigation;

  // Route-derived breadcrumb title
  const getBreadcrumbTitle = (): string => {
    const p = location.pathname;
    if (p === '/app' || p === '/app/') return 'Today';
    if (p.startsWith('/app/deals/') || p.startsWith('/app/negotiations/')) return 'Deal Detail';
    if (p === '/app/deals' || p === '/app/negotiations') return 'Deals';
    if (p === '/app/marketplace') return 'Marketplace';
    if (p.startsWith('/app/listings/new')) return 'New Listing';
    if (p.startsWith('/app/listings/')) return 'Edit Listing';
    if (p === '/app/listings') return 'Listings';
    if (p === '/app/rules' || p === '/app/memory') return 'Rules';
    if (p === '/app/requests/new') return 'New Request';
    if (p.startsWith('/app/transactions/')) return 'Receipt Detail';
    if (p === '/app/transactions') return 'Receipts';
    if (p === '/app/settings') return 'Settings';
    if (p === '/app/notifications') return 'Notifications';
    return 'Operations Desk';
  };

  const breadcrumb = getBreadcrumbTitle();
  const initials = getInitials(user?.displayName);

  return (
    <div className="min-h-screen bg-vyro-bg flex flex-col lg:flex-row text-vyro-text selection:bg-vyro-accent/20">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex fixed top-0 bottom-0 left-0 w-60 z-40 flex-col bg-vyro-surface border-r border-vyro-line">
        {/* Brand */}
        <div className="h-14 flex items-center px-4 border-b border-vyro-line gap-2.5">
          <div className="w-6 h-6 rounded-control bg-vyro-accent flex items-center justify-center text-white font-bold text-xs">
            V
          </div>
          <span className="font-semibold tracking-tight text-sm text-vyro-text">VYRO</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-control bg-vyro-bg border border-vyro-line text-vyro-muted">
            {isBuyerWorkspace ? 'Buying' : 'Selling'}
          </span>
        </div>

        {/* Primary Action Button (Only in Sidebar) */}
        <div className="p-3 border-b border-vyro-line-subtle">
          {isBuyerWorkspace ? (
            <Link
              to="/app/requests/new"
              className="w-full h-9 flex items-center justify-center gap-2 rounded-control bg-vyro-accent hover:bg-vyro-accent-hover text-white text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-vyro-accent"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New request</span>
            </Link>
          ) : (
            <Link
              to="/app/listings/new"
              className="w-full h-9 flex items-center justify-center gap-2 rounded-control bg-vyro-accent hover:bg-vyro-accent-hover text-white text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-vyro-accent"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New listing</span>
            </Link>
          )}
        </div>

        {/* Primary Nav Links */}
        <nav className="flex-1 px-2 py-3 space-y-1">
          {currentNavItems.map((item) => {
            const isActive =
              (item.href === '/app' && (location.pathname === '/app' || location.pathname === '/app/')) ||
              (item.href !== '/app' && (location.pathname === item.href || location.pathname.startsWith(item.href + '/')));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-control text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-vyro-bg text-vyro-text font-semibold border border-vyro-line'
                    : 'text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface-hover'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-vyro-accent' : 'text-vyro-muted'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quiet Mode Footnote */}
        <div className="p-3 border-t border-vyro-line text-xs text-vyro-subtle flex items-center justify-between">
          <span>AI autonomous mode</span>
          <span className="w-2 h-2 rounded-full bg-status-handled" title="Autonomous agents active" />
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-60 pb-16 lg:pb-0">
        {/* Top Header */}
        <header className="h-14 bg-vyro-bg/90 backdrop-blur-sm border-b border-vyro-line sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
          {/* Breadcrumb Title & Workspace Indicator */}
          <div className="flex items-center gap-2 text-xs text-vyro-muted">
            <span className="font-semibold text-vyro-text">VYRO</span>
            <ChevronRight className="w-3.5 h-3.5 text-vyro-subtle" />
            <span className="text-vyro-text font-medium">{breadcrumb}</span>
            <span className="text-vyro-line">·</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold border ${
              isBuyerWorkspace
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isBuyerWorkspace ? 'Buying' : 'Selling'}
            </span>
          </div>

          {/* Right Controls: Theme Toggle, Bell, Account Menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Notifications Bell */}
            <Link
              to="/app/notifications"
              className="relative p-1.5 rounded-control text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface transition-colors focus-visible:ring-2 focus-visible:ring-vyro-accent"
              aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-vyro-accent" />
              )}
            </Link>

            {/* Account Menu Dropdown */}
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-control hover:bg-vyro-surface transition-colors focus-visible:ring-2 focus-visible:ring-vyro-accent"
                aria-label="Account menu"
                aria-expanded={accountMenuOpen}
              >
                <div className="w-7 h-7 rounded-full bg-vyro-surface border border-vyro-line flex items-center justify-center text-xs font-semibold text-vyro-text">
                  {initials}
                </div>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-surface bg-vyro-surface border border-vyro-line shadow-xl py-1 z-50 text-xs">
                  <div className="px-3.5 py-2.5 border-b border-vyro-line">
                    <p className="font-semibold text-vyro-text truncate">{user?.displayName || 'User'}</p>
                    <p className="text-vyro-muted text-xs truncate mt-0.5">{user?.email}</p>
                  </div>

                  {/* Workspace Switcher */}
                  <div className="p-1 border-b border-vyro-line">
                    <button
                      onClick={() => {
                        switchWorkspace(isBuyerWorkspace ? 'seller' : 'buyer');
                        setAccountMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-control text-vyro-text hover:bg-vyro-surface-hover text-left transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-vyro-accent" />
                        <span>Switch to {isBuyerWorkspace ? 'Selling' : 'Buying'}</span>
                      </div>
                      <span className="text-[11px] text-vyro-muted">
                        Active: {isBuyerWorkspace ? 'Buying' : 'Selling'}
                      </span>
                    </button>
                  </div>

                  {/* Secondary Links */}
                  <div className="p-1 border-b border-vyro-line">
                    <Link
                      to="/app/rules"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-control text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface-hover transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Automation Rules</span>
                    </Link>
                    <Link
                      to="/app/settings"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-control text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface-hover transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Settings & Server Status</span>
                    </Link>
                    <Link
                      to="/how-it-works"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-control text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface-hover transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Documentation</span>
                    </Link>
                  </div>

                  {/* Sign out */}
                  <div className="p-1">
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-control text-status-declined hover:bg-vyro-surface-hover text-left transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Routed Content Area */}
        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (Today, Deals, New, Marketplace, Menu) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-vyro-surface border-t border-vyro-line z-40 flex items-center justify-around px-2"
        aria-label="Mobile Navigation"
      >
        <Link
          to="/app"
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[11px] font-medium ${
            location.pathname === '/app' || location.pathname === '/app/' ? 'text-vyro-accent' : 'text-vyro-muted'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Today</span>
        </Link>

        <Link
          to="/app/deals"
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[11px] font-medium ${
            location.pathname.startsWith('/app/deals') ? 'text-vyro-accent' : 'text-vyro-muted'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Deals</span>
        </Link>

        {/* Center Primary Action */}
        <Link
          to={isBuyerWorkspace ? '/app/requests/new' : '/app/listings/new'}
          className="w-9 h-9 rounded-full bg-vyro-accent flex items-center justify-center text-white shadow-md mx-1 shrink-0"
          aria-label={isBuyerWorkspace ? 'New request' : 'New listing'}
        >
          <Plus className="w-4 h-4" />
        </Link>

        <Link
          to="/app/marketplace"
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[11px] font-medium ${
            location.pathname.startsWith('/app/marketplace') ? 'text-vyro-accent' : 'text-vyro-muted'
          }`}
        >
          <Globe2 className="w-4 h-4" />
          <span>Market</span>
        </Link>

        <Link
          to="/app/rules"
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[11px] font-medium ${
            location.pathname.startsWith('/app/rules') ? 'text-vyro-accent' : 'text-vyro-muted'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Rules</span>
        </Link>
      </nav>
    </div>
  );
};
