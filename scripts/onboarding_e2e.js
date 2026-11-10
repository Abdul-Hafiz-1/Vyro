const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';
const SHOT_DIR = path.resolve(__dirname, '..', 'audit', 'pass3');

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });

  try {
    // --- CASE 1: Skip flow + Reopen from Help ---
    console.log('1) Testing fresh user Skip onboarding + reopen from Help...');
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await ctx1.newPage();
    const errors1 = [];
    page1.on('pageerror', (e) => errors1.push(e.message));
    page1.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('401')) errors1.push(m.text());
    });

    const ts = Date.now();
    await page1.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });
    await page1.fill('input[type="text"]', `Skip User ${ts}`);
    await page1.fill('input[type="email"]', `skip_${ts}@example.com`);
    await page1.fill('input[type="password"]', 'password123');
    await page1.click('button[type="submit"]');

    await page1.waitForURL(/\/onboarding/, { timeout: 10000 });
    await page1.waitForSelector('text=Tell AI what you need', { timeout: 8000 });
    await page1.screenshot({ path: path.join(SHOT_DIR, 'onboarding_01_welcome.png') });

    await page1.click('button:has-text("Skip setup")');
    await page1.waitForURL(/\/app$/, { timeout: 10000 });
    await page1.reload({ waitUntil: 'networkidle' });
    assert(page1.url().endsWith('/app'), `Expected reload after skip to stay on /app, got ${page1.url()}`);

    // Reopen from Help
    await page1.goto(`${BASE_URL}/app/help`, { waitUntil: 'networkidle' });
    await page1.click('a:has-text("Replay onboarding walkthrough")');
    await page1.waitForURL(/\/onboarding\?replay=1/, { timeout: 8000 });
    await page1.waitForSelector('text=Tell AI what you need', { timeout: 8000 });
    assert(errors1.length === 0, `Errors in Case 1: ${errors1.join('; ')}`);
    await ctx1.close();
    console.log('   ✔ Case 1 passed.');

    // --- CASE 2: Full 5-screen seller flow (skipping payout email -> Today warning + Coach marks) ---
    console.log('2) Testing Seller 5-screen onboarding (skip payout -> warning + focus + coach marks)...');
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page2 = await ctx2.newPage();
    const errors2 = [];
    page2.on('pageerror', (e) => errors2.push(e.message));

    await page2.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });
    await page2.fill('input[type="text"]', `Seller Onboard ${ts}`);
    await page2.fill('input[type="email"]', `seller_ob_${ts}@example.com`);
    await page2.fill('input[type="password"]', 'password123');
    await page2.click('button[type="submit"]');

    await page2.waitForURL(/\/onboarding/, { timeout: 10000 });
    await page2.click('button:has-text("Get started")');

    // Screen 2: Role
    await page2.waitForSelector('text=How will you use VYRO?', { timeout: 8000 });
    await page2.click('text=Sell services');
    await page2.screenshot({ path: path.join(SHOT_DIR, 'onboarding_02_role.png') });
    await page2.click('button:has-text("Continue")');

    // Screen 3: Interactive Sample Deal
    await page2.waitForSelector('text=Sample, not real', { timeout: 8000 });
    await page2.click('button:has-text("Next step")');
    await page2.waitForSelector('text=Step 2 of 7', { timeout: 5000 });
    await page2.click('button:has-text("Next step")');
    await page2.screenshot({ path: path.join(SHOT_DIR, 'onboarding_03_sample_deal.png') });
    await page2.click('button:has-text("Continue")');

    // Screen 4: Safety limits
    await page2.waitForSelector('text=Selling limits', { timeout: 8000 });
    await page2.screenshot({ path: path.join(SHOT_DIR, 'onboarding_04_limits.png') });
    await page2.click('button:has-text("Continue")');

    // Screen 5: Payments (skip leaving PayPal email empty)
    await page2.waitForSelector('text=Where should we send your earnings?', { timeout: 8000 });
    await page2.screenshot({ path: path.join(SHOT_DIR, 'onboarding_05_payments.png') });
    await page2.click('button:has-text("go to Today")');

    await page2.waitForURL(/\/app\?focusPrompt=1/, { timeout: 10000 });
    await page2.waitForSelector('text=Add where to send your earnings', { timeout: 8000 });

    // Verify HomePromptBox textarea is focused
    const focusedId = await page2.evaluate(() => document.activeElement?.id);
    assert(focusedId === 'home-prompt-input', `Expected #home-prompt-input to be focused, got ${focusedId}`);

    // Verify 3 dismissible Coach Marks work and persist
    for (let i = 0; i < 3; i++) {
      await page2.waitForSelector('[data-coachmark]', { timeout: 5000 });
      await page2.click('[data-coachmark] button:has-text("Got it")');
      await page2.waitForTimeout(250);
    }
    await page2.reload({ waitUntil: 'networkidle' });
    const remainingMarks = await page2.locator('[data-coachmark]').count();
    assert(remainingMarks === 0, `Expected 0 coach marks after dismissing all 3, found ${remainingMarks}`);

    await page2.screenshot({ path: path.join(SHOT_DIR, 'onboarding_06_seller_today_prompt.png') });
    assert(errors2.length === 0, `Errors in Case 2: ${errors2.join('; ')}`);
    await ctx2.close();
    console.log('   ✔ Case 2 passed.');
    console.log('✅ ONBOARDING E2E PASSED.');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ ONBOARDING E2E FAILED:', err);
  process.exit(1);
});
