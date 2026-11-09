const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const LOCAL_DIR = path.resolve(__dirname, '..', 'audit', 'round-redesign', 'today');
const ARTIFACT_DIR = path.resolve('C:\\Users\\User\\.gemini\\antigravity\\brain\\907977bc-7293-4960-b427-dba2a6d2f786', 'screenshots');

for (const dir of [LOCAL_DIR, ARTIFACT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('theme', t);
  }, theme);
  await page.waitForTimeout(400);
}

async function saveScreenshot(page, filename) {
  const localPath = path.join(LOCAL_DIR, filename);
  const artifactPath = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: localPath, fullPage: true });
  fs.copyFileSync(localPath, artifactPath);
  console.log(`[Captured] ${filename}`);
}

async function captureScreen(page, baseName) {
  // Desktop 1440
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(600);
  await setTheme(page, 'dark');
  await saveScreenshot(page, `${baseName}_1440_dark.png`);
  await setTheme(page, 'light');
  await saveScreenshot(page, `${baseName}_1440_light.png`);

  // Mobile 390
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await setTheme(page, 'dark');
  await saveScreenshot(page, `${baseName}_390_dark.png`);
  await setTheme(page, 'light');
  await saveScreenshot(page, `${baseName}_390_light.png`);
}

async function run() {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true
  });

  console.log('=== Capturing Screen A (Today) Redesign Screenshots ===');

  // Context 1: Account A (Buyer with Active Decisions/Deals)
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await pageA.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await pageA.fill('input[type="email"]', 'demo.buyer@example.com');
  await pageA.fill('input[type="password"]', 'password123');
  await pageA.click('button[type="submit"]');
  await pageA.waitForTimeout(1500);

  console.log('Capturing Account A (Filled State)...');
  await pageA.goto('http://localhost:5173/app', { waitUntil: 'domcontentloaded' });
  await pageA.waitForTimeout(1200);
  await captureScreen(pageA, 'screen_a_today_filled');
  await ctxA.close();

  // Context 2: Account C (Brand New Empty Account)
  const ctxC = await browser.newContext();
  const pageC = await ctxC.newPage();
  const freshEmail = `fresh_${Date.now()}@test.com`;
  await pageC.goto('http://localhost:5173/signup', { waitUntil: 'domcontentloaded' });
  const inputs = await pageC.$$('input');
  await inputs[0].fill('Sam Taylor');
  await inputs[1].fill(freshEmail);
  await inputs[2].fill('password123');
  await pageC.click('button[type="submit"]');
  await pageC.waitForTimeout(1500);

  console.log('Capturing Account C (Empty First-Time State)...');
  await pageC.goto('http://localhost:5173/app', { waitUntil: 'domcontentloaded' });
  await pageC.waitForTimeout(1200);
  await captureScreen(pageC, 'screen_a_today_empty');
  await ctxC.close();

  await browser.close();
  console.log('All screenshots captured successfully.');
}

run().catch(err => {
  console.error('Fatal error capturing screenshots:', err);
  process.exit(1);
});
