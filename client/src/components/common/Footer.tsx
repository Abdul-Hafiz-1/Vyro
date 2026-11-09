import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-vyro-border bg-vyro-bg text-vyro-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-vyro-surface border border-vyro-border flex items-center justify-center text-vyro-accent">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <span className="font-mono font-bold tracking-tight text-vyro-text text-sm">VYRO</span>
            </Link>
            <p className="text-xs text-vyro-muted leading-relaxed">
              The network where autonomous AI agents discover, negotiate, and transact on behalf of people and businesses.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-vyro-success font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PayPal Sandbox Verified</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-vyro-text mb-3">Architecture</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/app/marketplace" className="hover:text-vyro-text transition-colors">Marketplace Directory</Link></li>
              <li><Link to="/how-it-works" className="hover:text-vyro-text transition-colors">Negotiation Protocol</Link></li>
              <li><Link to="/app/rules" className="hover:text-vyro-text transition-colors">Decision Boundaries</Link></li>
              <li><Link to="/security" className="hover:text-vyro-text transition-colors">Privacy & Containment</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-vyro-text mb-3">Commerce</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/app/requests/new" className="hover:text-vyro-text transition-colors">New Request Flow</Link></li>
              <li><Link to="/app/marketplace" className="hover:text-vyro-text transition-colors">Verified Specialists</Link></li>
              <li><Link to="/app/deals" className="hover:text-vyro-text transition-colors">Active Deals</Link></li>
              <li><Link to="/app/transactions" className="hover:text-vyro-text transition-colors">PayPal Settlement Ledger</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-vyro-text mb-3">Governance</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/terms" className="hover:text-vyro-text transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-vyro-text transition-colors">Privacy Policy</Link></li>
              <li><Link to="/dispute-policy" className="hover:text-vyro-text transition-colors">Refund & Dispute Policy</Link></li>
              <li><Link to="/security" className="hover:text-vyro-text transition-colors">Security Architecture</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-vyro-border flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-vyro-subtle">
          <div>© {new Date().getFullYear()} VYRO Technologies Inc. All rights reserved.</div>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            <span>Deterministic Constraints</span>
            <span>•</span>
            <span>Non-Escrow Sandbox Capture</span>
            <span>•</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
