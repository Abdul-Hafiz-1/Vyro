import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, TrendingDown, TrendingUp, Minus, Clock, Tag } from 'lucide-react';
import { Proposal, NegotiationMessage } from '../../types';

export interface MultiIssuePoint {
  round: number;
  buyerPrice?: number;
  buyerDays?: number;
  sellerPrice?: number;
  sellerDays?: number;
  gap?: number;
  concessionBuyer?: number;
  concessionSeller?: number;
  tradesMade?: string[];
  status: 'converging' | 'consensus' | 'open';
}

interface PriceLadderProps {
  proposals?: Proposal[];
  messages?: NegotiationMessage[];
  currentRound: number;
  maxRounds: number;
  agreedPrice?: number;
  currency?: string;
}

export const PriceLadder: React.FC<PriceLadderProps> = ({
  proposals = [],
  messages = [],
  currentRound,
  maxRounds,
  agreedPrice,
  currency = 'USD'
}) => {
  // Extract round-by-round multi-issue positions from proposals and messages
  const roundsMap = new Map<number, {
    buyerPrice?: number;
    buyerDays?: number;
    sellerPrice?: number;
    sellerDays?: number;
    tradesMade: string[];
  }>();

  // Process proposals
  for (const p of proposals) {
    const entry = roundsMap.get(p.round) || { tradesMade: [] };
    const matchingMsg = messages.find(m => m.round === p.round && (m.messageType === 'proposal' || m.messageType === 'counteroffer'));
    
    if (matchingMsg?.senderRole === 'buyer') {
      entry.buyerPrice = p.price;
      entry.buyerDays = p.deliveryDays;
    } else {
      entry.sellerPrice = p.price;
      entry.sellerDays = p.deliveryDays;
    }

    if (p.tradesMade && p.tradesMade.length > 0) {
      entry.tradesMade.push(...p.tradesMade);
    }
    roundsMap.set(p.round, entry);
  }

  // Cross check messages for offer payloads
  for (const msg of messages) {
    const payload = msg.payload || (msg.toolCalls?.[0]?.args as any);
    const price = payload?.counterPrice || payload?.price || payload?.proposedPrice;
    const days = payload?.deliveryDays || payload?.turnaroundDays;
    const trades = payload?.tradesMade;

    const entry = roundsMap.get(msg.round) || { tradesMade: [] };
    if (typeof price === 'number') {
      if (msg.senderRole === 'buyer' && !entry.buyerPrice) {
        entry.buyerPrice = price;
        entry.buyerDays = typeof days === 'number' ? days : entry.buyerDays;
      } else if (msg.senderRole === 'seller' && !entry.sellerPrice) {
        entry.sellerPrice = price;
        entry.sellerDays = typeof days === 'number' ? days : entry.sellerDays;
      }
    }

    if (Array.isArray(trades)) {
      entry.tradesMade.push(...trades);
    }
    roundsMap.set(msg.round, entry);
  }

  // Carry forward standing offers across rounds so each round shows bilateral positions
  let lastKnownBuyerPrice: number | undefined;
  let lastKnownBuyerDays: number | undefined;
  let lastKnownSellerPrice: number | undefined;
  let lastKnownSellerDays: number | undefined;

  const sortedRounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);
  for (const r of sortedRounds) {
    const entry = roundsMap.get(r)!;
    if (entry.buyerPrice !== undefined) {
      lastKnownBuyerPrice = entry.buyerPrice;
      lastKnownBuyerDays = entry.buyerDays;
    } else if (lastKnownBuyerPrice !== undefined) {
      entry.buyerPrice = lastKnownBuyerPrice;
      entry.buyerDays = lastKnownBuyerDays;
    }

    if (entry.sellerPrice !== undefined) {
      lastKnownSellerPrice = entry.sellerPrice;
      lastKnownSellerDays = entry.sellerDays;
    } else if (lastKnownSellerPrice !== undefined) {
      entry.sellerPrice = lastKnownSellerPrice;
      entry.sellerDays = lastKnownSellerDays;
    }
    roundsMap.set(r, entry);
  }

  if (sortedRounds.length === 0 && agreedPrice) {
    sortedRounds.push(1);
    roundsMap.set(1, { buyerPrice: agreedPrice, sellerPrice: agreedPrice, tradesMade: ['Direct Consensus'] });
  }

  // Calculate multi-issue ladder points
  const points: MultiIssuePoint[] = [];
  let prevBuyer: number | undefined;
  let prevSeller: number | undefined;

  for (const r of sortedRounds) {
    const { buyerPrice, buyerDays, sellerPrice, sellerDays, tradesMade } = roundsMap.get(r)!;
    const gap = buyerPrice !== undefined && sellerPrice !== undefined ? Math.abs(sellerPrice - buyerPrice) : undefined;
    const concessionBuyer = prevBuyer !== undefined && buyerPrice !== undefined ? buyerPrice - prevBuyer : undefined;
    const concessionSeller = prevSeller !== undefined && sellerPrice !== undefined ? prevSeller - sellerPrice : undefined;

    const isConsensus = gap === 0 || (agreedPrice !== undefined && (buyerPrice === agreedPrice || sellerPrice === agreedPrice));

    // Deduplicate trades
    const uniqueTrades = Array.from(new Set(tradesMade));

    points.push({
      round: r,
      buyerPrice,
      buyerDays,
      sellerPrice,
      sellerDays,
      gap,
      concessionBuyer,
      concessionSeller,
      tradesMade: uniqueTrades,
      status: isConsensus ? 'consensus' : gap !== undefined && gap > 0 ? 'converging' : 'open'
    });

    if (buyerPrice !== undefined) prevBuyer = buyerPrice;
    if (sellerPrice !== undefined) prevSeller = sellerPrice;
  }

  if (points.length === 0) {
    return null;
  }

  // Determine global bounds for percentage positioning
  const allPrices = points.flatMap(p => [p.buyerPrice, p.sellerPrice, agreedPrice]).filter((v): v is number => typeof v === 'number');
  const minBound = Math.min(...allPrices);
  const maxBound = Math.max(...allPrices);
  const range = maxBound - minBound || 1;

  const getPercent = (val: number) => {
    return Math.max(4, Math.min(96, ((val - minBound) / range) * 100));
  };

  return (
    <div className="bg-vyro-surface border border-vyro-border rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-vyro-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-vyro-text font-mono">
              Multi-Issue Convergence Ladder
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-vyro-card border border-vyro-border text-vyro-muted">
              Round {currentRound} of {maxRounds}
            </span>
          </div>
          <p className="text-xs text-vyro-muted mt-0.5">
            Real-time multi-issue trades (price, turnaround days, and scope) between autonomous agents.
          </p>
        </div>

        {agreedPrice && (
          <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-xs font-mono font-medium">Consensus Package:</span>
            <span className="text-sm font-bold font-mono text-vyro-text tabular-nums">
              ${agreedPrice} {currency}
            </span>
          </div>
        )}
      </div>

      {/* Ladder Track rows */}
      <div className="space-y-4">
        {points.map((pt, idx) => {
          const isLatest = idx === points.length - 1;
          const leftPct = pt.buyerPrice !== undefined ? getPercent(pt.buyerPrice) : 10;
          const rightPct = pt.sellerPrice !== undefined ? getPercent(pt.sellerPrice) : 90;

          return (
            <div
              key={pt.round}
              className={`p-3 rounded-lg border transition-all space-y-2.5 ${
                isLatest
                  ? 'bg-vyro-card/80 border-vyro-border shadow-xs'
                  : 'bg-vyro-card/30 border-vyro-border/40 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Row Header */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-vyro-border/40 text-vyro-text font-bold">
                    Round {pt.round}
                  </span>
                  <span className="text-vyro-muted text-[11px]">
                    {pt.status === 'consensus'
                      ? 'Mutual Agreement Reached'
                      : pt.gap !== undefined
                      ? `Spread: $${pt.gap} ${currency}`
                      : 'Bilateral Turn'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  {pt.concessionBuyer !== undefined && pt.concessionBuyer > 0 && (
                    <span className="text-blue-400 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> Buyer +${pt.concessionBuyer}
                    </span>
                  )}
                  {pt.concessionSeller !== undefined && pt.concessionSeller > 0 && (
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <TrendingDown className="w-3 h-3" /> Seller -${pt.concessionSeller}
                    </span>
                  )}
                </div>
              </div>

              {/* Horizontal Graphical Bar Track */}
              <div className="relative h-9 bg-vyro-bg/90 rounded-md border border-vyro-border/60 overflow-hidden flex items-center px-3">
                {/* Visual gap fill between buyer and seller */}
                {pt.buyerPrice !== undefined && pt.sellerPrice !== undefined && (
                  <div
                    className="absolute top-0 bottom-0 bg-vyro-accent/10 border-x border-dashed border-vyro-accent/30 pointer-events-none"
                    style={{
                      left: `${Math.min(leftPct, rightPct)}%`,
                      width: `${Math.max(4, Math.abs(rightPct - leftPct))}%`
                    }}
                  />
                )}

                {/* Left Side: Buyer Marker (Price + Delivery Days) */}
                {pt.buyerPrice !== undefined ? (
                  <div className="flex items-center gap-1.5 z-10">
                    <span className="w-2 h-2 rounded-full bg-[#4C7DF0] shrink-0" />
                    <span className="text-xs font-bold font-mono text-vyro-text tabular-nums">
                      ${pt.buyerPrice}
                    </span>
                    {pt.buyerDays !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {pt.buyerDays}d
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-vyro-subtle z-10">Buyer --</span>
                )}

                {/* Center Gap Pill */}
                <div className="mx-auto z-10">
                  {pt.status === 'consensus' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Consensus Reached
                    </span>
                  ) : pt.gap !== undefined ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-vyro-muted bg-vyro-surface border border-vyro-border flex items-center gap-1">
                      <span>${pt.gap} gap</span>
                    </span>
                  ) : (
                    <Minus className="w-3 h-3 text-vyro-subtle" />
                  )}
                </div>

                {/* Right Side: Seller Marker (Price + Delivery Days) */}
                {pt.sellerPrice !== undefined ? (
                  <div className="flex items-center gap-1.5 z-10 ml-auto">
                    {pt.sellerDays !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {pt.sellerDays}d
                      </span>
                    )}
                    <span className="text-xs font-bold font-mono text-vyro-text tabular-nums">
                      ${pt.sellerPrice}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-vyro-subtle z-10 ml-auto">Seller --</span>
                )}
              </div>

              {/* Trade Chips & Concessions Made this Round */}
              {pt.tradesMade && pt.tradesMade.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-mono text-vyro-subtle flex items-center gap-1 mr-1">
                    <Tag className="w-3 h-3 text-vyro-accent" /> Trades:
                  </span>
                  {pt.tradesMade.map((trade, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-vyro-surface border border-vyro-border text-vyro-muted"
                    >
                      {trade}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
