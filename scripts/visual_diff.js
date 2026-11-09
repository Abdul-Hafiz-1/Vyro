const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const rawPixelmatch = require('pixelmatch');
const pixelmatch = rawPixelmatch.default || rawPixelmatch;

const OLD_UI_DIR = path.resolve(__dirname, '..', 'audit', 'old-ui');
const NEW_UI_DIR = path.resolve(__dirname, '..', 'audit', 'round-redesign', 'gate1');

if (!fs.existsSync(NEW_UI_DIR)) {
  fs.mkdirSync(NEW_UI_DIR, { recursive: true });
}

function loadPNG(filePath) {
  const data = fs.readFileSync(filePath);
  return PNG.sync.read(data);
}

function checkNoLeftSidebar(img) {
  // Inspect the left strip x=20..220, y=120..600 on a 1440px wide desktop screenshot.
  // In the old UI, this was an <aside> sidebar with dark background (#0B0F17 or #111827).
  // In the new Paper & Ink UI, there is no sidebar; x=20..220 is empty paper #FBF7F0 or light background.
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
      // Check if it looks like the old dark sidebar (r,g,b all < 50)
      if (r < 50 && g < 50 && b < 50) {
        darkSidebarPixels++;
      }
    }
  }

  const ratio = darkSidebarPixels / totalSampled;
  return ratio < 0.35; // PASS if no dense dark sidebar strip
}

function compareScreens(oldImgPath, newImgPath) {
  if (!fs.existsSync(oldImgPath)) {
    return { skipped: true, reason: 'Old reference screenshot not found' };
  }
  if (!fs.existsSync(newImgPath)) {
    return { skipped: true, reason: 'New screenshot not found' };
  }

  const img1 = loadPNG(oldImgPath);
  const img2 = loadPNG(newImgPath);

  // Crop or copy to common dimensions
  const width = Math.min(img1.width, img2.width);
  const height = Math.min(img1.height, img2.height);

  const cropped1 = new PNG({ width, height });
  const cropped2 = new PNG({ width, height });
  PNG.bitblt(img1, cropped1, 0, 0, width, height, 0, 0);
  PNG.bitblt(img2, cropped2, 0, 0, width, height, 0, 0);

  const diff = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    cropped1.data,
    cropped2.data,
    diff.data,
    width,
    height,
    { threshold: 0.02 }
  );

  const totalPixels = width * height;
  const diffPercentage = (mismatchedPixels / totalPixels) * 100;

  // Check left sidebar elimination on desktop
  const hasNoSidebar = width >= 1000 ? checkNoLeftSidebar(img2) : true;

  return {
    diffPercentage,
    mismatchedPixels,
    totalPixels,
    hasNoSidebar,
    pass: diffPercentage >= 50.0 && hasNoSidebar
  };
}

module.exports = { compareScreens, checkNoLeftSidebar };

if (require.main === module) {
  console.log('==============================================');
  console.log('   VYRO VISUAL DIFF & REDESIGN VERIFIER       ');
  console.log('==============================================\n');

  const pairsToCompare = [
    {
      name: 'Today / Overview (Desktop 1440 Light)',
      old: path.join(OLD_UI_DIR, 'buyer_overview_filled_1440_light.png'),
      new: path.join(NEW_UI_DIR, 'today_1440_light.png')
    },
    {
      name: 'Today / Overview (Mobile 390 Light)',
      old: path.join(OLD_UI_DIR, 'buyer_overview_filled_390_light.png'),
      new: path.join(NEW_UI_DIR, 'today_390_light.png')
    }
  ];

  let anyFailed = false;

  for (const pair of pairsToCompare) {
    console.log(`Comparing: ${pair.name}`);
    const result = compareScreens(pair.old, pair.new);

    if (result.skipped) {
      console.log(`[SKIP] ${result.reason}`);
      continue;
    }

    console.log(`  - Pixel Difference: ${result.diffPercentage.toFixed(2)}% (Target: >= 50%)`);
    console.log(`  - Sidebar Eliminated: ${result.hasNoSidebar ? 'YES' : 'NO (FAILED)'}`);

    if (result.pass) {
      console.log(`  [PASS] Redesign is completely different from old UI.\n`);
    } else {
      console.log(`  [FAIL] Screen does not meet 50% redesign threshold or retains sidebar.\n`);
      anyFailed = true;
    }
  }

  if (anyFailed) {
    process.exit(1);
  }
}
