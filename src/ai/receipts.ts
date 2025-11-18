/**
 * VOID Chain (chainId 2050) – ReceiptRegistry types.
 *
 * Mirrors docs/VOID-CHAIN-JOBQUEUE-SPEC.md and the Foundry devnet
 * ReceiptRegistry behavior.
 */

import type { Hex32, Address } from "./jobqueue";

export enum ReceiptStatus {
  Unknown = 0,
  Success = 1,
  Failed = 2,
  Partial = 3,
}

export interface Receipt {
  /**
   * Optional numeric index (e.g. from totalReceipts()-based indexing).
   * Tools can leave this undefined if not known.
   */
  index?: number;

  jobId: Hex32;
  modelId: Hex32;

  inputHash: Hex32;
  outputHash: Hex32;
  modelHash: Hex32;

  status: ReceiptStatus;
  agent: Address;

  blockTime: number;
  extraMeta?: Hex32; // hash of extra bundle / policy report / attestation
}

/**
 * Simple aggregate over a set of receipts; useful for health checks and
 * coverage metrics.
 */
export interface ReceiptSetStats {
  total: number;
  jobsTouched: number;
  perModelTotals: Record<string, number>;
  perAgentTotals: Record<string, number>;
}

/**
 * Summarize an array of receipts for basic metrics.
 *
 * This is intentionally pure and detached from any particular RPC or storage
 * layer – callers are responsible for fetching and decoding receipts; this
 * function just tallies them.
 */
export function summarizeReceipts(
  receipts: readonly Receipt[],
): ReceiptSetStats {
  const perModelTotals: Record<string, number> = Object.create(null);
  const perAgentTotals: Record<string, number> = Object.create(null);
  const jobIds = new Set<string>();

  for (const r of receipts) {
    jobIds.add(r.jobId.toLowerCase());

    const m = r.modelId.toLowerCase();
    perModelTotals[m] = (perModelTotals[m] ?? 0) + 1;

    const a = r.agent.toLowerCase();
    perAgentTotals[a] = (perAgentTotals[a] ?? 0) + 1;
  }

  return {
    total: receipts.length,
    jobsTouched: jobIds.size,
    perModelTotals,
    perAgentTotals,
  };
}
