import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOTS_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\907977bc-7293-4960-b427-dba2a6d2f786\\screenshots';
const CLIENT_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:4000/api/v1';

async function main() {
  console.log('--- STARTING RESPONSIVE & THEME VERIFICATION ---');

  // Register clean user
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `audit.user.${Date.now()}@example.com`,
      password: 'Password123!',
      displayName: 'Audit User'
    })
  });
  const data = await res.json();
  const sessionId = data.sessionId;

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setCookie({
      name: 'vyro_session',
      value: sessionId,
      domain: 'localhost',
      path: '/'
    });

    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 390, height: 844 }
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });

      // Dark Mode
      await page.goto(`${CLIENT_URL}/app`, { waitUntil: 'networkidle2' });
      await page.evaluate(() => {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        localStorage.setItem('vyro-theme', 'dark');
      });
      await new Promise(r => setTimeout(r, 600));

      // Verify no horizontal overflow
      const overflowDark = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      console.log(`[${vp.name} dark] overflow: ${overflowDark}`);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `multi_user_${vp.name}_dark.png`),
        fullPage: true
      });

      // Light Mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('vyro-theme', 'light');
      });
      await new Promise(r => setTimeout(r, 600));

      const overflowLight = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      console.log(`[${vp.name} light] overflow: ${overflowLight}`);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `multi_user_${vp.name}_light.png`),
        fullPage: true
      });
    }

    console.log('--- RESPONSIVE AUDIT COMPLETED CLEANLY ---');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
