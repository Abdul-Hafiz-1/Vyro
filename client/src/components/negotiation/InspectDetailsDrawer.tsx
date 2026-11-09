import React, { useEffect } from 'react';
import { X, ShieldCheck, Terminal, Cpu, CheckCircle2, FileText, Database } from 'lucide-react';
import { Button } from '../common/Button';

interface InspectDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  negotiation: any;
  decision?: any;
}

export const InspectDetailsDrawer: React.FC<InspectDetailsDrawerProps> = ({
  isOpen,
  onClose,
  negotiation,
  decision
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toolCalls = negotiation?.messages?.flatMap((m: any) => m.toolCalls || []) || [];
  const signals = decision?.signals || {};

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-xl bg-vyro-surface border-l border-vyro-border shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-vyro-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-vyro-accent" />
              <h2 className="text-sm font-semibold text-vyro-text font-mono">
                Inspect Autonomous Details
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-vyro-muted hover:text-vyro-text hover:bg-vyro-card transition-colors"
              aria-label="Close details drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Model & Runtime */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-vyro-subtle font-semibold tracking-wider">
                Model Telemetry & Runtime
              </span>
              <div className="p-3 rounded-lg bg-vyro-card border border-vyro-border/60 space-y-2 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-vyro-muted">Active Model:</span>
                  <span className="text-vyro-text font-semibold">Gemini 2.5 Flash</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-vyro-muted">Execution Mode:</span>
                  <span className="text-vyro-text">Strict JSON Schema Tool Calls</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-vyro-muted">Total Tool Invocations:</span>
                  <span className="text-vyro-text">{toolCalls.length} calls</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-vyro-muted">Negotiation Rounds:</span>
                  <span className="text-vyro-text">
                    {negotiation.currentRound} / {negotiation.maxRounds}
                  </span>
                </div>
              </div>
            </div>

            {/* Security & Containment Verification */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-vyro-subtle font-semibold tracking-wider">
                Security & Privacy Guardrails
              </span>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2 font-mono text-emerald-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="font-semibold text-vyro-text">Untrusted Message Containment: Active</span>
                </div>
                <p className="text-[11px] text-vyro-muted font-sans">
                  All counterparty messages are quarantined within strict containment tags (&lt;&lt;&lt;UNTRUSTED_COUNTERPARTY_MESSAGE&gt;&gt;&gt;) to neutralize prompt injections.
                </p>
                <div className="pt-2 border-t border-emerald-500/20 text-[11px] flex justify-between">
                  <span>Buyer Ceiling & Seller Floor:</span>
                  <span className="text-emerald-300 font-bold">100% Isolated / Never Leaked</span>
                </div>
              </div>
            </div>

            {/* Deterministic Decision Signals */}
            {decision && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-vyro-subtle font-semibold tracking-wider">
                  Decision Engine Signals
                </span>
                <div className="p-3 rounded-lg bg-vyro-card border border-vyro-border/60 space-y-2 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-vyro-muted">Outcome Status:</span>
                    <span className="text-vyro-text font-bold uppercase">{decision.status}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-vyro-muted">Decided By:</span>
                    <span className="text-vyro-text">{decision.decidedBy}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-vyro-muted">Deterministic Confidence:</span>
                    <span className="text-vyro-text tabular-nums font-bold">
                      {Math.round((decision.confidence || 0) * 100)}%
                    </span>
                  </div>

                  {decision.reasons && decision.reasons.length > 0 && (
                    <div className="pt-2 border-t border-vyro-border/40">
                      <span className="text-vyro-muted block mb-1 text-[11px]">Evaluation Reasons:</span>
                      <ul className="list-disc list-inside space-y-1 text-vyro-text text-[11px]">
                        {decision.reasons.map((r: string, idx: number) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Object.keys(signals).length > 0 && (
                    <div className="pt-2 border-t border-vyro-border/40">
                      <span className="text-vyro-muted block mb-1 text-[11px]">Evaluated Signals:</span>
                      <pre className="text-[10px] p-2 bg-vyro-bg rounded text-vyro-subtle overflow-x-auto">
                        {JSON.stringify(signals, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tool Calls Log */}
            {toolCalls.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-vyro-subtle font-semibold tracking-wider">
                  Autonomous Tool Call Log ({toolCalls.length})
                </span>
                <div className="space-y-2 font-mono">
                  {toolCalls.map((tc: any, idx: number) => (
                    <details
                      key={idx}
                      className="p-2.5 rounded-lg bg-vyro-card border border-vyro-border/60 group"
                    >
                      <summary className="cursor-pointer text-[11px] text-vyro-text font-medium flex items-center justify-between">
                        <span className="text-vyro-accent">{tc.name}()</span>
                        <span className="text-vyro-subtle text-[10px]">{tc.timestamp ? new Date(tc.timestamp).toLocaleTimeString() : ''}</span>
                      </summary>
                      <pre className="mt-2 p-2 bg-vyro-bg rounded text-[10px] text-vyro-subtle overflow-x-auto">
                        {JSON.stringify(tc.args, null, 2)}
                      </pre>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON Payload */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-vyro-subtle font-semibold tracking-wider">
                Raw Negotiation Entity
              </span>
              <pre className="p-3 bg-vyro-card rounded-lg border border-vyro-border/60 text-[10px] font-mono text-vyro-subtle overflow-x-auto max-h-60">
                {JSON.stringify(
                  {
                    id: negotiation.id,
                    status: negotiation.status,
                    currentRound: negotiation.currentRound,
                    maxRounds: negotiation.maxRounds,
                    agreementId: negotiation.agreementId,
                    messagesCount: negotiation.messages?.length
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-vyro-border flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close Inspector
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
