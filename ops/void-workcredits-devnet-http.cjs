#!/usr/bin/env node
'use strict';

const http = require('http');
const { execFile } = require('child_process');
const path = require('path');
const { URL } = require('url');

const ROOT = process.env.ROOT || process.cwd();
const PORT = parseInt(process.env.WC_HTTP_PORT || '4312', 10);

function log(...args) {
  console.log('[workcredits-http]', ...args);
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj, null, 2));
}

function runScript(relPath, args, cb) {
  const scriptPath = path.join(ROOT, relPath);
  execFile(
    scriptPath,
    args,
    { cwd: ROOT, env: process.env },
    (err, stdout, stderr) => {
      cb(err, stdout, stderr);
    }
  );
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname || '/';

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method Not Allowed');
    return;
  }

  // ---------------------------------------------------------------------------
  // GET /workcredits/devnet/pool.json
  // ---------------------------------------------------------------------------
  if (pathname === '/workcredits/devnet/pool.json') {
    log('GET', pathname, '-> pool script');
    runScript('ops/void-workcredits-devnet-pool-json.sh', [], (err, stdout, stderr) => {
      if (err) {
        log('pool error:', err.message);
        if (stderr && stderr.trim()) {
          log('pool stderr:', stderr.trim());
        }
        return sendJson(res, 500, {
          error: 'workcredits pool error',
          detail: err.message,
        });
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(stdout);
    });
    return;
  }

  // ---------------------------------------------------------------------------
  // GET /workcredits/devnet/account/:address.json
  // ---------------------------------------------------------------------------
  const accountMatch = pathname.match(/^\/workcredits\/devnet\/account\/([^/]+)\.json$/);
  if (accountMatch) {
    const addr = accountMatch[1];
    log('GET', pathname, '-> account script for addr', addr);

    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      log('bad address format:', addr);
      return sendJson(res, 400, {
        error: 'invalid address',
        address: addr,
      });
    }

    runScript(
      'ops/void-workcredits-devnet-account-json.sh',
      [addr],
      (err, stdout, stderr) => {
        if (err) {
          log('account error for', addr, ':', err.message);
          if (stderr && stderr.trim()) {
            log('account stderr:', stderr.trim());
          }
          return sendJson(res, 500, {
            error: 'workcredits account error',
            address: addr,
            detail: err.message,
          });
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(stdout);
      }
    );
    return;
  }

  // ---------------------------------------------------------------------------
  // GET /workcredits/devnet/dashboard/:address.json
  // Combines pool + account into a single object for wallet UI.
  // ---------------------------------------------------------------------------
  const dashMatch = pathname.match(/^\/workcredits\/devnet\/dashboard\/([^/]+)\.json$/);
  if (dashMatch) {
    const addr = dashMatch[1];
    log('GET', pathname, '-> dashboard (pool + account) for addr', addr);

    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      log('bad address format (dashboard):', addr);
      return sendJson(res, 400, {
        error: 'invalid address',
        address: addr,
      });
    }

    // First: pool
    runScript('ops/void-workcredits-devnet-pool-json.sh', [], (errPool, outPool, errPoolStderr) => {
      if (errPool) {
        log('dashboard pool error:', errPool.message);
        if (errPoolStderr && errPoolStderr.trim()) {
          log('dashboard pool stderr:', errPoolStderr.trim());
        }
        return sendJson(res, 500, {
          error: 'workcredits dashboard error (pool)',
          address: addr,
          detail: errPool.message,
        });
      }

      let poolJson;
      try {
        poolJson = JSON.parse(outPool);
      } catch (e) {
        log('dashboard pool JSON parse error:', e.message);
        return sendJson(res, 500, {
          error: 'workcredits dashboard error (pool JSON)',
          address: addr,
          detail: e.message,
        });
      }

      // Second: account
      runScript(
        'ops/void-workcredits-devnet-account-json.sh',
        [addr],
        (errAcct, outAcct, errAcctStderr) => {
          if (errAcct) {
            log('dashboard account error:', errAcct.message);
            if (errAcctStderr && errAcctStderr.trim()) {
              log('dashboard account stderr:', errAcctStderr.trim());
            }
            return sendJson(res, 500, {
              error: 'workcredits dashboard error (account)',
              address: addr,
              detail: errAcct.message,
            });
          }

          let accountJson;
          try {
            accountJson = JSON.parse(outAcct);
          } catch (e2) {
            log('dashboard account JSON parse error:', e2.message);
            return sendJson(res, 500, {
              error: 'workcredits dashboard error (account JSON)',
              address: addr,
              detail: e2.message,
            });
          }

          // Combine
          const result = {
            chain: poolJson.chain || accountJson.chain || 'devnet',
            address: addr,
            pool: poolJson,
            account: accountJson,
          };

          sendJson(res, 200, result);
        }
      );
    });

    return;
  }

  // ---------------------------------------------------------------------------
  // Fallback 404
  // ---------------------------------------------------------------------------
  log('404', pathname);
  sendJson(res, 404, { error: 'not found', path: pathname });
});

server.listen(PORT, () => {
  log(`ROOT=${ROOT}`);
  log(`PORT=${PORT}`);
  log(`listening on http://127.0.0.1:${PORT}`);
});
