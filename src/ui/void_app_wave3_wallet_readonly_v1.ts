import "./void_app_wave4_earn_readonly_v1.js";
import * as os from "node:os";

const G: any = globalThis as any;
const MARK = "__void_ui_wave3_wallet_readonly_v1";
const ROUTE_MARKER = "VOID_UI_WAVE3_WALLET_READONLY_V1";
const WALLET_ROUTE = "/__void/ui/wave3/wallet.json";
const STATUS_ROUTE = "/__void/ui/wave3-wallet-v1/status.json";
const ACCOUNT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
export const VOID_UI_WAVE3_WALLET_SOURCE_MAX_RESPONSE_BYTES_V1 = 128 * 1024;
export const VOID_UI_WAVE3_WALLET_SOURCE_TIMEOUT_MS_V1 = 3000;
export const VOID_UI_WAVE3_WALLET_SOURCE_TEARDOWN_MS_V1 = 250;

type SourceResult = {
  ok: boolean;
  status: number;
  body: unknown;
  error?: string;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type SourceFetchOptions = {
  timeoutMs?: number;
  fetchImpl?: FetchLike;
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

export function walletFiniteNumberV1(raw: unknown): number | null {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

export function walletNonNegativeSafeIntegerV1(raw: unknown): number | null {
  return (
    typeof raw === "number" &&
    Number.isSafeInteger(raw) &&
    raw >= 0
  )
    ? raw
    : null;
}

function walletNonNegativeFiniteNumberV1(raw: unknown): number | null {
  const value = walletFiniteNumberV1(raw);
  return value !== null && value >= 0 ? value : null;
}

function displayNumber(raw: number | null): string {
  if (raw === null) return "—";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 9,
  }).format(raw);
}

function sourceDeadlineErrorV1(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error("wallet_source_deadline_exceeded");
}

type WalletStreamReadResultV1 = Awaited<
  ReturnType<ReadableStreamDefaultReader<Uint8Array>["read"]>
>;

async function readWithinSignalV1(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<WalletStreamReadResultV1> {
  if (signal.aborted) throw sourceDeadlineErrorV1(signal);
  return await new Promise<WalletStreamReadResultV1>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      fn();
    };
    const onAbort = (): void => finish(() => reject(sourceDeadlineErrorV1(signal)));
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve()
      .then(() => reader.read())
      .then(
        (value) => finish(() => resolve(value)),
        (error) => finish(() => reject(error)),
      );
  });
}

async function awaitTeardownBoundedV1(
  action: () => Promise<unknown>,
): Promise<void> {
  let pending: Promise<unknown>;
  try {
    pending = Promise.resolve(action());
  } catch {
    return;
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      pending.then(() => undefined, () => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(
          resolve,
          VOID_UI_WAVE3_WALLET_SOURCE_TEARDOWN_MS_V1,
        );
      }),
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

function declaredLengthV1(response: Response): number | null {
  const raw = response.headers.get("content-length");
  if (raw === null) return null;
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) {
    throw new Error("wallet_source_content_length_invalid");
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("wallet_source_content_length_invalid");
  }
  return parsed;
}

export async function readVoidUiWave3WalletBoundedTextV1(
  response: Response,
  signal: AbortSignal,
): Promise<string> {
  const declared = declaredLengthV1(response);
  if (
    declared !== null &&
    declared > VOID_UI_WAVE3_WALLET_SOURCE_MAX_RESPONSE_BYTES_V1
  ) {
    if (response.body) {
      await awaitTeardownBoundedV1(() =>
        response.body!.cancel("wallet_source_body_too_large")
      );
    }
    throw new Error("wallet_source_body_too_large");
  }
  if (!response.body || typeof response.body.getReader !== "function") {
    throw new Error("wallet_source_body_not_stream_readable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let text = "";
  let cancellationAttempted = false;

  const cancel = async (reason: unknown): Promise<void> => {
    if (cancellationAttempted) return;
    cancellationAttempted = true;
    await awaitTeardownBoundedV1(() => reader.cancel(reason));
  };

  try {
    while (true) {
      const { done, value } = await readWithinSignalV1(reader, signal);
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        throw new Error("wallet_source_body_chunk_invalid");
      }
      total += value.byteLength;
      if (total > VOID_UI_WAVE3_WALLET_SOURCE_MAX_RESPONSE_BYTES_V1) {
        throw new Error("wallet_source_body_too_large");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } catch (error) {
    await cancel(error);
    throw error;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Cleanup never upgrades source evidence.
    }
  }
}

export async function fetchVoidUiWave3WalletSourceJsonV1(
  base: string,
  route: string,
  options: SourceFetchOptions = {},
): Promise<SourceResult> {
  const target = new URL(route, base.endsWith("/") ? base : `${base}/`).href;
  const controller = new AbortController();
  const timeoutMs =
    Number.isSafeInteger(options.timeoutMs) &&
    Number(options.timeoutMs) > 0
      ? Number(options.timeoutMs)
      : VOID_UI_WAVE3_WALLET_SOURCE_TIMEOUT_MS_V1;
  const timer = setTimeout(
    () => controller.abort(new Error("wallet_source_deadline_exceeded")),
    timeoutMs,
  );
  timer.unref?.();
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(target, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "void-ui-wave3-wallet-readonly-v1",
        "Cache-Control": "no-store",
      },
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });

    if (response.url !== target) {
      if (response.body) {
        await awaitTeardownBoundedV1(() =>
          response.body!.cancel("wallet_source_final_url_mismatch")
        );
      }
      throw new Error("wallet_source_final_url_mismatch");
    }

    const text = await readVoidUiWave3WalletBoundedTextV1(
      response,
      controller.signal,
    );
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: null,
      error: error instanceof Error ? error.message : String(error),
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
    fetchVoidUiWave3WalletSourceJsonV1(
      base,
      `/__void/participant/wallet/status?account=${encoded}`
    ),
    fetchVoidUiWave3WalletSourceJsonV1(base, `/wc/balance?account=${encoded}`),
    fetchVoidUiWave3WalletSourceJsonV1(base, `/wc/production/balance?account=${encoded}`),
  ]);

  const walletBody = objectBody(walletSource);
  const ledgerBody = objectBody(ledgerSource);
  const productionBody = objectBody(productionSource);

  const walletShapeValid =
    walletSource.status === 200 &&
    walletBody.ok === true &&
    typeof walletBody.has_wallet === "boolean" &&
    typeof walletBody.unlocked === "boolean";
  const walletAddress =
    walletShapeValid && walletBody.has_wallet === true
      ? validAddress(walletBody.address)
      : "";
  const walletUnlocked =
    walletShapeValid &&
    walletBody.has_wallet === true &&
    walletAddress.length > 0 &&
    walletBody.unlocked === true &&
    validAddress(walletBody.unlocked_address) === walletAddress;
  const walletStateValid =
    walletShapeValid &&
    (
      walletBody.has_wallet === false
        ? walletBody.unlocked === false
        : walletAddress.length > 0 &&
          (walletBody.unlocked === false || walletUnlocked)
    );

  const ledgerBalanceCandidate =
    ledgerSource.status === 200 && ledgerBody.ok === true
      ? walletNonNegativeFiniteNumberV1(ledgerBody.balance)
      : null;
  const ledgerCountCandidate =
    ledgerSource.status === 200 && ledgerBody.ok === true
      ? walletNonNegativeSafeIntegerV1(ledgerBody.count)
      : null;
  const ledgerAvailable =
    ledgerBalanceCandidate !== null && ledgerCountCandidate !== null;
  const ledgerBalance = ledgerAvailable ? ledgerBalanceCandidate : null;
  const ledgerCount = ledgerAvailable ? ledgerCountCandidate : null;

  const productionBalanceCandidate =
    productionSource.status === 200 &&
    productionBody.ok === true &&
    productionBody.marker === "VOID_WC_PRODUCTION_BALANCE_V1"
      ? walletNonNegativeFiniteNumberV1(productionBody.balance)
      : null;
  const productionCountCandidate =
    productionSource.status === 200 &&
    productionBody.ok === true &&
    productionBody.marker === "VOID_WC_PRODUCTION_BALANCE_V1"
      ? walletNonNegativeSafeIntegerV1(productionBody.count)
      : null;
  const productionAvailable =
    productionBalanceCandidate !== null &&
    productionCountCandidate !== null;
  const productionBalance =
    productionAvailable ? productionBalanceCandidate : null;
  const productionCount =
    productionAvailable ? productionCountCandidate : null;

  const nativeGas =
    walletStateValid &&
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
      source_available: walletStateValid,
      has_wallet: walletStateValid && walletBody.has_wallet === true,
      address: walletStateValid ? walletAddress : "",
      unlocked: walletStateValid && walletUnlocked,
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
        entries: ledgerCount,
        label: "Ledger WC",
        spendable_claimed: false,
      },
      production_wc: {
        available: productionBalance !== null,
        balance: productionBalance,
        display: displayNumber(productionBalance),
        entries: productionCount,
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
