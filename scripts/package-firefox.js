const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = new Set(process.argv.slice(2));
const shouldObfuscate = args.has('--obfuscate');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'manifest.json');
const distManifestPath = path.join(rootDir, 'dist', 'manifest.json');

const run = (cmd) => {
  execSync(cmd, { stdio: 'inherit' });
};

function writeFirefoxManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Firefox on some channels may have MV3 service workers disabled.
  // Use background.scripts for compatibility with temporary add-on installs.
  manifest.background = {
    scripts: ['background.js'],
    type: 'module',
  };

  fs.writeFileSync(distManifestPath, JSON.stringify(manifest, null, 2));
  console.log('[package:firefox] Wrote Firefox-compatible dist/manifest.json');
}

run('npm run build');

if (shouldObfuscate) {
  run('npm run obfuscate');
}

writeFirefoxManifest();

run('npm run clean-maps');
run('bestzip dist-firefox.zip dist/*');
