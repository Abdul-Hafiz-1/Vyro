import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Settings,
  ShieldCheck,
  Key,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Zap,
  Play,
  Clock,
  Lock,
  ChevronDown,
  ChevronRight,
  CreditCard
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: aiStatus, refetch: refetchAI } = useQuery({
    queryKey: ['aiStatusSettings'],
    queryFn: api.getAIStatus,
    refetchInterval: 6000
  });

  const { data: paymentsHealth, refetch: refetchPaymentsHealth, isFetching: isCheckingPayments } = useQuery({
    queryKey: ['paymentsHealth'],
    queryFn: api.getPaymentsHealth,
    staleTime: 30000
  });

  // Test current AI key
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

  const getStatusBadge = () => {
    if (!aiStatus) return <Badge variant="default" size="sm">Checking...</Badge>;
    if (aiStatus.isLive) return <Badge variant="success" size="sm" dot>CONNECTED ({aiStatus.latencyMs}ms)</Badge>;
    if (aiStatus.status === 'auth_failed') return <Badge variant="error" size="sm">AUTH FAILED</Badge>;
    if (aiStatus.status === 'rate_limited') return <Badge variant="error" size="sm">RATE LIMITED</Badge>;
    return <Badge variant="warning" size="sm">NOT CONFIGURED</Badge>;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-vyro-border">
        <h1 className="text-xl font-bold text-vyro-text tracking-tight">
          System Integrations & AI Diagnostics
        </h1>
        <p className="text-xs text-vyro-muted mt-0.5">
          Verify live Gemini model connectivity, configure API keys, and inspect PayPal Sandbox status.
        </p>
      </div>

      {/* AI Diagnostic Center */}
      <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-vyro-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-vyro-card border border-vyro-border flex items-center justify-center text-vyro-accent">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-vyro-text">Google Gemini AI Engine</h3>
              <p className="text-[11px] text-vyro-muted font-mono">Model: {aiStatus?.model || 'gemini-1.5-flash'}</p>
            </div>
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
              Test Live Call
            </Button>
          </div>
        </div>

        {/* Diagnostic Status Message */}
        {aiStatus?.isLive ? (
          <div className="p-3 rounded bg-vyro-success-bg border border-vyro-success/30 text-xs font-mono text-vyro-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Real Gemini API calls active. Latency: {aiStatus.latencyMs}ms. Last verified: {aiStatus.lastTestedAt ? new Date(aiStatus.lastTestedAt).toLocaleTimeString() : 'Recently'}.
            </span>
          </div>
        ) : (
          <div className="p-3 rounded bg-vyro-warning-bg border border-vyro-warning/30 text-xs text-vyro-warning space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{aiStatus?.status === 'auth_failed' ? 'Invalid API Key' : 'Gemini Key Not Configured'}</span>
            </div>
            <p className="text-[11px] text-vyro-muted leading-relaxed">
              {aiStatus?.errorMessage || 'Operating in deterministic baseline mode. Enter a Gemini API key below to activate live LLM agent negotiation.'}
            </p>
          </div>
        )}

        {/* Server-Side Only Notice */}
        <div className="pt-2 p-3.5 rounded-lg bg-vyro-card border border-vyro-border space-y-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-vyro-text font-semibold">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Server-Side Only Environment Security</span>
          </div>
          <p className="text-[11px] text-vyro-muted leading-relaxed font-sans">
            API keys are strictly managed on the backend and never accepted through the browser. To update or configure credentials, edit <code className="text-vyro-accent bg-vyro-surface px-1.5 py-0.5 rounded font-mono">.env</code> in your server directory.
          </p>
        </div>
      </div>

      {/* Advanced Settings & Diagnostics */}
      <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-vyro-card border border-vyro-border flex items-center justify-center text-vyro-accent">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-vyro-text">Advanced Settings</h3>
              <p className="text-[11px] text-vyro-muted font-mono">Developer gateways, connection probes, and sandbox status</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-vyro-muted text-xs">
            <span>{showAdvanced ? 'Hide' : 'Show'}</span>
            {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {showAdvanced && (
          <div className="pt-4 border-t border-vyro-border space-y-4">
            {/* PayPal Sandbox Gateway Diagnostic */}
            <div className="p-4 rounded-[6px] bg-vyro-card border border-vyro-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-[#0070BA]" />
                  <span className="text-xs font-mono font-semibold text-vyro-text">Payments Sandbox Connectivity</span>
                </div>
                <div className="flex items-center gap-2">
                  {paymentsHealth?.connected ? (
                    <Badge variant="success" size="sm" dot>Payments: sandbox connected</Badge>
                  ) : (
                    <Badge variant="error" size="sm" dot>Payments: sandbox not connected</Badge>
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

              <div className="text-[11px] font-mono text-vyro-muted space-y-1">
                <div>Environment: <span className="text-vyro-text">{paymentsHealth?.env || 'sandbox'} (https://api-m.sandbox.paypal.com)</span></div>
                {paymentsHealth?.appId && (
                  <div>Application ID: <span className="text-vyro-accent">{paymentsHealth.appId}</span></div>
                )}
                {paymentsHealth?.debugId && (
                  <div>Last PayPal-Debug-Id: <span className="text-vyro-subtle">{paymentsHealth.debugId}</span></div>
                )}
                {paymentsHealth?.reason && !paymentsHealth.connected && (
                  <div className="text-vyro-error">Diagnostic Note: {paymentsHealth.reason}</div>
                )}
              </div>

              <p className="text-[10px] text-vyro-subtle leading-relaxed">
                Order creation requires intent CAPTURE, valid buyer session, authorized decision status, and respects user daily budget caps. All payments route to the platform's sandbox business account with held seller shares.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
