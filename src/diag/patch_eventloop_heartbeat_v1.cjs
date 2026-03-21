/* eslint-disable */
(function () {
  const tag = `[eventloop.heartbeat.v1 pid=${process.pid}]`;
  const log = (...a) => { try { console.error(tag, ...a); } catch (_) {} };

  try {
    log("installed", { now: Date.now() });

    let i = 0;
    const iv = setInterval(() => {
      i++;
      log("tick", i, { now: Date.now() });
      if (i >= 10) {
        clearInterval(iv);
        log("done");
      }
    }, 1000);

    setTimeout(() => log("timeout-2s", { now: Date.now() }), 2000);
    setTimeout(() => log("timeout-6s", { now: Date.now() }), 6000);
  } catch (e) {
    log("install failed", (e && e.stack) ? e.stack : e);
  }
})();
