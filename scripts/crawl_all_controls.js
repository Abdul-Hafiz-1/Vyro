const { chromium } = require('playwright');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';

function assert(cond, msg) {
  if (!cond) throw new Error(`CRAWL FAILED: ${msg}`);
}

async function checkViewport(browser, width, height) {
  console.log(`\n--- Crawling controls at ${width}x${height} ---`);
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();

  const pageErrors = [];
  const server5xx = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (res) => {
    if (res.status() >= 500 && res.url().includes('/api/')) {
      server5xx.push(`${res.status()} ${res.url()}`);
    }
  });

  // Login as demo buyer
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'demo.buyer@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app/, { timeout: 10000 });

  const buyerRoutes = [
    '/app',
    '/app/requests/new',
    '/app/deals',
    '/app/marketplace',
    '/app/transactions',
    '/app/rules',
    '/app/notifications',
    '/app/settings',
    '/app/help',
  ];

  for (const route of buyerRoutes) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    assert(overflow <= 4, `Horizontal overflow (${overflow}px) on ${route} at ${width}px`);

    // Check interactive tabs/accordions/advanced panels without destructive clicks
    if (route === '/app/settings') {
      await page.click('button:has-text("Reduced")');
      await page.waitForTimeout(200);
      await page.click('button:has-text("Full")');
      await page.waitForTimeout(200);
      await page.click('button:has-text("System")');
      await page.waitForTimeout(200);
      const advBtn = page.locator('button:has-text("Advanced")');
      await advBtn.scrollIntoViewIfNeeded();
      await advBtn.click();
      await page.waitForSelector('text=PayPal OAuth token', { timeout: 15000 });
    }
    if (route === '/app/deals') {
      const tabs = page.locator('button[role="tab"], main button:has-text("All"), main button:has-text("Done")');
      const count = await tabs.count();
      for (let i = 0; i < Math.min(count, 4); i++) {
        if (await tabs.nth(i).isVisible()) {
          await tabs.nth(i).click();
          await page.waitForTimeout(120);
        }
      }
    }
  }

  // Test Search Command Palette opens cleanly from desktop icon if visible
  if (width >= 1024) {
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    const searchBtn = page.locator('header button[title*="Search"]');
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await page.waitForTimeout(180);
      await page.keyboard.press('Escape');
    }
    // Switch to Selling mode via ModeSwitch
    const sellBtn = page.locator('header button:has-text("Selling")');
    await sellBtn.click();
    await page.waitForTimeout(300);
    await page.goto(`${BASE_URL}/app/transactions`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Where should we send your earnings?', { timeout: 6000 });
    await page.goto(`${BASE_URL}/app/listings`, { waitUntil: 'networkidle' });
    await page.goto(`${BASE_URL}/app/listings/new`, { waitUntil: 'networkidle' });
  }

  assert(pageErrors.length === 0, `Uncaught page errors at ${width}px: ${pageErrors.join('; ')}`);
  assert(server5xx.length === 0, `5xx API errors at ${width}px: ${server5xx.join('; ')}`);
  await ctx.close();
  console.log(`   ✔ ${width}x${height} passed with 0 page errors & 0 5xx responses.`);
}

async function main() {
  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  try {
    await checkViewport(browser, 1440, 900);
    await checkViewport(browser, 390, 844);
    console.log('\n✅ CRAWL ALL CONTROLS PASSED AT 1440px AND 390px.');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ CRAWL FAILED:', err);
  process.exit(1);
});
