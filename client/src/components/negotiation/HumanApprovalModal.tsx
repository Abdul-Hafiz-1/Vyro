import React from 'react';
import { Agreement, Agent } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, DollarSign, Clock } from 'lucide-react';
import { Badge } from '../common/Badge';

interface HumanApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: Agreement | null;
  sellerAgent: Agent | null;
  onConfirmAuthorization: () => void;
  isAuthorizing: boolean;
}

export const HumanApprovalModal: React.FC<HumanApprovalModalProps> = ({
  isOpen,
  onClose,
  agreement,
  sellerAgent,
  onConfirmAuthorization,
  isAuthorizing
}) => {
  if (!agreement) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Explicit Human Authorization"
      description="Review and sign off on autonomous agent consensus before PayPal capture"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Guardrail Notice */}
        <div className="p-3 rounded-[6px] bg-vyro-warning-bg border border-vyro-warning/30 flex items-start gap-2.5 text-xs text-vyro-warning">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            VYRO Security Policy: AI agents are legally prohibited from triggering financial debits without explicit human authorization. Confirming below clears this agreement for PayPal Sandbox checkout.
          </p>
        </div>

        {/* Commercial Terms Summary Box */}
        <div className="p-4 rounded-[6px] bg-vyro-card border border-vyro-border space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-vyro-border/60">
            <div>
              <span className="text-[10px] font-mono uppercase text-vyro-subtle block">Contracted Partner</span>
              <span className="text-sm font-bold text-vyro-text">{agreement.sellerBusinessName}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-vyro-subtle block">Agreed Settlement</span>
              <span className="text-base font-bold font-mono text-vyro-success">${agreement.finalPrice} {agreement.currency}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-vyro-muted">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-vyro-accent" />
              <span>Turnaround: {agreement.deliveryDays} Days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-vyro-success" />
              <span>Payment: PayPal Sandbox</span>
            </div>
          </div>

          {/* Deliverables Checklist */}
          <div className="pt-2 border-t border-vyro-border/50">
            <span className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1.5">
              Included Deliverables:
            </span>
            <ul className="space-y-1 text-xs text-vyro-text">
              {agreement.finalDeliverables.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-vyro-success shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Terms Clause */}
          <p className="text-[10px] text-vyro-muted italic pt-2 border-t border-vyro-border/40 leading-normal">
            "{agreement.commercialTerms}"
          </p>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-vyro-border flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} disabled={isAuthorizing}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={onConfirmAuthorization}
            isLoading={isAuthorizing}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Authorize Commercial Agreement
          </Button>
        </div>
      </div>
    </Modal>
  );
};
