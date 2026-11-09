const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TOPBAR_DIR = path.resolve(__dirname, '..', 'audit', 'topbar');
const ARTIFACT_DIR = path.resolve('C:\\Users\\User\\.gemini\\antigravity\\brain\\907977bc-7293-4960-b427-dba2a6d2f786', 'screenshots');

for (const dir of [TOPBAR_DIR, ARTIFACT_DIR]) {
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

async function captureTopBarScreenshots(page, accountRole) {
  const viewports = [
    { name: '1440', width: 1440, height: 900 },
    { name: '390', width: 390, height: 844 },
  ];
  const themes = ['dark', 'light'];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const theme of themes) {
      await setTheme(page, theme);
      const filename = `topbar_${accountRole}_${vp.name}_${theme}.png`;
      const localPath = path.join(TOPBAR_DIR, filename);
      const artifactPath = path.join(ARTIFACT_DIR, filename);

      // Screenshot top portion (header & top nav)
      await page.screenshot({ path: localPath, clip: { x: 0, y: 0, width: vp.width, height: vp.width === 390 ? 120 : 90 } });
      fs.copyFileSync(localPath, artifactPath);
      console.log(`[Screenshot captured] ${filename}`);
    }
  }

  // Restore Desktop 1440 dark mode
  await page.setViewportSize({ width: 1440, height: 900 });
  await setTheme(page, 'dark');
}

async function testNavigationForAccount(browser, email, password, role) {
  console.log(`\n==================================================`);
  console.log(`TESTING NAVIGATION REACHABILITY: Account "${role}" (${email})`);
  console.log(`==================================================`);

  const viewports = [
    { label: 'Desktop 1440px', width: 1440, height: 900 },
    { label: 'Mobile 390px', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    console.log(`\n--- Viewport: ${vp.label} ---`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    // 1. Log in
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app', { timeout: 10000 });
    await page.waitForTimeout(600);

    // Capture topbar screenshots on first pass
    if (vp.width === 1440) {
      await captureTopBarScreenshots(page, role);
    }

    // List of key target routes that must be reached from Today in <= 2 clicks
    const targets = role === 'buyer' 
      ? [
          { name: 'Requests', urlPattern: /\/app\/requests/ },
          { name: 'Deals', urlPattern: /\/app\/deals/ },
          { name: 'Marketplace', urlPattern: /\/app\/marketplace/ },
          { name: 'Payments', urlPattern: /\/app\/transactions/ },
          { name: 'Rules', urlPattern: /\/app\/rules/, viaMenu: true },
          { name: 'Settings', urlPattern: /\/app\/settings/, viaMenu: true },
          { name: 'Notifications', urlPattern: /\/app\/notifications/ },
          { name: 'Help', urlPattern: /\/app\/help/, viaMenu: true },
        ]
      : [
          { name: 'Listings', urlPattern: /\/app\/listings/ },
          { name: 'New listing', urlPattern: /\/app\/listings\/new/ },
          { name: 'Deals', urlPattern: /\/app\/deals/ },
          { name: 'Payments', urlPattern: /\/app\/transactions/ },
          { name: 'Rules', urlPattern: /\/app\/rules/, viaMenu: true },
          { name: 'Settings', urlPattern: /\/app\/settings/, viaMenu: true },
          { name: 'Notifications', urlPattern: /\/app\/notifications/ },
          { name: 'Help', urlPattern: /\/app\/help/, viaMenu: true },
        ];

    for (const target of targets) {
      // Always reset back to Today
      await page.goto('http://localhost:5173/app', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);

      let clicksUsed = 0;

      if (target.viaMenu) {
        // Open avatar menu (1 click)
        const avatarBtn = page.locator('button[aria-label="User profile menu"]').first();
        if (!(await avatarBtn.isVisible())) {
          throw new Error(`Avatar menu button not visible on ${vp.label}`);
        }
        await avatarBtn.click();
        clicksUsed++;
        await page.waitForTimeout(300);

        // Click target item in menu (2nd click)
        const menuLink = page.locator(`a[href="${target.name === 'Rules' ? '/app/rules' : target.name === 'Settings' ? '/app/settings' : '/app/help'}"]`).first();
        if (!(await menuLink.isVisible())) {
          throw new Error(`Menu link for ${target.name} not visible after clicking avatar`);
        }
        await menuLink.click();
        clicksUsed++;
      } else {
        // Find visible link in TopBar, QuickAction cards, or Mobile bottom bar
        // Try direct link
        let directLink = null;
        const selectorMap = {
          Notifications: ['a[title="Notifications"]', 'a[href="/app/notifications"]'],
          Requests: ['nav a:has-text("Requests")', 'button:has-text("New request")', 'a:has-text("Start a request")', 'nav button:has-text("Request")', 'a[href*="requests"]'],
          Deals: ['nav a:has-text("Deals")', 'a:has-text("My deals")', 'a[href*="/app/deals"]'],
          Marketplace: ['nav a:has-text("Marketplace")', 'nav a:has-text("Market")', 'a:has-text("Marketplace")', 'a[href*="/app/marketplace"]'],
          Payments: ['nav a:has-text("Payments")', 'a:has-text("Payments")', 'a[href*="/app/transactions"]'],
          Listings: ['nav a:has-text("Listings")', 'a:has-text("Listings")', 'a[href*="/app/listings"]'],
          'New listing': ['button:has-text("New listing")', 'a:has-text("Create a listing")', 'nav button:has-text("Listing")', 'a[href*="/app/listings/new"]']
        };

        const selectors = selectorMap[target.name] || [
          `nav a:has-text("${target.name}")`,
          `a:has-text("${target.name}")`,
          `a[href*="${target.name.toLowerCase()}"]`
        ];

        for (const sel of selectors) {
          const loc = page.locator(`${sel}:visible`).first();
          if (await loc.isVisible().catch(() => false)) {
            directLink = loc;
            break;
          }
        }

        if (!directLink || !(await directLink.isVisible())) {
          throw new Error(`Visible link for ${target.name} not found on ${vp.label} starting from Today`);
        }

        await directLink.click();
        clicksUsed++;
      }

      // Verify URL matches target pattern
      await page.waitForTimeout(500);
      const currentUrl = page.url();
      if (!target.urlPattern.test(currentUrl)) {
        throw new Error(`Clicking ${target.name} navigated to ${currentUrl}, expected ${target.urlPattern}`);
      }

      if (clicksUsed > 2) {
        throw new Error(`Target ${target.name} took ${clicksUsed} clicks, exceeding maximum limit of 2 clicks!`);
      }

      // Check for back link or outbound link (fail if page is a dead end)
      const hasBackLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        return links.some((el) => {
          const text = (el.innerText || el.textContent || '').toLowerCase();
          const href = el.getAttribute('href') || '';
          return text.includes('back') || text.includes('today') || href === '/app' || href.startsWith('/app/');
        });
      });

      if (!hasBackLink) {
        throw new Error(`Page ${currentUrl} has no outbound or back link! DEAD END DETECTED.`);
      }

      console.log(`  ✓ Reachable: [${target.name}] in ${clicksUsed} click(s) -> URL: ${new URL(currentUrl).pathname} | Back link verified: YES`);
    }

    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true
  });

  try {
    // Test Account A (Buyer)
    await testNavigationForAccount(browser, 'demo.buyer@example.com', 'password123', 'buyer');

    // Test Account B (Seller)
    await testNavigationForAccount(browser, 'demo.seller@example.com', 'password123', 'seller');

    console.log(`\n==================================================`);
    console.log(`ALL NAVIGATION REACHABILITY TESTS PASSED WITH 0 DEAD ENDS!`);
    console.log(`==================================================\n`);
  } catch (err) {
    console.error(`\n❌ Navigation Reachability Test Failed:`, err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
