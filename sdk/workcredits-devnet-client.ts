export const DEFAULT_WORKCREDITS_BASE_URL = "http://127.0.0.1:4312";

export interface WorkCreditsPoolResponse {
  chain: string;
  up: number;
  health?: number;
  health_5m?: number;
  pool: {
    address: string;
    rpcUrl: string;
  };
  reserves: {
    void_raw: number;
    wc_raw: number;
    void: number;
    wc: number;
  };
  price: {
    wc_per_void: number;
    void_per_wc: number;
  };
}

export interface WorkCreditsAccountResponse {
  chain: string;
  address: string;
  up: number;
  balances: {
    void_raw: string;
    wc_raw: string;
    lp_raw: string;
    void: number;
    wc: number;
    lp: number;
  };
  earnings: {
    pending_wc_raw: string;
    pending_wc: number;
  };
  meta?: {
    pool_address?: string;
    workcredits_token?: string;
    rpc_url?: string;
    state_json?: string;
    broadcast_file?: string;
    updated_at?: number;
    [key: string]: unknown;
  };
}

/**
 * Normalise base URL so we can safely append paths.
 */
function normaliseBaseUrl(baseUrl: string): string {
  if (!baseUrl) return DEFAULT_WORKCREDITS_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

/**
 * Fetches the WC/VOID pool state from the devnet helper.
 */
export async function fetchWorkCreditsPool(
  baseUrl: string = DEFAULT_WORKCREDITS_BASE_URL
): Promise<WorkCreditsPoolResponse> {
  const root = normaliseBaseUrl(baseUrl);
  const url = root + "/workcredits/devnet/pool.json";

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `fetchWorkCreditsPool: HTTP ${res.status} ${res.statusText} for ${url}`
    );
  }

  const json = (await res.json()) as WorkCreditsPoolResponse;
  return json;
}

/**
 * Very basic address check – just enough for devnet UI / demos.
 */
function assertHexAddress(addr: string): void {
  if (typeof addr !== "string" || !addr.startsWith("0x") || addr.length < 10) {
    throw new Error(
      `fetchWorkCreditsAccount: expected 0x-prefixed address, got "${addr}"`
    );
  }
}

/**
 * Fetches balances + pending WC for a single address from the devnet helper.
 */
export async function fetchWorkCreditsAccount(
  address: string,
  baseUrl: string = DEFAULT_WORKCREDITS_BASE_URL
): Promise<WorkCreditsAccountResponse> {
  assertHexAddress(address);

  const root = normaliseBaseUrl(baseUrl);
  const path = `/workcredits/devnet/account/${address}.json`;
  const url = root + path;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `fetchWorkCreditsAccount: HTTP ${res.status} ${res.statusText} for ${url}`
    );
  }

  const json = (await res.json()) as WorkCreditsAccountResponse;
  return json;
}

/**
 * Small helper: returns true if helper + pool look healthy.
 */
export function isWorkCreditsPoolHealthy(
  pool: WorkCreditsPoolResponse
): boolean {
  if (!pool) return false;
  if (pool.up !== 1) return false;
  if (pool.health !== undefined && pool.health !== 1) return false;
  if (pool.health_5m !== undefined && pool.health_5m !== 1) return false;
  if (!pool.reserves) return false;
  if (pool.reserves.void <= 0 || pool.reserves.wc <= 0) return false;
  if (pool.price.wc_per_void <= 0 || pool.price.void_per_wc <= 0) return false;
  return true;
}
