import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cpu, Lock, Mail, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/app');
    } catch (err: any) {
      // Toast already shown in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vyro-bg flex flex-col justify-center items-center px-4 sm:px-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-control bg-vyro-surface border border-vyro-line flex items-center justify-center text-vyro-accent">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="font-semibold tracking-tight text-xl text-vyro-text">VYRO</span>
          </Link>
          <h2 className="text-2xl font-bold text-vyro-text tracking-tight">Access Autonomous Network</h2>
          <p className="text-xs text-vyro-muted mt-1">Sign in to control your procurement and seller agents</p>
        </div>

        <div className="p-6 sm:p-8 rounded-surface bg-vyro-surface border border-vyro-line shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-vyro-muted block mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  placeholder="you@company.com"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-vyro-bg border border-vyro-line rounded-control px-3.5 py-2 text-sm text-vyro-text placeholder:text-vyro-muted/50 focus:outline-none focus:ring-1 focus:ring-vyro-accent transition-colors pl-10"
                />
                <Mail className="w-4 h-4 text-vyro-muted absolute left-3.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-vyro-muted block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  placeholder="••••••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-vyro-bg border border-vyro-line rounded-control px-3.5 py-2 text-sm text-vyro-text placeholder:text-vyro-muted/50 focus:outline-none focus:ring-1 focus:ring-vyro-accent transition-colors pl-10"
                />
                <Lock className="w-4 h-4 text-vyro-muted absolute left-3.5 top-2.5" />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full justify-center mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-vyro-muted border-t border-vyro-line pt-4">
            New to VYRO?{' '}
            <Link to="/signup" className="text-vyro-accent hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || !password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        capabilities: { buying: true, selling: true }
      });
      navigate('/onboarding');
    } catch (err: any) {
      // Toast already shown in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vyro-bg flex flex-col justify-center items-center px-4 sm:px-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-control bg-vyro-surface border border-vyro-line flex items-center justify-center text-vyro-accent">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="font-semibold tracking-tight text-xl text-vyro-text">VYRO</span>
          </Link>
          <h2 className="text-2xl font-bold text-vyro-text tracking-tight">Create Network Identity</h2>
          <p className="text-xs text-vyro-muted mt-1">Deploy autonomous procurement & seller agents</p>
        </div>

        <div className="p-6 sm:p-8 rounded-surface bg-vyro-surface border border-vyro-line shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-vyro-muted block mb-1.5">
                Full Name / Organization
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Jordan Cross"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-vyro-bg border border-vyro-line rounded-control px-3.5 py-2 text-sm text-vyro-text placeholder:text-vyro-muted/50 focus:outline-none focus:ring-1 focus:ring-vyro-accent pl-10"
                />
                <UserIcon className="w-4 h-4 text-vyro-muted absolute left-3.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-vyro-muted block mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-vyro-bg border border-vyro-line rounded-control px-3.5 py-2 text-sm text-vyro-text placeholder:text-vyro-muted/50 focus:outline-none focus:ring-1 focus:ring-vyro-accent pl-10"
                />
                <Mail className="w-4 h-4 text-vyro-muted absolute left-3.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-vyro-muted block mb-1.5">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-vyro-bg border border-vyro-line rounded-control px-3.5 py-2 text-sm text-vyro-text placeholder:text-vyro-muted/50 focus:outline-none focus:ring-1 focus:ring-vyro-accent pl-10"
                />
                <Lock className="w-4 h-4 text-vyro-muted absolute left-3.5 top-2.5" />
              </div>
            </div>

            <div className="p-3 rounded-control bg-vyro-bg border border-vyro-line text-[11px] text-vyro-muted space-y-1">
              <div className="flex items-center gap-1.5 text-vyro-text font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-vyro-accent" />
                <span>Unified Account (Dual-Role Enabled)</span>
              </div>
              <p>You can buy and sell from this single account with isolated workspaces.</p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full justify-center mt-2"
            >
              {loading ? 'Creating Identity...' : 'Initialize Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-vyro-muted border-t border-vyro-line pt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-vyro-accent hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
