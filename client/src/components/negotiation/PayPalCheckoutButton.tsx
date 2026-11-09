import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import confetti from 'canvas-confetti';
import { api } from '../../api/client';
import { Agreement, Transaction } from '../../types';
import { ShieldCheck, Loader2, AlertCircle, HelpCircle } from 'lucide-react';

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
    import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AVQClLhVOWU_i3bKRJlGUbmviCeZSyd172KNUy7oP6T0YLUUwoDIcjTRxWAt6sA2ai91FKk-jtI4BNlc'
  );

  useEffect(() => {
    // Dynamically retrieve client ID from server config if missing
    if (!clientId || clientId === 'sb') {
      api.getPayPalConfig().then((cfg) => {
        if (cfg.clientId && cfg.clientId !== 'sb') {
          setClientId(cfg.clientId);
        }
      }).catch(() => {
        // Fallback to default
      });
    }
  }, [clientId]);

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
        <span className="text-base font-bold text-vyro-text">${agreement.finalPrice.toFixed(2)} USD</span>
      </div>

      {errorInfo && (
        <div className="p-3 rounded bg-vyro-error/15 border border-vyro-error/30 text-xs text-vyro-error space-y-1">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{errorInfo.message}</span>
          </div>
          {errorInfo.nextStep && (
            <div className="flex items-start gap-2 text-vyro-muted text-[11px] pl-6">
              <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-vyro-accent" />
              <span>{errorInfo.nextStep}</span>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-vyro-accent font-mono">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing PayPal authorization...</span>
        </div>
      )}

      {/* Real PayPal Buttons with createOrder & onApprove lifecycle */}
      <div className="pt-1">
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
              height: 44
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
                // Browser asks server to capture ONLY after buyer approved in popup
                const tx = await api.capturePayPalOrder(data.orderID);
                try {
                  confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#63D6A0', '#8B7CFF', '#F2F2F0']
                  });
                } catch {
                  // Non-blocking
                }
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
              setErrorInfo({
                message: 'An error occurred within the PayPal popup component.',
                nextStep: 'Ensure popups are allowed in your browser and try again.'
              });
            }}
          />
        </PayPalScriptProvider>
      </div>

      <p className="text-[10px] text-vyro-subtle text-center font-mono">
        Secured by PayPal Orders v2 Sandbox API. Funds captured directly to platform with held seller ledger.
      </p>
    </div>
  );
};
