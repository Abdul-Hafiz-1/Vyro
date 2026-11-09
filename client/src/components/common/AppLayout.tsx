import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { 
  Sun, 
  Handshake, 
  Store, 
  User, 
  Plus, 
  LogOut, 
  ListOrdered,
  Sparkles
} from 'lucide-react';

export const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, isSellerWorkspace, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isSeller = isSellerWorkspace;

  // Navigation Items
  const navItems = isSeller
    ? [
        { to: '/app', label: 'Today', icon: Sun },
        { to: '/app/listings', label: 'Listings', icon: Store },
        { to: '/app/deals', label: 'Deals', icon: Handshake },
        { to: '/app/settings', label: 'Account', icon: User },
      ]
    : [
        { to: '/app', label: 'Today', icon: Sun },
        { to: '/app/deals', label: 'Deals', icon: Handshake },
        { to: '/app/marketplace', label: 'Marketplace', icon: Store },
        { to: '/app/settings', label: 'Account', icon: User },
      ];

  const handleNewAction = () => {
    if (isSeller) {
      navigate('/app/listings/new');
    } else {
      navigate('/app/requests/new');
    }
  };

  const actionLabel = isSeller ? 'New listing' : 'New request';

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* 1. TOP BAR (DESKTOP) */}
      <header className="sticky top-0 bg-paper border-b-2 border-ink z-40 px-4 md:px-8 py-3">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between gap-4">
          
          {/* Logo */}
          <NavLink to="/app" className="flex items-center gap-2 select-none group">
            <div className="w-10 h-10 rounded-full bg-sun border-2 border-ink flex items-center justify-center font-display font-bold text-card-title text-ink shadow-hard-sm group-hover:-translate-y-0.5 transition-transform">
              V
            </div>
            <span className="font-display font-bold text-[26px] tracking-tight text-ink">
              VYRO
            </span>
          </NavLink>

          {/* Centered Desktop Pill Tabs */}
          <nav className="hidden md:flex items-center gap-2 bg-card border-2 border-ink rounded-full p-1.5 shadow-hard-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || 
                (item.to !== '/app' && location.pathname.startsWith(item.to));

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-body transition-all select-none ${
                    isActive
                      ? 'bg-sun text-ink border-2 border-ink shadow-hard-sm translate-y-0'
                      : 'text-muted hover:text-ink hover:bg-paper'
                  }`}
                >
                  <Icon className="w-4 h-4 text-ink" strokeWidth={2.5} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action: Big Coral Pill + Avatar */}
          <div className="flex items-center gap-3">
            <Button
              variant="coral"
              size="md"
              onClick={handleNewAction}
              icon={<Plus className="w-5 h-5 text-ink" strokeWidth={3} />}
              className="hidden sm:inline-flex"
            >
              {actionLabel}
            </Button>

            {/* Avatar & User Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="cursor-pointer focus:outline-none rounded-full"
                title={user?.displayName || 'Account'}
              >
                <Avatar name={user?.displayName || 'User'} size="md" variant="sun" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-card border-2 border-ink rounded-[20px] shadow-hard p-3 z-50 flex flex-col gap-1">
                  <div className="px-3 py-2 border-b-2 border-ink mb-1">
                    <p className="font-bold text-body text-ink truncate">
                      {user?.displayName || 'My Account'}
                    </p>
                    <p className="text-small text-muted truncate">
                      {user?.email}
                    </p>
                  </div>

                  <NavLink
                    to="/app/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-paper font-bold text-body text-ink"
                  >
                    <User className="w-4 h-4 text-ink" strokeWidth={2.5} />
                    <span>Account settings</span>
                  </NavLink>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-rose/20 text-rose font-bold text-body text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose" strokeWidth={2.5} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* 2. MAIN CONTENT COLUMN (MAX 880px) */}
      <main className="flex-1 w-full max-w-[880px] mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-12">
        {children || <Outlet />}
      </main>

      {/* 3. MOBILE FLOATING BOTTOM TAB BAR */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 max-w-[400px] mx-auto bg-card border-2 border-ink rounded-full shadow-hard px-3 py-2 flex items-center justify-around z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || 
            (item.to !== '/app' && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-full transition-all ${
                isActive ? 'text-coral font-bold' : 'text-muted font-medium'
              }`}
            >
              <Icon className="w-5 h-5 text-ink" strokeWidth={isActive ? 3 : 2} />
              <span className="text-[14px] leading-tight text-ink mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}

        {/* Round "+" Button */}
        <button
          type="button"
          onClick={handleNewAction}
          className="w-12 h-12 rounded-full bg-coral border-2 border-ink shadow-hard flex items-center justify-center cursor-pointer active:translate-y-0.75 active:shadow-hard-press"
          title={actionLabel}
        >
          <Plus className="w-6 h-6 text-ink" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};
