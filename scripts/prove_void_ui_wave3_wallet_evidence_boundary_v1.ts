import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_UI_WAVE3_WALLET_SOURCE_MAX_RESPONSE_BYTES_V1,
  fetchVoidUiWave3WalletSourceJsonV1,
  walletAccountIdV1,
  walletFiniteNumberV1,
  walletNonNegativeSafeIntegerV1,
} from "../src/ui/void_app_wave3_wallet_readonly_v1.js";
import {
  WALLET_SNAPSHOT_MAX_AGE_MS,
  WALLET_SNAPSHOT_MAX_FUTURE_SKEW_MS,
  clearWalletViewV1,
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
console.log("browser_wallet_generated_at_canonical=true");
console.log("browser_wallet_snapshot_max_age_ms=30000");
console.log("browser_wallet_snapshot_max_future_skew_ms=5000");
console.log("browser_wallet_request_lifetime_bound=true");
console.log("browser_wallet_late_response_rejected=true");
console.log("browser_wallet_subsequent_valid_recovery=true");
console.log("browser_shared_generation_owner=true");
console.log("browser_clear_invalidates_generation=true");
console.log("browser_clear_restores_load_control=true");
console.log("browser_route_departure_invalidates_generation=true");
console.log(`wallet_source_sha256=${sha256File(sourcePath)}`);
console.log(`wallet_client_sha256=${sha256File(clientPath)}`);
console.log(`wave2_manifest_sha256=${sha256File(wave2ManifestPath)}`);
console.log(`wave3_manifest_sha256=${sha256File(wave3ManifestPath)}`);
console.log(`wave4_manifest_sha256=${sha256File(wave4ManifestPath)}`);
console.log("manifest_refresh_required=true");
console.log("authority_added=false");
