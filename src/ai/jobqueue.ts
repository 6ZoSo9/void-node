/**
 * VOID Chain (chainId 2050) – JobQueue types.
 *
 * These types mirror docs/VOID-CHAIN-JOBQUEUE-SPEC.md and are intended
 * for use by node components, agents, and tooling.
 */

export type Hex32 = string;   // 0x-prefixed 32-byte hex string
export type Address = string; // 0x-prefixed 20-byte hex string

export enum JobStatus {
  Posted = 0,
  Claimed = 1,
  Completed = 2,
  Cancelled = 3,
  Expired = 4,
}

export interface JobId {
  value: Hex32;
}

export interface Job {
  jobId: Hex32;

  // Who posted the job
  poster: Address;

  // Namespacing / targeting
  appId: Hex32;
  modelId: Hex32;
  datasetId?: Hex32;

  // Content hashes
  inputHash: Hex32;
  optionsHash: Hex32;

  // Timing
  deadline?: number; // unix seconds or block timestamp (depends on caller)
  postedAt: number;  // unix seconds or block timestamp (documented per API)

  // Lifecycle
  status: JobStatus;
  claimedBy?: Address;
}

/**
 * Lightweight "input" object for constructing a Job *before* assigning jobId.
 */
export interface JobPostInput {
  poster: Address;
  appId: Hex32;
  modelId: Hex32;
  datasetId?: Hex32;
  inputHash: Hex32;
  optionsHash: Hex32;
  deadline?: number;
}

/**
 * Returns true if the given status is terminal.
 */
export function isTerminalStatus(status: JobStatus): boolean {
  switch (status) {
    case JobStatus.Completed:
    case JobStatus.Cancelled:
    case JobStatus.Expired:
      return true;
    default:
      return false;
  }
}

/**
 * Very small helper to normalize a 32-byte hash into a 0x-prefixed hex string.
 * We keep this intentionally lax (string-in/string-out) to avoid surprising
 * compile-time constraints.
 */
export function normalizeHex32(value: string): Hex32 {
  const v = value.trim();
  if (!v) {
    throw new Error("normalizeHex32: empty value");
  }
  const prefixed =
    v.startsWith("0x") || v.startsWith("0X")
      ? v
      : `0x${v}`;
  return prefixed.toLowerCase();
}

/**
 * Convenience: wrap an existing 32-byte hash as a JobId.
 */
export function makeJobId(value: string): JobId {
  return { value: normalizeHex32(value) };
}
