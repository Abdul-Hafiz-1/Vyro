const { chromium } = require('playwright');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const outDir = path.resolve(process.cwd(), 'audit', 'after-screenshots');
fs.mkdirSync(outDir, { recursive: true });

async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('vyro_theme', t);
    if (t === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, theme);
}

async function run() {
  const db = new DatabaseSync('server/data/vyro.db');
  const sessionId = 'sess_after_alex_' + Date.now();
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
  db.prepare('INSERT OR REPLACE INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    sessionId,
    'usr_alex_mercer',
    expiresAt,
    new Date().toISOString()
  );

  // Pick canonical escalated deal and real Alex Mercer agreement deal with pending payment
  const escId = 'neg_escalated_002';
  const liveAgreed = db.prepare(`
    SELECT n.id FROM negotiations n
    JOIN agents a ON n.buyer_agent_id = a.id OR n.seller_agent_id = a.id
    WHERE a.owner_id = 'usr_alex_mercer' AND n.status = 'agreement_reached' AND n.agreement_id IS NOT NULL
    ORDER BY n.updated_at DESC LIMIT 1
  `).get();
  const payId = liveAgreed ? liveAgreed.id : 'neg_275cf307';
  const timelineId = payId;
  console.log(`Using escalated deal: ${escId}, paypal deal: ${payId}, timeline deal: ${timelineId}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });

  const mode = process.argv[2] || 'all';
  const onlyExtra = mode === 'extra';
  const onlyPayPal = mode === 'paypal';

  try {
    // 1. Decision Card & PayPal matrix across 1440 / 390 and dark / light
    if (!onlyExtra) {
      for (const width of [1440, 390]) {
        for (const theme of ['dark', 'light']) {
          const context = await browser.newContext({ viewport: { width, height: 900 } });
          await context.addInitScript((t) => {
            localStorage.setItem('vyro_theme', t);
            if (t === 'light') {
              document.documentElement.classList.add('light');
              document.documentElement.classList.remove('dark');
            } else {
              document.documentElement.classList.remove('light');
              document.documentElement.classList.add('dark');
            }
          }, theme);
          await context.addCookies([
            { name: 'vyro_session', value: sessionId, domain: 'localhost', path: '/' }
          ]);
          const page = await context.newPage();

          if (!onlyPayPal) {
            // Decision Card view
            await page.goto(`http://localhost:5173/app/deals/${escId}`, { waitUntil: 'domcontentloaded' });
            await applyTheme(page, theme);
            await page.waitForSelector('button[aria-label^="Approve"]', { timeout: 10000 });
            await page.waitForTimeout(800);
            await page.screenshot({ path: path.join(outDir, `decision_card_${width}_${theme}.png`), fullPage: true });
          }

          // PayPal checkout view (wait for smart/buttons frame & SVG logo paint, scroll into view before capture)
          await page.goto(`http://localhost:5173/app/deals/${payId}`, { waitUntil: 'domcontentloaded' });
          await applyTheme(page, theme);
          await page.waitForSelector('h1', { timeout: 10000 });
          await page.waitForFunction(
            () => Array.from(document.querySelectorAll('iframe')).some(f => f.title === 'PayPal' && f.getBoundingClientRect().height >= 40),
            { timeout: 15000 }
          ).catch(() => {});
          await page.waitForFunction(
            () => Array.from(window.frames || []).length >= 0,
            { timeout: 1000 }
          ).catch(() => {});
          for (let attempt = 0; attempt < 35; attempt++) {
            const ppFrame = page.frames().find(f => f.url().includes('smart/buttons'));
            if (ppFrame) {
              const ready = await ppFrame.evaluate(() => {
                const imgs = Array.from(document.querySelectorAll('img'));
                return imgs.length > 0 && imgs.every(img => img.complete && img.naturalWidth > 0);
              }).catch(() => false);
              if (ready) break;
            }
            await page.waitForTimeout(500);
          }
          await page.locator('iframe[title="PayPal"]').first().scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(1000);
          await page.screenshot({ path: path.join(outDir, `paypal_checkout_${width}_${theme}.png`), fullPage: true });

          if (width === 1440 && theme === 'dark') {
            await page.screenshot({ path: path.join(outDir, 'timeline_gap_bar_1440_dark.png'), fullPage: true });
          }

          await context.close();
        }
      }
    }

    // 2. Interactive Decision Card states on 1440 dark (Counter open, Decline confirm, Approve -> Undo bar)
    if (!onlyExtra && !onlyPayPal) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addCookies([
        { name: 'vyro_session', value: sessionId, domain: 'localhost', path: '/' }
      ]);
      const page = await context.newPage();

      await page.goto(`http://localhost:5173/app/deals/${escId}`, { waitUntil: 'domcontentloaded' });
      await applyTheme(page, 'dark');
      await page.waitForSelector('button[aria-label^="Counter"]', { timeout: 10000 });

      // Counter open state
      await page.click('button[aria-label^="Counter"]');
      await page.waitForSelector('button:has-text("Send counter")', { timeout: 5000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, 'decision_card_counter_open.png'), fullPage: true });

      // Close counter via Cancel and open Decline confirm popover
      await page.click('button:has-text("Cancel")');
      await page.click('button[aria-label^="Decline"]');
      await page.waitForSelector('div[role="dialog"][aria-label="Confirm decline deal"]', { timeout: 5000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, 'decision_card_decline_confirm.png'), fullPage: true });

      // Click Keep, then test Approve -> Undo collapsed bar, then click Undo to restore clean DB state
      await page.click('div[role="dialog"] button:has-text("Keep")');
      await page.click('button[aria-label^="Approve"]');
      await page.waitForSelector('button:has-text("Undo")', { timeout: 8000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, 'decision_card_undo_collapsed.png'), fullPage: true });

      // Restore via Undo button
      const undoBtn = await page.$('button:has-text("Undo")');
      if (undoBtn) {
        await undoBtn.click();
        await page.waitForTimeout(1000);
      }

      await context.close();
    }

    // 3. Budget & Flexibility Step 2 UI (/app/requests/new)
    if (!onlyPayPal) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addCookies([{ name: 'vyro_session', value: sessionId, domain: 'localhost', path: '/' }]);
      const page = await context.newPage();
      await page.goto('http://localhost:5173/app/requests/new', { waitUntil: 'domcontentloaded' });
      await applyTheme(page, 'dark');
      await page.waitForSelector('h1', { timeout: 10000 });
      await page.fill('textarea', 'Full-stack e-commerce API & React checkout');
      await page.click('button:has-text("Continue")');
      await page.waitForSelector('button:has-text("Stick to budget")', { timeout: 5000 });
      const inputs = await page.$$('input[type="number"]');
      if (inputs.length >= 2) {
        await inputs[0].fill('1400');
        await inputs[1].fill('1750');
      }
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, 'budget_flexibility_1440_dark.png'), fullPage: true });

      await context.close();
    }

    // 4. PayPal Slow Network (48px Skeleton) & Blocked SDK Fallback (Retry button)
    if (!onlyPayPal) {
      // Slow network (delay PayPal config & SDK so 48px skeleton stays visible)
      const slowCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await slowCtx.addCookies([{ name: 'vyro_session', value: sessionId, domain: 'localhost', path: '/' }]);
      const slowPage = await slowCtx.newPage();
      await slowPage.route('**/api/v1/payments/paypal/config*', async (route) => {
        await new Promise(r => setTimeout(r, 9000));
        await route.continue().catch(() => {});
      });
      await slowPage.route('**/www.paypal.com/sdk/js*', async (route) => {
        await new Promise(r => setTimeout(r, 9000));
        await route.continue().catch(() => {});
      });
      await slowPage.goto(`http://localhost:5173/app/deals/${payId}`, { waitUntil: 'domcontentloaded' });
      await applyTheme(slowPage, 'dark');
      await slowPage.waitForSelector('[aria-label="Loading PayPal button"], [aria-label="Loading PayPal gateway"]', { timeout: 8000 });
      await slowPage.waitForTimeout(300);
      await slowPage.screenshot({ path: path.join(outDir, 'paypal_slow_skeleton.png'), fullPage: true });
      await slowCtx.close();

      // Blocked SDK -> Retry error box
      const blkCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await blkCtx.addCookies([{ name: 'vyro_session', value: sessionId, domain: 'localhost', path: '/' }]);
      const blkPage = await blkCtx.newPage();
      await blkPage.route('**/www.paypal.com/sdk/js*', (route) => route.abort());
      await blkPage.route('**/www.sandbox.paypal.com/sdk/js*', (route) => route.abort());
      await blkPage.goto(`http://localhost:5173/app/deals/${payId}`, { waitUntil: 'domcontentloaded' });
      await applyTheme(blkPage, 'dark');
      await blkPage.waitForSelector('button:has-text("Retry")', { timeout: 12000 });
      await blkPage.waitForTimeout(300);
      await blkPage.screenshot({ path: path.join(outDir, 'paypal_blocked_fallback.png'), fullPage: true });
      await blkCtx.close();
    }
  } finally {
    await browser.close();
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }

  console.log(`Captured all after screenshots in ${outDir}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
