import dotenv from 'dotenv';
import path from 'path';

// Load .env from server or root directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const paypalEnv = (process.env.PAYPAL_ENV || process.env.PAYPAL_MODE || 'sandbox').toLowerCase() as 'sandbox' | 'live';
const paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || '';

// Startup validation: Fail loudly if live credentials are configured while PAYPAL_ENV=sandbox
if (paypalEnv === 'sandbox' && (paypalClientId.startsWith('live_') || paypalClientSecret.startsWith('live_'))) {
  throw new Error('[PayPal Config] Live PayPal credentials detected while PAYPAL_ENV=sandbox. Refusing to start server to prevent accidental live charges.');
}

if (process.env.NODE_ENV === 'production' && (!paypalClientId || !paypalClientSecret)) {
  console.warn('[PayPal Config WARNING] PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing in production environment.');
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  paypal: {
    clientId: paypalClientId,
    clientSecret: paypalClientSecret,
    env: paypalEnv,
    mode: paypalEnv,
    baseUrl: paypalEnv === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com'
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  // Simulation flag allows testing complete pipeline even before external keys are configured
  allowSimulationMode: process.env.ALLOW_SIMULATION !== 'false',
};
