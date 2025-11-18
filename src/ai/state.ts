// src/ai/state.ts
//
// Minimal runtime loader for VOID devnet protocol state.
// Zero external deps; sync; designed for use by agent runtimes and scripts.

import { readFileSync } from "fs";
import { resolve } from "path";

export const VOID_DEFAULT_CHAIN_ID = 2050;

export interface VoidDevnetState {
  chainId: number;
  adminGate: string;
  modelRegistry: string;
  datasetRegistry: string;
  jobQueue: string;
  receiptRegistry: string;
  agentRegistry: string;
  /**
   * Full raw JSON from the STATE file for future/ext fields.
   */
  raw: Record<string, unknown>;
}

type ExpectedType = "number" | "string";

function requireField(
  obj: unknown,
  key: string,
  expectedType: ExpectedType
): any {
  if (obj === null || typeof obj !== "object") {
    throw new Error(`VOID devnet STATE is not an object (key="${key}")`);
  }

  const anyObj = obj as Record<string, unknown>;

  if (!(key in anyObj)) {
    throw new Error(`VOID devnet STATE missing required field "${key}"`);
  }

  const value = anyObj[key];

  if (typeof value !== expectedType) {
    throw new Error(
      `VOID devnet STATE field "${key}" must be a ${expectedType}, got ${typeof value}`
    );
  }

  return value;
}

/**
 * Some STATE fields may be stored either as:
 *   "ModelRegistry": "0x...."
 * or:
 *   "ModelRegistry": { "address": "0x....", ... }
 *
 * This helper normalizes both into a plain address string.
 */
function requireAddressField(obj: unknown, key: string): string {
  if (obj === null || typeof obj !== "object") {
    throw new Error(`VOID devnet STATE is not an object (key="${key}")`);
  }

  const anyObj = obj as Record<string, unknown>;

  if (!(key in anyObj)) {
    throw new Error(`VOID devnet STATE missing required field "${key}"`);
  }

  const value = anyObj[key];

  // Case 1: already a string address
  if (typeof value === "string") {
    if (!value.trim()) {
      throw new Error(
        `VOID devnet STATE field "${key}" is an empty string (expected address)`
      );
    }
    return value;
  }

  // Case 2: object with .address
  if (value !== null && typeof value === "object") {
    const inner = value as Record<string, unknown>;
    const addr = inner["address"];
    if (typeof addr === "string" && addr.trim().length > 0) {
      return addr;
    }
    throw new Error(
      `VOID devnet STATE field "${key}" is object without valid "address" string`
    );
  }

  throw new Error(
    `VOID devnet STATE field "${key}" must be a string or object{address}, got ${typeof value}`
  );
}

export interface LoadStateOptions {
  /**
   * Explicit path to the state file. May be absolute or relative to `cwd`.
   * If not provided, we fall back to env var or default.
   */
  statePath?: string;

  /**
   * Working directory used to resolve relative paths.
   * Defaults to `process.cwd()`.
   */
  cwd?: string;

  /**
   * Environment variable name that can override the state path.
   * Defaults to "STATE_FILE".
   */
  envVar?: string;

  /**
   * If provided, enforce that `chainId` in the file matches this.
   * If omitted, we enforce VOID_DEFAULT_CHAIN_ID instead.
   */
  expectedChainId?: number;
}

const DEFAULT_STATE_ENV = "STATE_FILE";
const DEFAULT_STATE_REL_PATH = "docs/VOID-DEVNET-PROTOCOL-STATE.json";

function resolveStatePath(opts: LoadStateOptions = {}): string {
  const cwd = opts.cwd ?? process.cwd();
  const envVar = opts.envVar ?? DEFAULT_STATE_ENV;

  const envPath = process.env[envVar];
  if (envPath && envPath.trim().length > 0) {
    return resolve(cwd, envPath);
  }

  if (opts.statePath && opts.statePath.trim().length > 0) {
    return resolve(cwd, opts.statePath);
  }

  return resolve(cwd, DEFAULT_STATE_REL_PATH);
}

/**
 * Synchronously load and validate the VOID devnet protocol STATE file.
 *
 * Typical usage (inside scripts / agent runtimes):
 *
 *   const state = loadVoidDevnetState();
 *   console.log(state.jobQueue, state.receiptRegistry);
 */
export function loadVoidDevnetState(
  opts: LoadStateOptions = {}
): VoidDevnetState {
  const path = resolveStatePath(opts);

  let rawText: string;
  try {
    rawText = readFileSync(path, "utf8");
  } catch (err: any) {
    throw new Error(
      `Failed to read VOID devnet STATE file at "${path}": ${err?.message ?? String(
        err
      )}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err: any) {
    throw new Error(
      `Failed to parse VOID devnet STATE JSON at "${path}": ${err?.message ?? String(
        err
      )}`
    );
  }

  const chainId = requireField(parsed, "chainId", "number") as number;
  const expectedChainId = opts.expectedChainId ?? VOID_DEFAULT_CHAIN_ID;

  if (chainId !== expectedChainId) {
    throw new Error(
      `VOID devnet STATE chainId mismatch: expected ${expectedChainId}, got ${chainId}`
    );
  }

  const adminGate = requireAddressField(parsed, "AdminGate");
  const modelRegistry = requireAddressField(parsed, "ModelRegistry");
  const datasetRegistry = requireAddressField(parsed, "DatasetRegistry");
  const jobQueue = requireAddressField(parsed, "JobQueue");
  const receiptRegistry = requireAddressField(parsed, "ReceiptRegistry");
  const agentRegistry = requireAddressField(parsed, "AgentRegistry");

  return {
    chainId,
    adminGate,
    modelRegistry,
    datasetRegistry,
    jobQueue,
    receiptRegistry,
    agentRegistry,
    raw: parsed as Record<string, unknown>,
  };
}
