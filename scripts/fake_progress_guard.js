const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'client', 'src');

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

const files = walk(SRC_DIR, ['.ts', '.tsx']);
const violations = [];

// Detect fake progress bar patterns (interval/timeout incrementing % or fake step counters for AI/loading)
const FAKE_PROGRESS_PATTERNS = [
  { name: 'Fake percentage progress increment', regex: /setProgress\s*\(\s*\(?\s*\w+\s*=>|\bprogress\s*\+\s*\d/ },
  { name: 'Fake AI status timer message rotation', regex: /setInterval\([^)]*(Analyzing|Thinking|Matching|Negotiating|Step)/i },
];

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    for (const pat of FAKE_PROGRESS_PATTERNS) {
      if (pat.regex.test(line)) {
        violations.push(`${rel}:${idx + 1} — ${pat.name}: ${line.trim()}`);
      }
    }
  });
}

if (violations.length > 0) {
  console.error('❌ FAKE PROGRESS GUARD FAILED:');
  violations.forEach((v) => console.error('  -', v));
  process.exit(1);
}

console.log(`✅ FAKE PROGRESS GUARD PASSED (${files.length} files scanned, zero fake progress timers).`);
