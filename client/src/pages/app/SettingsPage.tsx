import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User,
  ShieldCheck,
  CreditCard,
  Bell,
  Pause,
  Play,
  Lock,
  LogOut,
  AlertTriangle,
  Check,
  ArrowLeft
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';
import { Avatar } from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { formatName } from '../../lib/present';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Profile Form state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Pause switch state & confirmation modal
  const [isPaused, setIsPaused] = useState(user?.isAutomationPaused || false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [isUpdatingPause, setIsUpdatingPause] = useState(false);

  // Notification toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [decisionAlerts, setDecisionAlerts] = useState(true);
  const [dealUpdates, setDealUpdates] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Payments health
  const { data: paymentsHealth } = useQuery({
    queryKey: ['paymentsHealth'],
    queryFn: api.getPaymentsHealth,
    staleTime: 30000
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await api.updateProfile({ displayName, bio });
      toast.success('Profile updated.');
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConfirmTogglePause = async () => {
    const nextState = !isPaused;
    setIsUpdatingPause(true);
    try {
      await api.setAutomationPaused(nextState);
      setIsPaused(nextState);
      setShowPauseModal(false);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success(
        nextState
          ? 'Automation paused. All actions now require manual human decision.'
          : 'Automation resumed. Agents negotiate within authorized boundaries.'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update automation state');
    } finally {
      setIsUpdatingPause(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Way back (Breadcrumb) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1.5 text-secondary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Today</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1 pb-4 border-b border-border-subtle">
        <h1 className="font-display font-bold text-[28px] text-text-primary tracking-tight">
          Account Settings
        </h1>
        <p className="text-secondary text-text-muted">
          Manage your profile, automated agent permissions, notifications, and security.
        </p>
      </div>

      {/* Global Automation Pause Card */}
      <Card className="p-6 flex flex-col gap-5 border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isPaused
                  ? 'bg-status-declined/15 text-status-declined'
                  : 'bg-status-handled/15 text-status-handled'
              }`}
            >
              {isPaused ? (
                <Pause className="w-5 h-5" strokeWidth={2.5} />
              ) : (
                <Play className="w-5 h-5 ml-0.5" strokeWidth={2.5} />
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-body text-text-primary">
                  Autonomous Agent Delegation
                </span>
                <StatusChip
                  label={isPaused ? 'Paused' : 'Active'}
                  role={isPaused ? 'declined' : 'handled'}
                  size="sm"
                />
              </div>
              <p className="text-secondary text-text-muted mt-1 leading-relaxed">
                {isPaused
                  ? 'All autonomous bargaining is paused. Every proposal and agreement must be manually approved by you.'
                  : 'Agents automatically negotiate pricing and terms within your ceilings and floors, stopping only for exceptions.'}
              </p>
            </div>
          </div>

          <Button
            variant={isPaused ? 'volt' : 'outline'}
            size="md"
            onClick={() => setShowPauseModal(true)}
          >
            {isPaused ? 'Resume automation' : 'Pause automation'}
          </Button>
        </div>
      </Card>

      {/* Profile Section */}
      <div className="flex flex-col gap-4">
        <span className="font-display font-bold text-[20px] text-text-primary">
          Profile Information
        </span>

        <Card className="p-6">
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
            <div className="flex items-center gap-4 pb-6 border-b border-border-subtle">
              <Avatar name={formatName(user?.displayName)} size="lg" />
              <div className="flex flex-col">
                <span className="font-semibold text-body text-text-primary">
                  {formatName(user?.displayName)}
                </span>
                <span className="text-secondary text-text-muted">{user?.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-secondary font-medium text-text-primary">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-11 px-4 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-secondary font-medium text-text-primary">
                  Account email
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full h-11 px-4 bg-raised border border-border-subtle rounded-control text-secondary text-text-muted cursor-not-allowed opacity-75"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-secondary font-medium text-text-primary">
                Bio or studio summary
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your focus, specialties, or standard working hours…"
                className="w-full p-4 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="volt"
                size="md"
                isLoading={isSavingProfile}
              >
                Save profile
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Payment Gateway Section */}
      <div className="flex flex-col gap-4">
        <span className="font-display font-bold text-[20px] text-text-primary">
          Payment & Escrow
        </span>

        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-text-muted" strokeWidth={2} />
              <div className="flex flex-col">
                <span className="font-semibold text-body text-text-primary">
                  PayPal Sandbox Escrow
                </span>
                <span className="text-secondary text-text-muted">
                  Official payment gateway for contract authorization and settlement.
                </span>
              </div>
            </div>

            <StatusChip
              label={paymentsHealth?.connected ? 'Connected' : 'Active Sandbox'}
              role="handled"
              size="sm"
            />
          </div>

          <div className="p-4 bg-raised rounded-control border border-border-subtle flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-status-handled shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-secondary text-text-muted leading-relaxed">
              All transactions are secured by PayPal Orders v2 Sandbox. Funds are held in escrow until scope deliverables are inspected and approved.
            </p>
          </div>
        </Card>
      </div>

      {/* Notifications Preferences */}
      <div className="flex flex-col gap-4">
        <span className="font-display font-bold text-[20px] text-text-primary">
          Notifications
        </span>

        <Card className="divide-y divide-border-subtle overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium text-body text-text-primary">
                Email alerts for decision requests
              </span>
              <span className="text-secondary text-text-muted">
                Receive an email when your agent requires manual approval on a deal.
              </span>
            </div>
            <input
              type="checkbox"
              checked={decisionAlerts}
              onChange={(e) => setDecisionAlerts(e.target.checked)}
              className="w-5 h-5 accent-volt cursor-pointer"
            />
          </div>

          <div className="p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium text-body text-text-primary">
                Negotiation progress updates
              </span>
              <span className="text-secondary text-text-muted">
                Get notified when rounds conclude or when agreements are formed.
              </span>
            </div>
            <input
              type="checkbox"
              checked={dealUpdates}
              onChange={(e) => setDealUpdates(e.target.checked)}
              className="w-5 h-5 accent-volt cursor-pointer"
            />
          </div>
        </Card>
      </div>

      {/* Security & Password */}
      <div className="flex flex-col gap-4">
        <span className="font-display font-bold text-[20px] text-text-primary">
          Security & Password
        </span>

        <Card className="p-6">
          <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-secondary font-medium text-text-primary">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-11 px-4 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-secondary font-medium text-text-primary">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full h-11 px-4 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => logout()}
                leftIcon={<LogOut className="w-4 h-4" strokeWidth={2} />}
              >
                Log out
              </Button>

              <Button
                type="submit"
                variant="secondary"
                size="md"
                disabled={!currentPassword || newPassword.length < 8}
                isLoading={isChangingPassword}
              >
                Update password
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Confirmation Modal for Automation Pause */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isPaused
                    ? 'bg-status-handled/15 text-status-handled'
                    : 'bg-status-declined/15 text-status-declined'
                }`}
              >
                {isPaused ? (
                  <Play className="w-5 h-5 ml-0.5" strokeWidth={2.5} />
                ) : (
                  <Pause className="w-5 h-5" strokeWidth={2.5} />
                )}
              </div>
              <h3 className="font-display font-bold text-[20px] text-text-primary">
                {isPaused ? 'Resume autonomous delegation?' : 'Pause all agent automation?'}
              </h3>
            </div>

            <p className="text-secondary text-text-muted leading-relaxed">
              {isPaused
                ? 'Your buyer and seller agents will resume negotiating autonomously within your configured boundaries.'
                : 'Your agents will stop making autonomous commitments. All proposals, price adjustments, and agreements will halt until you manually review them.'}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowPauseModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant={isPaused ? 'volt' : 'destructive'}
                size="md"
                isLoading={isUpdatingPause}
                onClick={handleConfirmTogglePause}
              >
                {isPaused ? 'Yes, resume' : 'Yes, pause automation'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};