import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import confetti from 'canvas-confetti';
import { api } from '../../api/client';
import { Agreement, Transaction } from '../../types';
import { ShieldCheck, Loader2, AlertCircle, HelpCircle } from 'lucide-react';
import { formatMoney } from '../../lib/present';
import { StatusChip } from '../common/StatusChip';

interface PayPalCheckoutButtonProps {
  agreement: Agreement;
  onPaymentSuccess: (tx: Transaction) => void;
  onPaymentError: (err: string) => void;
}

interface ErrorDetails {
  message: string;
  nextStep?: string;
}

export const PayPalCheckoutButton: React.FC<PayPalCheckoutButtonProps> = ({
  agreement,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ErrorDetails | null>(null);
  const [clientId, setClientId] = useState<string>(
    import.meta.env.VITE_PAYPAL_CLIENT_ID || ''
  );

  useEffect(() => {
    // Always sync authoritative PayPal clientId from server
    api.getPayPalConfig().then((cfg) => {
      if (cfg.clientId && cfg.clientId !== 'sb') {
        setClientId(cfg.clientId);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="p-5 rounded-surface bg-surface border border-border-subtle flex flex-col gap-4 text-text-primary">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2 text-secondary text-text-primary font-medium">
          <ShieldCheck className="w-4 h-4 text-status-handled" strokeWidth={2} />
          <span>PayPal Escrow Checkout</span>
        </div>
        <StatusChip label="Sandbox testnet" role="neutral" size="sm" />
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-secondary text-text-muted">Total to authorize</span>
        <span className="font-display font-bold text-[24px] text-text-primary">
          {formatMoney(agreement.finalPrice)}
        </span>
      </div>

      {errorInfo && (
        <div className="p-3.5 rounded-control bg-status-declined/10 border border-status-declined/20 text-secondary text-status-declined flex flex-col gap-1.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
            <span className="font-medium">{errorInfo.message}</span>
          </div>
          {errorInfo.nextStep && (
            <div className="flex items-start gap-2 text-text-muted text-secondary pl-6">
              <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-volt" strokeWidth={2} />
              <span>{errorInfo.nextStep}</span>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-2 text-secondary text-volt font-medium">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
          <span>Processing PayPal authorization…</span>
        </div>
      )}

      {/* Real PayPal Buttons */}
      <div className="pt-1">
        {clientId ? (
          <PayPalScriptProvider
            options={{
              clientId: clientId,
              currency: 'USD',
              intent: 'capture',
              components: 'buttons'
            }}
          >
            <PayPalButtons
              style={{
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'paypal',
                height: 48
              }}
              disabled={loading}
              createOrder={async () => {
                setLoading(true);
                setErrorInfo(null);
                try {
                  const res = await api.createPayPalOrder(agreement.id);
                  return res.orderId;
                } catch (err: any) {
                  const message = err.message || 'Failed to create PayPal order.';
                  setErrorInfo({
                    message,
                    nextStep: 'Check that this deal is approved in your review queue.'
                  });
                  onPaymentError(message);
                  throw err;
                } finally {
                  setLoading(false);
                }
              }}
              onApprove={async (data) => {
                setLoading(true);
                setErrorInfo(null);
                try {
                  const tx = await api.capturePayPalOrder(data.orderID);
                  try {
                    confetti({
                      particleCount: 80,
                      spread: 70,
                      origin: { y: 0.6 },
                      colors: ['#D4FF3A', '#34D399', '#FFFFFF']
                    });
                  } catch {}
                  onPaymentSuccess(tx);
                } catch (err: any) {
                  const message = err.message || 'Failed to capture PayPal payment.';
                  setErrorInfo({
                    message,
                    nextStep: 'Please check your sandbox balance and try again.'
                  });
                  onPaymentError(message);
                } finally {
                  setLoading(false);
                }
              }}
              onCancel={() => {
                setErrorInfo({
                  message: 'PayPal authorization window was closed without completing payment.',
                  nextStep: 'Click the PayPal button again when you are ready to authorize payment.'
                });
              }}
              onError={(err) => {
                console.error('[PayPal Checkout Error]:', err);
                const msg = err && typeof err === 'object' && 'message' in err ? (err as any).message : String(err);
                setErrorInfo({
                  message: msg || 'An error occurred within the PayPal popup component.',
                  nextStep: 'Ensure popups are allowed in your browser and try again.'
                });
              }}
            />
          </PayPalScriptProvider>
        ) : (
          <div className="flex items-center justify-center py-4 text-secondary text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Loading payment gateway...</span>
          </div>
        )}
      </div>

      <p className="text-secondary text-text-muted text-center">
        Secured by PayPal Sandbox. Funds are held in escrow until deliverables are verified.
      </p>
    </div>
  );
};