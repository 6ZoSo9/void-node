export interface WorkCreditsPool {
  // Flexible bag of fields from /workcredits/devnet/pool.json
  [key: string]: any;
}

export interface WorkCreditsAccount {
  // Flexible bag of fields from /workcredits/devnet/account/<addr>.json
  [key: string]: any;
}

export interface WorkCreditsDashboardResponse {
  pool: WorkCreditsPool;
  account: WorkCreditsAccount;
}

// Devnet-only base path for the helper, proxied by Vite to 4312
const DEVNET_BASE_PATH = "/workcredits/devnet";

export async function fetchWorkCreditsDashboard(
  address: string
): Promise<WorkCreditsDashboardResponse> {
  const normalized = address.trim();

  if (!normalized) {
    throw new Error("Address is required");
  }

  const url = `${DEVNET_BASE_PATH}/dashboard/${normalized}.json`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const detail = body || res.statusText;
    throw new Error(`WorkCredits devnet HTTP ${res.status}: ${detail}`);
  }

  const json = await res.json();
	// __WC_DASH_FORCE_POOL_OBJECT_DEVNETAPI_V1__
	// Helper response shapes vary:
	// - `poolState` contains reserves/price (new)
	// - `pool` may be an address string (old) OR an object (older UI)
	// We force `json.pool` to be an object (prefer poolState), and preserve any string as `poolAddress`.
	try {
		const anyJson: any = json as any;
		const poolState = (anyJson.poolState && typeof anyJson.poolState === "object") ? anyJson.poolState : null;
		const poolObj = (anyJson.pool && typeof anyJson.pool === "object") ? anyJson.pool : null;

		if (typeof anyJson.pool === "string" && !anyJson.poolAddress) {
			anyJson.poolAddress = anyJson.pool;
		}

		anyJson.pool = poolState || poolObj || {};

		// Normalize balances: sometimes top-level `balances`, sometimes `account.balances`
		if (anyJson.balances && typeof anyJson.balances === "object") {
			anyJson.account = (anyJson.account && typeof anyJson.account === "object") ? anyJson.account : {};
			anyJson.account.balances = anyJson.balances;
		} else {
			anyJson.account = (anyJson.account && typeof anyJson.account === "object") ? anyJson.account : {};
			anyJson.account.balances = (anyJson.account.balances && typeof anyJson.account.balances === "object") ? anyJson.account.balances : {};
		}
	} catch (e) {
		// best-effort only; UI will fall back to zeros
	}

	// __WC_DASH_NORMALIZE_POOLSTATE_DEVNETAPI_V2__
	// Normalize helper response shapes:
	// - new: { poolState, balances, ... }
	// - old: { pool, account: { balances } }
	try {
		const any = json as any;
		if (any && typeof any === "object") {
			const ps = any.poolState;
			if (!any.pool && ps && typeof ps === "object") any.pool = ps;

			if (!any.account || typeof any.account !== "object") any.account = {};

			// helper returns balances at top-level
			if (any.balances && typeof any.balances === "object" && !any.account.balances) {
				any.account.balances = any.balances;
			}

			// optional: surface poolState.meta (rpc_url, etc.) to places that look at account.meta
			if (ps && typeof ps === "object" && ps.meta && typeof ps.meta === "object" && !any.account.meta) {
				any.account.meta = ps.meta;
			}
		}
	} catch (_e) {}

  if (!json || typeof json !== "object") {
    throw new Error("Invalid JSON from WorkCredits devnet dashboard");
  }

  return json as WorkCreditsDashboardResponse;
}
