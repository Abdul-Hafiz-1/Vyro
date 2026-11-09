import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { WorkspaceType } from '../../types';
import {
  Check,
  ChevronDown,
  ShoppingBag,
  Store,
  Sparkles,
  Bot,
  PlusCircle,
  Shield,
  Layers
} from 'lucide-react';

export const WorkspaceSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    user,
    activeWorkspace,
    switchWorkspace,
    hasBuyerCapability,
    hasSellerCapability,
    updateCapabilities
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const workspaces: {
    id: WorkspaceType;
    label: string;
    sublabel: string;
    icon: any;
    color: string;
    enabled: boolean;
  }[] = [
    {
      id: 'buyer',
      label: 'Buyer Workspace',
      sublabel: 'Procure products, hire talent & autonomous agent search',
      icon: ShoppingBag,
      color: 'text-vyro-accent',
      enabled: hasBuyerCapability
    },
    {
      id: 'seller',
      label: 'Seller Workspace',
      sublabel: 'List services & products, manage inquiries & revenue',
      icon: Store,
      color: 'text-vyro-success',
      enabled: hasSellerCapability
    },
    {
      id: 'studio',
      label: 'Agent Studio',
      sublabel: 'Configure AI agents, negotiation policies & limits',
      icon: Bot,
      color: 'text-indigo-400',
      enabled: true
    }
  ];

  const currentWorkspaceInfo = workspaces.find(w => w.id === activeWorkspace) || workspaces[0];
  const CurrentIcon = currentWorkspaceInfo.icon;

  const handleSelectWorkspace = (id: WorkspaceType) => {
    switchWorkspace(id);
    setIsOpen(false);
  };

  const handleToggleCapability = async (type: 'buying' | 'selling', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const current = user.capabilities || { buying: true, selling: false };
    const updated = {
      ...current,
      [type]: !current[type]
    };
    // Ensure at least one capability is enabled
    if (!updated.buying && !updated.selling) {
      return;
    }
    await updateCapabilities(updated);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 rounded-[6px] border transition-all text-left group ${
          compact
            ? 'p-1.5 bg-vyro-surface hover:bg-vyro-hover border-vyro-border'
            : 'px-3 py-1.5 bg-vyro-surface/90 hover:bg-vyro-surface border-vyro-border hover:border-vyro-border-light shadow-xs'
        }`}
        title="Switch active workspace (Single Account, Dual Role)"
      >
        <div className="relative shrink-0">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80'}
            alt={user?.displayName || 'User'}
            className="w-6 h-6 rounded-full object-cover ring-1 ring-vyro-border"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-vyro-bg ${
              activeWorkspace === 'buyer'
                ? 'bg-vyro-accent'
                : activeWorkspace === 'seller'
                ? 'bg-vyro-success'
                : 'bg-indigo-400'
            }`}
          />
        </div>

        {!compact && (
          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-vyro-text truncate">
                {user?.displayName || 'Alex Mercer'}
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase tracking-wider font-bold ${
                  activeWorkspace === 'buyer'
                    ? 'bg-vyro-accent/15 text-vyro-accent'
                    : activeWorkspace === 'seller'
                    ? 'bg-vyro-success-bg/30 text-vyro-success'
                    : 'bg-indigo-500/15 text-indigo-400'
                }`}
              >
                {activeWorkspace}
              </span>
            </div>
            <div className="text-[10px] text-vyro-muted truncate font-mono">
              {currentWorkspaceInfo.label}
            </div>
          </div>
        )}

        <ChevronDown className="w-3.5 h-3.5 text-vyro-subtle group-hover:text-vyro-text shrink-0 transition-transform duration-200" />
      </button>

      {/* Flyout Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-vyro-surface border border-vyro-border rounded-[10px] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1.5 border-b border-vyro-border/60 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-vyro-subtle">
                Unified Dual-Role Identity
              </span>
              <span className="text-[9px] font-mono text-vyro-muted bg-vyro-card px-1.5 py-0.5 rounded border border-vyro-border/60">
                1 Account • Multi-Role
              </span>
            </div>
            <p className="text-[11px] text-vyro-muted mt-1 leading-tight">
              Switch workspaces seamlessly without signing out. Both buyer and seller agents operate under your UID.
            </p>
          </div>

          <div className="space-y-1.5">
            {workspaces.map((workspace) => {
              const isSelected = workspace.id === activeWorkspace;
              const Icon = workspace.icon;

              return (
                <button
                  key={workspace.id}
                  onClick={() => handleSelectWorkspace(workspace.id)}
                  className={`w-full p-2.5 rounded-[8px] text-left flex items-start gap-3 transition-colors border ${
                    isSelected
                      ? 'bg-vyro-card border-vyro-accent/50 text-vyro-text'
                      : 'hover:bg-vyro-card/50 border-transparent text-vyro-muted hover:text-vyro-text'
                  }`}
                >
                  <div className={`p-1.5 rounded-[6px] bg-vyro-bg border border-vyro-border shrink-0 mt-0.5 ${workspace.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-vyro-text truncate">
                        {workspace.label}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-vyro-accent shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] text-vyro-muted mt-0.5 line-clamp-1 leading-normal">
                      {workspace.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Capabilities quick management */}
          <div className="mt-3 pt-2.5 border-t border-vyro-border/60 px-2 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-vyro-subtle block">
              Active Account Capabilities
            </span>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-vyro-muted flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-vyro-accent" /> Buying
              </span>
              <button
                type="button"
                onClick={(e) => handleToggleCapability('buying', e)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  hasBuyerCapability
                    ? 'bg-vyro-accent/15 border-vyro-accent/30 text-vyro-accent'
                    : 'bg-vyro-bg border-vyro-border text-vyro-subtle hover:text-vyro-muted'
                }`}
              >
                {hasBuyerCapability ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-vyro-muted flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-vyro-success" /> Selling
              </span>
              <button
                type="button"
                onClick={(e) => handleToggleCapability('selling', e)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  hasSellerCapability
                    ? 'bg-vyro-success-bg/30 border-vyro-success/30 text-vyro-success'
                    : 'bg-vyro-bg border-vyro-border text-vyro-subtle hover:text-vyro-muted'
                }`}
              >
                {hasSellerCapability ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
