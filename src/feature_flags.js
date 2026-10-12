"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureEnabled = featureEnabled;
var flags = {
    // Example: enable strict txroot header enforcement after a block height
    "txroot.enforce": function () {
        var _a;
        var env = process.env.VOID_FEATURE_TXROOT_ENFORCE || "0";
        // formats: "0" | "1" | "epoch:150000" (block height threshold)
        if (env === "0")
            return false;
        if (env === "1")
            return true;
        if (env.startsWith("epoch:")) {
            var n = Number(env.slice(6));
            var cur = Number((_a = globalThis.__void_head_number) !== null && _a !== void 0 ? _a : -1);
            return Number.isFinite(n) && Number.isFinite(cur) && cur >= n;
        }
        return false;
    }
};
function featureEnabled(name) {
    var now = Date.now();
    var f = flags[name];
    return f ? !!f(now) : false;
}
// Strict mode: throw on mismatch instead of repairing
var strictFlag = function () {
    var _a;
    var env = process.env.VOID_FEATURE_TXROOT_ENFORCE_STRICT || "0";
    if (env === "1")
        return true;
    if (env.startsWith("epoch:")) {
        var n = Number(env.slice(6));
        var cur = Number((_a = globalThis.__void_head_number) !== null && _a !== void 0 ? _a : -1);
        return Number.isFinite(n) && Number.isFinite(cur) && cur >= n;
    }
    return false;
};
Object.assign(flags, { "txroot.enforce.strict": strictFlag });
