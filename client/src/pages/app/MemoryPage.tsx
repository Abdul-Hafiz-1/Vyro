import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { MemoryItem } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { toast } from 'sonner';
import {
  Sliders,
  Plus,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  PauseCircle,
  PlayCircle,
  Check
} from 'lucide-react';

export const MemoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, isBuyerWorkspace } = useAuth();

  const [roleTab, setRoleTab] = useState<'buyer' | 'seller'>(isBuyerWorkspace ? 'buyer' : 'seller');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Home data for current limits and pause switch
  const { data: homeData, refetch: refetchHome } = useQuery({
    queryKey: ['homePayloadRules'],
    queryFn: api.getHome
  });

  const limits = homeData?.userLimits || {
    autoApprovalLimit: 200,
    dailyBudgetCap: 500,
    isAutomationPaused: false,
    balance: 1000
  };

  const [autoLimitInput, setAutoLimitInput] = useState<number>(limits.autoApprovalLimit);
  const [dailyCapInput, setDailyCapInput] = useState<number>(limits.dailyBudgetCap);

  // Sync inputs when data loads
  React.useEffect(() => {
    if (homeData?.userLimits) {
      setAutoLimitInput(homeData.userLimits.autoApprovalLimit);
      setDailyCapInput(homeData.userLimits.dailyBudgetCap);
    }
  }, [homeData?.userLimits]);

  // Memory rules
  const { data: memoryItems = [], isLoading: isRulesLoading } = useQuery({
    queryKey: ['memory', roleTab],
    queryFn: () => api.getMemoryItems(roleTab),
    refetchInterval: 10000
  });

  // Tuning Overrides
  const { data: overrides = [], refetch: refetchOverrides } = useQuery({
    queryKey: ['tuningOverrides'],
    queryFn: () => api.getOverrides(),
    refetchInterval: 10000
  });

  // Limit update mutation
  const updateLimitsMutation = useMutation({
    mutationFn: () => api.updateLimits(Number(autoLimitInput), Number(dailyCapInput)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homePayloadRules'] });
      refetchHome();
      toast.success('Approval limits and spend caps updated.');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update limits')
  });

  // Pause switch mutation
  const pauseMutation = useMutation({
    mutationFn: (isPaused: boolean) => api.setAutomationPaused(isPaused),
    onSuccess: (data, isPaused) => {
      queryClient.invalidateQueries({ queryKey: ['homePayloadRules'] });
      refetchHome();
      if (isPaused) {
        toast.info('Automation paused: all deals will now route to human review.');
      } else {
        toast.success('Autonomous approvals active.');
      }
    },
    onError: (err: any) => toast.error(err.message || 'Failed to toggle pause')
  });

  // Add rule mutation
  const addMemoryMutation = useMutation({
    mutationFn: (item: { role: 'buyer' | 'seller'; key: string; value: string; type?: string }) =>
      api.addMemoryItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] });
      setNewKey('');
      setNewValue('');
      setIsAdding(false);
      toast.success('Rule stored and enforced.');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to store rule')
  });

  // Delete rule mutation
  const deleteMemoryMutation = useMutation({
    mutationFn: (id: string) => api.deleteMemoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] });
      toast.success('Rule removed.');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete rule')
  });

  // Apply override suggestion into explicit rule
  const applyOverrideMutation = useMutation({
    mutationFn: (id: string) => api.applyOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tuningOverrides'] });
      queryClient.invalidateQueries({ queryKey: ['memory'] });
      refetchOverrides();
      toast.success('Suggestion confirmed and converted into active rule.');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to apply rule')
  });

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) {
      toast.error('Rule title and constraint are required.');
      return;
    }
    addMemoryMutation.mutate({
      role: roleTab,
      key: newKey.trim(),
      value: newValue.trim(),
      type: 'decision_rule'
    });
  };

  const pendingOverrides = overrides.filter((o: any) => o.status === 'logged');

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-vyro-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold font-mono text-vyro-text uppercase tracking-wider">
              Autonomous Rules & Policies
            </h1>
            <Badge variant="accent" size="sm">
              Server Enforced
            </Badge>
          </div>
          <p className="text-xs text-vyro-muted mt-0.5">
            Configure decision boundaries, spending caps, policy constraints, and review overrides.
          </p>
        </div>

        {/* Global Pause Switch */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-vyro-surface border border-vyro-border">
          <div className="text-right">
            <span className="text-[11px] font-mono font-medium block text-vyro-text">
              {limits.isAutomationPaused ? 'Automation Paused' : 'Automation Active'}
            </span>
            <span className="text-[10px] text-vyro-muted font-mono">
              {limits.isAutomationPaused ? 'All deals route to Review' : 'Auto-approving under limit'}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={limits.isAutomationPaused}
            onClick={() => pauseMutation.mutate(!limits.isAutomationPaused)}
            disabled={pauseMutation.isPending}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              limits.isAutomationPaused ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                limits.isAutomationPaused ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Section 1: Decision Boundaries & Spend Caps */}
      <div className="p-5 rounded-xl bg-vyro-surface border border-vyro-border space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-vyro-border/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-vyro-accent" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-vyro-text">
              Decision Boundaries & Spend Limits
            </h2>
          </div>
          <span className="text-[10px] font-mono text-vyro-muted">
            SQLite Database · Instant Sync
          </span>
        </div>

        <p className="text-xs text-vyro-muted leading-relaxed">
          Deals meeting all constraints auto-approve up to your ceiling. Transactions exceeding your auto-approval ceiling or daily cap immediately escalate to the Needs-you review queue.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Auto-approval Limit */}
          <div className="p-3.5 rounded-lg bg-vyro-card border border-vyro-border space-y-2">
            <label className="text-[11px] font-mono text-vyro-muted flex items-center justify-between">
              <span>Auto-Approval Ceiling:</span>
              <span className="text-vyro-accent font-semibold font-mono tabular-nums">
                ${autoLimitInput} USD
              </span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-vyro-subtle">$</span>
              <input
                type="number"
                min="0"
                max="5000"
                value={autoLimitInput}
                onChange={(e) => setAutoLimitInput(Number(e.target.value))}
                className="flex-1 bg-vyro-surface border border-vyro-border rounded-lg px-3 py-1.5 text-xs text-vyro-text font-mono tabular-nums focus:outline-none focus:border-vyro-accent"
              />
            </div>
            <span className="text-[10px] text-vyro-subtle block font-mono">
              Max single transaction auto-approved by AI.
            </span>
          </div>

          {/* Daily Spend Cap */}
          <div className="p-3.5 rounded-lg bg-vyro-card border border-vyro-border space-y-2">
            <label className="text-[11px] font-mono text-vyro-muted flex items-center justify-between">
              <span>Daily Spend Cap:</span>
              <span className="text-emerald-400 font-semibold font-mono tabular-nums">
                ${dailyCapInput} USD
              </span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-vyro-subtle">$</span>
              <input
                type="number"
                min="0"
                max="20000"
                value={dailyCapInput}
                onChange={(e) => setDailyCapInput(Number(e.target.value))}
                className="flex-1 bg-vyro-surface border border-vyro-border rounded-lg px-3 py-1.5 text-xs text-vyro-text font-mono tabular-nums focus:outline-none focus:border-vyro-accent"
              />
            </div>
            <span className="text-[10px] text-vyro-subtle block font-mono">
              Maximum cumulative daily budget before requiring manual sign-off.
            </span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            variant="primary"
            size="sm"
            isLoading={updateLimitsMutation.isPending}
            onClick={() => updateLimitsMutation.mutate()}
            className="text-xs px-4 rounded-lg font-medium"
          >
            Save Boundaries
          </Button>
        </div>
      </div>

      {/* Section 2: Suggested Rules from Overrides ("Make this a rule") */}
      {pendingOverrides.length > 0 && (
        <div className="p-5 rounded-xl bg-vyro-surface border border-amber-500/30 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-vyro-border/50">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
                Suggested Policy Changes from Overrides
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {pendingOverrides.length} Suggestions
            </span>
          </div>

          <p className="text-xs text-vyro-muted leading-relaxed">
            When you override an AI recommendation in the Review Queue, VYRO logs the pattern and formulates suggested policy changes. Confirming a suggestion converts it into an enforced rule.
          </p>

          <div className="space-y-3">
            {pendingOverrides.map((override: any) => (
              <div
                key={override.id}
                className="p-3.5 rounded-lg bg-vyro-card border border-vyro-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold">
                      Override: {override.overrideAction}
                    </span>
                    <span className="text-vyro-muted text-[11px] font-mono">
                      Original: {override.originalRecommendation}
                    </span>
                  </div>
                  <p className="text-vyro-text font-medium text-xs">
                    "{override.overrideNote || 'Manual human override'}"
                  </p>
                  {override.suggestedPolicyChange && (
                    <p className="text-[11px] text-vyro-muted font-mono">
                      Suggested Rule: <span className="text-emerald-400">{override.suggestedPolicyChange}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={applyOverrideMutation.isPending}
                    onClick={() => applyOverrideMutation.mutate(override.id)}
                    className="text-xs h-7 px-3 rounded-lg"
                  >
                    Confirm Rule
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Operating Rules & Constraints */}
      <div className="p-5 rounded-xl bg-vyro-surface border border-vyro-border space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-vyro-border/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-vyro-accent" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-vyro-text">
              Active Operational Rules ({memoryItems.length})
            </h2>
          </div>

          <div className="flex items-center p-0.5 rounded-lg bg-vyro-card border border-vyro-border text-xs font-mono">
            <button
              onClick={() => setRoleTab('buyer')}
              className={`px-3 py-1 rounded-md transition-colors ${
                roleTab === 'buyer'
                  ? 'bg-vyro-surface text-vyro-text font-semibold shadow-xs'
                  : 'text-vyro-muted hover:text-vyro-text'
              }`}
            >
              Buyer Rules
            </button>
            <button
              onClick={() => setRoleTab('seller')}
              className={`px-3 py-1 rounded-md transition-colors ${
                roleTab === 'seller'
                  ? 'bg-vyro-surface text-vyro-text font-semibold shadow-xs'
                  : 'text-vyro-muted hover:text-vyro-text'
              }`}
            >
              Seller Rules
            </button>
          </div>
        </div>

        {/* Rules List */}
        {isRulesLoading ? (
          <div className="py-8 text-center text-xs font-mono text-vyro-muted animate-pulse">
            Loading active rules...
          </div>
        ) : memoryItems.length === 0 ? (
          <div className="p-8 rounded-lg bg-vyro-card text-center text-xs text-vyro-muted">
            No custom rules active for {roleTab}. Add a rule below.
          </div>
        ) : (
          <div className="space-y-2">
            {memoryItems.map((rule) => (
              <div
                key={rule.id}
                className="p-3.5 rounded-lg bg-vyro-card border border-vyro-border flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-vyro-text">{rule.key}</span>
                    <Badge variant="default" size="sm">
                      {rule.type}
                    </Badge>
                  </div>
                  <p className="text-vyro-muted leading-relaxed font-sans">{rule.value}</p>
                </div>

                <button
                  type="button"
                  onClick={() => deleteMemoryMutation.mutate(rule.id)}
                  className="text-vyro-subtle hover:text-vyro-error p-1 transition-colors shrink-0"
                  aria-label="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Rule Form */}
        <div className="pt-2">
          {!isAdding ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Add New {roleTab === 'buyer' ? 'Buyer' : 'Seller'} Rule
            </Button>
          ) : (
            <form onSubmit={handleAddRule} className="p-4 rounded-lg bg-vyro-card border border-vyro-border space-y-3">
              <span className="text-xs font-semibold text-vyro-text font-mono block">
                Define New {roleTab === 'buyer' ? 'Buyer' : 'Seller'} Rule
              </span>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[11px] font-mono text-vyro-muted block mb-1">Rule Name / Scope</label>
                  <input
                    type="text"
                    placeholder="e.g. Mandatory Source Code Delivery"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full bg-vyro-surface border border-vyro-border rounded-lg px-3 py-1.5 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-vyro-muted block mb-1">Condition & Requirement</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Must include full GitHub repository ownership transfer within 24 hours of delivery."
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full bg-vyro-surface border border-vyro-border rounded-lg p-2.5 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-vyro-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={addMemoryMutation.isPending}
                  className="text-xs px-4"
                >
                  Save Rule
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
