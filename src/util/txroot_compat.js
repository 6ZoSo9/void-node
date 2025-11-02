"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTxRootHex = void 0;
// Adapts to whichever symbol your txroot helper exported.
// Tries several common names, falls back to .default if it’s a function.
var M = require("./txroot.js");
function pickCompute() {
    var cand = M;
    return (cand.computeTxRootHex ||
        cand.txrootHex ||
        cand.computeTxRoot ||
        cand.txrootFromTxsHex ||
        cand.txrootHexFromTxs ||
        (typeof cand.default === "function" ? cand.default : null));
}
exports.computeTxRootHex = (function () {
    var fn = pickCompute();
    if (!fn) {
        throw new Error("txroot_compat: no compatible compute function found in ./txroot.js");
    }
    return fn;
})();
