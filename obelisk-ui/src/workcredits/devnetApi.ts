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
  if (!json || typeof json !== "object") {
    throw new Error("Invalid JSON from WorkCredits devnet dashboard");
  }

  return json as WorkCreditsDashboardResponse;
}
