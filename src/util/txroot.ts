import { createHash } from "node:crypto";

export type TxRootResult = { root: string; leaves: string[] };

function recordTxrootCompatFallbackFailure(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_UTIL_TXROOT_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE", {
    scope,
    message,
  });
}

function sha256Hex(buf: Buffer): string {
  const h = createHash("sha256");
  h.update(buf);
  return h.digest("hex");
}

export function computeTxRoot(txs: any[]): TxRootResult {
  const EMPTY =
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  const leaves = (txs || []).map((tx) =>
    sha256Hex(Buffer.isBuffer(tx) ? tx : Buffer.from(JSON.stringify(tx)))
  );

  if (leaves.length === 0) return { root: EMPTY, leaves: [] };

  let level = leaves.slice();
  while (level.length > 1) {
    const next: string[] = [];
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
export function txRootOf(txs: any[]): any {
  return computeTxRoot(txs).root;
}

// ---------------- txroot compat alias (additive, safe) ---------------- 
// Some code paths dynamically import { txroot } from "./util/txroot.js".
// Expose a facade that defers to local helpers if they exist.

export const txroot = (...args: any[]) => {
  try {
    // @ts-ignore -- these may or may not exist in this module; we probe safely
    if (typeof computeTxRoot === 'function') { /* @ts-ignore */ return (computeTxRoot as any)(...args); }
  } catch (err) {
    recordTxrootCompatFallbackFailure("computeTxRoot-compat-probe", err);
  }
  try {
    // @ts-ignore
    if (typeof merkleRoot === 'function')   { /* @ts-ignore */ return (merkleRoot as any)(...args); }
  } catch (err) {
    recordTxrootCompatFallbackFailure("merkleRoot-compat-probe", err);
  }
  throw new Error('[txroot compat] No computeTxRoot/merkleRoot available in util/txroot.ts');
};
