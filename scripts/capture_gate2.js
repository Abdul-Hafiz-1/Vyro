const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'audit', 'gate2');
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
  console.log('=== CAPTURING GATE 2 SCREENSHOTS ===\n');

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true
  });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Login as Buyer
  console.log('Logging in as demo.buyer@example.com...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'demo.buyer@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  // 1. NEW REQUEST FLOW (Step 1)
  console.log('\n--- 1. Capturing New Request Flow (Step 1) ---');
  await page.goto('http://localhost:5173/app/requests/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await captureScreenModes(page, 'buyer_request_step1');

  // Click on a preset to populate data
  const presetCard = await page.locator('text=Brand Identity').first();
  if (await presetCard.isVisible()) {
    await presetCard.click();
    await page.waitForTimeout(400);
  }

  // Continue to Step 2 (Budget & Timing)
  console.log('\n--- 2. Capturing New Request Flow (Step 2: Budget & Deadline) ---');
  const continueBtn = await page.locator('button:has-text("Continue to budget")');
  if (await continueBtn.isVisible()) {
    await continueBtn.click();
    await page.waitForTimeout(500);
    await captureScreenModes(page, 'buyer_request_step2');
  }

  // Continue to Step 3 (Review & Start)
  console.log('\n--- 3. Capturing New Request Flow (Step 3: Review & Start) ---');
  const reviewBtn = await page.locator('button:has-text("Continue to review")');
  if (await reviewBtn.isVisible()) {
    await reviewBtn.click();
    await page.waitForTimeout(500);
    await captureScreenModes(page, 'buyer_request_new');
  }

  // 2. DEAL PAGE (NegotiationDetailPage)
  console.log('\n--- 4. Capturing Deal Page Cockpit ---');
  await page.goto('http://localhost:5173/app/deals', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  // Look for any deal link or row
  const dealLink = await page.locator('a[href^="/app/deals/"]').first();
  let dealUrl = '';
  if (await dealLink.isVisible()) {
    dealUrl = await dealLink.getAttribute('href');
  }

  if (dealUrl) {
    console.log(`Navigating to found deal: ${dealUrl}`);
    await page.goto(`http://localhost:5173${dealUrl}`, { waitUntil: 'domcontentloaded' });
  } else {
    // If no deal link, trigger a quick negotiation from step 3 or visit first deal
    console.log('No deal found on list, triggering from request step 3...');
    await page.goto('http://localhost:5173/app/requests/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const preset = await page.locator('text=Security Audit').first();
    if (await preset.isVisible()) await preset.click();
    await page.click('button:has-text("Continue to budget")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Continue to review")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Find and negotiate")');
    await page.waitForTimeout(3000);
  }

  await page.waitForTimeout(1000);
  await captureScreenModes(page, 'buyer_deal_cockpit');

  // Open Full Conversation Drawer
  console.log('\n--- 5. Capturing Conversation Transcript Drawer ---');
  const drawerBtn = await page.locator('button:has-text("Full conversation")').first();
  if (await drawerBtn.isVisible()) {
    await drawerBtn.click();
    await page.waitForTimeout(500);
    await captureScreenModes(page, 'buyer_deal_drawer');
  }

  await ctx.close();
  await browser.close();
  console.log('\n=== ALL GATE 2 SCREENSHOTS CAPTURED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Error capturing Gate 2 screenshots:', err);
  process.exit(1);
});