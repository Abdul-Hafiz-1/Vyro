import React, { useState, useEffect } from 'react';
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Agreement, Transaction } from '../../types';
import { CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { formatMoney } from '../../lib/present';

interface PayPalCheckoutButtonProps {
  agreement: Agreement;
  projectTitle?: string;
  isSandbox?: boolean;
  onPaymentSuccess: (tx: Transaction) => void;
  onPaymentError: (err: string) => void;
}

interface ErrorDetails {
  message: string;
  nextStep?: string;
}

const PayPalButtonsInner: React.FC<{
  agreementId: string;
  isLight: boolean;
  loading: boolean;
  setLoading: (val: boolean) => void;
  setErrorInfo: (err: ErrorDetails | null) => void;
  onRetryScript: () => void;
  onPaymentSuccess: (tx: Transaction) => void;
  onPaymentError: (err: string) => void;
}> = ({
  agreementId,
  isLight,
  loading,
  setLoading,
  setErrorInfo,
  onRetryScript,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [renderFailed, setRenderFailed] = useState(false);

  if (isRejected || renderFailed) {
    return (
      <div className="min-h-[48px] p-3 rounded-[10px] border border-border-subtle bg-raised flex items-center justify-between gap-3">
        <span className="text-secondary text-text-muted">
          PayPal checkout couldn’t load right now.
        </span>
        <button
          type="button"
          onClick={() => {
            setRenderFailed(false);
            onRetryScript();
          }}
          className="h-9 px-3 rounded-[10px] border border-border-subtle bg-surface text-secondary font-medium text-text-primary hover:bg-raised inline-flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative z-20 w-full min-h-[48px]">
      {isPending && (
        <div
          aria-label="Loading PayPal button"
          className="absolute inset-0 z-10 h-12 w-full rounded-[4px] bg-raised opacity-70"
        />
      )}
      <div className={isPending ? 'w-full opacity-0 pointer-events-none' : 'w-full'}>
        <PayPalButtons
          forceReRender={[agreementId, isLight ? 'light' : 'dark']}
          style={{
            layout: 'vertical',
            color: isLight ? 'blue' : 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 48,
            tagline: false,
          }}
          disabled={loading}
          createOrder={async () => {
            setLoading(true);
            setErrorInfo(null);
            try {
              const res = await api.createPayPalOrder(agreementId);
              return res.orderId;
            } catch (err: any) {
              const message = err.message || 'Could not start PayPal checkout.';
              setErrorInfo({
                message,
                nextStep: 'Confirm this deal is approved, then try again.',
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
              onPaymentSuccess(tx);
            } catch (err: any) {
              const message = err.message || 'Payment could not be captured.';
              setErrorInfo({
                message,
                nextStep: 'Check your PayPal balance or try again.',
              });
              onPaymentError(message);
            } finally {
              setLoading(false);
            }
          }}
          onCancel={() => {
            setErrorInfo({
              message: 'PayPal window closed before completing payment.',
              nextStep: 'Click the PayPal button whenever you’re ready.',
            });
          }}
          onError={(err) => {
            console.error('[PayPal Checkout Error]:', err);
            setRenderFailed(true);
            setErrorInfo({
              message: 'PayPal checkout encountered a loading error.',
              nextStep: 'Disable blockers or click Retry to reload PayPal.',
            });
          }}
        />
      </div>
    </div>
  );
};

export const PayPalCheckoutButton: React.FC<PayPalCheckoutButtonProps> = ({
  agreement,
  projectTitle,
  isSandbox = true,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ErrorDetails | null>(null);
  const [paidTx, setPaidTx] = useState<Transaction | null>(null);
  const [clientId, setClientId] = useState<string>(
    import.meta.env.VITE_PAYPAL_CLIENT_ID || ''
  );
  const [configError, setConfigError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isLight, setIsLight] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('light')
  );

  // Sync active theme for optimal PayPal button contrast (gold on dark, blue on light)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const syncTheme = () => {
      setIsLight(document.documentElement.classList.contains('light'));
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const loadConfig = () => {
    setConfigError(false);
    api
      .getPayPalConfig()
      .then((cfg) => {
        if (cfg.clientId && cfg.clientId !== 'sb') {
          setClientId(cfg.clientId);
        } else if (!import.meta.env.VITE_PAYPAL_CLIENT_ID) {
          setConfigError(true);
        }
      })
      .catch(() => {
        if (!import.meta.env.VITE_PAYPAL_CLIENT_ID) {
          setConfigError(true);
        }
      });
  };

  useEffect(() => {
    loadConfig();
  }, [retryKey]);

  const scopeSummary =
    projectTitle ||
    (agreement.finalDeliverables?.length
      ? agreement.finalDeliverables.slice(0, 2).join(', ')
      : 'Agreed project deliverables');

  if (paidTx) {
    return (
      <div className="w-full p-4 rounded-control bg-status-handled/10 border border-status-handled/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-status-handled font-medium text-secondary">
          <CheckCircle2 className="w-5 h-5 shrink-0" strokeWidth={2.5} />
          <span>Paid with PayPal</span>
        </div>
        <Link
          to={`/app/transactions/${paidTx.id}`}
          className="text-secondary font-medium text-text-primary underline hover:text-volt"
        >
          View receipt
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3 text-text-primary relative z-20">
      {/* Clear Amount & Scope Summary Above Button */}
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-secondary text-text-muted truncate">{scopeSummary}</span>
          <span className="font-display font-bold text-[20px] text-text-primary shrink-0">
            {formatMoney(agreement.finalPrice)}
          </span>
        </div>
        <p className="text-secondary text-text-muted">
          Service fee {formatMoney(Math.round(agreement.finalPrice * 100 * 0.05) / 100)} (5% included) · Paid with PayPal and held until you accept the work.
        </p>
        <p className="text-secondary text-text-muted">
          You’ll approve the payment in PayPal. We never see your login.
        </p>
      </div>

      {errorInfo && (
        <div className="p-3 rounded-[10px] bg-status-declined/10 border border-status-declined/20 text-secondary text-status-declined flex flex-col gap-1">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
            <span className="font-medium">{errorInfo.message}</span>
          </div>
          {errorInfo.nextStep && (
            <span className="text-secondary text-text-muted pl-6">{errorInfo.nextStep}</span>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-1 text-secondary text-volt font-medium">
          <span className="vyro-live-indicator" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>Processing PayPal approval…</span>
        </div>
      )}

      {/* Official PayPal SDK Button Container (unclipped, untransformed, min-h-48px) */}
      <div className="w-full min-h-[48px] relative z-20">
        {configError ? (
          <div className="min-h-[48px] p-3 rounded-[10px] border border-border-subtle bg-raised flex items-center justify-between gap-3">
            <span className="text-secondary text-text-muted">PayPal configuration unavailable.</span>
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="h-9 px-3 rounded-[10px] border border-border-subtle bg-surface text-secondary font-medium text-text-primary hover:bg-raised inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : clientId ? (
          <PayPalScriptProvider
            key={`pp-${clientId}-${retryKey}`}
            options={{
              clientId,
              components: 'buttons',
              currency: 'USD',
              intent: 'capture',
              disableFunding: 'card,credit,paylater',
            }}
          >
            <PayPalButtonsInner
              agreementId={agreement.id}
              isLight={isLight}
              loading={loading}
              setLoading={setLoading}
              setErrorInfo={setErrorInfo}
              onRetryScript={() => setRetryKey((k) => k + 1)}
              onPaymentSuccess={(tx) => {
                setPaidTx(tx);
                onPaymentSuccess(tx);
              }}
              onPaymentError={onPaymentError}
            />
          </PayPalScriptProvider>
        ) : (
          <div
            aria-label="Loading PayPal gateway"
            className="h-12 w-full rounded-[4px] bg-raised opacity-70"
          />
        )}
      </div>

      {isSandbox && (
        <p className="text-secondary text-text-muted text-center">
          Test mode: no real money moves
        </p>
      )}
    </div>
  );
};
