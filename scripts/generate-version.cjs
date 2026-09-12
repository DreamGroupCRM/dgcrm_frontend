// V_22.0 — writes public/version.json with the current build's timestamp,
// so the deployed app can tell a stale, already-loaded page apart from a
// newly-deployed one (see src/components/common/VersionWatcher.tsx). Run
// automatically before every `npm run build` via the "prebuild" script —
// npm's own lifecycle hook, no extra tooling/vite plugin needed.
const fs = require('fs');
const path = require('path');

const version = String(Date.now());
const outPath = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(outPath, JSON.stringify({ version }));
console.log(`✓ Wrote ${outPath} (version ${version})`);
