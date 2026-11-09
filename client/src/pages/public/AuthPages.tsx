import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/app');
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center px-4 sm:px-6 py-12">
      <div className="max-w-md w-full flex flex-col gap-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <span className="font-display font-bold text-[32px] text-text-primary tracking-tight">
              VYRO
            </span>
          </Link>
          <h1 className="font-display font-bold text-[24px] text-text-primary tracking-tight">
            Sign in to your account
          </h1>
          <p className="text-secondary text-text-muted">
            Manage your autonomous procurement requests and seller listings.
          </p>
        </div>

        {/* Auth Card */}
        <Card className="p-8 flex flex-col gap-6 bg-surface">
          {errorMessage && (
            <div className="p-3.5 rounded-control bg-status-declined/10 border border-status-declined/30 text-secondary text-status-declined flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-secondary font-medium text-text-primary">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-text-muted absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  placeholder="name@company.com"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full h-11 pl-11 pr-4 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-secondary font-medium text-text-primary">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-text-muted absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="••••••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 pl-11 pr-11 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" strokeWidth={2} />
                  ) : (
                    <Eye className="w-5 h-5" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="volt"
              size="lg"
              fullWidth
              isLoading={loading}
              className="mt-2"
            >
              Sign in
            </Button>
          </form>

          <div className="text-center text-secondary text-text-muted pt-4 border-t border-border-subtle">
            Don’t have an account?{' '}
            <Link to="/signup" className="text-text-primary font-semibold hover:underline">
              Create account
            </Link>
          </div>
        </Card>
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
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!displayName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
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
      navigate('/app');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center px-4 sm:px-6 py-12">
      <div className="max-w-md w-full flex flex-col gap-8">
        <div className="flex flex-col items-center text-center gap-2">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <span className="font-display font-bold text-[32px] text-text-primary tracking-tight">
              VYRO
            </span>
          </Link>
          <h1 className="font-display font-bold text-[24px] text-text-primary tracking-tight">
            Create your account
          </h1>
          <p className="text-secondary text-text-muted">
            Start completely clean. Buy and sell with full isolation.
          </p>
        </div>

        <Card className="p-8 flex flex-col gap-6 bg-surface">
          {errorMessage && (
            <div className="p-3.5 rounded-control bg-status-declined/10 border border-status-declined/30 text-secondary text-status-declined flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-secondary font-medium text-text-primary">
                Full name or studio name
              </label>
              <div className="relative">
                <UserIcon className="w-5 h-5 text-text-muted absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Jordan Cross"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                  className="w-full h-11 pl-11 pr-4 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-secondary font-medium text-text-primary">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-text-muted absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 pl-11 pr-4 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-secondary font-medium text-text-primary">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-text-muted absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full h-11 pl-11 pr-11 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" strokeWidth={2} />
                  ) : (
                    <Eye className="w-5 h-5" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="volt"
              size="lg"
              fullWidth
              isLoading={loading}
              className="mt-2"
            >
              Create account
            </Button>
          </form>

          <div className="text-center text-secondary text-text-muted pt-4 border-t border-border-subtle">
            Already have an account?{' '}
            <Link to="/login" className="text-text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};