const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'audit', 'gate1');
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
  console.log('=== CAPTURING GATE 1 FINAL SCREENSHOTS ===\n');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true
  });

  // 1. STYLEGUIDE
  console.log('--- 1. Capturing /styleguide (Both Themes) ---');
  const styleCtx = await browser.newContext();
  const stylePage = await styleCtx.newPage();
  await stylePage.goto('http://localhost:5173/styleguide', { waitUntil: 'domcontentloaded' });
  await stylePage.waitForTimeout(800);
  await captureScreenModes(stylePage, 'styleguide');
  await styleCtx.close();

  // 2. TODAY SCREEN (ACTIVE ACCOUNT A)
  console.log('\n--- 2. Capturing Today Screen (Both Themes) ---');
  const buyerCtx = await browser.newContext();
  const buyerPage = await buyerCtx.newPage();
  await buyerPage.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await buyerPage.fill('input[type="email"]', 'demo.buyer@example.com');
  await buyerPage.fill('input[type="password"]', 'password123');
  await buyerPage.click('button[type="submit"]');
  await buyerPage.waitForTimeout(1000);

  await buyerPage.goto('http://localhost:5173/app', { waitUntil: 'domcontentloaded' });
  await buyerPage.waitForTimeout(800);
  await captureScreenModes(buyerPage, 'today');
  await buyerCtx.close();

  await browser.close();
  console.log('\n=== ALL GATE 1 SCREENSHOTS CAPTURED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Error capturing Gate 1 screenshots:', err);
  process.exit(1);
});
