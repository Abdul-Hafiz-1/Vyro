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
  Clock
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);

  const { data: aiStatus, refetch: refetchAI } = useQuery({
    queryKey: ['aiStatusSettings'],
    queryFn: api.getAIStatus,
    refetchInterval: 6000
  });

  const { data: statusData, refetch: refetchSystem } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: api.getSystemStatus,
  });

  // Test current AI key
  const testMutation = useMutation({
    mutationFn: () => api.testAI(),
    onSuccess: (data) => {
      refetchAI();
      queryClient.invalidateQueries({ queryKey: ['aiStatus'] });
      if (data.isLive) {
        toast.success(`Gemini API connection verified (${data.latencyMs}ms)!`);
      } else {
        toast.error(`Gemini API test failed: ${data.errorMessage || data.status}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'API test request failed');
    }
  });

  // Save & test new key
  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      toast.error('Please enter a valid Gemini API key.');
      return;
    }

    setIsConfiguring(true);
    try {
      const res = await api.configureAI(apiKeyInput.trim());
      refetchAI();
      queryClient.invalidateQueries({ queryKey: ['aiStatus'] });
      if (res.isLive) {
        toast.success(`Key configured & verified! Latency: ${res.latencyMs}ms`);
        setApiKeyInput('');
      } else {
        toast.error(`Key saved but API verification failed: ${res.errorMessage || res.status}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to configure API key');
    } finally {
      setIsConfiguring(false);
    }
  };

  const resetMutation = useMutation({
    mutationFn: api.resetDemoData,
    onSuccess: () => {
      toast.success('Store reset to initial benchmark state.');
      refetchSystem();
      queryClient.invalidateQueries();
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

        {/* Runtime Key Configuration Form */}
        <form onSubmit={handleSaveKey} className="space-y-3 pt-2">
          <label className="text-xs font-mono uppercase text-vyro-muted block">
            Update or Test Gemini API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="AIzaSy... (Paste Google AI Studio Key)"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="flex-1 bg-vyro-card border border-vyro-border rounded-[6px] px-3 py-1.5 text-xs font-mono text-vyro-text focus:outline-none focus:border-vyro-accent"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isConfiguring}
            >
              Save & Test Key
            </Button>
          </div>
          <p className="text-[10px] text-vyro-subtle font-mono">
            Key is sent strictly to the backend and never exposed in client code.
          </p>
        </form>
      </div>

      {/* PayPal Sandbox Gateway */}
      <div className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-vyro-card border border-vyro-border flex items-center justify-center text-[#0070BA]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-vyro-text">PayPal Sandbox Orders API</h3>
              <p className="text-[11px] text-vyro-muted font-mono">Gateway: https://api-m.sandbox.paypal.com</p>
            </div>
          </div>

          <Badge variant="success" size="sm">SANDBOX READY</Badge>
        </div>
        <p className="text-xs text-vyro-muted leading-relaxed">
          The backend enforces server-side amount calculation directly from the accepted commercial agreement and uses cryptographic idempotency keys to prevent duplicate captures.
        </p>
      </div>

      {/* Store Reset */}
      <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border flex items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-semibold text-vyro-text">Reset Benchmark Seed Data</h4>
          <p className="text-[11px] text-vyro-muted mt-0.5">
            Restores the 3 benchmark seller agents (Pixel Studio $180/145/5d, LaunchCraft $130/120/8d, Northstar $160/150/4d).
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
