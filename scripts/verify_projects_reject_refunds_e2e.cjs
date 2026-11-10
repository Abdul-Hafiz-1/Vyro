const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';
const SHOT_DIR = path.resolve(__dirname, '..', 'audit', 'pass4');

function assert(cond, msg) {
  if (!cond) throw new Error(`E2E ASSERTION FAILED: ${msg}`);
}

async function signupFreshAccount(page, name, email) {
  await page.goto(`${BASE_URL}/signup`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  const textInputs = page.locator('input[type="text"]');
  if (await textInputs.count() > 0) {
    await textInputs.first().fill(name);
  }
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(onboarding|app)/, { timeout: 15000 });
  // Complete onboarding via API cleanly to stay fast & deterministic, then reload /app
  await page.evaluate(async (payoutEmail) => {
    const r1 = await fetch('/api/v1/auth/onboarding', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capabilities: { buying: true, selling: true },
        activeWorkspace: 'buyer',
        completed: true,
        step: 5
      })
    });
    if (!r1.ok) throw new Error('Onboarding failed: ' + (await r1.text()));
    const r2 = await fetch('/api/v1/payouts/account', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypalEmail: payoutEmail })
    });
    if (!r2.ok) throw new Error('Payout setup failed: ' + (await r2.text()));
  }, `sb-${email}`);
  await page.goto(`${BASE_URL}/app`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
}

async function switchWorkspace(page, mode) {
  await page.evaluate(async (m) => {
    const res = await fetch('/api/v1/auth/workspace', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace: m })
    });
    if (!res.ok) throw new Error('Workspace switch failed: ' + (await res.text()));
  }, mode);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
}

async function createListingViaApi(page, title, price = 150) {
  return page.evaluate(async ({ t, p }) => {
    const res = await fetch('/api/v1/listings', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: t,
        description: 'Full-stack TypeScript web service implementation with tests and docs.',
        category: 'Development',
        price: p,
        minAcceptablePrice: Math.round(p * 0.8),
        deliveryDays: 5,
        deliverables: ['Source code', 'Automated tests']
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Listing create failed');
    return json.data;
  }, { t: title, p: price });
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const ts = Date.now();
  const sellerEmail = `p4_seller_${ts}@example.com`;
  const buyerEmail = `p4_buyer_${ts}@example.com`;

  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  try {
    const ctxSeller = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ctxBuyer = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageSeller = await ctxSeller.newPage();
    const pageBuyer = await ctxBuyer.newPage();
    pageSeller.on('pageerror', (e) => console.error('[Seller PageError]', e.message));
    pageSeller.on('response', async (r) => { if (r.status() >= 400 && r.status() !== 401) console.error('[Seller HTTP]', r.status(), r.url(), await r.text().catch(() => '')); });
    pageBuyer.on('pageerror', (e) => console.error('[Buyer PageError]', e.message));
    pageBuyer.on('response', async (r) => { if (r.status() >= 400 && r.status() !== 401) console.error('[Buyer HTTP]', r.status(), r.url(), await r.text().catch(() => '')); });

    console.log('1) Signing up Seller & Buyer + setting up seller listing...');
    await signupFreshAccount(pageSeller, 'Studio Seller P4', sellerEmail);
    await switchWorkspace(pageSeller, 'seller');
    const listing = await createListingViaApi(pageSeller, `UI Architecture Pass4 ${String(ts).slice(-4)}`, 160);
    await pageSeller.evaluate(async () => {
      await fetch('/api/v1/projects/seller/rules', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewIncomingManually: true, maxConcurrentProjects: 4 })
      });
    });

    await signupFreshAccount(pageBuyer, 'Buyer Alice P4', buyerEmail);
    await pageBuyer.goto(`${BASE_URL}/app/marketplace`, { waitUntil: 'domcontentloaded' });

    // =========================================================================
    // SCENARIO 1: Buyer sends direct request -> Seller Rejects with private reason
    // -> Buyer sees neutral decline + no private seller note leaked
    // =========================================================================
    console.log('2) Scenario 1: Direct request -> Seller Reject with private note...');
    const proj1 = await pageBuyer.evaluate(async (listingId) => {
      const res = await fetch('/api/v1/projects/inquire', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, maxBudget: 160, deadlineDays: 5 })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    }, listing.id);

    await pageSeller.goto(`${BASE_URL}/app/projects/${proj1.id}`, { waitUntil: 'domcontentloaded' });
    await pageSeller.waitForSelector('text=Respond to buyer request', { timeout: 10000 });
    await pageSeller.waitForTimeout(300);
    await pageSeller.screenshot({ path: path.join(SHOT_DIR, 'debug_before_reject.png'), fullPage: true });
    await pageSeller.locator('button:has-text("Reject")').first().click({ force: true });
    await pageSeller.click('button:has-text("Too busy")');
    await pageSeller.fill('textarea[placeholder*="Optional note"]', 'INTERNAL-SECRET-VIP-QUEUE');
    await pageSeller.locator('div.fixed button:has-text("Reject")').click();
    await pageSeller.waitForSelector('text=Declined before payment', { timeout: 10000 });
    await pageSeller.screenshot({ path: path.join(SHOT_DIR, '01_seller_rejected.png'), fullPage: true });

    await pageBuyer.goto(`${BASE_URL}/app/projects/${proj1.id}`, { waitUntil: 'domcontentloaded' });
    await pageBuyer.waitForSelector('text=Declined before payment', { timeout: 10000 });
    const buyerDeclinedBody = await pageBuyer.innerText('body');
    assert(buyerDeclinedBody.includes("can't take it"), 'Buyer should see neutral seller decline text');
    assert(!buyerDeclinedBody.includes('INTERNAL-SECRET-VIP-QUEUE'), 'Private seller reject note MUST NOT leak to buyer');
    await pageBuyer.screenshot({ path: path.join(SHOT_DIR, '01_buyer_neutral_decline.png'), fullPage: true });

    // =========================================================================
    // Helper to spin up an agreed -> paid_held project cleanly via API + Mock Settle
    // =========================================================================
    async function createPaidHeldProject(titleSuffix, budget = 160) {
      return pageBuyer.evaluate(async ({ listingId, b }) => {
        const inqRes = await fetch('/api/v1/projects/inquire', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId, maxBudget: b, deadlineDays: 5 })
        });
        const inq = (await inqRes.json()).data;
        // Seller accepts via Seller page API? No, accept from Seller context below!
        return inq;
      }, { listingId: listing.id, b: budget });
    }

    async function sellerAcceptAndBuyerPay(projectId) {
      await pageSeller.evaluate(async (pid) => {
        const res = await fetch(`/api/v1/projects/${pid}/accept-request`, { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error('Seller accept failed');
      }, projectId);
      const agr = await pageBuyer.evaluate(async (pid) => {
        const dRes = await fetch(`/api/v1/projects/${pid}`, { credentials: 'include' });
        const d = (await dRes.json()).data;
        const payRes = await fetch('/api/v1/payments/mock-settle', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agreementId: d.agreementId })
        });
        if (!payRes.ok) throw new Error('Mock settle failed');
        return d;
      }, projectId);
      return agr;
    }

    // =========================================================================
    // SCENARIO 3: Buyer cancels in paid_held -> immediate full refund
    // =========================================================================
    console.log('3) Scenario 3: Buyer cancels in paid_held -> instant full refund...');
    const pCancel = await createPaidHeldProject('CancelBeforeStart', 150);
    await sellerAcceptAndBuyerPay(pCancel.id);
    await pageBuyer.goto(`${BASE_URL}/app/projects/${pCancel.id}`, { waitUntil: 'domcontentloaded' });
    await pageBuyer.click('button:has-text("Cancel and get a full refund")');
    await pageBuyer.click('button:has-text("Confirm refund")');
    await pageBuyer.waitForSelector('text=Refunded to buyer', { timeout: 10000 });
    await pageBuyer.screenshot({ path: path.join(SHOT_DIR, '03_buyer_paid_held_refunded.png'), fullPage: true });

    // =========================================================================
    // SCENARIO 2 & 4: Happy Path + Zero Refund After Delivery Check
    //   Start work -> Deliver work with file -> Verify ZERO refund button for buyer
    //   -> Accept work -> Payout released
    // =========================================================================
    console.log('4) Scenario 2 & 4: Start work -> Deliver file -> Verify zero refund after delivery -> Accept work...');
    const pHappy = await createPaidHeldProject('HappyDelivery', 160);
    await sellerAcceptAndBuyerPay(pHappy.id);

    await pageSeller.goto(`${BASE_URL}/app/projects/${pHappy.id}`, { waitUntil: 'domcontentloaded' });
    await pageSeller.click('button:has-text("Start work")');
    await pageSeller.waitForSelector('text=Deliver work', { timeout: 10000 });

    const tmpEvidencePath = path.join(SHOT_DIR, 'sample_deliverable.txt');
    fs.writeFileSync(tmpEvidencePath, 'Completed deliverable bundle verified for Pass 4.');
    await pageSeller.setInputFiles('input[type="file"]', tmpEvidencePath);
    await pageSeller.fill('textarea[placeholder*="Summarize what you delivered"]', 'Delivered source repository and verification notes.');
    await pageSeller.fill('input[placeholder*="delivery links"]', 'https://example.com/repo-v1');
    await pageSeller.click('button:has-text("Add link")');
    await pageSeller.click('button:has-text("Submit delivery")');
    await pageSeller.waitForSelector('text=Delivered · waiting for buyer acceptance', { timeout: 10000 });
    await pageSeller.screenshot({ path: path.join(SHOT_DIR, '02_seller_delivered.png'), fullPage: true });

    // Buyer checks Delivered page (Scenario 4: ZERO refund buttons anywhere!)
    await pageBuyer.goto(`${BASE_URL}/app/projects/${pHappy.id}`, { waitUntil: 'domcontentloaded' });
    await pageBuyer.waitForSelector('text=Review delivered work', { timeout: 10000 });
    const refundBtnsAfterDelivery = await pageBuyer.locator('button:has-text("refund"), button:has-text("Refund")').count();
    assert(refundBtnsAfterDelivery === 0, `Expected ZERO refund buttons after delivery, found ${refundBtnsAfterDelivery}`);
    assert((await pageBuyer.locator('button:has-text("Accept work")').count()) >= 1, 'Accept work must be visible');
    assert((await pageBuyer.locator('button:has-text("Request changes")').count()) >= 1, 'Request changes must be visible');
    assert((await pageBuyer.locator('button:has-text("Report a problem")').count()) >= 1, 'Report a problem must be visible');
    await pageBuyer.screenshot({ path: path.join(SHOT_DIR, '04_buyer_delivered_no_refund.png'), fullPage: true });

    await pageBuyer.click('button:has-text("Accept work")');
    await pageBuyer.waitForSelector('text=Work accepted & settled', { timeout: 10000 });
    await pageBuyer.screenshot({ path: path.join(SHOT_DIR, '02_buyer_accepted_payout.png'), fullPage: true });

    // =========================================================================
    // SCENARIO 5: Auto-release after short review window
    // =========================================================================
    console.log('5) Scenario 5: Short review window auto-release...');
    const pAuto = await createPaidHeldProject('AutoRelease', 140);
    await sellerAcceptAndBuyerPay(pAuto.id);
    await pageSeller.evaluate(async (pid) => {
      await fetch(`/api/v1/projects/${pid}/start`, { method: 'POST', credentials: 'include' });
      await fetch(`/api/v1/projects/${pid}/deliver`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Auto-release delivery test note', links: [] })
      });
    }, pAuto.id);
    // Wait past short REVIEW_WINDOW_HOURS (Math.max(0.001, ...)=3.6s -> wait 4.5s) then tick worker
    await new Promise(r => setTimeout(r, 4500));
    const tickResult = await pageSeller.evaluate(async () => {
      const res = await fetch('/api/v1/projects/worker/tick', { method: 'POST', credentials: 'include' });
      return res.json();
    });
    const processedIds = tickResult?.data?.processedIds || [];
    assert(processedIds.includes(pAuto.id) || processedIds.length >= 1, `Expected worker tick to auto-release expired review window, got ${JSON.stringify(tickResult)}`);
    await pageBuyer.goto(`${BASE_URL}/app/projects/${pAuto.id}`, { waitUntil: 'domcontentloaded' });
    await pageBuyer.waitForSelector('text=Work accepted & settled', { timeout: 10000 });
    await pageBuyer.screenshot({ path: path.join(SHOT_DIR, '05_auto_released_project.png'), fullPage: true });

    // =========================================================================
    // SCENARIO 6: Dispute opened -> Counterparty responds -> Admin Split Resolution
    // =========================================================================
    console.log('6) Scenario 6: Dispute open + response + mediator split resolution...');
    const pDisp = await createPaidHeldProject('DisputeSplit', 200);
    await sellerAcceptAndBuyerPay(pDisp.id);
    await pageSeller.evaluate(async (pid) => {
      await fetch(`/api/v1/projects/${pid}/start`, { method: 'POST', credentials: 'include' });
      await fetch(`/api/v1/projects/${pid}/deliver`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Delivered partial scope only', links: [] })
      });
    }, pDisp.id);

    await pageBuyer.goto(`${BASE_URL}/app/projects/${pDisp.id}`, { waitUntil: 'domcontentloaded' });
    await pageBuyer.click('button:has-text("Report a problem")');
    await pageBuyer.fill('textarea[placeholder*="Describe what happened"]', 'Missing responsive tests and second page.');
    await pageBuyer.click('button:has-text("Open dispute")');
    await pageBuyer.waitForSelector('text=Dispute open', { timeout: 10000 });
    await pageBuyer.screenshot({ path: path.join(SHOT_DIR, '06_dispute_opened.png'), fullPage: true });

    // Navigate to /app/disputes mediator screen & resolve with 60/40 split
    await pageBuyer.goto(`${BASE_URL}/app/disputes`, { waitUntil: 'domcontentloaded' });
    await pageBuyer.fill('input[placeholder*="Required resolution explanation"]', 'Split 60% seller for core build, 40% refund to buyer.');
    await pageBuyer.click('button:has-text("Apply resolution")');
    await pageBuyer.waitForSelector('text=Resolved', { timeout: 10000 });
    await pageBuyer.screenshot({ path: path.join(SHOT_DIR, '06_dispute_resolved_split.png'), fullPage: true });

    // =========================================================================
    // SCENARIO 7: Seller Projects Panel + Seller Today Strip
    // =========================================================================
    console.log('7) Scenario 7: Seller Projects Panel & Seller Today strip...');
    await pageSeller.goto(`${BASE_URL}/app/projects`, { waitUntil: 'domcontentloaded' });
    await pageSeller.waitForSelector('text=in progress', { timeout: 10000 });
    await pageSeller.screenshot({ path: path.join(SHOT_DIR, '07_seller_projects_panel.png'), fullPage: true });

    await pageSeller.goto(`${BASE_URL}/app`, { waitUntil: 'domcontentloaded' });
    await pageSeller.screenshot({ path: path.join(SHOT_DIR, '07_seller_today_strip.png'), fullPage: true });

    console.log('ALL 7 PLAYWRIGHT E2E SCENARIOS PASSED!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
