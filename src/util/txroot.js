import { createHash } from "node:crypto";
function sha256Hex(buf) {
    const h = createHash("sha256");
    h.update(buf);
    return h.digest("hex");
}
export function computeTxRoot(txs) {
    const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const leaves = (txs || []).map((tx) => sha256Hex(Buffer.isBuffer(tx) ? tx : Buffer.from(JSON.stringify(tx))));
    if (leaves.length === 0)
        return { root: EMPTY, leaves: [] };
    let level = leaves.slice();
    while (level.length > 1) {
        const next = [];
        for (let i = 0; i < level.length; i += 2) {
            const a = level[i];
            const b = level[i + 1] ?? level[i]; // duplicate last if odd
            next.push(sha256Hex(Buffer.from(a + b, "hex")));
        }
        level = next;
    }
    return { root: level[0], leaves };
}
/**
 * Returns the root string. Typed as `any` so callers using `?.root ??`
 * (object form) or direct string form both compile without churn.
 */
export function txRootOf(txs) {
    return computeTxRoot(txs).root;
}
// ---------------- txroot compat alias (additive, safe) ---------------- 
// Some code paths dynamically import { txroot } from "./util/txroot.js".
// Expose a facade that defers to local helpers if they exist.
export const txroot = (...args) => {
    try {
        // @ts-ignore -- these may or may not exist in this module; we probe safely
        if (typeof computeTxRoot === 'function') { /* @ts-ignore */
            return computeTxRoot(...args);
        }
    }
    catch { }
    try {
        // @ts-ignore
        if (typeof merkleRoot === 'function') { /* @ts-ignore */
            return merkleRoot(...args);
        }
    }
    catch { }
    throw new Error('[txroot compat] No computeTxRoot/merkleRoot available in util/txroot.ts');
};
