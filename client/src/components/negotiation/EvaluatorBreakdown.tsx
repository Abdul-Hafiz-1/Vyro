import React from 'react';
import { MultiProposalComparison } from '../../types';
import { Cpu, CheckCircle2, AlertTriangle, ShieldCheck, Award, TrendingUp } from 'lucide-react';
import { Badge } from '../common/Badge';

interface EvaluatorBreakdownProps {
  evaluation: MultiProposalComparison;
}

export const EvaluatorBreakdown: React.FC<EvaluatorBreakdownProps> = ({ evaluation }) => {
  return (
    <div className="bg-vyro-surface border border-vyro-border rounded-[8px] p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-vyro-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-vyro-card border border-vyro-border flex items-center justify-center text-vyro-accent">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-vyro-text tracking-tight">Evaluator Agent Analysis</h4>
            <p className="text-[11px] text-vyro-muted font-mono">Independent Multi-Factor Scoring Model</p>
          </div>
        </div>
        <Badge variant="accent" size="sm">
          <Award className="w-3 h-3 mr-1" /> Consensus Formed
        </Badge>
      </div>

      {/* Summary Verdict Callout */}
      <div className="p-3.5 rounded-[6px] bg-vyro-card border border-vyro-border/80 text-xs leading-relaxed text-vyro-text flex items-start gap-3">
        <TrendingUp className="w-4 h-4 text-vyro-accent shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-vyro-text">Executive Recommendation:</span>
          <p className="text-vyro-muted mt-1 leading-normal">{evaluation.summaryVerdict}</p>
        </div>
      </div>

      {/* Proposal Comparison Cards */}
      <div className="space-y-4">
        {evaluation.evaluations.map((evalItem) => {
          const isWinner = evalItem.negotiationId === evaluation.recommendedNegotiationId;

          return (
            <div
              key={evalItem.id}
              className={`p-4 rounded-[6px] border transition-all ${
                isWinner
                  ? 'bg-vyro-success-bg/20 border-vyro-success/60 ring-1 ring-vyro-success/30'
                  : 'bg-vyro-card/60 border-vyro-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-vyro-text">{evalItem.sellerBusinessName}</span>
                  {isWinner && (
                    <Badge variant="success" size="sm">
                      Recommended Deal
                    </Badge>
                  )}
                </div>
                <div className="text-right font-mono">
                  <span className="text-sm font-bold text-vyro-text">${evalItem.proposalPrice}</span>
                  <span className="text-[10px] text-vyro-muted block">Composite: {evalItem.score.overall}/100</span>
                </div>
              </div>

              {/* Score Metric Bars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-[10px] font-mono">
                <div className="p-2 rounded bg-vyro-surface border border-vyro-border/50">
                  <span className="text-vyro-subtle block">Price Score</span>
                  <span className="text-vyro-text font-bold">{evalItem.score.priceScore}%</span>
                </div>
                <div className="p-2 rounded bg-vyro-surface border border-vyro-border/50">
                  <span className="text-vyro-subtle block">Capabilities</span>
                  <span className="text-vyro-text font-bold">{evalItem.score.capabilityScore}%</span>
                </div>
                <div className="p-2 rounded bg-vyro-surface border border-vyro-border/50">
                  <span className="text-vyro-subtle block">Delivery SLA</span>
                  <span className="text-vyro-text font-bold">{evalItem.score.deliveryScore}%</span>
                </div>
                <div className="p-2 rounded bg-vyro-surface border border-vyro-border/50">
                  <span className="text-vyro-subtle block">Risk Rating</span>
                  <span className="text-vyro-text font-bold">{evalItem.score.riskScore}%</span>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="space-y-1 text-[11px]">
                {evalItem.strengths.slice(0, 2).map((s, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-vyro-success">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{s}</span>
                  </div>
                ))}
                {evalItem.weaknesses.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-vyro-warning">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span className="truncate">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
