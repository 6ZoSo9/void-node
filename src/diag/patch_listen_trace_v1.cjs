'use strict';
/*
  SILENCED_LISTEN_TRACE_V2

  This file is still --require'd by systemd ExecStart.
  Default behavior: DO NOTHING (no stdout/stderr spam).
  To re-enable the original listen tracing for debugging:
    export VOID_LISTEN_TRACE=1
*/
try {
  const enable = (process.env.VOID_LISTEN_TRACE || '') === '1';
  if (enable) {
    // load preserved implementation (the old noisy tracer)
    require('./patch_listen_trace_v1.impl.cjs');
  }
} catch (e) {
  // never crash boot due to debug tooling
}
