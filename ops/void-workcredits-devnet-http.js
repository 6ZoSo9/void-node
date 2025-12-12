'use strict';

const http = require('http');
const { spawn } = require('child_process');
const url = require('url');
const path = require('path');

const ROOT = process.env.ROOT || process.cwd();
const PORT = Number(process.env.WC_HTTP_PORT || 4311);

function runScript(scriptRel, args, res) {
  const scriptPath = path.join(ROOT, scriptRel);
  const child = spawn('bash', [scriptPath, ...args], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  child.on('close', (code) => {
    if (code !== 0) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        ok: false,
        error: `script exited with code ${code}`,
        stderr: stderr.trim()
      }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(stdout);
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || '', true);
  const pathname = parsed.pathname || '';

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'method not allowed' }));
    return;
  }

  if (pathname === '/workcredits/devnet/pool.json') {
    runScript('ops/void-workcredits-devnet-pool-json.sh', [], res);
    return;
  }

  if (pathname.startsWith('/workcredits/devnet/account/')) {
    let addr = pathname.replace('/workcredits/devnet/account/', '');
    if (addr.endsWith('.json')) addr = addr.slice(0, -5);
    addr = addr.trim();

    if (!addr || !addr.startsWith('0x')) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'invalid address' }));
      return;
    }

    runScript('ops/void-workcredits-devnet-account-json.sh', [addr], res);
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: false, error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`[workcredits-http] listening on http://127.0.0.1:${PORT}`);
});
