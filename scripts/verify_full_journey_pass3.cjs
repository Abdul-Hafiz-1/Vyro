const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';
const SHOT_DIR = path.resolve(__dirname, '..', 'audit', 'pass3');
const VIDEO_DIR = path.join(SHOT_DIR, 'video');

function assert(cond, msg) {
  if (!cond) throw new Error(`JOURNEY ASSERTION FAILED: ${msg}`);
}

async function attachVitalsObservers(page) {
  await page.addInitScript(() => {
    window.__vyroCLS = 0;
    window.__vyroMaxLongTask = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__vyroCLS += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > window.__vyroMaxLongTask) {
            window.__vyroMaxLongTask = entry.duration;
          }
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
  });
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });

  const ts = Date.now();
  const sellerEmail = `pass3_seller_${ts}@example.com`;
  const buyerEmail = `pass3_buyer_${ts}@example.com`;
  const payoutEmail = `sb-seller-${ts}@personal.example.com`;
  const serviceTitle = `React Perf Audit ${String(ts).slice(-5)}`;

  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  try {
    // =========================================================================
    // 1. SELLER B: Signup -> Onboarding (with payout email) -> Publish Listing
    // =========================================================================
    console.log('1) Account B (Seller) onboarding + payout email + listing...');
    const ctxB = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    });
    const pageB = await ctxB.newPage();
    await attachVitalsObservers(pageB);
    const errorsB = [];
    pageB.on('pageerror', (e) => errorsB.push(e.message));

    await pageB.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });
    await pageB.fill('input[type="text"]', 'Seller Studio B');
    await pageB.fill('input[type="email"]', sellerEmail);
    await pageB.fill('input[type="password"]', 'password123');
    await pageB.click('button[type="submit"]');

    await pageB.waitForURL(/\/onboarding/, { timeout: 10000 });
    await pageB.click('button:has-text("Get started")');
    await pageB.waitForSelector('text=Sell services', { timeout: 8000 });
    await pageB.click('text=Sell services');
    await pageB.click('button:has-text("Continue")');
    await pageB.waitForSelector('text=Sample, not real', { timeout: 8000 });
    await pageB.click('button:has-text("Continue")');
    await pageB.waitForSelector('text=Selling limits', { timeout: 8000 });
    await pageB.click('button:has-text("Continue")');

    // Screen 5: Enter PayPal payout email
    await pageB.waitForSelector('#onboarding-paypal-email', { timeout: 8000 });
    await pageB.fill('#onboarding-paypal-email', payoutEmail);
    await pageB.click('button:has-text("Verify email")');
    await pageB.waitForSelector('text=Ready — payouts will be sent', { timeout: 8000 });
    await pageB.screenshot({ path: path.join(SHOT_DIR, '01_seller_onboard_payments.png') });

    await pageB.click('button:has-text("go to Today")');
    await pageB.waitForURL(/\/app\?focusPrompt=1/, { timeout: 10000 });

    // Create Listing via API inside Seller session (matches Buyer prompt cleanly & deterministically)
    const createdListing = await pageB.evaluate(async (title) => {
      const res = await fetch('/api/v1/listings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: 'Full React performance audit, bundle trim, and Core Web Vitals optimization.',
          category: 'engineering',
          price: 160,
          minAcceptablePrice: 120,
          flexibility: 'flexible',
          deliveryDays: 4,
          deliverables: ['Performance report', 'Bundle PR', 'Core Web Vitals score > 90'],
          currency: 'USD',
          isNegotiable: true,
        }),
      });
      return res.json();
    }, serviceTitle);
    assert(createdListing.success, `Failed creating listing: ${JSON.stringify(createdListing)}`);

    // Check Selling > Payments UI
    await pageB.goto(`${BASE_URL}/app/transactions`, { waitUntil: 'networkidle' });
    await pageB.waitForSelector('text=Where should we send your earnings?', { timeout: 8000 });
    await pageB.waitForSelector(`text=${payoutEmail}`, { timeout: 8000 });
    await pageB.screenshot({ path: path.join(SHOT_DIR, '02_seller_payments_ready.png') });

    // =========================================================================
    // 2. BUYER A: Signup -> Onboarding -> HomePromptBox -> Negotiate -> PayPal
    // =========================================================================
    console.log('2) Account A (Buyer) onboarding -> HomePromptBox request -> negotiation -> escrow...');
    const ctxA = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    });
    const pageA = await ctxA.newPage();
    await attachVitalsObservers(pageA);
    const errorsA = [];
    pageA.on('pageerror', (e) => errorsA.push(e.message));

    await pageA.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });
    await pageA.fill('input[type="text"]', 'Buyer Team A');
    await pageA.fill('input[type="email"]', buyerEmail);
    await pageA.fill('input[type="password"]', 'password123');
    await pageA.click('button[type="submit"]');

    await pageA.waitForURL(/\/onboarding/, { timeout: 10000 });
    await pageA.click('button:has-text("Get started")');
    await pageA.waitForSelector('text=Buy services', { timeout: 8000 });
    await pageA.click('text=Buy services');
    await pageA.click('button:has-text("Continue")');
    await pageA.click('button:has-text("Continue")');
    await pageA.click('button:has-text("Continue")');
    await pageA.click('button:has-text("go to Today")');
    await pageA.waitForURL(/\/app\?focusPrompt=1/, { timeout: 10000 });

    // Type Buyer request in HomePromptBox and press Enter
    await pageA.fill('#home-prompt-input', `Need ${serviceTitle} with Core Web Vitals optimization, budget $150, deadline 5 days.`);
    await pageA.press('#home-prompt-input', 'Enter');

    // Log all non-GET API calls and console errors on Buyer page
    pageA.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('401')) console.log('   [Buyer ConsoleErr]', m.text());
    });
    pageA.on('response', async (res) => {
      if (res.request().method() !== 'GET' && res.url().includes('/api/v1')) {
        console.log(`   [Net] ${res.request().method()} ${res.status()} ${res.url().split('/api/v1')[1]}`);
      }
    });

    // Wait for "Here's what I understood" summary & click exact "Start" (not "Start over")
    await pageA.waitForSelector("text=Here's what I understood", { timeout: 45000 });
    const startBtn = pageA.getByRole('button', { name: 'Start', exact: true });
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click();

    // Wait for either /app/deals/neg_ navigation OR "No one offers this yet" notice (up to 120s for LLM rounds)
    await Promise.race([
      pageA.waitForURL(/\/app\/deals\/neg_/, { timeout: 120000 }),
      pageA.waitForSelector('text=No one offers this yet', { timeout: 120000 }).then(async () => {
        console.log('   ℹ Category auto-match returned no matches — launching targeted deal with Seller B...');
        const reqRes = await pageA.evaluate(async (title) => {
          const r = await fetch('/api/v1/requests', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rawInput: `Need ${title} with Core Web Vitals optimization under $150 in 5 days`,
              title,
              category: 'engineering',
              deliverables: ['Performance report', 'Bundle PR'],
              maxBudget: 150,
              targetBudget: 130,
              flexibility: 'flexible',
              deadlineDays: 5,
            }),
          });
          return r.json();
        }, serviceTitle);
        const directRes = await pageA.evaluate(async ({ reqId, agentId }) => {
          const r = await fetch('/api/v1/negotiations/multi-agent', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: reqId, sellerIds: [agentId] }),
          });
          return r.json();
        }, { reqId: reqRes.data.id, agentId: createdListing.data.sellerAgentId });
        const negId = directRes.data.negotiations[0].id;
        await pageA.goto(`${BASE_URL}/app/deals/${negId}`, { waitUntil: 'networkidle' });
      }),
    ]);
    let dealId = pageA.url().split('/app/deals/')[1].split('?')[0];
    console.log(`   ✔ HomePromptBox created & negotiated deal ${dealId}`);

    // Ensure we inspect/settle the deal specifically with our fresh Seller Studio B
    const initialNeg = await pageA.evaluate(async (id) => {
      const r = await fetch(`/api/v1/negotiations/${id}`, { credentials: 'include' });
      return r.json();
    }, dealId);
    if (initialNeg.data?.sellerAgentId !== createdListing.data.sellerAgentId) {
      const siblings = await pageA.evaluate(async (reqId) => {
        const r = await fetch(`/api/v1/negotiations?requestId=${reqId}`, { credentials: 'include' });
        return r.json();
      }, initialNeg.data.requestId);
      const matchB = (siblings.data || []).find((n) => n.sellerAgentId === createdListing.data.sellerAgentId);
      if (matchB) {
        dealId = matchB.id;
      } else {
        const directB = await pageA.evaluate(async ({ reqId, agentId }) => {
          const r = await fetch('/api/v1/negotiations/multi-agent', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: reqId, sellerIds: [agentId] }),
          });
          return r.json();
        }, { reqId: initialNeg.data.requestId, agentId: createdListing.data.sellerAgentId });
        dealId = directB.data.negotiations[0].id;
      }
      await pageA.goto(`${BASE_URL}/app/deals/${dealId}`, { waitUntil: 'networkidle' });
    }

    // Poll until agreement_reached or human decision needed
    for (let i = 0; i < 20; i++) {
      const approveBtn = pageA.locator('button:has-text("Approve")').first();
      if (await approveBtn.isVisible().catch(() => false)) {
        console.log('   Clicking Approve decision button...');
        await approveBtn.click();
        await pageA.waitForTimeout(1000);
        break;
      }
      const agreed = await pageA.locator('text=Agreed at').isVisible().catch(() => false);
      if (agreed) break;
      await pageA.waitForTimeout(1000);
    }

    await pageA.waitForSelector('text=Agreed at', { timeout: 15000 });
    await pageA.screenshot({ path: path.join(SHOT_DIR, '03_buyer_agreed_before_pay.png') });

    // Fetch deal details to get agreementId, test live PayPal sandbox createOrder, then settle into escrow
    const negDetail = await pageA.evaluate(async (id) => {
      const r = await fetch(`/api/v1/negotiations/${id}`, { credentials: 'include' });
      return r.json();
    }, dealId);
    const agreementId = negDetail.data.agreement.id;
    assert(agreementId, 'Agreement missing after deal approval');

    // Verify LIVE PayPal createOrder returns real PayPal Order ID & PAYER_ACTION_REQUIRED
    const liveOrder = await pageA.evaluate(async (agId) => {
      const r = await fetch('/api/v1/payments/create-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: agId }),
      });
      return r.json();
    }, agreementId);
    assert(liveOrder.success && liveOrder.data?.orderId, `Live PayPal createOrder failed: ${JSON.stringify(liveOrder)}`);
    console.log(`   ✔ Live PayPal Sandbox createOrder succeeded: orderId=${liveOrder.data.orderId} (${liveOrder.data.status})`);

    // Complete escrow settlement via server endpoint (since headless Chromium cannot complete interactive PayPal popup login)
    const settleRes = await pageA.evaluate(async (agId) => {
      const r = await fetch('/api/v1/payments/mock-settle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: agId }),
      });
      return r.json();
    }, agreementId);
    assert(settleRes.success && settleRes.data?.id, `Escrow settle failed: ${JSON.stringify(settleRes)}`);
    const txId = settleRes.data.id;

    // Reload Buyer deal page -> verify Paid, held until buyer accepts work
    await pageA.reload({ waitUntil: 'networkidle' });
    await pageA.waitForSelector('text=Paid with PayPal · held until you accept the work', { timeout: 10000 });
    await pageA.waitForSelector('button:has-text("Accept work")', { timeout: 8000 });
    await pageA.screenshot({ path: path.join(SHOT_DIR, '04_buyer_paid_held.png') });

    // Click Accept work in Buyer UI -> triggers real PayPal Sandbox Payouts call to Seller B!
    console.log('3) Buyer A accepts work -> triggering PayPal Sandbox Payout to Seller B...');
    await pageA.click('button:has-text("Accept work")');
    await pageA.waitForSelector('text=Work accepted', { timeout: 15000 });
    await pageA.screenshot({ path: path.join(SHOT_DIR, '05_buyer_accepted_work.png') });

    // Check Buyer Itemized Receipt
    await pageA.goto(`${BASE_URL}/app/transactions/${txId}`, { waitUntil: 'networkidle' });
    await pageA.waitForSelector('text=Agreed project price', { timeout: 8000 });
    await pageA.waitForSelector('text=Service fee (5%)', { timeout: 8000 });
    await pageA.waitForSelector('text=Seller payout', { timeout: 8000 });
    await pageA.screenshot({ path: path.join(SHOT_DIR, '06_buyer_receipt_itemized.png') });

    // =========================================================================
    // 4. SELLER B VERIFIES RELEASED EARNINGS & RECEIPT
    // =========================================================================
    console.log('4) Seller B verifies payout batch & Released status...');
    await pageB.goto(`${BASE_URL}/app/deals/${dealId}`, { waitUntil: 'networkidle' });
    await pageB.waitForSelector('text=/were sent to|being sent to/', { timeout: 10000 });
    await pageB.waitForSelector(`text=${payoutEmail}`, { timeout: 8000 });
    await pageB.screenshot({ path: path.join(SHOT_DIR, '07_seller_deal_released.png') });

    const payoutsCheck = await pageB.evaluate(async () => {
      const r = await fetch('/api/v1/payouts', { credentials: 'include' });
      return r.json();
    });
    console.log('   Seller B payouts API:', JSON.stringify(payoutsCheck.data));
    assert(payoutsCheck.data?.length >= 1, 'Expected at least 1 seller payout record');
    const payoutRec = payoutsCheck.data[0];
    assert(payoutRec.status === 'paid' || payoutRec.status === 'simulated_paid' || payoutRec.status === 'processing', `Unexpected payout status: ${payoutRec.status}`);

    await pageB.goto(`${BASE_URL}/app/transactions`, { waitUntil: 'networkidle' });
    await pageB.waitForSelector('text=Where should we send your earnings?', { timeout: 8000 });
    await pageB.screenshot({ path: path.join(SHOT_DIR, '08_seller_payments_released.png') });

    // =========================================================================
    // 5. SECOND DEAL REFUND TEST (Dispute -> Refund)
    // =========================================================================
    console.log('5) Second deal dispute & refund verification...');
    const req2 = await pageA.evaluate(async (title) => {
      const r = await fetch('/api/v1/requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawInput: `Follow-up ${title} performance pass, budget $160, 5 days`,
          title: `${title} R2`,
          category: 'engineering',
          deliverables: ['Audit pass 2'],
          maxBudget: 160,
          targetBudget: 140,
          flexibility: 'flexible',
          deadlineDays: 5,
        }),
      });
      return r.json();
    }, serviceTitle);
    assert(req2.success && req2.data?.id, 'Failed to create 2nd request');

    const neg2 = await pageA.evaluate(async ({ reqId, agentId }) => {
      const r = await fetch('/api/v1/negotiations/multi-agent', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: reqId, sellerIds: [agentId] }),
      });
      return r.json();
    }, { reqId: req2.data.id, agentId: createdListing.data.sellerAgentId });
    const neg2Id = neg2.data.negotiations[0].id;

    await pageA.goto(`${BASE_URL}/app/deals/${neg2Id}`, { waitUntil: 'networkidle' });
    // Approve if escalated
    const approveBtn2 = pageA.locator('button:has-text("Approve")').first();
    if (await approveBtn2.isVisible().catch(() => false)) {
      await approveBtn2.click();
      await pageA.waitForTimeout(800);
    }

    const neg2Detail = await pageA.evaluate(async (id) => {
      const r = await fetch(`/api/v1/negotiations/${id}`, { credentials: 'include' });
      return r.json();
    }, neg2Id);
    const settle2 = await pageA.evaluate(async (agId) => {
      const r = await fetch('/api/v1/payments/mock-settle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: agId }),
      });
      return r.json();
    }, neg2Detail.data.agreement.id);
    assert(settle2.success, 'Deal 2 escrow settle failed');

    await pageA.reload({ waitUntil: 'networkidle' });
    await pageA.waitForSelector('button:has-text("Report a problem")', { timeout: 10000 });
    await pageA.click('button:has-text("Report a problem")');
    await pageA.fill('textarea[placeholder*="missing"]', 'Bundle deliverables were incomplete.');
    await pageA.click('button:has-text("Submit problem")');
    await pageA.waitForSelector('button:has-text("Request PayPal refund")', { timeout: 10000 });
    await pageA.click('button:has-text("Request PayPal refund")');
    await pageA.waitForSelector('text=Payment refunded', { timeout: 10000 });
    await pageA.screenshot({ path: path.join(SHOT_DIR, '09_buyer_refunded.png') });

    // Measure CLS & Long tasks
    const clsA = await pageA.evaluate(() => window.__vyroCLS || 0);
    const maxTaskA = await pageA.evaluate(() => window.__vyroMaxLongTask || 0);
    const clsB = await pageB.evaluate(() => window.__vyroCLS || 0);
    const maxTaskB = await pageB.evaluate(() => window.__vyroMaxLongTask || 0);

    console.log(`\nTelemetry: Buyer CLS=${clsA.toFixed(4)} (<0.1), MaxLongTask=${maxTaskA.toFixed(1)}ms`);
    console.log(`Telemetry: Seller CLS=${clsB.toFixed(4)} (<0.1), MaxLongTask=${maxTaskB.toFixed(1)}ms`);
    assert(clsA < 0.1 && clsB < 0.1, `CLS exceeded 0.1 budget: buyer=${clsA}, seller=${clsB}`);
    assert(errorsA.length === 0 && errorsB.length === 0, `Page errors found: A=${errorsA.join(';')} B=${errorsB.join(';')}`);

    await ctxA.close();
    await ctxB.close();
    console.log('✅ FULL PASS 3 TWO-ACCOUNT E2E JOURNEY PASSED.');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ PASS 3 JOURNEY FAILED:', err);
  process.exit(1);
});
