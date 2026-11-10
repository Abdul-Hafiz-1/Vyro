import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';

// 1. TERMS OF SERVICE
export const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      id: 'sovereignty',
      title: '1. Human Sovereignty & Ultimate Control',
      body: 'VYRO provides autonomous agents that search, evaluate, and negotiate agreements on your behalf. You configure your comfortable budget, flexibility stretch, auto-approval thresholds, and commercial rules. No financial transaction above your comfortable budget ever executes without your explicit, authenticated human approval.'
    },
    {
      id: 'authority',
      title: '2. Agent Authority & Operating Boundaries',
      body: 'Your agent acts strictly within the bounds you configure in your Rules. Agents can explore offerings, submit structured multi-issue counteroffers (price, delivery timeline, revision count), and reject non-viable terms. An agent cannot commit funds exceeding your hard cap or agree to terms violating your active policies.'
    },
    {
      id: 'agreements',
      title: '3. Commercial Agreements & Settlement',
      body: 'When both parties agree to terms and approval is granted, an official Agreement is formed. Payment capture occurs via verified escrow gateways (such as PayPal Sandbox). Sellers commit to delivering the deliverables specified in the agreed terms within the agreed timeframe.'
    },
    {
      id: 'safety',
      title: '4. Prohibited Content & Safety Policy',
      body: 'Users may not create listings or submit requests for illegal services, malware, financial fraud, impersonation, or harassment. VYRO reserves the right to terminate accounts that attempt prompt injection, price-collusion bots, or platform manipulation.'
    }
  ];

  return (
    <div className="min-h-screen bg-bg text-text-primary py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
          >
            Back
          </Button>
          <span className="text-secondary text-text-muted">Last updated: November 2026</span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <StatusChip label="Legal & Governance" role="neutral" size="sm" />
          </div>
          <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
            Terms of Service
          </h1>
          <p className="text-body text-text-muted leading-relaxed">
            Plain-language operating terms for buyers, sellers, and autonomous AI agents on the VYRO platform.
          </p>
        </div>

        {/* Table of Contents */}
        <Card className="p-5 flex flex-col gap-2.5 bg-raised">
          <span className="text-secondary font-semibold text-text-primary">Table of contents</span>
          <div className="flex flex-col gap-1.5 text-secondary">
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                {sec.title}
              </a>
            ))}
          </div>
        </Card>

        {/* Sections */}
        <div className="flex flex-col gap-6">
          {sections.map((sec) => (
            <Card key={sec.id} id={sec.id} className="p-6 flex flex-col gap-3 scroll-mt-6">
              <h2 className="font-display font-bold text-[20px] text-text-primary">
                {sec.title}
              </h2>
              <p className="text-body text-text-muted leading-relaxed">
                {sec.body}
              </p>
            </Card>
          ))}
        </div>

        <div className="pt-6 border-t border-border-subtle flex items-center justify-between text-secondary text-text-muted">
          <span>Questions? Reach out to support@vyro.network</span>
          <Link to="/privacy" className="text-text-primary font-semibold hover:underline">
            Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
};

// 2. PRIVACY POLICY
export const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      id: 'isolation',
      title: '1. Private Values Are Cryptographically Isolated',
      body: 'Your comfortable budget and hard cap as a buyer, and your standard lowest price and minimum limit as a seller, are never revealed to counterparties, nor to counterparty agents. All responses are serialized server-side: a buyer query can never inspect a seller limit, and a seller query can never inspect a buyer budget.'
    },
    {
      id: 'retention',
      title: '2. Data Retention & Negotiation History',
      body: 'Transcripts of multi-agent negotiations are stored solely to construct your audit trail, provide explanations for price settlements, and allow post-deal dispute mediation. We do not sell your transactional data or share prompts with third-party advertisers.'
    },
    {
      id: 'payments',
      title: '3. Financial Data & Payment Processors',
      body: 'VYRO never stores raw credit card numbers or bank account credentials. All escrow payments are processed through trusted third-party providers (PayPal Sandbox Orders API). Your financial credentials remain secured with the payment processor.'
    },
    {
      id: 'rights',
      title: '4. Your Sovereignty & Account Deletion',
      body: 'You may export your transaction receipts or delete your account and associated agents at any time. When you close your account, your agent rules, memory vectors, and private thresholds are permanently scrubbed from active databases.'
    }
  ];

  return (
    <div className="min-h-screen bg-bg text-text-primary py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
          >
            Back
          </Button>
          <span className="text-secondary text-text-muted">Last updated: November 2026</span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <StatusChip label="Zero-Knowledge Privacy" role="handled" size="sm" />
          </div>
          <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-body text-text-muted leading-relaxed">
            How VYRO protects your private pricing thresholds, personal data, and negotiation history.
          </p>
        </div>

        {/* Table of Contents */}
        <Card className="p-5 flex flex-col gap-2.5 bg-raised">
          <span className="text-secondary font-semibold text-text-primary">Table of contents</span>
          <div className="flex flex-col gap-1.5 text-secondary">
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                {sec.title}
              </a>
            ))}
          </div>
        </Card>

        {/* Sections */}
        <div className="flex flex-col gap-6">
          {sections.map((sec) => (
            <Card key={sec.id} id={sec.id} className="p-6 flex flex-col gap-3 scroll-mt-6">
              <h2 className="font-display font-bold text-[20px] text-text-primary">
                {sec.title}
              </h2>
              <p className="text-body text-text-muted leading-relaxed">
                {sec.body}
              </p>
            </Card>
          ))}
        </div>

        <div className="pt-6 border-t border-border-subtle flex items-center justify-between text-secondary text-text-muted">
          <span>Questions? Contact privacy@vyro.network</span>
          <Link to="/terms" className="text-text-primary font-semibold hover:underline">
            Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
};

// 3. DISPUTE & ESCROW POLICY
export const DisputePolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-text-primary py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" strokeWidth={2} />}
          >
            Back
          </Button>
          <span className="text-secondary text-text-muted">Last updated: November 2026</span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <StatusChip label="Escrow & Mediation" role="handled" size="sm" />
          </div>
          <h1 className="font-display font-bold text-[32px] text-text-primary tracking-tight">
            Dispute & Mediation Policy
          </h1>
          <p className="text-body text-text-muted leading-relaxed">
            How platform escrow protects buyers and sellers in the event of scope discrepancy or unmet milestones.
          </p>
        </div>

        <Card className="p-6 flex flex-col gap-3">
          <h2 className="font-display font-bold text-[20px] text-text-primary">
            Stage-Aware Refund Fail-Safe &amp; 72-Hour Review Window
          </h2>
          <p className="text-body text-text-muted leading-relaxed">
            Funds captured via PayPal escrow remain held until work is delivered and accepted. Before the seller clicks <strong>Start work</strong>, buyers may cancel for an immediate full refund. While in progress, refunds require seller agreement or mediation. Once delivered, buyers cannot self-refund; they have a 72-hour review window to accept work, request changes, or open a dispute before auto-acceptance releases seller earnings.
          </p>
        </Card>

        <Card className="p-6 flex flex-col gap-3">
          <h2 className="font-display font-bold text-[20px] text-text-primary">
            SHA-256 Evidence Proofs &amp; 72-Hour Dispute Mediation
          </h2>
          <p className="text-body text-text-muted leading-relaxed">
            All projects record an immutable agreed deliverables snapshot and compute SHA-256 hashes for every uploaded delivery file stored privately outside public web directories. When a dispute is opened, held funds freeze and respondents have 72 hours to submit counter-evidence before a mediator releases, refunds, or splits funds. External claims filed directly inside PayPal remain subject to PayPal&apos;s Buyer Protection rules.
          </p>
        </Card>
      </div>
    </div>
  );
};