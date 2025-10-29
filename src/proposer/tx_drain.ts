// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { txBuffer } from "../tx_buffer.js";

export type TxDrainOpts = {
  max?: number;         // max txs to include each block
  stringify?: boolean;  // keep true: block contains strings
};

export function drainTxs(opts: TxDrainOpts = {}) {
  const max = Math.min(1000, Math.max(0, opts.max ?? 100));
  if (max === 0) return [];
  const raw = txBuffer.popN(max);
  if (!opts.stringify) return raw.map(t => t.data); // in case we ever switch to objects

  // default: strings already (tx_routes stringifies), just map
  return raw.map(t => t.data as string);
}
