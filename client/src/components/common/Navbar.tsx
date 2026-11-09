import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Cpu } from 'lucide-react';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const navLinks = [
    { label: 'Marketplace', href: '/app/marketplace' },
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Security', href: '/security' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-vyro-bg/85 backdrop-blur-md border-b border-vyro-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-[6px] bg-vyro-surface border border-vyro-border flex items-center justify-center text-vyro-accent group-hover:border-vyro-accent/50 transition-colors">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-vyro-text font-mono">VYRO</span>
            <span className="text-[9px] uppercase tracking-widest text-vyro-muted -mt-1 font-mono">Autonomous Commerce</span>
          </div>
        </Link>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-xs uppercase tracking-wider font-mono text-vyro-muted hover:text-vyro-text transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/app">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Launch Console
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
