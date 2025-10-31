/**
 * Early proto scrub — remove any pre-existing non-writable txRoot on Object.prototype.
 */
(() => {
  try {
    const proto = Object.prototype as any;
    const d = Object.getOwnPropertyDescriptor(proto, 'txRoot');
    if (d) {
      try { delete proto.txRoot; } catch {}
      const d2 = Object.getOwnPropertyDescriptor(proto, 'txRoot');
      if (d2) {
        try {
          Object.defineProperty(proto, 'txRoot', { value: undefined, writable: true, configurable: true });
        } catch {}
        try { delete proto.txRoot; } catch {}
      }
    }
  } catch {}
})();
