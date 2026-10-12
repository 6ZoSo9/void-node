/**
 * Early proto scrub — remove any pre-existing non-writable txRoot on Object.prototype.
 */
(function () {
    var VOID_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_V1";
    function recordVoidProtoScrubEmptyCatchVisibilityV1(site, err) {
        try {
            var g = globalThis;
            var key = "__void_proto_scrub_empty_catch_visibility_v1";
            var bucket = Array.isArray(g[key]) ? g[key] : [];
            bucket.push({
                marker: VOID_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_V1_MARKER,
                site: String(site || "unknown"),
                message: err && err.message ? String(err.message) : String(err || ""),
            });
            while (bucket.length > 50)
                bucket.shift();
            g[key] = bucket;
        }
        catch (_visibilityRecordErr) {
            /* VOID_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
        }
    }
    try {
        var proto = Object.prototype;
        var d = Object.getOwnPropertyDescriptor(proto, 'txRoot');
        if (d) {
            try {
                delete proto.txRoot;
            }
            catch (_a) { recordVoidProtoScrubEmptyCatchVisibilityV1('VOID_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_V1_SITE_DELETE_INITIAL', _a); }
            var d2 = Object.getOwnPropertyDescriptor(proto, 'txRoot');
            if (d2) {
                try {
                    Object.defineProperty(proto, 'txRoot', { value: undefined, writable: true, configurable: true });
                }
                catch (_b) { recordVoidProtoScrubEmptyCatchVisibilityV1('VOID_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_V1_SITE_DEFINE_FALLBACK', _b); }
                try {
                    delete proto.txRoot;
                }
                catch (_c) { recordVoidProtoScrubEmptyCatchVisibilityV1('VOID_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_V1_SITE_DELETE_AFTER_DEFINE', _c); }
            }
        }
    }
    catch (_d) { recordVoidProtoScrubEmptyCatchVisibilityV1('VOID_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_V1_SITE_OUTER_SCRUB', _d); }
})();
