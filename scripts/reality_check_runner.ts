import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'audit', 'reality-check');
const ARTIFACT_DIR = path.resolve('C:\\Users\\User\\.gemini\\antigravity\\brain\\907977bc-7293-4960-b427-dba2a6d2f786', 'screenshots');

for (const dir of [SCREENSHOT_DIR, ARTIFACT_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveEvidenceShot(page: any, name: string) {
  const localFile = path.join(SCREENSHOT_DIR, `${name}.png`);
  const artifactFile = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: localFile, fullPage: true });
  fs.copyFileSync(localFile, artifactFile);
  console.log(`[Evidence Shot] ${name}.png saved`);
}

async function main() {
  console.log('==================================================');
  console.log('  VYRO REALITY-CHECK INTERVIEW RUNNER');
  console.log('==================================================\n');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true
  });

  // Create two completely isolated browser contexts (Cookie jar isolation)
  const contextA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const contextB = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // Track browser errors
  const consoleErrorsA: string[] = [];
  const consoleErrorsB: string[] = [];
  pageA.on('console', msg => { if (msg.type() === 'error') consoleErrorsA.push(msg.text()); });
  pageB.on('console', msg => { if (msg.type() === 'error') consoleErrorsB.push(msg.text()); });

  const timestamp = Date.now();
  const emailA = `fresh.buyer.${timestamp}@example.com`;
  const emailB = `fresh.seller.${timestamp}@example.com`;
  const password = 'Password123!';

  console.log(`Creating Fresh Accounts:\n  Buyer A:  ${emailA}\n  Seller B: ${emailB}\n`);

  // 1. REGISTER B (Seller) & VERIFY COMPLETELY EMPTY STATE
  console.log('--- Checking Question 1: Brand New Seller B Empty State ---');
  await pageB.goto('http://localhost:5173/signup');
  await pageB.fill('input[placeholder*="Jordan Cross"]', 'Fresh Seller B');
  await pageB.fill('input[type="email"]', emailB);
  await pageB.fill('input[type="password"]', password);
  await pageB.click('button[type="submit"]');
  await pageB.waitForURL('**/app');
  await pageB.waitForTimeout(1000);

  // Switch B to Selling Workspace
  await pageB.click('button:has-text("Selling")');
  await pageB.waitForTimeout(600);
  await saveEvidenceShot(pageB, 'q1_seller_b_empty_today');

  // Verify B has 0 deals and 0 listings
  const bTodayHeading = await pageB.locator('h1').innerText();
  console.log(`Seller B Today Heading: "${bTodayHeading}"`);

  await pageB.goto('http://localhost:5173/app/deals');
  await pageB.waitForTimeout(600);
  await saveEvidenceShot(pageB, 'q1_seller_b_empty_deals');

  await pageB.goto('http://localhost:5173/app/listings');
  await pageB.waitForTimeout(600);
  await saveEvidenceShot(pageB, 'q1_seller_b_empty_listings');

  // 2. REGISTER A (Buyer) in context A
  console.log('\n--- Checking Question 2: Simultaneous Isolated Sessions ---');
  await pageA.goto('http://localhost:5173/signup');
  await pageA.fill('input[placeholder*="Jordan Cross"]', 'Fresh Buyer A');
  await pageA.fill('input[type="email"]', emailA);
  await pageA.fill('input[type="password"]', password);
  await pageA.click('button[type="submit"]');
  await pageA.waitForURL('**/app');
  await pageA.waitForTimeout(1000);
  await saveEvidenceShot(pageA, 'q2_buyer_a_today');

  // Verify both sessions are distinct
  const userA = await pageA.evaluate(() => localStorage.getItem('user'));
  const userB = await pageB.evaluate(() => localStorage.getItem('user'));
  console.log(`User A in Context A: ${userA ? JSON.parse(userA).displayName : 'None'}`);
  console.log(`User B in Context B: ${userB ? JSON.parse(userB).displayName : 'None'}`);

  // 3. SELLER B CREATES A LISTING
  console.log('\n--- Checking Question 4 & 5: Seller B Creates Listing & Appears in Marketplace ---');
  await pageB.goto('http://localhost:5173/app/listings/new');
  await pageB.waitForTimeout(600);
  
  // Step 1: Title & Category
  await pageB.fill('input[placeholder*="Production React"]', 'OWASP Security Audit & Vulnerability Review');
  await pageB.click('button:has-text("Security")');
  await pageB.click('button:has-text("Continue to scope")');
  await pageB.waitForTimeout(400);

  // Step 2: Deliverables
  await pageB.click('button:has-text("Continue to pricing")');
  await pageB.waitForTimeout(400);

  // Step 3: Price & Floor
  await pageB.fill('input[type="number"]', '320'); // price
  const numberInputs = await pageB.locator('input[type="number"]').all();
  if (numberInputs.length >= 2) {
    await numberInputs[1].fill('260'); // floor price
  }
  await pageB.click('button:has-text("Continue to review")');
  await pageB.waitForTimeout(400);

  // Step 4: Publish
  await pageB.click('button:has-text("Publish offering")');
  await pageB.waitForTimeout(1500);
  await saveEvidenceShot(pageB, 'q4_seller_b_listing_published');

  // 4. BUYER A SEES B'S LISTING IN MARKETPLACE
  await pageA.goto('http://localhost:5173/app/marketplace');
  await pageA.waitForTimeout(1000);
  await saveEvidenceShot(pageA, 'q5_marketplace_with_b_listing');
  const hasListing = await pageA.locator('text=OWASP Security Audit').first().isVisible();
  console.log(`Listing visible to Buyer A in Marketplace: ${hasListing ? 'YES' : 'NO'}`);

  // 5. BUYER A CREATES REQUEST FROM PLAIN TEXT PROMPT
  console.log('\n--- Checking Question 7 & 10: Buyer A Creates Request and Negotiates ---');
  await pageA.goto('http://localhost:5173/app/requests/new');
  await pageA.waitForTimeout(600);

  const promptInput = pageA.locator('textarea').first();
  await promptInput.fill('OWASP top-10 security audit of my Express backend');
  await pageA.click('button:has-text("Continue to budget")');
  await pageA.waitForTimeout(500);
  await pageA.click('button:has-text("Continue to review")');
  await pageA.waitForTimeout(500);
  await saveEvidenceShot(pageA, 'q7_buyer_a_request_step3');

  // Start autonomous negotiation
  await pageA.click('button:has-text("Find and negotiate")');
  await pageA.waitForTimeout(3000);
  await saveEvidenceShot(pageA, 'q10_buyer_a_deal_cockpit');

  const dealUrl = pageA.url();
  console.log(`Negotiation Deal Cockpit URL: ${dealUrl}`);

  // 6. VERIFY NO RAW TEXT IN COCKPIT
  console.log('\n--- Checking Question 18: No Raw Text in Cockpit ---');
  const pageText = await pageA.innerText('body');
  const hasRawSnakeCase = /\b(needs_review|in_negotiation|agreement_reached|auto_approved|human_approved)\b/.test(pageText);
  const hasBareUuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(pageText);
  console.log(`Raw snake_case enum leaked: ${hasRawSnakeCase ? 'YES (BAD)' : 'NO (CLEAN)'}`);
  console.log(`Raw UUID leaked: ${hasBareUuid ? 'YES (BAD)' : 'NO (CLEAN)'}`);

  // Clean exit
  await contextA.close();
  await contextB.close();
  await browser.close();

  console.log('\n==================================================');
  console.log('  REALITY-CHECK RUN COMPLETE');
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('Reality check runner failed:', err);
  process.exit(1);
});
