import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { MemoryItem } from '../../types';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';
import { formatMoney } from '../../lib/present';
import { toast } from 'sonner';
import {
  Sliders,
  Plus,
  Trash2,
  ShieldCheck,
  Lock,
  PauseCircle,
  PlayCircle,
  Check,
  DollarSign,
  ArrowLeft
} from 'lucide-react';

export const MemoryPage: React.FC = () => {
  const navigate = useNavigate();
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

  React.useEffect(() => {
    if (homeData?.userLimits) {
      setAutoLimitInput(homeData.userLimits.autoApprovalLimit);
      setDailyCapInput(homeData.userLimits.dailyBudgetCap);
    }
  }, [homeData?.userLimits]);

  // Memory rules
  const { data: memoryItems = [], isLoading: isRulesLoading } = useQuery({
    queryKey: ['memory', roleTab],
    queryFn: () => api.getMemoryItems(roleTab)
  });

  const updateLimitsMutation = useMutation({
    mutationFn: () => api.updateLimits(autoLimitInput, dailyCapInput),
    onSuccess: () => {
      toast.success('Agent financial limits updated.');
      queryClient.invalidateQueries({ queryKey: ['homePayload'] });
      queryClient.invalidateQueries({ queryKey: ['homePayloadRules'] });
      refetchHome();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update limits')
  });

  const addRuleMutation = useMutation({
    mutationFn: () =>
      api.addMemoryItem({
        role: roleTab,
        key: newKey.trim(),
        value: newValue.trim(),
      }),
    onSuccess: () => {
      toast.success('New agent rule saved.');
      setNewKey('');
      setNewValue('');
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ['memory', roleTab] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add rule')
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => api.deleteMemoryItem(id),
    onSuccess: () => {
      toast.success('Rule removed.');
      queryClient.invalidateQueries({ queryKey: ['memory', roleTab] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete rule')
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-[28px] text-text-primary tracking-tight">
              Rules & Agent Boundaries
            </h1>
            <StatusChip label="Autonomous Bounds" role="handled" size="sm" />
          </div>
          <p className="text-secondary text-text-muted">
            Configure financial thresholds, negotiation guidelines, and sovereign policy guardrails.
          </p>
        </div>

        {/* Role Tab */}
        <div className="flex bg-surface p-1 rounded-control border border-border-subtle">
          <button
            type="button"
            onClick={() => setRoleTab('buyer')}
            className={`px-3 py-1.5 rounded-control text-secondary font-medium transition-colors cursor-pointer ${
              roleTab === 'buyer'
                ? 'bg-volt text-[#0C0E0D] font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Buyer Rules
          </button>
          <button
            type="button"
            onClick={() => setRoleTab('seller')}
            className={`px-3 py-1.5 rounded-control text-secondary font-medium transition-colors cursor-pointer ${
              roleTab === 'seller'
                ? 'bg-volt text-[#0C0E0D] font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Seller Rules
          </button>
        </div>
      </div>

      {/* Financial Limits Section */}
      <div className="flex flex-col gap-4">
        <span className="font-display font-bold text-[20px] text-text-primary">
          Financial Autonomy Limits
        </span>

        <Card className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-secondary font-medium text-text-primary">
                Auto-approval threshold
              </label>
              <div className="relative">
                <DollarSign className="w-5 h-5 text-text-muted absolute left-4 top-3 pointer-events-none" />
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={autoLimitInput}
                  onChange={(e) => setAutoLimitInput(Number(e.target.value))}
                  className="w-full h-11 pl-11 pr-4 bg-surface border border-border-subtle rounded-control text-secondary font-semibold text-text-primary focus:outline-none focus:border-volt transition-colors"
                />
              </div>
              <span className="text-secondary text-text-muted">
                Deals at or below this amount can be auto-approved by your agent.
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-secondary font-medium text-text-primary">
                Daily cumulative cap
              </label>
              <div className="relative">
                <DollarSign className="w-5 h-5 text-text-muted absolute left-4 top-3 pointer-events-none" />
                <input
                  type="number"
                  min={0}
                  max={20000}
                  value={dailyCapInput}
                  onChange={(e) => setDailyCapInput(Number(e.target.value))}
                  className="w-full h-11 pl-11 pr-4 bg-surface border border-border-subtle rounded-control text-secondary font-semibold text-text-primary focus:outline-none focus:border-volt transition-colors"
                />
              </div>
              <span className="text-secondary text-text-muted">
                Daily total transactions authorized within a 24-hour window.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border-subtle">
            <Button
              variant="volt"
              size="md"
              isLoading={updateLimitsMutation.isPending}
              onClick={() => updateLimitsMutation.mutate()}
            >
              Update limits
            </Button>
          </div>
        </Card>
      </div>

      {/* Autonomous Memory Rules List */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-[20px] text-text-primary">
            {roleTab === 'buyer' ? 'Buyer Procurement Guidelines' : 'Seller Commercial Guidelines'}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            leftIcon={<Plus className="w-4 h-4" strokeWidth={2} />}
          >
            Add rule
          </Button>
        </div>

        {/* Add Rule Form */}
        {isAdding && (
          <Card className="p-5 flex flex-col gap-4 bg-raised">
            <span className="text-secondary font-semibold text-text-primary">
              Define a new operating rule
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-secondary text-text-muted">Rule title or subject</label>
                <input
                  type="text"
                  placeholder="e.g. Delivery limit"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full h-11 px-4 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-secondary text-text-muted">Instruction or condition</label>
                <input
                  type="text"
                  placeholder="e.g. Never agree to more than 7 days delivery without checking"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full h-11 px-4 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button
                variant="volt"
                size="sm"
                disabled={!newKey.trim() || !newValue.trim()}
                isLoading={addRuleMutation.isPending}
                onClick={() => addRuleMutation.mutate()}
              >
                Save rule
              </Button>
            </div>
          </Card>
        )}

        {/* Rules List */}
        <div className="bg-surface border border-border-subtle rounded-surface divide-y divide-border-subtle overflow-hidden">
          {memoryItems.length === 0 ? (
            <div className="p-8 text-center text-secondary text-text-muted">
              No custom rules configured. Your agent operates using default sovereign guardrails.
            </div>
          ) : (
            memoryItems.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-body text-text-primary">
                    {item.key}
                  </span>
                  <p className="text-secondary text-text-muted">
                    {item.value}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteRuleMutation.mutate(item.id)}
                  className="text-text-muted hover:text-status-declined p-2 transition-colors cursor-pointer"
                  aria-label="Delete rule"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};