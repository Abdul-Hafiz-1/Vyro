import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Settings,
  ShieldCheck,
  User,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Zap,
  Lock,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Bell,
  Mail
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, isBuyerWorkspace, isSellerWorkspace } = useAuth();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Profile Form state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // AI & Payments queries
  const { data: aiStatus, refetch: refetchAI } = useQuery({
    queryKey: ['aiStatusSettings'],
    queryFn: api.getAIStatus,
    refetchInterval: 12000
  });

  const { data: paymentsHealth, refetch: refetchPaymentsHealth, isFetching: isCheckingPayments } = useQuery({
    queryKey: ['paymentsHealth'],
    queryFn: api.getPaymentsHealth,
    staleTime: 30000
  });

  const testMutation = useMutation({
    mutationFn: () => api.testAI(),
    onSuccess: (data) => {
      refetchAI();
      queryClient.invalidateQueries({ queryKey: ['aiStatus'] });
      if (data.isLive) {
        toast.success(`Gemini API connection verified (${data.latencyMs}ms)! Model: ${data.model}`);
      } else if (data.status === 'rate_limited') {
        toast.warning('Gemini Free Tier daily quota limit reached for this key. Autonomous fallback engine is active.');
      } else {
        toast.error(`Gemini API test failed: ${data.errorMessage || data.status}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'API test request failed');
    }
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await api.updateProfile({ displayName, bio });
      toast.success('Account profile updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getStatusBadge = () => {
    if (!aiStatus) return <Badge variant="default" size="sm">Checking...</Badge>;
    if (aiStatus.isLive) return <Badge variant="success" size="sm" dot>Connected ({aiStatus.latencyMs}ms)</Badge>;
    if (aiStatus.status === 'auth_failed') return <Badge variant="error" size="sm">Auth Failed</Badge>;
    if (aiStatus.status === 'rate_limited') return <Badge variant="error" size="sm">Rate Limited</Badge>;
    return <Badge variant="warning" size="sm">Not Configured</Badge>;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-vyro-line">
        <h1 className="text-xl font-bold text-vyro-text tracking-tight">
          Account & Operations Settings
        </h1>
        <p className="text-xs text-vyro-muted mt-0.5">
          Manage your account profile, workspace identity, and developer connection probes.
        </p>
      </div>

      {/* Account Profile Card */}
      <div className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-vyro-line">
          <div className="w-8 h-8 rounded-control bg-vyro-bg border border-vyro-line flex items-center justify-center text-vyro-accent">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-vyro-text">Account Profile</h2>
            <p className="text-xs text-vyro-muted">Your public identity on agreements and invoices</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-vyro-text mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-control bg-vyro-bg border border-vyro-line text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-vyro-text mb-1">
                Account Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 text-xs rounded-control bg-vyro-bg/50 border border-vyro-line text-vyro-muted cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-vyro-text mb-1">
              Bio / Business Description
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell counterparties about your business capabilities or purchasing requirements..."
              className="w-full px-3 py-2 text-xs rounded-control bg-vyro-bg border border-vyro-line text-vyro-text focus:outline-none focus:border-vyro-accent"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-vyro-muted">
              Active Mode: <span className="text-vyro-text font-semibold capitalize">{isBuyerWorkspace ? 'Buyer' : 'Seller'}</span>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingProfile}
            >
              Save Profile
            </Button>
          </div>
        </form>
      </div>

      {/* Commercial Safety Quick Summary */}
      <div className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-control bg-vyro-bg border border-vyro-line flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-vyro-text">Safety & Approval Guardrails</h2>
              <p className="text-xs text-vyro-muted">
                Auto-approval limit: <span className="font-semibold text-vyro-text">${user?.autoApprovalLimit ?? 200}</span> · Daily budget cap: <span className="font-semibold text-vyro-text">${user?.dailyBudgetCap ?? 500}</span>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/app/rules'}
          >
            Edit in Rules →
          </Button>
        </div>
      </div>

      {/* Advanced Settings & Developer Diagnostics */}
      <div className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-control bg-vyro-bg border border-vyro-line flex items-center justify-center text-vyro-muted">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-vyro-text">Advanced Developer Diagnostics</h2>
              <p className="text-xs text-vyro-muted">AI engine connection probe, PayPal Sandbox status, and server posture</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-vyro-muted text-xs">
            <span>{showAdvanced ? 'Hide' : 'Show'}</span>
            {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {showAdvanced && (
          <div className="pt-4 border-t border-vyro-line space-y-4">
            {/* AI Diagnostics Box */}
            <div className="p-4 rounded-control bg-vyro-bg border border-vyro-line space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-vyro-accent" />
                  <span className="text-xs font-semibold text-vyro-text">Google Gemini AI Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge()}
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={testMutation.isPending}
                    onClick={() => testMutation.mutate()}
                    leftIcon={<Zap className="w-3.5 h-3.5 text-vyro-accent" />}
                  >
                    Test Probe
                  </Button>
                </div>
              </div>

              {aiStatus?.isLive ? (
                <div className="p-3 rounded-control bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Gemini API verified ({aiStatus.latencyMs}ms). Model: {aiStatus.model || 'gemini-1.5-flash'}.
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-control bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{aiStatus?.status === 'auth_failed' ? 'Invalid API Key' : 'Gemini Key Not Configured'}</span>
                  </div>
                  <p className="text-xs text-vyro-muted">
                    {aiStatus?.errorMessage || 'Operating in deterministic baseline mode. Enter a Gemini API key in server/.env to activate live LLM negotiation.'}
                  </p>
                </div>
              )}
            </div>

            {/* PayPal Sandbox Gateway Diagnostic */}
            <div className="p-4 rounded-control bg-vyro-bg border border-vyro-line space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-[#0070BA]" />
                  <span className="text-xs font-semibold text-vyro-text">Payments Sandbox Connectivity</span>
                </div>
                <div className="flex items-center gap-2">
                  {paymentsHealth?.connected ? (
                    <Badge variant="success" size="sm" dot>Sandbox Connected</Badge>
                  ) : (
                    <Badge variant="error" size="sm" dot>Not Connected</Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isCheckingPayments}
                    onClick={async () => {
                      const res = await refetchPaymentsHealth();
                      if (res.data?.connected) {
                        toast.success(`PayPal Sandbox OAuth verified! App: ${res.data.appId || 'Connected'}`);
                      } else {
                        toast.error(`PayPal Sandbox probe failed: ${res.data?.reason || 'Unknown error'}`);
                      }
                    }}
                    leftIcon={<RefreshCw className={`w-3 h-3 ${isCheckingPayments ? 'animate-spin' : ''}`} />}
                  >
                    Check
                  </Button>
                </div>
              </div>

              <div className="text-xs text-vyro-muted space-y-1 font-mono">
                <div>Environment: <span className="text-vyro-text">{paymentsHealth?.env || 'sandbox'}</span></div>
                {paymentsHealth?.appId && (
                  <div>Application ID: <span className="text-vyro-accent">{paymentsHealth.appId}</span></div>
                )}
                {paymentsHealth?.debugId && (
                  <div>Last Debug ID: <span className="text-vyro-muted">{paymentsHealth.debugId}</span></div>
                )}
              </div>
            </div>

            {/* Server-Side Only Notice */}
            <div className="p-3.5 rounded-control bg-vyro-bg border border-vyro-line space-y-1 text-xs">
              <div className="flex items-center gap-2 text-vyro-text font-semibold">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Server-Side Only Environment Security</span>
              </div>
              <p className="text-xs text-vyro-muted">
                Secrets are strictly managed in the server environment and never exposed in the browser. To update credentials, edit <code className="text-vyro-accent bg-vyro-surface px-1 py-0.5 rounded font-mono">.env</code> in your server directory.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
