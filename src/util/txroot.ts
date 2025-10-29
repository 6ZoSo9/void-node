import { createHash } from "node:crypto";

/**
 * Compute a deterministic txRoot from an array of tx objects.
 * Strategy (temporary): sha256 over "\n"-joined per-tx sha256(JSON.stringify(tx)).
 * Later we can upgrade to Keccak-256 and RLP/SCALE if desired.
 */
export function computeTxRoot(txs: any[]): string {
  const h = createHash("sha256");
  for (const tx of (txs || [])) {
    const inner = createHash("sha256").update(JSON.stringify(tx)).digest();
    h.update(inner);
    h.update("\n");
  }
  return "0x" + h.digest("hex");
}
