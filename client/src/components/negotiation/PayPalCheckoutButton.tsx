import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import confetti from 'canvas-confetti';
import { api } from '../../api/client';
import { Agreement, Transaction } from '../../types';
import { Button } from '../common/Button';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';

interface PayPalCheckoutButtonProps {
  agreement: Agreement;
  onPaymentSuccess: (tx: Transaction) => void;
  onPaymentError: (err: string) => void;
}

export const PayPalCheckoutButton: React.FC<PayPalCheckoutButtonProps> = ({
  agreement,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExecuteSandboxPayment = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Step 1: Create Order on backend (derived strictly from authorized agreement)
      const order = await api.createPayPalOrder(agreement.id);
      
      // Step 2: Capture Order on backend & verify server-side
      const transaction = await api.capturePayPalOrder(order.orderId);

      // Trigger celebratory confetti for successfully settled commercial transaction
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#63D6A0', '#8B7CFF', '#F2F2F0']
        });
      } catch (e) {
        // Non-blocking
      }

      onPaymentSuccess(transaction);
    } catch (err: any) {
      console.error('[PayPal Sandbox] Payment capture failed:', err);
      const msg = err.message || 'Payment capture failed';
      setErrorMsg(msg);
      onPaymentError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-vyro-border/60">
        <div className="flex items-center gap-2 text-xs font-mono text-vyro-text">
          <ShieldCheck className="w-4 h-4 text-vyro-success" />
          <span className="font-semibold">PayPal Sandbox Orders API</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-vyro-warning-bg border border-vyro-warning/30 text-vyro-warning">
          SANDBOX TESTNET
        </span>
      </div>

      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-vyro-muted">Total Authorized:</span>
        <span className="text-base font-bold text-vyro-text">${agreement.finalPrice} {agreement.currency}</span>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded bg-vyro-error/15 border border-vyro-error/30 text-xs text-vyro-error flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Action Button */}
      <Button
        variant="primary"
        size="lg"
        className="w-full justify-center bg-[#0070BA] hover:bg-[#005ea6] text-white font-semibold border-none shadow-md"
        isLoading={loading}
        onClick={handleExecuteSandboxPayment}
        leftIcon={<CreditCard className="w-4 h-4" />}
      >
        Pay ${agreement.finalPrice} with PayPal Sandbox
      </Button>

      <p className="text-[10px] text-vyro-subtle text-center font-mono">
        Secured by PayPal Sandbox API. Non-escrow instant order capture upon verification.
      </p>
    </div>
  );
};
