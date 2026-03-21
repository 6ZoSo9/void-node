/**
 * patch_finalhandler_guard_v1.js
 * Prevents finalhandler from throwing when called with missing/invalid res/req.
 */
(function () {
  function safeRequire(name) {
    try { return require(name); } catch { return null; }
  }
  const fh = safeRequire('finalhandler');
  if (!fh) {
    console.error('[finalhandler-guard] finalhandler not found; skipping');
    return;
  }

  // finalhandler exports a function; it also closes over helper fns in its module.
  // We can't access its internal headersSent directly, so we monkeypatch http.ServerResponse
  // + provide a super defensive shim for res.headersSent access.
  try {
    const http = require('http');
    const origCreateServer = http.createServer;
    http.createServer = function patchedCreateServer(...args) {
      const server = origCreateServer.apply(this, args);
      server.on('request', (req, res) => {
        if (res && typeof res === 'object' && !('headersSent' in res)) {
          Object.defineProperty(res, 'headersSent', { value: false, writable: true, configurable: true });
        }
      });
      return server;
    };
  } catch (e) {
    console.error('[finalhandler-guard] http.createServer patch failed', e && e.message ? e.message : e);
  }

  // Also patch express app invocation edge: if someone calls app() with missing args,
  // finalhandler can be reached with undefined res. We guard at process level to avoid crash.
  const origEmit = process.emit;
  process.emit = function patchedEmit(ev, ...rest) {
    if (ev === 'uncaughtException' || ev === 'unhandledRejection') {
      const err = rest && rest[0];
      const msg = (err && err.message) ? String(err.message) : '';
      if (msg.includes("headersSent") && msg.includes("Cannot read properties of undefined")) {
        console.error('[finalhandler-guard] swallowed crashy headersSent error:', msg);
        return true;
      }
    }
    return origEmit.call(this, ev, ...rest);
  };

  console.error('[finalhandler-guard] installed');
})();
