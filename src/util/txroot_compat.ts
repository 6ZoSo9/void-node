// Adapts to whichever symbol your txroot helper exported.
// Tries several common names, falls back to .default if it’s a function.
import * as M from "./txroot.js";

type Fn = (txs: any[]) => string;

function pickCompute(): Fn {
  const cand = (M as any);
  return (
    cand.computeTxRootHex ||
    cand.txrootHex ||
    cand.computeTxRoot ||
    cand.txrootFromTxsHex ||
    cand.txrootHexFromTxs ||
    (typeof cand.default === "function" ? cand.default : null)
  );
}

export const computeTxRootHex: Fn = (function () {
  const fn = pickCompute();
  if (!fn) {
    throw new Error("txroot_compat: no compatible compute function found in ./txroot.js");
  }
  return fn as Fn;
})();
