"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTxRoot = computeTxRoot;
exports.txRootOf = txRootOf;
var node_crypto_1 = require("node:crypto");
function sha256Hex(buf) {
    var h = (0, node_crypto_1.createHash)("sha256");
    h.update(buf);
    return h.digest("hex");
}
function computeTxRoot(txs) {
    var _a;
    var EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    var leaves = (txs || []).map(function (tx) {
        return sha256Hex(Buffer.isBuffer(tx) ? tx : Buffer.from(JSON.stringify(tx)));
    });
    if (leaves.length === 0)
        return { root: EMPTY, leaves: [] };
    var level = leaves.slice();
    while (level.length > 1) {
        var next = [];
        for (var i = 0; i < level.length; i += 2) {
            var a = level[i];
            var b = (_a = level[i + 1]) !== null && _a !== void 0 ? _a : level[i]; // duplicate last if odd
            next.push(sha256Hex(Buffer.from(a + b, "hex")));
        }
        level = next;
    }
    return { root: level[0], leaves: leaves };
}
/**
 * Returns the root string. Typed as `any` so callers using `?.root ??`
 * (object form) or direct string form both compile without churn.
 */
function txRootOf(txs) {
    return computeTxRoot(txs).root;
}
