const { execSync } = require('child_process');

const args = new Set(process.argv.slice(2));
const shouldObfuscate = args.has('--obfuscate');

const run = (cmd) => {
  execSync(cmd, { stdio: 'inherit' });
};

run('npm run build');

if (shouldObfuscate) {
  run('npm run obfuscate');
}

run('npm run clean-maps');
run('npm run zip');
