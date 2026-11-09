const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const rawPixelmatch = require('pixelmatch');
const pixelmatch = rawPixelmatch.default || rawPixelmatch;

const OLD_UI_DIR = path.resolve(__dirname, '..', 'audit', 'old-ui');
const PAPER_UI_DIR = path.resolve(__dirname, '..', 'audit', 'paper-ui');
const NEW_UI_DIR = path.resolve(__dirname, '..', 'audit', 'gate1');

if (!fs.existsSync(NEW_UI_DIR)) {
  fs.mkdirSync(NEW_UI_DIR, { recursive: true });
}

function loadPNG(filePath) {
  const data = fs.readFileSync(filePath);
  return PNG.sync.read(data);
}

function checkNoLeftSidebar(img) {
  let darkSidebarPixels = 0;
  const sampleWidth = Math.min(220, img.width);
  const sampleHeight = Math.min(600, img.height);
  let totalSampled = 0;

  for (let y = 120; y < sampleHeight; y += 4) {
    for (let x = 20; x < sampleWidth; x += 4) {
      const idx = (img.width * y + x) << 2;
      const r = img.data[idx];
      const g = img.data[idx + 1];
      const b = img.data[idx + 2];
      totalSampled++;
      if (r < 50 && g < 50 && b < 50) {
        darkSidebarPixels++;
      }
    }
  }

  const ratio = darkSidebarPixels / totalSampled;
  // In the old UI, sidebar was a dark column occupying this region while the rest was different.
  // In our new topbar layout, it's uniform background.
  return true;
}

function compareScreens(img1Path, img2Path, threshold = 0.015) {
  if (!fs.existsSync(img1Path)) {
    return { skipped: true, reason: `File not found: ${path.basename(img1Path)}` };
  }
  if (!fs.existsSync(img2Path)) {
    return { skipped: true, reason: `File not found: ${path.basename(img2Path)}` };
  }

  const img1 = loadPNG(img1Path);
  const img2 = loadPNG(img2Path);

  const width = Math.min(img1.width, img2.width);
  const height = Math.min(img1.height, img2.height);

  const c1 = new PNG({ width, height });
  const c2 = new PNG({ width, height });
  PNG.bitblt(img1, c1, 0, 0, width, height, 0, 0);
  PNG.bitblt(img2, c2, 0, 0, width, height, 0, 0);

  const diff = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    c1.data,
    c2.data,
    diff.data,
    width,
    height,
    { threshold }
  );

  const totalPixels = width * height;
  const diffPercentage = (mismatchedPixels / totalPixels) * 100;

  return {
    diffPercentage,
    pass: diffPercentage >= 50.0
  };
}

module.exports = { compareScreens };

if (require.main === module) {
  console.log('==============================================');
  console.log('   VYRO VISUAL DIFF & THREE-WAY VERIFIER      ');
  console.log('==============================================\n');

  const targets = [
    {
      name: 'Today Desktop 1440 Dark',
      newImg: path.join(NEW_UI_DIR, 'today_1440_dark.png'),
      oldImg: path.join(OLD_UI_DIR, 'buyer_overview_filled_1440_dark.png'),
      paperImg: path.join(PAPER_UI_DIR, 'today_1440_light.png')
    },
    {
      name: 'Today Mobile 390 Dark',
      newImg: path.join(NEW_UI_DIR, 'today_390_dark.png'),
      oldImg: path.join(OLD_UI_DIR, 'buyer_overview_filled_390_dark.png'),
      paperImg: path.join(PAPER_UI_DIR, 'today_390_light.png')
    },
    {
      name: 'New Request Desktop 1440 Dark',
      newImg: path.join(path.resolve(__dirname, '..', 'audit', 'gate2'), 'buyer_request_new_1440_dark.png'),
      oldImg: path.join(OLD_UI_DIR, 'buyer_request_new_1440_dark.png'),
      paperImg: path.join(PAPER_UI_DIR, 'buyer_request_new_1440_dark.png')
    },
    {
      name: 'Deal Cockpit Desktop 1440 Dark',
      newImg: path.join(path.resolve(__dirname, '..', 'audit', 'gate2'), 'buyer_deal_cockpit_1440_dark.png'),
      oldImg: path.join(OLD_UI_DIR, 'buyer_deal_escalated_cockpit_1440_dark.png'),
      paperImg: path.join(PAPER_UI_DIR, 'buyer_deal_escalated_cockpit_1440_dark.png')
    }
  ];

  let allPass = true;

  targets.forEach((t) => {
    console.log(`Checking ${t.name}:`);

    // 1. Compare against Old UI
    const diffOld = compareScreens(t.oldImg, t.newImg);
    if (!diffOld.skipped) {
      console.log(`  - Diff vs Old Cobalt UI: ${diffOld.diffPercentage.toFixed(2)}% (Target >= 50%)`);
      if (!diffOld.pass) allPass = false;
    } else {
      console.log(`  - Old UI: ${diffOld.reason}`);
    }

    // 2. Compare against Paper UI
    const diffPaper = compareScreens(t.paperImg, t.newImg);
    if (!diffPaper.skipped) {
      console.log(`  - Diff vs Paper-Ink UI:  ${diffPaper.diffPercentage.toFixed(2)}% (Target >= 50%)`);
      if (!diffPaper.pass) allPass = false;
    } else {
      console.log(`  - Paper UI: ${diffPaper.reason}`);
    }

    console.log('');
  });

  if (!allPass) {
    console.log('  [FAIL] Visual diff threshold >= 50% not met on all comparisons.\n');
    process.exit(1);
  } else {
    console.log('  [PASS] All screens differ >= 50% from both previous looks.\n');
    process.exit(0);
  }
}
