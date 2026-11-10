const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const envText = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

async function main() {
  const db = new DatabaseSync('server/data/vyro.db');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name);
  console.log('=== CURRENT DB TABLES ===');
  console.log(tables.join(', '));

  for (const t of ['users', 'agents', 'agreements', 'transactions']) {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => `${c.name}:${c.type}`);
    console.log(`\n[${t}] columns:`, cols.join(', '));
  }

  console.log('\n=== SAMPLE USERS (checking seller payment fields) ===');
  console.log(db.prepare('SELECT id, email, role, active_workspace, onboarding_completed, balance FROM users LIMIT 6').all());

  console.log('\n=== SAMPLE TRANSACTIONS (checking seller payout & merchant routing) ===');
  console.log(db.prepare('SELECT id, agreement_id, buyer_user_id, seller_user_id, amount, payment_status, seller_share_held, seller_payout_status, seller_payout_at, paypal_order_id, paypal_capture_id FROM transactions LIMIT 6').all());

  // Also inspect PayPal OAuth + Payouts API availability using platform merchant sandbox credentials
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  const baseUrl = (process.env.PAYPAL_ENV || 'sandbox') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  console.log('\n=== PAYPAL SANDBOX TOKEN & PAYOUTS CHECK ===');
  if (!clientId || !clientSecret) {
    console.log('PayPal credentials missing in .env');
    return;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const tokenDebugId = tokenRes.headers.get('paypal-debug-id');
  const tokenJson = await tokenRes.json();
  console.log('OAuth Status:', tokenRes.status, 'Debug-ID:', tokenDebugId, 'Scopes:', tokenJson.scope || '(none)');
  console.log('App ID:', tokenJson.app_id, 'Token type:', tokenJson.token_type);

  // Probe Payouts API GET /v1/payments/payouts?batch_id=... or send a $1.00 test batch to check if Payouts API is enabled
  const testBatchId = `diag_payout_${Date.now()}`;
  const receiverEmail = process.env.PAYPAL_TEST_SELLER_EMAIL || 'sb-seller-test@personal.example.com';
  console.log('Testing $1.00 Payouts call to:', receiverEmail);
  const payoutRes = await fetch(`${baseUrl}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenJson.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: testBatchId,
        email_subject: 'VYRO payout test',
        email_message: 'VYRO sandbox payout diagnostic'
      },
      items: [{
        recipient_type: 'EMAIL',
        amount: { value: '1.00', currency: 'USD' },
        note: 'VYRO payout',
        sender_item_id: `diag_item_${Date.now()}`,
        receiver: receiverEmail
      }]
    })
  });
  const payoutDebugId = payoutRes.headers.get('paypal-debug-id');
  const payoutBody = await payoutRes.text();
  console.log('Payouts POST Status:', payoutRes.status, 'Debug-ID:', payoutDebugId);
  console.log('Payouts Response:', payoutBody);
}

main().catch(err => { console.error(err); process.exit(1); });
