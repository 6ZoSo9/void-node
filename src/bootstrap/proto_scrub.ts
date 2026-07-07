/**
 * Early proto scrub — remove any pre-existing non-writable txRoot on Object.prototype.
 */
function recordProtoScrubBestEffortFailure(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_BOOTSTRAP_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE", {
    scope,
    message,
  });
}

(() => {
  try {
    const proto = Object.prototype as any;
    const d = Object.getOwnPropertyDescriptor(proto, 'txRoot');
    if (d) {
      try {
        delete proto.txRoot;
      } catch (err) {
        recordProtoScrubBestEffortFailure("initial-delete", err);
      }

      const d2 = Object.getOwnPropertyDescriptor(proto, 'txRoot');
      if (d2) {
        try {
          Object.defineProperty(proto, 'txRoot', { value: undefined, writable: true, configurable: true });
        } catch (err) {
          recordProtoScrubBestEffortFailure("define-property-normalize", err);
        }

        try {
          delete proto.txRoot;
        } catch (err) {
          recordProtoScrubBestEffortFailure("final-delete", err);
        }
      }
    }
  } catch (err) {
    recordProtoScrubBestEffortFailure("outer-proto-scrub", err);
  }
})();
