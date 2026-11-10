const { chromium } = require('playwright');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const mode = process.argv[2] || 'before';
const outDir = path.resolve(process.cwd(), 'audit', `${mode}-screenshots`);
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
  const sessionId = 'sess_snapshot_alex_' + Date.now();
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
  db.prepare('INSERT OR REPLACE INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    sessionId,
    'usr_alex_mercer',
    expiresAt,
    new Date().toISOString()
  );

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });

  try {
    for (const width of [1440, 390]) {
      for (const theme of ['dark', 'light']) {
        const context = await browser.newContext({
          viewport: { width, height: 900 }
        });
        await context.addCookies([
          { name: 'vyro_session', value: sessionId, domain: 'localhost', path: '/' }
        ]);
        const page = await context.newPage();

        // Decision card view
        await page.goto('http://localhost:5173/app/deals/neg_escalated_002', { waitUntil: 'domcontentloaded' });
        await applyTheme(page, theme);
        await page.waitForSelector('h1', { timeout: 8000 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(outDir, `decision_card_${width}_${theme}.png`), fullPage: true });

        // PayPal checkout view
        await page.goto('http://localhost:5173/app/deals/neg_a7bc52c4', { waitUntil: 'domcontentloaded' });
        await applyTheme(page, theme);
        await page.waitForSelector('h1', { timeout: 8000 });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(outDir, `paypal_checkout_${width}_${theme}.png`), fullPage: true });

        await context.close();
      }
    }
  } finally {
    await browser.close();
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }

  console.log(`Captured ${mode} screenshots in ${outDir}`);
}

run().catch(e => { console.error(e); process.exit(1); });
