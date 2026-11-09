const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'audit', 'final');
const ARTIFACT_DIR = path.resolve('C:\\Users\\User\\.gemini\\antigravity\\brain\\907977bc-7293-4960-b427-dba2a6d2f786', 'screenshots');

for (const dir of [OUTPUT_DIR, ARTIFACT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    if (t === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('theme', t);
  }, theme);
  await page.waitForTimeout(300);
}

async function saveShot(page, filename) {
  const localFile = path.join(OUTPUT_DIR, filename);
  const artifactFile = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: localFile, fullPage: true });
  fs.copyFileSync(localFile, artifactFile);
  console.log(`[Captured] ${filename}`);
}

async function captureScreenModes(page, baseName) {
  // Desktop 1440 Dark
  await page.setViewportSize({ width: 1440, height: 900 });
  await setTheme(page, 'dark');
  await saveShot(page, `${baseName}_1440_dark.png`);

  // Desktop 1440 Light
  await setTheme(page, 'light');
  await saveShot(page, `${baseName}_1440_light.png`);

  // Mobile 390 Dark
  await page.setViewportSize({ width: 390, height: 844 });
  await setTheme(page, 'dark');
  await saveShot(page, `${baseName}_390_dark.png`);

  // Mobile 390 Light
  await setTheme(page, 'light');
  await saveShot(page, `${baseName}_390_light.png`);
}

async function run() {
  console.log('=== CAPTURING FINAL COMPLETE APPLICATION SUITE SCREENSHOTS ===\n');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true
  });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // 1. Landing Page
  console.log('--- 1. Landing Page ---');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await captureScreenModes(page, 'landing_page');

  // 2. Auth Pages
  console.log('--- 2. Login Page ---');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await captureScreenModes(page, 'login_page');

  console.log('--- 3. Signup Page ---');
  await page.goto('http://localhost:5173/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await captureScreenModes(page, 'signup_page');

  // 3. Login as Buyer
  console.log('--- Logging into App as Buyer ---');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'demo.buyer@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  // 4. Today Page
  console.log('--- 4. Today Page ---');
  await page.goto('http://localhost:5173/app', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await captureScreenModes(page, 'today_overview');

  // 5. Marketplace
  console.log('--- 5. Marketplace ---');
  await page.goto('http://localhost:5173/app/marketplace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await captureScreenModes(page, 'marketplace');

  // 6. Create Listing
  console.log('--- 6. Create Listing ---');
  await page.goto('http://localhost:5173/app/listings/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await captureScreenModes(page, 'listing_editor');

  // 7. Deals List
  console.log('--- 7. Deals List ---');
  await page.goto('http://localhost:5173/app/deals', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await captureScreenModes(page, 'deals_list');

  // 8. Transactions & Receipts
  console.log('--- 8. Transactions List ---');
  await page.goto('http://localhost:5173/app/transactions', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await captureScreenModes(page, 'transactions_list');

  // 9. Settings
  console.log('--- 9. Settings Page ---');
  await page.goto('http://localhost:5173/app/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await captureScreenModes(page, 'settings');

  // 10. Rules / Memory
  console.log('--- 10. Rules & Memory ---');
  await page.goto('http://localhost:5173/app/rules', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await captureScreenModes(page, 'rules_memory');

  // 11. Legal Terms
  console.log('--- 11. Terms of Service ---');
  await page.goto('http://localhost:5173/terms', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await captureScreenModes(page, 'legal_terms');

  await ctx.close();
  await browser.close();
  console.log('\n=== ALL FINAL APPLICATION SCREENSHOTS CAPTURED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Error during final screenshot capture:', err);
  process.exit(1);
});