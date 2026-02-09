/* cpu_triage_active_handles_v1.cjs
   Dumps active handles/requests to /tmp periodically when VOID_CPU_TRIAGE=1.
   Low risk: file I/O only, no network, no stdout spam.
*/
(function () {
  try {
    if (process.env.VOID_CPU_TRIAGE !== '1') return;

    const fs = require('fs');
    const path = require('path');

    const outBase = `/tmp/void-handles.${process.pid}`;
    const dump = () => {
      try {
        // Not public API, but available in Node.
        const getHandles = process._getActiveHandles ? process._getActiveHandles() : [];
        const getReqs = process._getActiveRequests ? process._getActiveRequests() : [];

        const summarize = (h) => {
          if (!h) return { type: 'null' };
          const name = (h.constructor && h.constructor.name) ? h.constructor.name : typeof h;
          const o = { type: name };
          // common timer handle fields
          if (name.includes('Timeout') || name.includes('Immediate')) {
            o._idleTimeout = h._idleTimeout;
            o._repeat = h._repeat;
            o._destroyed = h._destroyed;
          }
          // sockets
          if (name.includes('Socket')) {
            o.localAddress = h.localAddress;
            o.localPort = h.localPort;
            o.remoteAddress = h.remoteAddress;
            o.remotePort = h.remotePort;
            o.bytesRead = h.bytesRead;
            o.bytesWritten = h.bytesWritten;
          }
          return o;
        };

        const payload = {
          ts: new Date().toISOString(),
          pid: process.pid,
          handles: getHandles.map(summarize),
          requests: getReqs.map(summarize),
        };

        const tmp = `${outBase}.${Date.now()}.json`;
        fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
        // keep last ~40 dumps
        const files = fs.readdirSync('/tmp').filter(f => f.startsWith(path.basename(outBase)) && f.endsWith('.json')).sort();
        while (files.length > 40) {
          const f = files.shift();
          try { fs.unlinkSync(`/tmp/${f}`); } catch {}
        }
      } catch {}
    };

    setInterval(dump, 5000).unref();
    // first dump soon
    setTimeout(dump, 500).unref();
  } catch {}
})();
