import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Settings, ShieldCheck, Key, Database, RefreshCw, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const { data: statusData, refetch } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: api.getSystemStatus,
  });

  const resetMutation = useMutation({
    mutationFn: api.resetDemoData,
    onSuccess: (res) => {
      setResetMessage('Store reset to initial demonstration state with default agents.');
      refetch();
      setTimeout(() => setResetMessage(null), 4000);
    }
  });

  const providers = statusData?.providers;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-vyro-border">
        <h1 className="text-xl sm:text-2xl font-bold text-vyro-text tracking-tight">
          System Settings & Integrations
        </h1>
        <p className="text-xs text-vyro-muted">
          Inspect active AI providers, PayPal Sandbox gateways, and store persistence.
        </p>
      </div>

      {resetMessage && (
        <div className="p-3 rounded bg-vyro-success-bg border border-vyro-success/30 text-xs text-vyro-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Provider Connectivity Grid */}
      <div className="space-y-4">
        {/* Gemini AI Status */}
        <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-vyro-card border border-vyro-border flex items-center justify-center text-vyro-accent">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-vyro-text">Google Gemini API</h3>
                <p className="text-[11px] text-vyro-muted font-mono">Model: {providers?.gemini?.model || 'gemini-1.5-flash'}</p>
              </div>
            </div>

            <Badge variant={providers?.gemini?.configured ? 'success' : 'accent'} size="sm">
              {providers?.gemini?.configured ? 'LIVE API KEY' : 'SIMULATION MODE'}
            </Badge>
          </div>
          <p className="text-xs text-vyro-muted leading-relaxed">
            Powers natural-language procurement parsing, tactical buyer counteroffers, and multi-factor proposal evaluations. Set `GEMINI_API_KEY` in `.env` to enable live Gemini endpoints.
          </p>
        </div>

        {/* PayPal Sandbox Status */}
        <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-vyro-card border border-vyro-border flex items-center justify-center text-[#0070BA]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-vyro-text">PayPal Sandbox Gateway</h3>
                <p className="text-[11px] text-vyro-muted font-mono">Mode: {providers?.paypal?.mode || 'sandbox'}</p>
              </div>
            </div>

            <Badge variant={providers?.paypal?.configured ? 'success' : 'warning'} size="sm">
              {providers?.paypal?.configured ? 'API CONNECTED' : 'SANDBOX TESTNET'}
            </Badge>
          </div>
          <p className="text-xs text-vyro-muted leading-relaxed">
            Integrates the official PayPal REST Orders API (`/v2/checkout/orders` and `/v2/checkout/orders/capture`). Non-escrow server-verified capture with cryptographic idempotency. Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in `.env` for production sandbox apps.
          </p>
        </div>

        {/* Database & Storage */}
        <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-vyro-card border border-vyro-border flex items-center justify-center text-vyro-success">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-vyro-text">Database & Data Store</h3>
                <p className="text-[11px] text-vyro-muted font-mono">
                  Persisted JSON Store • {providers?.database?.records?.agents || 5} Agents • {providers?.database?.records?.negotiations || 0} Negotiations
                </p>
              </div>
            </div>

            <Badge variant="success" size="sm">
              PERSISTENT DISK
            </Badge>
          </div>
          <p className="text-xs text-vyro-muted leading-relaxed">
            Data is persisted to disk on every state mutation so server restarts preserve agents, counteroffers, and captured PayPal transactions.
          </p>
        </div>
      </div>

      {/* Demo Reset Action */}
      <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-vyro-text">Reset Demonstration Data</h4>
          <p className="text-xs text-vyro-muted">
            Restore initial demo agents (Studio Buyer, Pixel Studio, Northstar, LaunchCraft) and clear negotiation states.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          isLoading={resetMutation.isPending}
          onClick={() => resetMutation.mutate()}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Reset Store
        </Button>
      </div>
    </div>
  );
};
