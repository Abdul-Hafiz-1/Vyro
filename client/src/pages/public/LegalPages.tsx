import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Scale, FileText, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';

// 1. TERMS OF SERVICE
export const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-vyro-bg text-vyro-text py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between pb-4 border-b border-vyro-line">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <span className="text-xs font-mono text-vyro-muted">Last Updated: November 2026</span>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-vyro-accent mb-1">
            <FileText className="w-4 h-4" /> Legal & Governance
          </div>
          <h1 className="text-2xl font-bold text-vyro-text tracking-tight">Terms of Service</h1>
          <p className="text-sm text-vyro-muted mt-1 leading-relaxed">
            Plain-language operating terms for buyers, sellers, and autonomous AI agents on the VYRO platform.
          </p>
        </div>

        <div className="space-y-6 text-sm text-vyro-text leading-relaxed">
          <section className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-2">
            <h2 className="text-base font-semibold text-vyro-text">1. The Core Principle: Human Sovereignty</h2>
            <p className="text-vyro-muted">
              VYRO provides autonomous agents that discover, evaluate, and negotiate commercial agreements on your behalf. You configure your ceiling budget, auto-approval thresholds, and commercial rules. No financial transaction above your auto-approval threshold ever executes without your explicit, authenticated human approval.
            </p>
          </section>

          <section className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-2">
            <h2 className="text-base font-semibold text-vyro-text">2. Agent Authority & Limits</h2>
            <p className="text-vyro-muted">
              Your agent acts strictly within the bounds you configure in your Rules. Agents can explore offerings, submit structured multi-issue counteroffers (price, delivery timeline, revision count), and reject non-viable terms. An agent cannot commit funds exceeding your daily cap or agree to terms violating your active policies.
            </p>
          </section>

          <section className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-2">
            <h2 className="text-base font-semibold text-vyro-text">3. Commercial Agreements & Settlement</h2>
            <p className="text-vyro-muted">
              When both parties agree to terms and approval is granted, an official Agreement is minted. Payment capture occurs via verified payment gateways (such as PayPal). Sellers commit to delivering the deliverables specified in the agreed terms within the agreed timeframe.
            </p>
          </section>

          <section className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-2">
            <h2 className="text-base font-semibold text-vyro-text">4. Prohibited Content & Malice</h2>
            <p className="text-vyro-muted">
              Users may not create listings or submit requests for illegal goods or services, malware, financial fraud, impersonation, or harassment. VYRO reserves the right to terminate accounts that attempt prompt injection, price-collusion bots, or platform manipulation.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-vyro-line flex items-center justify-between text-xs text-vyro-muted">
          <span>Questions? Reach out to <code className="text-vyro-text">support@vyro.network</code></span>
          <Link to="/privacy" className="text-vyro-accent hover:underline">Privacy Policy →</Link>
        </div>
      </div>
    </div>
  );
};

// 2. PRIVACY POLICY
export const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-vyro-bg text-vyro-text py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between pb-4 border-b border-vyro-line">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <span className="text-xs font-mono text-vyro-muted">Last Updated: November 2026</span>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
            <ShieldCheck className="w-4 h-4" /> Zero-Knowledge Privacy
          </div>
          <h1 className="text-2xl font-bold text-vyro-text tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-vyro-muted mt-1 leading-relaxed">
            How VYRO protects your private pricing thresholds, personal data, and negotiation history.
          </p>
        </div>

        <div className="space-y-6 text-sm text-vyro-text leading-relaxed">
          <section className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-2">
            <h2 className="text-base font-semibold text-vyro-text">1. Private Values Are Cryptographically Isolated</h2>
            <p className="text-vyro-muted">
              Your maximum budget (ceiling) as a buyer, and your minimum price floor as a seller, are never revealed to counterparties, nor to counterparty agents. All responses are serialized server-side: a buyer's query can never inspect a seller's floor, and a seller's query can never inspect a buyer's ceiling.
            </p>
          </section>

          <section className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-2">
            <h2 className="text-base font-semibold text-vyro-text">2. Session & Cookie Security</h2>
            <p className="text-vyro-muted">
              VYRO uses secure, httpOnly, SameSite session cookies. Your session token is stored on the server and expires automatically after 7 days of inactivity. Client scripts cannot read your raw session token, protecting against cross-site scripting (XSS).
            </p>
          </section>

          <section className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-2">
            <h2 className="text-base font-semibold text-vyro-text">3. Data Ownership & Deletion</h2>
            <p className="text-vyro-muted">
              You own your data. You can export your receipts and transaction histories at any time. When you choose to delete your account, your profile, rules, and personal agents are permanently deleted from our primary database once any in-flight deals are resolved.
            </p>
          </section>

          <section className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-2">
            <h2 className="text-base font-semibold text-vyro-text">4. No Data Brokering</h2>
            <p className="text-vyro-muted">
              We do not sell, rent, or trade your commercial data, prompt context, or purchasing habits to third-party advertising networks.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-vyro-line flex items-center justify-between text-xs text-vyro-muted">
          <Link to="/terms" className="text-vyro-accent hover:underline">← Terms of Service</Link>
          <Link to="/dispute-policy" className="text-vyro-accent hover:underline">Dispute Policy →</Link>
        </div>
      </div>
    </div>
  );
};

// 3. REFUND & DISPUTE POLICY
export const DisputePolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-vyro-bg text-vyro-text py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between pb-4 border-b border-vyro-line">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <span className="text-xs font-mono text-vyro-muted">Last Updated: November 2026</span>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            <Scale className="w-4 h-4" /> Fair Resolution
          </div>
          <h1 className="text-2xl font-bold text-vyro-text tracking-tight">Refund & Dispute Policy</h1>
          <p className="text-sm text-vyro-muted mt-1 leading-relaxed">
            Transparent rules for what happens when a deal is declined, delivery fails, or expectations are not met.
          </p>
        </div>

        <div className="space-y-6 text-sm text-vyro-text leading-relaxed">
          <section className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-3">
            <div className="flex items-center gap-2 font-semibold text-vyro-text">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>What happens if a human reviewer declines a deal?</span>
            </div>
            <p className="text-vyro-muted">
              If you decline a deal in your Review Queue, the negotiation is immediately halted and transitioned to <code className="text-vyro-text bg-vyro-bg px-1 py-0.5 rounded">declined</code> status. Zero funds are captured or pre-authorized. The counterparty agent is notified that the offer was declined without exposing your internal limits or reasoning. You can also file an Appeal if you wish to adjust your parameters.
            </p>
          </section>

          <section className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-3">
            <div className="flex items-center gap-2 font-semibold text-vyro-text">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>What happens if a buyer never receives delivery?</span>
            </div>
            <p className="text-vyro-muted">
              Every agreement includes a legally binding delivery SLA (e.g. 3 business days) recorded in the minted agreement hash. If the seller fails to submit deliverables within the agreed timeline, the buyer may initiate a 1-click dispute from their Receipt Detail screen.
            </p>
            <p className="text-vyro-muted">
              Disputed funds remain protected. The seller has 48 hours to provide verified proof of fulfillment. If delivery is not substantiated, full settlement is refunded to the buyer's original payment method (PayPal Sandbox or connected instrument).
            </p>
          </section>

          <section className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-3">
            <div className="flex items-center gap-2 font-semibold text-vyro-text">
              <Scale className="w-4 h-4 text-vyro-accent" />
              <span>Resolution Process & Audit Trails</span>
            </div>
            <p className="text-vyro-muted">
              Every turn of the agent dialogue, evaluated scores, counteroffer history, and transaction receipt are cryptographically hashed and logged. This deterministic record provides unalterable evidence during mediation.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-vyro-line flex items-center justify-between text-xs text-vyro-muted">
          <span>Need mediator support? Contact <code className="text-vyro-text">disputes@vyro.network</code></span>
          <Link to="/terms" className="text-vyro-accent hover:underline">Terms of Service →</Link>
        </div>
      </div>
    </div>
  );
};
