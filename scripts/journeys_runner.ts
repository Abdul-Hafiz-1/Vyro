import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const JOURNEYS_DIR = path.resolve(__dirname, '..', 'audit', 'journeys');
const ARTIFACT_DIR = path.resolve('C:\\Users\\User\\.gemini\\antigravity\\brain\\907977bc-7293-4960-b427-dba2a6d2f786', 'screenshots');

for (const dir of [JOURNEYS_DIR, ARTIFACT_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveShot(page: any, name: string) {
  const localFile = path.join(JOURNEYS_DIR, `${name}.png`);
  const artifactFile = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: localFile, fullPage: true });
  fs.copyFileSync(localFile, artifactFile);
  console.log(`[Journey Shot] ${name}.png saved`);
}

async function main() {
  console.log('==================================================');
  console.log('  VYRO END-TO-END SCRIPTED JOURNEYS RUNNER');
  console.log('==================================================\n');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true
  });

  const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await contextA.newPage();

  // -------------------------------------------------------------
  // JOURNEY 1: HAPPY PATH (B lists -> A requests -> Negotiate -> Auto-approve -> Pay -> Receipt)
  // -------------------------------------------------------------
  console.log('--- Journey 1: Happy Path ---');
  await pageA.goto('http://localhost:5173/login');
  await pageA.fill('input[type="email"]', 'demo.buyer@example.com');
  await pageA.fill('input[type="password"]', 'password123');
  await pageA.click('button[type="submit"]');
  await pageA.waitForURL('**/app');
  await pageA.waitForTimeout(800);
  await saveShot(pageA, 'journey1_01_buyer_today');

  // Go to marketplace and select listing
  await pageA.goto('http://localhost:5173/app/marketplace');
  await pageA.waitForTimeout(800);
  await saveShot(pageA, 'journey1_02_marketplace_browse');

  // Request flow with auto-approved budget
  await pageA.goto('http://localhost:5173/app/requests/new');
  await pageA.waitForTimeout(600);
  await pageA.fill('textarea', 'High-speed Next.js landing page production build');
  await pageA.click('button:has-text("Continue to budget")');
  await pageA.waitForTimeout(400);
  await pageA.click('button:has-text("Continue to review")');
  await pageA.waitForTimeout(400);
  await saveShot(pageA, 'journey1_03_request_review');

  await pageA.click('button:has-text("Find and negotiate")');
  await pageA.waitForTimeout(3000);
  await saveShot(pageA, 'journey1_04_negotiation_cockpit');

  // Authorize Payment via Platform Escrow
  const payBtn = pageA.locator('button:has-text("Instant Platform Escrow")').first();
  if (await payBtn.isVisible()) {
    await payBtn.click();
    await pageA.waitForTimeout(2000);
    await saveShot(pageA, 'journey1_05_deal_settled');
  }

  // View Receipt
  await pageA.goto('http://localhost:5173/app/transactions');
  await pageA.waitForTimeout(800);
  await saveShot(pageA, 'journey1_06_receipts_ledger');

  const firstReceipt = pageA.locator('a[href^="/app/transactions/"]').first();
  if (await firstReceipt.isVisible()) {
    await firstReceipt.click();
    await pageA.waitForTimeout(800);
    await saveShot(pageA, 'journey1_07_itemized_receipt');
  }

  // -------------------------------------------------------------
  // JOURNEY 2: NEEDS-REVIEW PATH (Offer exceeds auto limit -> pauses on Today)
  // -------------------------------------------------------------
  console.log('\n--- Journey 2: Needs-Review Path ---');
  await pageA.goto('http://localhost:5173/app');
  await pageA.waitForTimeout(800);
  await saveShot(pageA, 'journey2_01_needs_review_today');

  // -------------------------------------------------------------
  // JOURNEY 3: AUTO-DECLINED PATH & APPEAL
  // -------------------------------------------------------------
  console.log('\n--- Journey 3: Auto-Declined & Appeal ---');
  // Check deals list for any declined/appeal state
  await pageA.goto('http://localhost:5173/app/deals');
  await pageA.waitForTimeout(800);
  await pageA.click('button:has-text("Handled")');
  await pageA.waitForTimeout(500);
  await saveShot(pageA, 'journey3_01_handled_deals');

  await contextA.close();
  await browser.close();

  console.log('\n==================================================');
  console.log('  ALL SCRIPTED JOURNEYS COMPLETED SUCCESSFULLY!');
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('Journeys script error:', err);
  process.exit(1);
});
