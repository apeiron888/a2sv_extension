const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = new Set(process.argv.slice(2));
const shouldObfuscate = args.has('--obfuscate');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'manifest.json');
const distDir = path.join(rootDir, 'dist');
const legacyDir = path.join(rootDir, 'dist-legacy');
const legacyManifestPath = path.join(legacyDir, 'manifest.json');

const run = (cmd) => {
  execSync(cmd, { stdio: 'inherit' });
};

function toLegacyManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (fs.existsSync(legacyDir)) {
    fs.rmSync(legacyDir, { recursive: true, force: true });
  }
  fs.cpSync(distDir, legacyDir, { recursive: true });

  const legacy = {
    ...manifest,
    manifest_version: 2,
  };

  // MV3 -> MV2 background conversion
  legacy.background = {
    scripts: ['background.js'],
    persistent: false,
  };

  // MV3 action -> MV2 browser_action
  if (legacy.action) {
    legacy.browser_action = legacy.action;
    delete legacy.action;
  }

  // MV3 host_permissions -> MV2 permissions
  const hostPermissions = Array.isArray(legacy.host_permissions) ? legacy.host_permissions : [];
  const basePermissions = Array.isArray(legacy.permissions) ? legacy.permissions : [];
  legacy.permissions = [...new Set([...basePermissions, ...hostPermissions])];
  delete legacy.host_permissions;

  // MV3 web_accessible_resources format -> MV2 string[]
  if (Array.isArray(legacy.web_accessible_resources)) {
    const flatResources = legacy.web_accessible_resources.flatMap((item) => {
      if (typeof item === 'string') return [item];
      if (item && Array.isArray(item.resources)) return item.resources;
      return [];
    });
    legacy.web_accessible_resources = [...new Set(flatResources)];
  }

  // Remove Firefox-only metadata for Chromium legacy package
  delete legacy.browser_specific_settings;

  fs.writeFileSync(legacyManifestPath, JSON.stringify(legacy, null, 2));
  console.log('[package:legacy] Wrote legacy-compatible dist-legacy/manifest.json');
}

run('npm run build');

if (shouldObfuscate) {
  run('npm run obfuscate');
}

toLegacyManifest();

run('npm run clean-maps');
run('bestzip dist-legacy.zip dist-legacy/*');
