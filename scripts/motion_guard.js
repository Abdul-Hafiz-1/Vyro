const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'client', 'src');
const DIST_ASSETS = path.join(ROOT, 'client', 'dist', 'assets');

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, exts, out);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const failures = [];
const srcFiles = walk(SRC_DIR, ['.css', '.ts', '.tsx']);
const distCssFiles = walk(DIST_ASSETS, ['.css']);

// 1. Check reduced-motion coverage in source & built CSS
const indexCssPath = path.join(SRC_DIR, 'index.css');
const indexCss = fs.readFileSync(indexCssPath, 'utf8');
if (!indexCss.includes('@media (prefers-reduced-motion: reduce)')) {
  failures.push('Missing @media (prefers-reduced-motion: reduce) in client/src/index.css');
}
if (!indexCss.includes('.motion-reduced')) {
  failures.push('Missing .motion-reduced override class in client/src/index.css');
}
if (distCssFiles.length === 0) {
  failures.push('Missing built CSS in client/dist/assets — run client build first.');
} else {
  const builtCss = distCssFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  if (!builtCss.includes('prefers-reduced-motion')) {
    failures.push('Built CSS bundle does not include prefers-reduced-motion media query.');
  }
  // Verify built CSS has zero disallowed infinite animations except vyroLivePulse
  const animMatches = builtCss.match(/animation\s*:[^;{}]+/g) || [];
  for (const m of animMatches) {
    if (m.includes('infinite') && !m.includes('vyro-live-pulse') && !m.includes('vyroLivePulse')) {
      failures.push(`Built CSS has disallowed infinite animation: ${m}`);
    }
  }
}

// 2. Scan source files for disallowed classes, infinite loops, >400ms durations, layout-property animations
const BANNED_CLASS_RE = /\b(animate-spin|animate-pulse|animate-bounce|animate-ping)\b|canvas-confetti/;
const CSS_DURATION_RE = /(?:duration|transition-duration|animation-duration)\s*[:=]\s*["'`]?(\d+(?:\.\d+)?)(ms|s)\b/gi;
const TAILWIND_DURATION_RE = /\bduration-(\d+)\b/g;

for (const file of srcFiles) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const ln = idx + 1;

    // Banned Tailwind looping classes or confetti
    const banned = line.match(BANNED_CLASS_RE);
    if (banned) {
      failures.push(`${rel}:${ln} — Disallowed animation/effect "${banned[0]}"`);
    }

    // Check explicit ms/s CSS durations
    let m;
    CSS_DURATION_RE.lastIndex = 0;
    while ((m = CSS_DURATION_RE.exec(line)) !== null) {
      const val = parseFloat(m[1]);
      const ms = m[2].toLowerCase() === 's' ? val * 1000 : val;
      // Allow 1200ms/1.2s ONLY for vyro-live-pulse keyframes
      if (ms > 400 && !line.includes('vyro-live-pulse') && !line.includes('vyroLivePulse')) {
        failures.push(`${rel}:${ln} — Animation/transition duration ${ms}ms exceeds 400ms cap`);
      }
    }

    // Check Tailwind duration-<N> utilities
    TAILWIND_DURATION_RE.lastIndex = 0;
    while ((m = TAILWIND_DURATION_RE.exec(line)) !== null) {
      const ms = parseInt(m[1], 10);
      if (ms > 400) {
        failures.push(`${rel}:${ln} — Tailwind duration-${ms} exceeds 400ms cap`);
      }
    }

    // Check Framer Motion numeric duration: 0.X > 0.4
    const fmDur = line.match(/\bduration:\s*(0?\.\d+|\d+(?:\.\d+)?)/);
    if (fmDur) {
      const sec = parseFloat(fmDur[1]);
      if (sec > 0.4 && !line.includes('durationMs')) {
        failures.push(`${rel}:${ln} — Framer Motion duration ${sec}s exceeds 0.4s cap`);
      }
    }

    // Disallowed CSS transition-property / @keyframes layout properties
    if (/transition-(property)?\s*:\s*[^;]*(width|height|top|left|right|bottom|margin|padding)/i.test(line)) {
      failures.push(`${rel}:${ln} — CSS transition on layout property (use transform/opacity only): ${line.trim()}`);
    }
    if (/\binfinite\b/.test(line) && !line.includes('vyro-live-pulse') && !line.includes('vyroLivePulse') && !rel.endsWith('MotionContext.tsx') && !line.includes('//') && !line.includes('*')) {
      if (file.endsWith('.css')) {
        failures.push(`${rel}:${ln} — Disallowed infinite CSS animation: ${line.trim()}`);
      }
    }
  });
}

if (failures.length > 0) {
  console.error('❌ MOTION GUARD FAILED:');
  failures.forEach((f) => console.error('  -', f));
  process.exit(1);
}

console.log(`✅ MOTION GUARD PASSED (${srcFiles.length} source files + ${distCssFiles.length} built CSS bundles checked).`);
