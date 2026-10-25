const { execSync } = require('node:child_process');

const isWorkersBuild = Boolean(process.env.WORKERS_CI) && !process.env.OPENNEXT_BUILD;
const command = isWorkersBuild ? 'opennextjs-cloudflare build' : 'next build';

execSync(command, {
  stdio: 'inherit',
  env: { ...process.env, OPENNEXT_BUILD: '1' },
});
