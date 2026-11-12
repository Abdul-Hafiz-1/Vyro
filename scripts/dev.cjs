const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function runService(name, args) {
  const child = spawn(npmCmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: isWin
  });
  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });
  return child;
}

console.log('Starting VYRO backend (http://localhost:4000) and frontend (http://localhost:5173)...');
const server = runService('server', ['--prefix', 'server', 'run', 'dev']);
const client = runService('client', ['--prefix', 'client', 'run', 'dev']);

function shutdown() {
  server.kill('SIGINT');
  client.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
