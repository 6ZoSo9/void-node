import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_UI_WAVE3_WALLET_SOURCE_MAX_RESPONSE_BYTES_V1,
  fetchVoidUiWave3WalletSourceJsonV1,
  walletFiniteNumberV1,
  walletNonNegativeSafeIntegerV1,
} from "../src/ui/void_app_wave3_wallet_readonly_v1.js";
import { validateWalletSnapshotV1 } from "../public/void-app-wave1-v1/assets/js/wallet-live.js";

const root = process.cwd();
const encoder = new TextEncoder();
const sourcePath = "src/ui/void_app_wave3_wallet_readonly_v1.ts";
const clientPath = "public/void-app-wave1-v1/assets/js/wallet-live.js";
const wave2ManifestPath = "docs/public/void-ui-wave2-home-readonly-v1/source-manifest.json";
const wave3ManifestPath = "docs/public/void-ui-wave3-wallet-readonly-v1/source-manifest.json";
const wave4ManifestPath = "docs/public/void-ui-wave4-earn-readonly-v1/source-manifest.json";

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

const validSnapshot = (account = "account-A") => ({
  ok: true,
  marker: "VOID_UI_WAVE3_WALLET_READONLY_V1",
  generated_at: "2026-09-21T12:00:00.000Z",
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
  validateWalletSnapshotV1(validSnapshot(), "account-A"),
  validSnapshot(),
);

const accountMismatch = validSnapshot("account-B");
assert.throws(
  () => validateWalletSnapshotV1(accountMismatch, "account-A"),
  /account does not match request/,
);

for (const wrong of ["false", 1, null]) {
  const value = validSnapshot() as any;
  value.ok = wrong;
  assert.throws(() => validateWalletSnapshotV1(value, "account-A"));
}

for (const [field, wrong] of [
  ["has_wallet", "false"],
  ["unlocked", "false"],
  ["source_available", "true"],
] as const) {
  const value = validSnapshot() as any;
  value.wallet[field] = wrong;
  assert.throws(() => validateWalletSnapshotV1(value, "account-A"));
}

const statusString = validSnapshot() as any;
statusString.sources.wallet_status.status = "200";
assert.throws(() => validateWalletSnapshotV1(statusString, "account-A"));

const fractionalCount = validSnapshot() as any;
fractionalCount.balances.ledger_wc.entries = 1.5;
assert.throws(() => validateWalletSnapshotV1(fractionalCount, "account-A"));

const numericStringBalance = validSnapshot() as any;
numericStringBalance.balances.production_wc.balance = "1.5";
assert.throws(() => validateWalletSnapshotV1(numericStringBalance, "account-A"));

const absent = validSnapshot() as any;
absent.wallet.has_wallet = false;
absent.wallet.unlocked = false;
absent.wallet.address = "";
assert.doesNotThrow(() => validateWalletSnapshotV1(absent, "account-A"));

const clientSource = fs.readFileSync(path.join(root, clientPath), "utf8");
for (const marker of [
  "createNetworkRequestOwnerV1",
  "readBoundedNetworkJsonV1",
  "credentials: 'omit'",
  "redirect: 'error'",
  "mode: 'same-origin'",
  "referrerPolicy: 'no-referrer'",
  "AbortSignal.timeout(WALLET_REQUEST_TIMEOUT_MS)",
  "walletRequestOwner.cancel('wallet cleared')",
  "walletRequestOwner.cancel('wallet route left')",
  "response.url !== expectedUrl",
  "snapshot.account.id !== expectedAccount",
  "snapshot.ok !== true",
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
console.log("server_response_stream_bounded=true");
console.log("server_deadline_owns_body=true");
console.log("server_redirects_rejected=true");
console.log("server_final_url_exact=true");
console.log("browser_schema_closed=true");
console.log("browser_account_request_response_bound=true");
console.log("browser_status_type_strict=true");
console.log("browser_shared_generation_owner=true");
console.log("browser_clear_invalidates_generation=true");
console.log("browser_route_departure_invalidates_generation=true");
console.log(`wallet_source_sha256=${sha256File(sourcePath)}`);
console.log(`wallet_client_sha256=${sha256File(clientPath)}`);
console.log(`wave2_manifest_sha256=${sha256File(wave2ManifestPath)}`);
console.log(`wave3_manifest_sha256=${sha256File(wave3ManifestPath)}`);
console.log(`wave4_manifest_sha256=${sha256File(wave4ManifestPath)}`);
console.log("manifest_refresh_required=true");
console.log("authority_added=false");
