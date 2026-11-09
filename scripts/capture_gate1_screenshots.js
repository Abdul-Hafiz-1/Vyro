const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'audit', 'round-redesign', 'gate1');
const ARTIFACT_DIR = path.resolve('C:\\Users\\User\\.gemini\\antigravity\\brain\\907977bc-7293-4960-b427-dba2a6d2f786', 'screenshots');

for (const dir of [OUTPUT_DIR, ARTIFACT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function setLightMode(page) {
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light');
  });
  await page.waitForTimeout(200);
}

async function saveShot(page, filename) {
  const localFile = path.join(OUTPUT_DIR, filename);
  const artifactFile = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: localFile, fullPage: true });
  fs.copyFileSync(localFile, artifactFile);
  console.log(`[Captured] ${filename}`);
}

async function run() {
  console.log('=== CAPTURING GATE 1 SCREENSHOTS (LIGHT FIRST) ===');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true
  });

  // 1. STYLEGUIDE
  console.log('\n--- 1. Capturing /styleguide ---');
  const styleCtx = await browser.newContext();
  const stylePage = await styleCtx.newPage();
  await stylePage.goto('http://localhost:5173/styleguide', { waitUntil: 'domcontentloaded' });
  await setLightMode(stylePage);
  await stylePage.waitForTimeout(800);

  // Desktop 1440
  await stylePage.setViewportSize({ width: 1440, height: 900 });
  await stylePage.waitForTimeout(400);
  await saveShot(stylePage, 'styleguide_1440_light.png');

  // Mobile 390
  await stylePage.setViewportSize({ width: 390, height: 844 });
  await stylePage.waitForTimeout(400);
  await saveShot(stylePage, 'styleguide_390_light.png');

  await styleCtx.close();

  // 2. TODAY SCREEN (FILLED - ACCOUNT A)
  console.log('\n--- 2. Capturing Today Screen (Filled - Account A) ---');
  const buyerCtx = await browser.newContext();
  const buyerPage = await buyerCtx.newPage();
  await buyerPage.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await buyerPage.fill('input[type="email"]', 'demo.buyer@example.com');
  await buyerPage.fill('input[type="password"]', 'password123');
  await buyerPage.click('button[type="submit"]');
  await buyerPage.waitForTimeout(1000);

  await buyerPage.goto('http://localhost:5173/app', { waitUntil: 'domcontentloaded' });
  await setLightMode(buyerPage);
  await buyerPage.waitForTimeout(800);

  // Desktop 1440
  await buyerPage.setViewportSize({ width: 1440, height: 900 });
  await buyerPage.waitForTimeout(400);
  await saveShot(buyerPage, 'today_1440_light.png');

  // Mobile 390
  await buyerPage.setViewportSize({ width: 390, height: 844 });
  await buyerPage.waitForTimeout(400);
  await saveShot(buyerPage, 'today_390_light.png');

  await buyerCtx.close();

  // 3. TODAY SCREEN (EMPTY - NEW USER ACCOUNT C)
  console.log('\n--- 3. Capturing Today Screen (Empty - New Account) ---');
  const emptyCtx = await browser.newContext();
  const emptyPage = await emptyCtx.newPage();
  const freshEmail = `gate1_empty_${Date.now()}@example.com`;
  await emptyPage.goto('http://localhost:5173/signup', { waitUntil: 'domcontentloaded' });
  const inputs = await emptyPage.$$('input');
  await inputs[0].fill('Sam Taylor');
  await inputs[1].fill(freshEmail);
  await inputs[2].fill('password123');
  await emptyPage.click('button[type="submit"]');
  await emptyPage.waitForTimeout(1200);

  await emptyPage.goto('http://localhost:5173/app', { waitUntil: 'domcontentloaded' });
  await setLightMode(emptyPage);
  await emptyPage.waitForTimeout(800);

  // Desktop 1440
  await emptyPage.setViewportSize({ width: 1440, height: 900 });
  await emptyPage.waitForTimeout(400);
  await saveShot(emptyPage, 'today_empty_1440_light.png');

  // Mobile 390
  await emptyPage.setViewportSize({ width: 390, height: 844 });
  await emptyPage.waitForTimeout(400);
  await saveShot(emptyPage, 'today_empty_390_light.png');

  await emptyCtx.close();

  await browser.close();
  console.log('\n=== GATE 1 SCREENSHOTS COMPLETE ===');
}

run().catch(err => {
  console.error('Error capturing Gate 1 screenshots:', err);
  process.exit(1);
});
