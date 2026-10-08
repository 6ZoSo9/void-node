import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_UI_WAVE3_WALLET_SOURCE_MAX_RESPONSE_BYTES_V1,
  fetchVoidUiWave3WalletSourceJsonV1,
  walletAccountIdV1,
  walletFiniteNumberV1,
  walletNativeGasDisplayV1,
  walletNonNegativeSafeIntegerV1,
} from "../src/ui/void_app_wave3_wallet_readonly_v1.js";
import {
  WALLET_SNAPSHOT_MAX_AGE_MS,
  WALLET_SNAPSHOT_MAX_FUTURE_SKEW_MS,
  bindWalletViewV1,
  clearWalletViewV1,
  loadWalletAccountV1,
  renderWalletErrorV1,
  renderWalletLoadingV1,
  renderWalletV1,
  validateWalletSnapshotV1,
} from "../public/void-app-wave1-v1/assets/js/wallet-live.js";

const root = process.cwd();
const encoder = new TextEncoder();
const sourcePath = "src/ui/void_app_wave3_wallet_readonly_v1.ts";
const clientPath = "public/void-app-wave1-v1/assets/js/wallet-live.js";
const wave2ManifestPath = "docs/public/void-ui-wave2-home-readonly-v1/source-manifest.json";
const wave3ManifestPath = "docs/public/void-ui-wave3-wallet-readonly-v1/source-manifest.json";
const wave4ManifestPath = "docs/public/void-ui-wave4-earn-readonly-v1/source-manifest.json";
const PROOF_NOW_MS = Date.parse("2026-09-29T12:00:00.000Z");
const PROOF_NOW = new Date(PROOF_NOW_MS).toISOString();

const sha256File = (relative: string): string =>
  createHash("sha256")
    .update(fs.readFileSync(path.join(root, relative)))
    .digest("hex");

const responseAt = (
  url: string,
  body: BodyInit | null,
  init: ResponseInit = {},
): Response => {
  const response = new Response(body, init);
  Object.defineProperty(response, "url", { value: url, configurable: true });
  return response;
};

const validSnapshot = (
  account = "account-A",
  generatedAt = PROOF_NOW,
) => ({
  ok: true,
  marker: "VOID_UI_WAVE3_WALLET_READONLY_V1",
  generated_at: generatedAt,
  read_only: true,
  network_name: "Mainnet-0",
  source_base: "http://127.0.0.1:4100",
  node: {
    hostname: "proof-node",
    label: "Local node",
    role: "local",
  },
  account: {
    selected: true,
    id: account,
    label: account,
  },
  wallet: {
    source_available: true,
    has_wallet: true,
    address: "0x" + "a".repeat(40),
    unlocked: false,
    native_gas_available: true,
    native_gas_display: "1",
    source: "participant_wallet_native_v1",
  },
  balances: {
    void: {
      available: false,
      display: "—",
      reason: "No read-only VOID token balance source is connected to Wave 3.",
    },
    ledger_wc: {
      available: true,
      balance: 3,
      display: "3",
      entries: 2,
      label: "Ledger WC",
      spendable_claimed: false,
    },
    production_wc: {
      available: true,
      balance: 1.5,
      display: "1.5",
      entries: 1,
      label: "Production WC",
      ledger_version: "v1",
      spendable: false,
      redeemable: false,
      transferable: false,
      included_in_legacy_balance: false,
    },
  },
  sources: {
    wallet_status: {
      route: "/__void/participant/wallet/status",
      ok: true,
      status: 200,
    },
    ledger_wc: {
      route: "/wc/balance",
      ok: true,
      status: 200,
    },
    production_wc: {
      route: "/wc/production/balance",
      ok: true,
      status: 200,
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
});

const validateWalletAt = (
  snapshot: ReturnType<typeof validSnapshot>,
  expectedAccount = "account-A",
  requestStartedAtMs = PROOF_NOW_MS,
  evaluatedAtMs = requestStartedAtMs,
) => validateWalletSnapshotV1(snapshot, expectedAccount, {
  requestStartedAtMs,
  evaluatedAtMs,
});

for (const wrong of [null, true, false, "", "0", "3", [], {}]) {
  assert.equal(walletFiniteNumberV1(wrong), null);
}
assert.equal(walletFiniteNumberV1(0), 0);
assert.equal(walletFiniteNumberV1(1.25), 1.25);
assert.equal(walletFiniteNumberV1(Number.NaN), null);
assert.equal(walletFiniteNumberV1(Number.POSITIVE_INFINITY), null);

for (const wrong of [null, true, "0", -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
  assert.equal(walletNonNegativeSafeIntegerV1(wrong), null);
}
assert.equal(walletNonNegativeSafeIntegerV1(0), 0);
assert.equal(walletNonNegativeSafeIntegerV1(42), 42);

for (const invalidNativeGas of [
  null,
  undefined,
  0,
  "unlimited",
  "1 ETH",
  "+1",
  "-1",
  "1e3",
  "1,000",
  "01",
  ".5",
  "1.",
  "0." + "1".repeat(19),
]) {
  assert.equal(walletNativeGasDisplayV1(invalidNativeGas), null);
}
for (const validNativeGas of [
  "0",
  "0.0",
  "1",
  "1.0",
  "0.500000000",
  "1." + "0".repeat(18),
]) {
  assert.equal(walletNativeGasDisplayV1(validNativeGas), validNativeGas);
}

for (const wrong of [
  null,
  undefined,
  true,
  false,
  0,
  42,
  ["account-A"],
  ["account-A", "account-B"],
  { account: "account-A" },
  "",
  " ",
  "a".repeat(129),
  "account A",
]) {
  assert.equal(walletAccountIdV1(wrong), null);
}
assert.equal(walletAccountIdV1("a"), "a");
assert.equal(walletAccountIdV1("a".repeat(128)), "a".repeat(128));
assert.equal(walletAccountIdV1(" account-A "), "account-A");

const target = "http://127.0.0.1:4100/wc/balance?account=account-A";
let observedRedirect: RequestRedirect | undefined;
let observedCredentials: RequestCredentials | undefined;
let observedReferrer: ReferrerPolicy | undefined;
const payload = JSON.stringify({ ok: true, balance: 3, count: 1 });
const nominal = await fetchVoidUiWave3WalletSourceJsonV1(
  "http://127.0.0.1:4100",
  "/wc/balance?account=account-A",
  {
    fetchImpl: async (_input, init) => {
      observedRedirect = init?.redirect;
      observedCredentials = init?.credentials;
      observedReferrer = init?.referrerPolicy;
      return responseAt(target, payload, {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(payload)),
        },
      });
    },
  },
);
assert.equal(nominal.ok, true);
assert.deepEqual(nominal.body, { ok: true, balance: 3, count: 1 });
assert.equal(observedRedirect, "error");
assert.equal(observedCredentials, "omit");
assert.equal(observedReferrer, "no-referrer");

let redirectCancelled = false;
const wrongUrl = await fetchVoidUiWave3WalletSourceJsonV1(
  "http://127.0.0.1:4100",
  "/wc/balance?account=account-A",
  {
    fetchImpl: async () =>
      responseAt(
        "http://127.0.0.1:4100/unexpected",
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(payload));
          },
          cancel() {
            redirectCancelled = true;
          },
        }),
        { status: 200 },
      ),
  },
);
assert.equal(wrongUrl.ok, false);
assert.equal(wrongUrl.error, "wallet_source_final_url_mismatch");
assert.equal(redirectCancelled, true);

let declaredReads = 0;
let declaredCancelled = false;
const declaredOversize = await fetchVoidUiWave3WalletSourceJsonV1(
  "http://127.0.0.1:4100",
  "/wc/balance?account=account-A",
  {
    fetchImpl: async () =>
      ({
        url: target,
        ok: true,
        status: 200,
        headers: new Headers({
          "content-length": String(
            VOID_UI_WAVE3_WALLET_SOURCE_MAX_RESPONSE_BYTES_V1 + 1,
          ),
        }),
        body: {
          getReader() {
            declaredReads += 1;
            throw new Error("declared oversize must not acquire a reader");
          },
          async cancel() {
            declaredCancelled = true;
          },
        },
      }) as unknown as Response,
  },
);
assert.equal(declaredOversize.ok, false);
assert.equal(declaredOversize.error, "wallet_source_body_too_large");
assert.equal(declaredReads, 0);
assert.equal(declaredCancelled, true);

let streamedCancel = false;
const streamedOversize = await fetchVoidUiWave3WalletSourceJsonV1(
  "http://127.0.0.1:4100",
  "/wc/balance?account=account-A",
  {
    fetchImpl: async () =>
      responseAt(
        target,
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              new Uint8Array(VOID_UI_WAVE3_WALLET_SOURCE_MAX_RESPONSE_BYTES_V1),
            );
            controller.enqueue(new Uint8Array(1));
          },
          cancel() {
            streamedCancel = true;
          },
        }),
        { status: 200 },
      ),
  },
);
assert.equal(streamedOversize.ok, false);
assert.equal(streamedOversize.error, "wallet_source_body_too_large");
assert.equal(streamedCancel, true);

let deadlineCancelStarted = false;
const keepAlive = setTimeout(() => {}, 1000);
const deadlineStarted = Date.now();
const deadline = await fetchVoidUiWave3WalletSourceJsonV1(
  "http://127.0.0.1:4100",
  "/wc/balance?account=account-A",
  {
    timeoutMs: 25,
    fetchImpl: async () =>
      responseAt(
        target,
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode('{"ok":true'));
          },
          cancel() {
            deadlineCancelStarted = true;
            return new Promise<void>(() => undefined);
          },
        }),
        { status: 200 },
      ),
  },
);
clearTimeout(keepAlive);
assert.equal(deadline.ok, false);
assert.equal(deadline.error, "wallet_source_deadline_exceeded");
assert.equal(deadlineCancelStarted, true);
assert.ok(Date.now() - deadlineStarted < 600);

assert.deepEqual(
  validateWalletAt(validSnapshot()),
  validSnapshot(),
);

assert.equal(WALLET_SNAPSHOT_MAX_AGE_MS, 30_000);
assert.equal(WALLET_SNAPSHOT_MAX_FUTURE_SKEW_MS, 5_000);

for (const generatedAt of [
  "",
  "not-a-time",
  "2026-09-29T12:00:00Z",
  "2026-09-29T12:00:00.00Z",
]) {
  const value = validSnapshot();
  value.generated_at = generatedAt;
  assert.throws(
    () => validateWalletAt(value),
    /Wallet generated timestamp invalid/,
  );
}

for (const generatedAt of [
  "1970-01-01T00:00:00.000Z",
  "9999-12-31T23:59:59.999Z",
]) {
  const value = validSnapshot("account-A", generatedAt);
  assert.throws(
    () => validateWalletAt(value),
    /Wallet generated timestamp outside freshness window/,
  );
}

const justInsideAge = validSnapshot(
  "account-A",
  new Date(PROOF_NOW_MS - WALLET_SNAPSHOT_MAX_AGE_MS).toISOString(),
);
assert.doesNotThrow(() => validateWalletAt(justInsideAge));

const justOutsideAge = validSnapshot(
  "account-A",
  new Date(PROOF_NOW_MS - WALLET_SNAPSHOT_MAX_AGE_MS - 1).toISOString(),
);
assert.throws(
  () => validateWalletAt(justOutsideAge),
  /Wallet generated timestamp outside freshness window/,
);

const justInsideFutureSkew = validSnapshot(
  "account-A",
  new Date(PROOF_NOW_MS + WALLET_SNAPSHOT_MAX_FUTURE_SKEW_MS).toISOString(),
);
assert.doesNotThrow(() => validateWalletAt(justInsideFutureSkew));

const justOutsideFutureSkew = validSnapshot(
  "account-A",
  new Date(PROOF_NOW_MS + WALLET_SNAPSHOT_MAX_FUTURE_SKEW_MS + 1).toISOString(),
);
assert.throws(
  () => validateWalletAt(justOutsideFutureSkew),
  /Wallet generated timestamp outside freshness window/,
);

assert.throws(
  () => validateWalletAt(
    validSnapshot(),
    "account-A",
    PROOF_NOW_MS,
    PROOF_NOW_MS + WALLET_SNAPSHOT_MAX_AGE_MS + 1,
  ),
  /Wallet generated timestamp outside freshness window/,
);

assert.throws(
  () => validateWalletAt(
    validSnapshot(),
    "account-A",
    PROOF_NOW_MS + 1,
    PROOF_NOW_MS,
  ),
  /Wallet freshness context invalid/,
);

const recoveryNowMs = PROOF_NOW_MS + WALLET_SNAPSHOT_MAX_AGE_MS + 1;
const recoverySnapshot = validSnapshot(
  "account-A",
  new Date(recoveryNowMs).toISOString(),
);
assert.doesNotThrow(
  () => validateWalletAt(
    recoverySnapshot,
    "account-A",
    recoveryNowMs,
    recoveryNowMs,
  ),
);

const accountMismatch = validSnapshot("account-B");
assert.throws(
  () => validateWalletAt(accountMismatch, "account-A"),
  /account does not match request/,
);

for (const wrong of ["false", 1, null]) {
  const value = validSnapshot() as any;
  value.ok = wrong;
  assert.throws(() => validateWalletAt(value));
}

for (const [field, wrong] of [
  ["has_wallet", "false"],
  ["unlocked", "false"],
  ["source_available", "true"],
] as const) {
  const value = validSnapshot() as any;
  value.wallet[field] = wrong;
  assert.throws(() => validateWalletAt(value));
}

const statusString = validSnapshot() as any;
statusString.sources.wallet_status.status = "200";
assert.throws(() => validateWalletAt(statusString));

for (const [ok, status] of [[false, 200], [true, 503]] as const) {
  const value = validSnapshot() as any;
  value.sources.wallet_status.ok = ok;
  value.sources.wallet_status.status = status;
  assert.throws(
    () => validateWalletAt(value),
    /HTTP outcome mismatch/,
  );
}

for (const balanceKey of ["ledger_wc", "production_wc"] as const) {
  const value = validSnapshot() as any;
  value.balances[balanceKey].available = false;
  value.balances[balanceKey].balance = null;
  value.balances[balanceKey].entries = null;
  value.balances[balanceKey].display = "999";
  assert.throws(
    () => validateWalletAt(value),
    /unavailable evidence must remain null and undisplayed/,
  );
}

for (const balanceKey of ["ledger_wc", "production_wc"] as const) {
  const value = validSnapshot() as any;
  value.balances[balanceKey].display = "999";
  assert.throws(
    () => validateWalletAt(value),
    /display does not match balance/,
  );
}

const inventedVoidDisplay = validSnapshot() as any;
inventedVoidDisplay.balances.void.display = "999 VOID";
assert.throws(
  () => validateWalletAt(inventedVoidDisplay),
  /VOID balance boundary mismatch/,
);

const unavailableWalletEvidence = validSnapshot() as any;
unavailableWalletEvidence.wallet.source_available = false;
assert.throws(
  () => validateWalletAt(unavailableWalletEvidence),
  /unavailable source exposed wallet evidence/,
);

const unavailableNativeGasDisplay = validSnapshot() as any;
unavailableNativeGasDisplay.wallet.native_gas_available = false;
assert.throws(
  () => validateWalletAt(unavailableNativeGasDisplay),
  /native gas availability mismatch/,
);

const nativeGasWithoutWallet = validSnapshot() as any;
nativeGasWithoutWallet.wallet.has_wallet = false;
nativeGasWithoutWallet.wallet.address = "";
nativeGasWithoutWallet.wallet.unlocked = false;
assert.throws(
  () => validateWalletAt(nativeGasWithoutWallet),
  /native gas availability mismatch/,
);

for (const invalidNativeGasDisplay of [
  "unlimited",
  "1 ETH",
  "+1",
  "-1",
  "1e3",
  "1,000",
  "01",
  ".5",
  "1.",
  "0." + "1".repeat(19),
]) {
  const invalidNativeGas = validSnapshot() as any;
  invalidNativeGas.wallet.native_gas_display =
    invalidNativeGasDisplay;
  assert.throws(
    () => validateWalletAt(invalidNativeGas),
    /native gas display invalid/,
  );
}

for (const validNativeGasDisplay of [
  "0",
  "0.0",
  "1",
  "1.0",
  "0.500000000",
  "1." + "0".repeat(18),
]) {
  const validNativeGas = validSnapshot() as any;
  validNativeGas.wallet.native_gas_display =
    validNativeGasDisplay;
  assert.doesNotThrow(() => validateWalletAt(validNativeGas));
}

const ledgerWithoutSource = validSnapshot() as any;
ledgerWithoutSource.sources.ledger_wc.ok = false;
ledgerWithoutSource.sources.ledger_wc.status = 503;
assert.throws(
  () => validateWalletAt(ledgerWithoutSource),
  /ledger WC available without its source/,
);

const fractionalCount = validSnapshot() as any;
fractionalCount.balances.ledger_wc.entries = 1.5;
assert.throws(() => validateWalletAt(fractionalCount));

const numericStringBalance = validSnapshot() as any;
numericStringBalance.balances.production_wc.balance = "1.5";
assert.throws(() => validateWalletAt(numericStringBalance));

const absent = validSnapshot() as any;
absent.wallet.has_wallet = false;
absent.wallet.unlocked = false;
absent.wallet.address = "";
absent.wallet.native_gas_available = false;
absent.wallet.native_gas_display = "—";
assert.doesNotThrow(() => validateWalletAt(absent));

const unavailableSource = validSnapshot() as any;
unavailableSource.wallet.source_available = false;
unavailableSource.wallet.has_wallet = false;
unavailableSource.wallet.address = "";
unavailableSource.wallet.unlocked = false;
unavailableSource.wallet.native_gas_available = false;
unavailableSource.wallet.native_gas_display = "—";
unavailableSource.sources.wallet_status.ok = false;
unavailableSource.sources.wallet_status.status = 503;

const rendered = new Map<string, { textContent: string; className: string }>();
const originalDocument = (globalThis as any).document;
const originalDateNow = Date.now;
try {
  (globalThis as any).document = {
    querySelector: (selector: string) => {
      if (!rendered.has(selector)) {
        rendered.set(selector, { textContent: "", className: "" });
      }
      return rendered.get(selector);
    },
  };
  Date.now = () => PROOF_NOW_MS;
  assert.doesNotThrow(() =>
    renderWalletV1(validSnapshot(), "account-A", PROOF_NOW_MS),
  );
  assert.equal(
    rendered.get("[data-wallet-address]")?.textContent,
    "0x" + "a".repeat(40),
  );
  assert.equal(rendered.get("[data-wallet-native-gas]")?.textContent, "1");
  assert.equal(rendered.get("[data-wallet-ledger-wc]")?.textContent, "3");
  assert.equal(
    rendered.get("[data-wallet-source-status]")?.textContent,
    "Available",
  );

  renderWalletLoadingV1();
  assert.equal(
    rendered.get("[data-wallet-state-chip]")?.textContent,
    "Loading account",
  );
  assert.equal(
    rendered.get("[data-wallet-message]")?.textContent,
    "Reading three fixed local sources.",
  );
  for (const selector of [
    "[data-wallet-account-id]",
    "[data-wallet-address]",
    "[data-wallet-native-gas]",
    "[data-wallet-void-balance]",
    "[data-wallet-ledger-wc]",
    "[data-wallet-production-wc]",
  ]) {
    assert.equal(rendered.get(selector)?.textContent, "—");
  }
  for (const selector of [
    "[data-wallet-local-status]",
    "[data-wallet-lock-state]",
    "[data-wallet-source-status]",
    "[data-wallet-source-ledger]",
    "[data-wallet-source-production]",
  ]) {
    assert.equal(rendered.get(selector)?.textContent, "Not checked");
  }
  assert.equal(
    rendered.get("[data-wallet-ledger-meta]")?.textContent,
    "No account loaded",
  );
  assert.equal(
    rendered.get("[data-wallet-production-meta]")?.textContent,
    "No account loaded",
  );

  assert.doesNotThrow(() =>
    renderWalletV1(validSnapshot(), "account-A", PROOF_NOW_MS),
  );
  renderWalletErrorV1("Proof adapter failure");
  assert.equal(
    rendered.get("[data-wallet-state-chip]")?.textContent,
    "Account unavailable",
  );
  assert.equal(
    rendered.get("[data-wallet-message]")?.textContent,
    "Proof adapter failure",
  );
  for (const selector of [
    "[data-wallet-account-id]",
    "[data-wallet-address]",
    "[data-wallet-native-gas]",
    "[data-wallet-void-balance]",
    "[data-wallet-ledger-wc]",
    "[data-wallet-production-wc]",
  ]) {
    assert.equal(rendered.get(selector)?.textContent, "—");
  }
  for (const selector of [
    "[data-wallet-local-status]",
    "[data-wallet-lock-state]",
    "[data-wallet-source-status]",
    "[data-wallet-source-ledger]",
    "[data-wallet-source-production]",
  ]) {
    assert.equal(rendered.get(selector)?.textContent, "Not checked");
  }
  assert.equal(
    rendered.get("[data-wallet-ledger-meta]")?.textContent,
    "No account loaded",
  );
  assert.equal(
    rendered.get("[data-wallet-production-meta]")?.textContent,
    "No account loaded",
  );

  assert.doesNotThrow(() =>
    renderWalletV1(unavailableSource, "account-A", PROOF_NOW_MS),
  );
} finally {
  Date.now = originalDateNow;
  if (originalDocument === undefined) delete (globalThis as any).document;
  else (globalThis as any).document = originalDocument;
}
assert.equal(
  rendered.get("[data-wallet-state-chip]")?.textContent,
  "Wallet status unavailable",
);
assert.equal(
  rendered.get("[data-wallet-state-chip]")?.className,
  "status-chip status-chip--warning",
);
assert.equal(
  rendered.get("[data-wallet-message]")?.textContent,
  "Wallet presence and lock state could not be checked. Independently available accounting balances remain read-only.",
);

const racedRender = new Map<string, { textContent: string; className: string }>();
const racedStorageWrites: Array<[string, string]> = [];
const racedButton = { disabled: false };
const originalRaceDocument = (globalThis as any).document;
const originalRaceWindow = (globalThis as any).window;
const originalRaceSessionStorage = (globalThis as any).sessionStorage;
const originalRaceFetch = globalThis.fetch;
const originalRaceDateNow = Date.now;
let resolveOlderFetch!: (response: Response) => void;
let signalOlderFetchStarted!: () => void;
const olderFetchStarted = new Promise<void>((resolve) => {
  signalOlderFetchStarted = resolve;
});
try {
  (globalThis as any).document = {
    querySelector: (selector: string) => {
      if (!racedRender.has(selector)) {
        racedRender.set(selector, { textContent: "", className: "" });
      }
      return racedRender.get(selector);
    },
  };
  (globalThis as any).window = {
    location: {
      hash: "#/wallet",
      origin: "http://localhost",
    },
  };
  (globalThis as any).sessionStorage = {
    setItem: (key: string, value: string) => {
      racedStorageWrites.push([key, value]);
    },
  };
  globalThis.fetch = (() => {
    signalOlderFetchStarted();
    return new Promise<Response>((resolve) => {
      resolveOlderFetch = resolve;
    });
  }) as typeof fetch;
  Date.now = () => PROOF_NOW_MS;

  const olderLoad = loadWalletAccountV1("account-A", racedButton);
  await olderFetchStarted;
  assert.equal(racedButton.disabled, true);

  await loadWalletAccountV1("bad account", racedButton);
  assert.equal(racedButton.disabled, false);
  assert.equal(
    racedRender.get("[data-wallet-state-chip]")?.textContent,
    "Account unavailable",
  );
  assert.equal(
    racedRender.get("[data-wallet-message]")?.textContent,
    "Use 1–128 letters, numbers, periods, underscores, colons, or hyphens.",
  );
  for (const selector of [
    "[data-wallet-account-id]",
    "[data-wallet-address]",
    "[data-wallet-native-gas]",
    "[data-wallet-void-balance]",
    "[data-wallet-ledger-wc]",
    "[data-wallet-production-wc]",
  ]) {
    assert.equal(racedRender.get(selector)?.textContent, "—");
  }
  assert.deepEqual(racedStorageWrites, []);

  resolveOlderFetch(responseAt(
    "http://localhost/__void/ui/wave3/wallet.json?account=account-A",
    JSON.stringify(validSnapshot("account-A")),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  ));
  await olderLoad;

  assert.equal(
    racedRender.get("[data-wallet-state-chip]")?.textContent,
    "Account unavailable",
  );
  assert.equal(
    racedRender.get("[data-wallet-message]")?.textContent,
    "Use 1–128 letters, numbers, periods, underscores, colons, or hyphens.",
  );
  assert.deepEqual(racedStorageWrites, []);
} finally {
  Date.now = originalRaceDateNow;
  globalThis.fetch = originalRaceFetch;
  if (originalRaceDocument === undefined) delete (globalThis as any).document;
  else (globalThis as any).document = originalRaceDocument;
  if (originalRaceWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = originalRaceWindow;
  if (originalRaceSessionStorage === undefined) {
    delete (globalThis as any).sessionStorage;
  } else {
    (globalThis as any).sessionStorage = originalRaceSessionStorage;
  }
}
assert.equal(
  rendered.get("[data-wallet-address]")?.textContent,
  "Unavailable",
);
assert.equal(
  rendered.get("[data-wallet-local-status]")?.textContent,
  "Unavailable",
);
assert.equal(
  rendered.get("[data-wallet-lock-state]")?.textContent,
  "Not checked",
);
assert.equal(
  rendered.get("[data-wallet-ledger-wc]")?.textContent,
  "3",
);
assert.equal(
  rendered.get("[data-wallet-production-wc]")?.textContent,
  "1.5",
);

let clearGeneration = 7;
const pendingGeneration = clearGeneration;
let clearReason = "";
const removedStorageKeys: string[] = [];
let resetCount = 0;
let focusCount = 0;
const clearedInput = {
  value: "account-A",
  focus: () => {
    focusCount += 1;
  },
};
const clearedLoadControl = { disabled: true };

clearWalletViewV1({
  invalidate: (reason: string) => {
    clearReason = reason;
    clearGeneration += 1;
  },
  storage: {
    removeItem: (key: string) => {
      removedStorageKeys.push(key);
    },
  },
  input: clearedInput,
  button: clearedLoadControl,
  reset: () => {
    resetCount += 1;
  },
});

assert.equal(clearGeneration, pendingGeneration + 1);
assert.equal(clearReason, "wallet cleared");
assert.deepEqual(removedStorageKeys, ["void.ui.wave3.wallet.account.v1"]);
assert.equal(clearedInput.value, "");
assert.equal(resetCount, 1);
assert.equal(clearedLoadControl.disabled, false);
assert.equal(focusCount, 1);

const originalPrivacyDocument = (globalThis as any).document;
const originalPrivacyWindow = (globalThis as any).window;
const originalPrivacyStorageDescriptor =
  Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
const originalPrivacyFetch = globalThis.fetch;
const originalPrivacyNow = Date.now;

const privacyNodes = new Map<string, { textContent: string; className: string }>();
const privacyDenied = { get: 0, set: 0, remove: 0, property: 0 };
let privacyFocused = 0;
const privacyInput = {
  value: "account-A",
  focus: () => { privacyFocused += 1; },
};
const privacyButton = { disabled: false };
let privacyClearHandler: (() => void) | null = null;
let privacySubmitBound = false;
let privacySubmitHandler: ((event: { preventDefault: () => void }) => void) | null = null;
let privacySubmitPrevented = 0;
const fireBoundPrivacySubmit = () => {
  const handler = privacySubmitHandler;
  assert.ok(handler, "actual Wallet submit listener must be bound");
  handler({ preventDefault: () => { privacySubmitPrevented += 1; } });
};
const waitForPrivacyChip = async (expected: string) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (privacyNodes.get("[data-wallet-state-chip]")?.textContent === expected) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  assert.equal(privacyNodes.get("[data-wallet-state-chip]")?.textContent, expected);
};
const privacyForm = {
  dataset: {} as Record<string, string>,
  querySelector: (selector: string) => {
    if (selector === "[data-wallet-account-input]") return privacyInput;
    if (selector === "[data-wallet-load]") return privacyButton;
    if (selector === "[data-wallet-clear]") return {
      addEventListener: (name: string, listener: () => void) => {
        if (name === "click") privacyClearHandler = listener;
      },
    };
    return null;
  },
  addEventListener: (name: string, handler: (event: { preventDefault: () => void }) => void) => {
    if (name === "submit") {
      privacySubmitBound = true;
      privacySubmitHandler = handler;
    }
  },
};
let activePrivacyForm: typeof privacyForm = privacyForm;
try {
  (globalThis as any).window = {
    location: { hash: "#/wallet", origin: "http://localhost" },
  };
  (globalThis as any).document = {
    querySelector: (selector: string) => {
      if (selector === "[data-wallet-account-form]") return activePrivacyForm;
      if (!privacyNodes.has(selector)) {
        privacyNodes.set(selector, { textContent: "", className: "" });
      }
      return privacyNodes.get(selector);
    },
  };
  (globalThis as any).sessionStorage = {
    getItem: () => {
      privacyDenied.get += 1;
      throw new DOMException("denied", "SecurityError");
    },
    setItem: () => {
      privacyDenied.set += 1;
      throw new DOMException("denied", "SecurityError");
    },
    removeItem: () => {
      privacyDenied.remove += 1;
      throw new DOMException("denied", "SecurityError");
    },
  };
  Date.now = () => PROOF_NOW_MS;
  let privacyFetches = 0;
  globalThis.fetch = (async () => {
    privacyFetches += 1;
    return responseAt(
      "http://localhost/__void/ui/wave3/wallet.json?account=account-A",
      JSON.stringify(validSnapshot("account-A")),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  assert.doesNotThrow(() => bindWalletViewV1());
  assert.equal(privacySubmitBound, true, "Wallet submit bound despite denied getItem");
  assert.equal(privacyForm.dataset.walletBound, "true");
  assert.equal(privacyDenied.get, 1);
  fireBoundPrivacySubmit();
  await waitForPrivacyChip("Local wallet found");
  assert.equal(privacySubmitPrevented, 1);
  assert.equal(privacyFetches, 1);
  assert.equal(privacyDenied.set, 1);
  assert.equal(privacyButton.disabled, false);
  assert.equal(privacyNodes.get("[data-wallet-state-chip]")?.textContent, "Local wallet found");
  assert.equal(privacyNodes.get("[data-wallet-account-id]")?.textContent, "account-A");
  assert.equal(privacyNodes.get("[data-wallet-ledger-wc]")?.textContent, "3");
  assert.equal(privacyNodes.get("[data-wallet-message]")?.textContent,
    "Local wallet identity and accounting balances are shown read-only.");
  assert.notEqual(privacyNodes.get("[data-wallet-state-chip]")?.textContent, "Account unavailable");

  privacyButton.disabled = true;
  assert.ok(privacyClearHandler, "Wallet clear listener must be bound");
  privacyClearHandler!();
  assert.equal(privacyDenied.remove, 1);
  assert.equal(privacyInput.value, "");
  assert.equal(privacyButton.disabled, false);
  assert.equal(privacyFocused, 1);
  assert.equal(privacyNodes.get("[data-wallet-account-id]")?.textContent, "—");
  assert.equal(privacyNodes.get("[data-wallet-ledger-wc]")?.textContent, "—");
  assert.equal(privacyNodes.get("[data-wallet-state-chip]")?.textContent, "No account loaded");

  // Keep a real bound submit pending while storage removal throws. Clear must
  // abort its owner/generation; even a mock fetch that ignores AbortSignal and
  // resolves with a valid wallet afterward must not repaint cleared evidence.
  let resolvePendingWalletFetch!: (response: Response) => void;
  let markPendingWalletFetchStarted!: () => void;
  const pendingWalletFetchStarted = new Promise<void>((resolve) => {
    markPendingWalletFetchStarted = resolve;
  });
  globalThis.fetch = (() => {
    privacyFetches += 1;
    return new Promise<Response>((resolve) => {
      resolvePendingWalletFetch = resolve;
      markPendingWalletFetchStarted();
    });
  }) as typeof fetch;
  privacyInput.value = "account-A";
  fireBoundPrivacySubmit();
  await pendingWalletFetchStarted;
  assert.equal(privacyFetches, 2);
  assert.equal(privacySubmitPrevented, 2);
  assert.equal(privacyButton.disabled, true);
  assert.equal(privacyNodes.get("[data-wallet-state-chip]")?.textContent, "Loading account");
  assert.ok(privacyClearHandler, "bound clear listener must cancel the pending request");
  privacyClearHandler!();
  assert.equal(privacyDenied.remove, 2);
  assert.equal(privacyInput.value, "");
  assert.equal(privacyButton.disabled, false);
  assert.equal(privacyFocused, 2);
  assert.equal(privacyNodes.get("[data-wallet-state-chip]")?.textContent, "No account loaded");
  assert.equal(privacyNodes.get("[data-wallet-account-id]")?.textContent, "—");
  resolvePendingWalletFetch(responseAt(
    "http://localhost/__void/ui/wave3/wallet.json?account=account-A",
    JSON.stringify(validSnapshot("account-A")),
    { status: 200, headers: { "content-type": "application/json" } },
  ));
  for (let tick = 0; tick < 12; tick += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  assert.equal(privacyDenied.set, 1, "stale response must not persist a wallet");
  assert.equal(privacyNodes.get("[data-wallet-state-chip]")?.textContent, "No account loaded");
  assert.equal(privacyNodes.get("[data-wallet-account-id]")?.textContent, "—");
  assert.equal(privacyNodes.get("[data-wallet-ledger-wc]")?.textContent, "—");
  assert.equal(privacyButton.disabled, false);

  // Some browsers throw when accessing the sessionStorage property itself,
  // before any method call. Neither binding nor clear may inherit that throw.
  const propertyDeniedForm = {
    ...privacyForm,
    dataset: {} as Record<string, string>,
  };
  activePrivacyForm = propertyDeniedForm;
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    get: () => {
      privacyDenied.property += 1;
      throw new DOMException("storage unavailable", "SecurityError");
    },
  });
  assert.doesNotThrow(() => bindWalletViewV1());
  assert.equal(propertyDeniedForm.dataset.walletBound, "true");
  // Use the actual newly bound submit closure while the storage PROPERTY
  // getter itself throws. Direct loadWalletAccountV1 would miss that boundary.
  const propertyBeforeSubmit = privacyDenied.property;
  globalThis.fetch = (async () => {
    privacyFetches += 1;
    return responseAt(
      "http://localhost/__void/ui/wave3/wallet.json?account=account-A",
      JSON.stringify(validSnapshot("account-A")),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  privacyInput.value = "account-A";
  fireBoundPrivacySubmit();
  await waitForPrivacyChip("Local wallet found");
  assert.equal(privacyFetches, 3);
  assert.equal(privacySubmitPrevented, 3);
  assert.ok(privacyDenied.property > propertyBeforeSubmit,
    "property getter failure must be caught after verified fetch");
  assert.equal(privacyNodes.get("[data-wallet-account-id]")?.textContent, "account-A");
  assert.equal(privacyNodes.get("[data-wallet-ledger-wc]")?.textContent, "3");
  assert.notEqual(privacyNodes.get("[data-wallet-state-chip]")?.textContent,
    "Account unavailable");
  assert.equal(privacyButton.disabled, false);
  // The bound Clear handler must also tolerate a denied storage property getter.
  privacyClearHandler!();
  assert.equal(privacyInput.value, "");
  assert.equal(privacyButton.disabled, false);
  assert.equal(privacyFocused, 3);
  assert.equal(privacyNodes.get("[data-wallet-account-id]")?.textContent, "—");
  assert.equal(privacyNodes.get("[data-wallet-state-chip]")?.textContent, "No account loaded");
  assert.ok(privacyDenied.property >= propertyBeforeSubmit + 2);
} finally {
  Date.now = originalPrivacyNow;
  globalThis.fetch = originalPrivacyFetch;
  if (originalPrivacyDocument === undefined) delete (globalThis as any).document;
  else (globalThis as any).document = originalPrivacyDocument;
  if (originalPrivacyWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = originalPrivacyWindow;
  if (originalPrivacyStorageDescriptor) {
    Object.defineProperty(globalThis, "sessionStorage", originalPrivacyStorageDescriptor);
  } else {
    delete (globalThis as any).sessionStorage;
  }
}

const adapterSource = fs.readFileSync(path.join(root, sourcePath), "utf8");
for (const marker of [
  "export function walletAccountIdV1(raw: unknown): string | null",
  'if (typeof raw !== "string") return null;',
  "const account = walletAccountIdV1(req?.query?.account);",
]) {
  assert.ok(adapterSource.includes(marker), `missing Wallet adapter boundary: ${marker}`);
}
const accountParserStart = adapterSource.indexOf(
  "export function walletAccountIdV1(raw: unknown): string | null",
);
const accountParserEnd = adapterSource.indexOf("\n}\n", accountParserStart);
assert.ok(accountParserStart >= 0 && accountParserEnd > accountParserStart);
const accountParserSource = adapterSource.slice(
  accountParserStart,
  accountParserEnd + 3,
);
assert.equal(
  accountParserSource.includes("String("),
  false,
  "legacy Wallet account query coercion remains",
);

const clientSource = fs.readFileSync(path.join(root, clientPath), "utf8");
const clearListenerStart = clientSource.indexOf(
  "clear?.addEventListener('click', () => {",
);
const clearListenerEnd = clientSource.indexOf("  });", clearListenerStart);
assert.ok(clearListenerStart >= 0 && clearListenerEnd > clearListenerStart);
const clearListenerSource = clientSource.slice(clearListenerStart, clearListenerEnd);
assert.ok(clearListenerSource.includes("clearWalletViewV1({ input, button });"));
for (const marker of [
  "createNetworkRequestOwnerV1",
  "readBoundedNetworkJsonV1",
  "credentials: 'omit'",
  "redirect: 'error'",
  "mode: 'same-origin'",
  "referrerPolicy: 'no-referrer'",
  "AbortSignal.timeout(WALLET_REQUEST_TIMEOUT_MS)",
  "const invalidateWalletRequest = (reason) =>",
  "walletRequestOwner.cancel(reason)",
  "export const loadWalletAccountV1 =",
  "export const bindWalletViewV1 =",
  "const readSavedWalletAccountV1 =",
  "const rememberWalletAccountV1 =",
  "const forgetWalletAccountV1 =",
  "invalidateWalletRequest('wallet request replaced by invalid account')",
  "restoreWalletLoadControlV1(button)",
  "export const clearWalletViewV1 =",
  "clearWalletViewV1({ input, button });",
  "invalidateWalletRequest('wallet route left')",
  "response.url !== expectedUrl",
  "snapshot.account.id !== expectedAccount",
  "snapshot.ok !== true",
  "WALLET_SNAPSHOT_MAX_AGE_MS = 30_000",
  "WALLET_SNAPSHOT_MAX_FUTURE_SKEW_MS = 5_000",
  "requestStartedAtMs = Date.now()",
  "evaluatedAtMs: Date.now()",
  "Wallet generated timestamp outside freshness window",
]) {
  assert.ok(clientSource.includes(marker), `missing Wallet client boundary: ${marker}`);
}
for (const forbidden of [
  "Number(source?.status",
  "await response.json()",
  "!body?.ok",
]) {
  assert.equal(clientSource.includes(forbidden), false, `legacy Wallet client seam remains: ${forbidden}`);
}

console.log("VOID_UI_WAVE3_WALLET_EVIDENCE_BOUNDARY_V1_GREEN");
console.log("server_numeric_types_strict=true");
console.log("server_account_query_type_strict=true");
console.log("server_response_stream_bounded=true");
console.log("server_deadline_owns_body=true");
console.log("server_redirects_rejected=true");
console.log("server_final_url_exact=true");
console.log("browser_schema_closed=true");
console.log("browser_account_request_response_bound=true");
console.log("browser_status_type_strict=true");
console.log("browser_source_outcome_coherent=true");
console.log("browser_unavailable_evidence_undisplayed=true");
console.log("browser_available_display_balance_bound=true");
console.log("browser_available_evidence_source_bound=true");
console.log("browser_native_gas_wallet_bound=true");
console.log("browser_wallet_source_unavailable_truthful=true");
console.log("browser_wallet_stale_evidence_cleared=true");
console.log("browser_wallet_invalid_input_supersedes_active_request=true");
console.log("browser_wallet_generated_at_canonical=true");
console.log("browser_wallet_snapshot_max_age_ms=30000");
console.log("browser_wallet_snapshot_max_future_skew_ms=5000");
console.log("browser_wallet_request_lifetime_bound=true");
console.log("browser_wallet_late_response_rejected=true");
console.log("browser_wallet_subsequent_valid_recovery=true");
console.log("browser_shared_generation_owner=true");
console.log("browser_clear_invalidates_generation=true");
console.log("browser_clear_restores_load_control=true");
console.log("browser_session_storage_get_denial_nonblocking=true");
console.log("browser_session_storage_set_denial_preserves_verified_evidence=true");
console.log("browser_session_storage_remove_denial_clears_evidence=true");
console.log("browser_session_storage_property_getter_denial_nonblocking=true");
console.log("browser_bound_submit_survives_storage_property_getter_denial=true");
console.log("browser_denied_storage_clear_blocks_late_pending_wallet_response=true");
console.log("browser_route_departure_invalidates_generation=true");
console.log(`wallet_source_sha256=${sha256File(sourcePath)}`);
console.log(`wallet_client_sha256=${sha256File(clientPath)}`);
console.log(`wave2_manifest_sha256=${sha256File(wave2ManifestPath)}`);
console.log(`wave3_manifest_sha256=${sha256File(wave3ManifestPath)}`);
console.log(`wave4_manifest_sha256=${sha256File(wave4ManifestPath)}`);
console.log("manifest_refresh_required=true");
console.log("authority_added=false");
