import dotenv from 'dotenv';
import path from 'path';

// Load .env from server or root directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const paymentProvider = (process.env.PAYMENT_PROVIDER || 'paypal').trim().toLowerCase();
const paypalEnv = (process.env.PAYPAL_ENV || process.env.PAYPAL_MODE || 'sandbox').toLowerCase() as 'sandbox' | 'live';
const paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || '';

// Startup validation: Fail loudly if live credentials are configured while PAYPAL_ENV=sandbox
if (paypalEnv === 'sandbox' && (paypalClientId.startsWith('live_') || paypalClientSecret.startsWith('live_'))) {
  throw new Error('[PayPal Config] Live PayPal credentials detected while PAYPAL_ENV=sandbox. Refusing to start server to prevent accidental live charges.');
}

if (nodeEnv === 'production' && (!paypalClientId || !paypalClientSecret)) {
  console.warn('[PayPal Config WARNING] PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing in production environment.');
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  paymentProvider,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  paypal: {
    clientId: paypalClientId,
    clientSecret: paypalClientSecret,
    env: paypalEnv,
    mode: paypalEnv,
    merchantEmail: (process.env.PAYPAL_MERCHANT_EMAIL || '').trim().toLowerCase(),
    payoutProvider: (nodeEnv === 'production'
      ? 'paypal'
      : (process.env.PAYPAL_PAYOUT_PROVIDER || (paypalClientId && paypalClientSecret ? 'paypal' : 'simulated')).toLowerCase()) as 'paypal' | 'simulated',
    baseUrl: paypalEnv === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com'
  },
  platformFeePercent: Math.max(0, Math.min(30, Number(process.env.PLATFORM_FEE_PERCENT ?? 5))),
  reviewWindowHours: Math.max(0.001, Number(process.env.REVIEW_WINDOW_HOURS ?? 72)),
  disputeResponseHours: Math.max(0.001, Number(process.env.DISPUTE_RESPONSE_HOURS ?? 72)),
  uploadsDir: path.resolve(__dirname, '../../uploads'),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  // Simulation flag allows testing complete pipeline even before external keys are configured
  allowSimulationMode: process.env.ALLOW_SIMULATION !== 'false',
};
