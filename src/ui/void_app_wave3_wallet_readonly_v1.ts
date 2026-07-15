import "./void_app_wave4_earn_readonly_v1.js";
import * as os from "node:os";

const G: any = globalThis as any;
const MARK = "__void_ui_wave3_wallet_readonly_v1";
const ROUTE_MARKER = "VOID_UI_WAVE3_WALLET_READONLY_V1";
const WALLET_ROUTE = "/__void/ui/wave3/wallet.json";
const STATUS_ROUTE = "/__void/ui/wave3-wallet-v1/status.json";
const ACCOUNT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

type SourceResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

function isLoopbackRequest(req: any): boolean {
  const values = [
    req?.ip,
    req?.socket?.remoteAddress,
    req?.connection?.remoteAddress,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  return values.some(
    (value) =>
      value === "127.0.0.1" ||
      value === "::1" ||
      value === "::ffff:127.0.0.1" ||
      value === "localhost"
  );
}

function sendJson(req: any, res: any, code: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value));

  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
    "cache-control": "no-store",
  });

  if (String(req?.method || "GET").toUpperCase() === "HEAD") {
    res.end();
    return;
  }

  res.end(body);
}

function sourceBase(): string {
  const port = Math.max(
    1,
    Math.min(65535, Number(process.env.HTTP_PORT || 4100) || 4100)
  );

  return `http://127.0.0.1:${port}`;
}

function accountId(raw: unknown): string | null {
  const value = String(raw || "").trim();

  if (!ACCOUNT_PATTERN.test(value)) return null;

  return value;
}

function validAddress(raw: unknown): string {
  const value = String(raw || "").trim();

  return /^0x[a-fA-F0-9]{40}$/.test(value) ? value : "";
}

function finiteNumber(raw: unknown): number | null {
  const value = Number(raw);

  return Number.isFinite(value) ? value : null;
}

function displayNumber(raw: number | null): string {
  if (raw === null) return "—";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 9,
  }).format(raw);
}

async function fetchJson(base: string, route: string): Promise<SourceResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(base + route, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "void-ui-wave3-wallet-readonly-v1",
        "Cache-Control": "no-store",
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let body: unknown = null;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      body: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

function objectBody(source: SourceResult): Record<string, unknown> {
  return source.body !== null &&
    typeof source.body === "object" &&
    !Array.isArray(source.body)
    ? (source.body as Record<string, unknown>)
    : {};
}

function nodeIdentity(): {
  hostname: string;
  label: string;
  role: "precision" | "nimo" | "alienware" | "local";
} {
  const hostname = os.hostname();

  if (/precision/i.test(hostname)) {
    return { hostname, label: "Precision", role: "precision" };
  }

  if (/n153b|nimo/i.test(hostname)) {
    return { hostname, label: "Nimo", role: "nimo" };
  }

  if (/alienware/i.test(hostname)) {
    return { hostname, label: "Alienware", role: "alienware" };
  }

  return { hostname, label: hostname || "Local node", role: "local" };
}

async function buildSnapshot(account: string): Promise<Record<string, unknown>> {
  const base = sourceBase();
  const encoded = encodeURIComponent(account);

  const [walletSource, ledgerSource, productionSource] = await Promise.all([
    fetchJson(
      base,
      `/__void/participant/wallet/status?account=${encoded}`
    ),
    fetchJson(base, `/wc/balance?account=${encoded}`),
    fetchJson(base, `/wc/production/balance?account=${encoded}`),
  ]);

  const walletBody = objectBody(walletSource);
  const ledgerBody = objectBody(ledgerSource);
  const productionBody = objectBody(productionSource);

  const walletAddress =
    walletBody.has_wallet === true ? validAddress(walletBody.address) : "";

  const ledgerBalance =
    ledgerSource.status === 200 && ledgerBody.ok === true
      ? finiteNumber(ledgerBody.balance)
      : null;

  const productionBalance =
    productionSource.status === 200 &&
    productionBody.ok === true &&
    productionBody.marker === "VOID_WC_PRODUCTION_BALANCE_V1"
      ? finiteNumber(productionBody.balance)
      : null;

  const nativeGas =
    walletSource.status === 200 &&
    walletBody.ok === true &&
    typeof walletBody.native_gas === "string" &&
    walletBody.native_gas.length > 0
      ? walletBody.native_gas
      : null;

  return {
    ok: true,
    marker: ROUTE_MARKER,
    generated_at: new Date().toISOString(),
    read_only: true,
    network_name: "Mainnet-0",
    source_base: base,
    node: nodeIdentity(),
    account: {
      selected: true,
      id: account,
      label: account,
    },
    wallet: {
      source_available: walletSource.status === 200 && walletBody.ok === true,
      has_wallet: walletBody.has_wallet === true,
      address: walletAddress,
      unlocked:
        walletBody.unlocked === true &&
        validAddress(walletBody.unlocked_address) === walletAddress &&
        walletAddress.length > 0,
      native_gas_available: nativeGas !== null,
      native_gas_display: nativeGas ?? "—",
      source: "participant_wallet_native_v1",
    },
    balances: {
      void: {
        available: false,
        display: "—",
        reason:
          "No read-only VOID token balance source is connected to Wave 3.",
      },
      ledger_wc: {
        available: ledgerBalance !== null,
        balance: ledgerBalance,
        display: displayNumber(ledgerBalance),
        entries:
          ledgerBalance !== null ? finiteNumber(ledgerBody.count) ?? 0 : 0,
        label: "Ledger WC",
        spendable_claimed: false,
      },
      production_wc: {
        available: productionBalance !== null,
        balance: productionBalance,
        display: displayNumber(productionBalance),
        entries:
          productionBalance !== null
            ? finiteNumber(productionBody.count) ?? 0
            : 0,
        label: "Production WC",
        ledger_version:
          productionBalance !== null
            ? String(productionBody.ledger_version || "")
            : "",
        spendable: false,
        redeemable: false,
        transferable: false,
        included_in_legacy_balance: false,
      },
    },
    sources: {
      wallet_status: {
        route: "/__void/participant/wallet/status",
        ok: walletSource.ok,
        status: walletSource.status,
      },
      ledger_wc: {
        route: "/wc/balance",
        ok: ledgerSource.ok,
        status: ledgerSource.status,
      },
      production_wc: {
        route: "/wc/production/balance",
        ok: productionSource.ok,
        status: productionSource.status,
      },
    },
    boundaries: {
      browser_wallet_connection: false,
      wallet_create: false,
      wallet_import: false,
      wallet_unlock: false,
      wallet_export: false,
      wallet_send: false,
      wc_to_void: false,
      ledger_write: false,
      validator_mutation: false,
      operator_mutation: false,
      money_movement: false,
    },
  };
}

function install(app: any): boolean {
  if (!app || typeof app.all !== "function") return false;
  if (G[MARK]) return true;

  G[MARK] = true;

  app.all(WALLET_ROUTE, async (req: any, res: any) => {
    if (!isLoopbackRequest(req)) {
      sendJson(req, res, 404, { ok: false, error: "not_found" });
      return;
    }

    const method = String(req?.method || "GET").toUpperCase();

    if (method !== "GET" && method !== "HEAD") {
      sendJson(req, res, 405, {
        ok: false,
        error: "method_not_allowed",
        allowed: ["GET", "HEAD"],
      });
      return;
    }

    const account = accountId(req?.query?.account);

    if (!account) {
      sendJson(req, res, 400, {
        ok: false,
        error: "missing_or_invalid_account_id",
        account_rule: "^[A-Za-z0-9._:-]{1,128}$",
      });
      return;
    }

    sendJson(req, res, 200, await buildSnapshot(account));
  });

  app.all(STATUS_ROUTE, (req: any, res: any) => {
    if (!isLoopbackRequest(req)) {
      sendJson(req, res, 404, { ok: false, error: "not_found" });
      return;
    }

    const method = String(req?.method || "GET").toUpperCase();

    if (method !== "GET" && method !== "HEAD") {
      sendJson(req, res, 405, {
        ok: false,
        error: "method_not_allowed",
        allowed: ["GET", "HEAD"],
      });
      return;
    }

    sendJson(req, res, 200, {
      ok: true,
      marker: ROUTE_MARKER,
      route: WALLET_ROUTE,
      status_route: STATUS_ROUTE,
      loopback_only: true,
      methods: ["GET", "HEAD"],
      account_rule: "^[A-Za-z0-9._:-]{1,128}$",
      exact_source_routes: [
        "/__void/participant/wallet/status",
        "/wc/balance",
        "/wc/production/balance",
      ],
      sanitized_source_bodies: true,
      wallet_connection: false,
      wallet_mutation: false,
      ledger_write: false,
      money_movement: false,
    });
  });

  console.log(
    "[void-app-wave3-wallet-readonly.v1] mounted " +
      `${WALLET_ROUTE} loopback-only`
  );

  return true;
}

(function mountVoidAppWave3WalletReadonlyV1() {
  const tryInstall = (): void => {
    try {
      const app = G.__void_http_app;

      if (install(app)) return;
    } catch {
      // The bounded retry keeps this read-only surface additive during startup.
    }

    setTimeout(tryInstall, 250).unref?.();
  };

  tryInstall();
})();

export {};
