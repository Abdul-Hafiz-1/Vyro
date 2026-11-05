import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Globe2,
  Bot,
  Scale,
  CreditCard,
  BarChart3,
  Settings,
  HelpCircle,
  Menu,
  X,
  Plus,
  Cpu,
  Bell,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Button } from './Button';
import { Badge } from './Badge';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();

  const { data: statusData } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: api.getSystemStatus,
    refetchInterval: 15000
  });

  const { data: activityData } = useQuery({
    queryKey: ['activityFeed'],
    queryFn: () => api.getActivity(8),
    refetchInterval: 10000
  });

  const navigation = [
    { name: 'Overview', href: '/app', icon: LayoutDashboard },
    { name: 'Network', href: '/app/network', icon: Globe2 },
    { name: 'Agents', href: '/app/agents', icon: Bot },
    { name: 'Negotiations', href: '/app/negotiations', icon: Scale },
    { name: 'Transactions', href: '/app/transactions', icon: CreditCard },
    { name: 'Analytics', href: '/app/analytics', icon: BarChart3 },
  ];

  const secondaryNav = [
    { name: 'Settings', href: '/app/settings', icon: Settings },
    { name: 'Architecture & Help', href: '/how-it-works', icon: HelpCircle },
  ];

  const currentNav = navigation.find(item => item.href === location.pathname) 
    || secondaryNav.find(item => item.href === location.pathname)
    || { name: 'Workspace' };

  return (
    <div className="min-h-screen bg-vyro-bg flex">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-vyro-secondary border-r border-vyro-border transition-all duration-200 ease-in-out
          ${sidebarOpen ? 'w-64' : 'w-20'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-vyro-border/70">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-[6px] bg-vyro-surface border border-vyro-border flex items-center justify-center text-vyro-accent shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-mono font-bold tracking-tight text-vyro-text text-sm">VYRO</span>
                <span className="text-[9px] uppercase tracking-wider text-vyro-muted font-mono">Autonomous Net</span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 rounded text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface transition-colors"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded text-vyro-muted hover:text-vyro-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button */}
        <div className="p-3 border-b border-vyro-border/40">
          <Link to="/app/requests/new">
            <Button
              variant="accent"
              size="sm"
              className={`w-full justify-center ${!sidebarOpen && 'px-2'}`}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {sidebarOpen ? 'New Request' : ''}
            </Button>
          </Link>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/app' && location.pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors group ${
                  isActive
                    ? 'bg-vyro-surface text-vyro-text border border-vyro-border font-semibold'
                    : 'text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface/50'
                }`}
                title={!sidebarOpen ? item.name : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-vyro-accent' : 'text-vyro-muted group-hover:text-vyro-text'}`} />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Secondary / Settings Navigation */}
        <div className="p-2.5 border-t border-vyro-border/60 space-y-1">
          {secondaryNav.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors group ${
                  isActive
                    ? 'bg-vyro-surface text-vyro-text border border-vyro-border'
                    : 'text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface/50'
                }`}
                title={!sidebarOpen ? item.name : undefined}
              >
                <Icon className="w-4 h-4 shrink-0 text-vyro-muted group-hover:text-vyro-text" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}

          {/* User profile card */}
          {sidebarOpen ? (
            <div className="mt-3 p-2 rounded-[6px] bg-vyro-surface/60 border border-vyro-border flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-vyro-hover border border-vyro-border flex items-center justify-center font-mono text-[11px] text-vyro-accent">
                  SB
                </div>
                <div className="truncate">
                  <div className="text-xs font-medium text-vyro-text truncate">Apex Studio</div>
                  <div className="text-[10px] text-vyro-muted font-mono truncate">buyer@vyro.network</div>
                </div>
              </div>
              <Badge variant="success" size="sm">Active</Badge>
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <div className="w-7 h-7 rounded-full bg-vyro-hover border border-vyro-border flex items-center justify-center font-mono text-[11px] text-vyro-accent" title="Apex Studio">
                SB
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}`}>
        {/* Top Navbar */}
        <header className="h-16 bg-vyro-bg/90 backdrop-blur-md border-b border-vyro-border sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-vyro-muted">
              <span>VYRO Network</span>
              <ChevronRight className="w-3.5 h-3.5 text-vyro-subtle" />
              <span className="text-vyro-text font-medium">{currentNav.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Network Health Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-vyro-surface border border-vyro-border text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-vyro-success animate-pulse-subtle" />
              <span className="text-vyro-muted">Network:</span>
              <span className="text-vyro-text font-semibold">Autonomous Mesh Live</span>
            </div>

            {/* Notifications Trigger */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-[6px] bg-vyro-surface hover:bg-vyro-hover border border-vyro-border text-vyro-muted hover:text-vyro-text transition-colors relative"
                aria-label="View activity alerts"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-vyro-accent rounded-full" />
              </button>

              {/* Activity Drawer */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-vyro-surface border border-vyro-border rounded-[8px] shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-vyro-border">
                    <span className="text-xs font-mono font-semibold text-vyro-text uppercase tracking-wider">Telemetry Stream</span>
                    <Badge variant="accent" size="sm">Real-time</Badge>
                  </div>
                  <div className="space-y-2.5 max-h-80 overflow-y-auto">
                    {activityData && activityData.length > 0 ? (
                      activityData.map((evt) => (
                        <div key={evt.id} className="p-2 rounded bg-vyro-card border border-vyro-border/60 text-xs">
                          <div className="flex items-center justify-between font-medium text-vyro-text text-[11px]">
                            <span className="truncate">{evt.title}</span>
                            <span className="font-mono text-[9px] text-vyro-subtle shrink-0">
                              {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-vyro-muted mt-1 leading-snug">{evt.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-vyro-muted py-4 text-center">No recent network events.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Demo Flow Trigger */}
            <Link to="/app/requests/new">
              <Button size="sm" variant="secondary" className="hidden sm:inline-flex text-xs">
                Launch Request
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
