import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cpu, ArrowRight, Lock, Mail, User } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('procurement@apexstudio.io');
  const [password, setPassword] = useState('••••••••••••');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-vyro-bg flex flex-col justify-center items-center px-4 sm:px-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-[6px] bg-vyro-surface border border-vyro-border flex items-center justify-center text-vyro-accent">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="font-mono font-bold tracking-tight text-xl text-vyro-text">VYRO</span>
          </Link>
          <h2 className="text-2xl font-bold text-vyro-text tracking-tight">Access Autonomous Network</h2>
          <p className="text-xs text-vyro-muted mt-1">Sign in to control your procurement and seller agents</p>
        </div>

        <div className="p-6 sm:p-8 rounded-[8px] bg-vyro-surface border border-vyro-border shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-sm text-vyro-text focus:outline-none focus:border-vyro-accent transition-colors pl-10"
                />
                <Mail className="w-4 h-4 text-vyro-subtle absolute left-3.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-sm text-vyro-text focus:outline-none focus:border-vyro-accent transition-colors pl-10"
                />
                <Lock className="w-4 h-4 text-vyro-subtle absolute left-3.5 top-2.5" />
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full justify-center">
              Sign In to Console
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-vyro-border text-center text-xs text-vyro-muted">
            <span>Demo authentication enabled. </span>
            <button
              onClick={() => navigate('/app')}
              className="text-vyro-accent hover:underline font-medium"
            >
              Skip directly to Dashboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-vyro-bg flex flex-col justify-center items-center px-4 sm:px-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-[6px] bg-vyro-surface border border-vyro-border flex items-center justify-center text-vyro-accent">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="font-mono font-bold tracking-tight text-xl text-vyro-text">VYRO</span>
          </Link>
          <h2 className="text-2xl font-bold text-vyro-text tracking-tight">Create Network Identity</h2>
          <p className="text-xs text-vyro-muted mt-1">Deploy autonomous procurement & seller agents</p>
        </div>

        <div className="p-6 sm:p-8 rounded-[8px] bg-vyro-surface border border-vyro-border shadow-xl">
          <form onSubmit={(e) => { e.preventDefault(); navigate('/app'); }} className="space-y-4">
            <div>
              <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">
                Full Name / Organization
              </label>
              <input
                type="text"
                defaultValue="Apex Studio Ventures"
                required
                className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-sm text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                defaultValue="buyer@apexstudio.io"
                required
                className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-sm text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-vyro-muted block mb-1.5">
                Password
              </label>
              <input
                type="password"
                defaultValue="SecureKey123!"
                required
                className="w-full bg-vyro-card border border-vyro-border rounded-[6px] px-3.5 py-2 text-sm text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
            </div>

            <Button type="submit" variant="accent" size="lg" className="w-full justify-center">
              Initialize Account
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-vyro-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-vyro-accent hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
