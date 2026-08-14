import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();

function fail(message: string): never {
  throw new Error(`VOID_UI_WAVE4_EARN_READONLY_V1_FAIL: ${message}`);
}

function read(relative: string): string {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

const moduleSource = read("src/ui/void_app_wave4_earn_readonly_v1.ts");
const client = read("public/void-app-wave1-v1/assets/js/earn-live.js");
const views = read("public/void-app-wave1-v1/assets/js/views.js");
const css = read("public/void-app-wave1-v1/assets/css/views.css");
const html = read("public/void-app-wave1-v1/index.html");
const wave3Module = read("src/ui/void_app_wave3_wallet_readonly_v1.ts");

for (const marker of [
  'const ROUTE_MARKER = "VOID_UI_WAVE4_EARN_READONLY_V1"',
  'const EARN_ROUTE = "/__void/ui/wave4/earn.json"',
  'const STATUS_ROUTE = "/__void/ui/wave4-earn-v1/status.json"',
  'const ACCOUNT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/',
  'const HISTORY_LIMIT = 5',
  'typeof raw === "number" && Number.isFinite(raw)',
  'value === "127.0.0.1"',
  'value === "::1"',
  'method !== "GET" && method !== "HEAD"',
  'fetchJson(base, `/wc/runner/status?account=${encoded}`)',
  'fetchJson(base, `/wc/reward-stats?account=${encoded}`)',
  'fetchJson(base, `/wc/redeemable?account=${encoded}`)',
  'fetchJson(base, `/wc/production/balance?account=${encoded}`)',
  'fetchJson(base, `/jobs?account=${encoded}&limit=${HISTORY_LIMIT}`)',
  '`/receipts?account=${encoded}&limit=${HISTORY_LIMIT}`',
  '`/__void/participant/datanet-wc/status?account=${encoded}`',
  'raw_source_bodies: false',
  'absolute_paths: false',
  'wallet_addresses: false',
  'job_inputs: false',
  'job_meta: false',
  'receipt_roots: false',
  'receipt_leaves: false',
  'receipt_payloads: false',
  'job_execution: false',
  'job_submission: false',
  'reward_award: false',
  'runner_activation: false',
  'runner_tick: false',
  'runner_config: false',
  'wc_redeem: false',
  'wc_send: false',
  'wc_to_void: false',
  'ledger_write: false',
  'browser_wallet_connection: false',
  'money_movement: false',
]) {
  if (!moduleSource.includes(marker)) {
    fail(`server marker missing: ${marker}`);
  }
}

for (const forbidden of [
  'app.post(',
  'app.put(',
  'app.patch(',
  'app.delete(',
  'appendFileSync',
  'writeFileSync',
  '"/wc/runner/set"',
  '"/wc/runner/tick"',
  '"/wc/runner/config"',
  '"/wc/redeem"',
  '"/wc/send"',
  '"/wc/scan-receipts"',
  '"/jobs/submit"',
  '"/__void/jobs-and-datanet-worker/run-once"',
  '"/__void/participant/wallet/send-void"',
  '"/__void/participant/wallet/trade/wc-to-void"',
  'privateKey',
  'mnemonic',
  'ciphertext',
]) {
  if (moduleSource.includes(forbidden)) {
    fail(`server contains forbidden mutation or secret marker: ${forbidden}`);
  }
}

const finiteNumberMatch = moduleSource.match(
  /function finiteNumber\(raw: unknown\): number \| null \{\n([\s\S]*?)\n\}/
);

if (!finiteNumberMatch) {
  fail("strict finiteNumber implementation not found");
}

const parseFiniteNumber = new Function(
  "raw",
  finiteNumberMatch[1]
) as (raw: unknown) => number | null;

for (const wrongType of [
  null,
  false,
  true,
  "0",
  "1.5",
  "",
  [],
  {},
]) {
  if (parseFiniteNumber(wrongType) !== null) {
    fail(`wrong-typed numeric evidence accepted: ${JSON.stringify(wrongType)}`);
  }
}

for (const [raw, expected] of [
  [0, 0],
  [1.5, 1.5],
  [-2, -2],
] as const) {
  if (parseFiniteNumber(raw) !== expected) {
    fail(`valid finite numeric evidence rejected: ${raw}`);
  }
}

for (const nonFinite of [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
]) {
  if (parseFiniteNumber(nonFinite) !== null) {
    fail("non-finite numeric evidence accepted");
  }
}

for (const failOpen of [
  "nonNegative(runner.jobs_last_hour) ?? 0",
  "nonNegative(production.count) ?? 0",
  "nonNegative(totals.total_wc) ?? 0",
  "nonNegative(totals.publish_wc) ?? 0",
  "nonNegative(totals.verify_wc) ?? 0",
  "nonNegative(totals.redundancy_wc) ?? 0",
]) {
  if (moduleSource.includes(failOpen)) {
    fail(`numeric evidence still defaults unavailable input to zero: ${failOpen}`);
  }
}

if (
  !moduleSource.includes(
    "available: lastCredit !== null && lastCreditAmount !== null"
  )
) {
  fail("last-credit availability is not bound to a valid numeric amount");
}

const frontendFetches = client.split("fetch(").length - 1;

if (frontendFetches !== 1) {
  fail(`frontend must contain exactly one fetch call, found ${frontendFetches}`);
}

for (const marker of [
  "const EARN_ENDPOINT = '/__void/ui/wave4/earn.json'",
  "method: 'GET'",
  "cache: 'no-store'",
  "credentials: 'same-origin'",
  "AbortSignal.timeout(7000)",
  "snapshot.marker !== EARN_MARKER",
  "typeof value === 'number' && Number.isFinite(value)",
  "typeof source?.status === 'number'",
  "typeof item?.reward_wc === 'number'",
  "typeof availableWork.network_need_score === 'number'",
  "data-earn-account-form",
  "data-earn-jobs-list",
  "data-earn-receipts-list",
]) {
  if (!client.includes(marker)) {
    fail(`Earn client marker missing: ${marker}`);
  }
}

for (const forbidden of [
  "window.ethereum",
  "globalThis.ethereum",
  "XMLHttpRequest",
  "WebSocket",
  "/wc/",
  "/jobs",
  "/receipts",
  "/__void/participant/",
  "sendTransaction",
  "personal_sign",
  "eth_sendTransaction",
  "method: 'POST'",
  "method: 'PUT'",
  "method: 'PATCH'",
  "method: 'DELETE'",
]) {
  if (client.includes(forbidden)) {
    fail(`frontend contains forbidden direct source or mutation marker: ${forbidden}`);
  }
}

const formatNumberMatch = client.match(
  /const formatNumber = \(value\) => \{\n([\s\S]*?)\n\};/
);

if (!formatNumberMatch) {
  fail("strict client formatNumber implementation not found");
}

const formatFiniteNumber = new Function(
  "value",
  formatNumberMatch[1]
) as (value: unknown) => string;

for (const wrongType of [
  null,
  false,
  true,
  "0",
  "1.5",
  "",
  [],
  {},
]) {
  if (formatFiniteNumber(wrongType) !== "—") {
    fail(`client rendered wrong-typed numeric evidence: ${JSON.stringify(wrongType)}`);
  }
}

for (const [raw, expected] of [
  [0, "0"],
  [1.5, "1.5"],
] as const) {
  if (formatFiniteNumber(raw) !== expected) {
    fail(`client rejected valid finite numeric evidence: ${raw}`);
  }
}

for (const failOpen of [
  "const number = Number(value);",
  "Number.isFinite(Number(item?.reward_wc))",
  "Number.isFinite(Number(availableWork.network_need_score))",
  "const status = Number(source?.status ?? 0);",
]) {
  if (client.includes(failOpen)) {
    fail(`client numeric coercion remains: ${failOpen}`);
  }
}

for (const marker of [
  "function earnView()",
  "data-earn-view",
  "data-earn-account-form",
  "data-earn-earned-wc",
  "data-earn-redeemable-wc",
  "data-earn-production-wc",
  "data-earn-jobs-list",
  "data-earn-receipts-list",
  "Execution disabled",
  "No action in this view",
  "Advanced read-only details",
]) {
  if (!views.includes(marker)) {
    fail(`Earn view marker missing: ${marker}`);
  }
}

if (views.includes("earn: () => placeholderView('Earn'")) {
  fail("Earn placeholder remains active");
}

for (const marker of [
  "./assets/js/home-live.js",
  "./assets/js/wallet-live.js",
  "./assets/js/earn-live.js",
  "WAVE 4 READ-ONLY EARN",
]) {
  if (!html.includes(marker)) {
    fail(`application integration marker missing: ${marker}`);
  }
}

for (const marker of [
  ".earn-account-form",
  ".earn-facts",
  ".earn-history-list",
  ".earn-source-details",
  ".earn-advanced-grid",
]) {
  if (!css.includes(marker)) {
    fail(`Earn CSS marker missing: ${marker}`);
  }
}

if (
  !wave3Module.startsWith(
    'import "./void_app_wave4_earn_readonly_v1.js";'
  )
) {
  fail("Wave 4 module import is not anchored in the Wave 3 module");
}

for (const relative of [
  "docs/public/void-ui-wave4-earn-readonly-v1/README.md",
  "docs/public/void-ui-wave4-earn-readonly-v1/ADAPTER_CONTRACT.md",
  "docs/public/void-ui-wave4-earn-readonly-v1/ACCEPTANCE_CRITERIA.md",
  "docs/public/void-ui-wave4-earn-readonly-v1/VISUAL_APPROVAL.md",
  "docs/public/void-ui-wave4-earn-readonly-v1/source-manifest.json",
]) {
  if (!fs.existsSync(path.join(root, relative))) {
    fail(`Wave 4 document missing: ${relative}`);
  }
}

const manifest = JSON.parse(
  read("docs/public/void-ui-wave4-earn-readonly-v1/source-manifest.json")
);

if (
  manifest.marker !== "VOID_UI_WAVE4_EARN_READONLY_V1" ||
  manifest.base !== "373eaa3fff2d8f3a164561e9dcf3ea5684aad5fa" ||
  manifest.account_input_kind !== "participant_account_id" ||
  manifest.loopback_only !== true ||
  manifest.get_head_only !== true ||
  manifest.frontend_fetch_count !== 1 ||
  manifest.history_limit !== 5 ||
  manifest.authority_added !== false ||
  manifest.visual_approval?.required !== true ||
  manifest.visual_approval?.approved !== true ||
  manifest.visual_approval?.approved_by !== "ZoSo" ||
  manifest.visual_approval?.approved_date !== "2026-07-15" ||
  manifest.visual_approval?.surface !== "/app/#/earn" ||
  manifest.visual_approval?.account !== "zoso" ||
  manifest.visual_approval?.desktop_reviewed !== true ||
  manifest.visual_approval?.mobile_reviewed !== true ||
  manifest.visual_approval?.receipt_sha256 !==
    "fb8ee0189556fa1a47679f4f6400b227f032cf6eaea6fac63f22e91b1239e406"
) {
  fail("Wave 4 source manifest contract is incorrect");
}

const visualApproval = read(
  "docs/public/void-ui-wave4-earn-readonly-v1/VISUAL_APPROVAL.md"
);

for (const marker of [
  "Approved for staging and PR preparation",
  "Approved by:** ZoSo",
  "Desktop and narrow/mobile layouts were manually reviewed",
  "VOID_UI_WAVE4_EARN_READONLY_VISUAL_PREVIEW_CORRECTED_V2_GREEN",
  "fb8ee0189556fa1a47679f4f6400b227f032cf6eaea6fac63f22e91b1239e406",
  "pre-load/empty state",
]) {
  if (!visualApproval.includes(marker)) {
    fail(`Wave 4 visual approval evidence missing: ${marker}`);
  }
}

const exactSources = [
  "/wc/runner/status",
  "/wc/reward-stats",
  "/wc/redeemable",
  "/wc/production/balance",
  "/jobs",
  "/receipts",
  "/__void/participant/datanet-wc/status",
];

if (
  JSON.stringify(manifest.fixed_source_routes) !==
  JSON.stringify(exactSources)
) {
  fail("Wave 4 fixed source allowlist is incorrect");
}

const hashes = manifest.repository_hashes;

if (!hashes || typeof hashes !== "object" || Array.isArray(hashes)) {
  fail("Wave 4 repository hash map is missing");
}

if (
  Object.prototype.hasOwnProperty.call(
    hashes,
    "scripts/prove_void_ui_wave4_earn_readonly_v1.ts"
  )
) {
  fail("Wave 4 proof self-reference was not excluded");
}

for (const [relative, expected] of Object.entries(hashes)) {
  const target = path.join(root, relative);

  if (!fs.existsSync(target)) {
    fail(`Wave 4 repository hash target missing: ${relative}`);
  }

  const actual = createHash("sha256")
    .update(fs.readFileSync(target))
    .digest("hex");

  if (actual !== expected) {
    fail(`Wave 4 repository hash mismatch: ${relative}`);
  }
}

const wave1 = JSON.parse(
  read("docs/public/void-ui-wave1-foundation-v1/source-manifest.json")
);
const wave2 = JSON.parse(
  read("docs/public/void-ui-wave2-home-readonly-v1/source-manifest.json")
);
const wave3 = JSON.parse(
  read("docs/public/void-ui-wave3-wallet_readonly_v1/source-manifest.json")
);

if (
  wave1.wave4_earn_readonly_transition?.authority_added !== false ||
  wave2.wave4_earn_readonly?.authority_added !== false ||
  wave3.wave4_earn_readonly_transition?.authority_added !== false
) {
  fail("upstream Wave manifests do not bind the Wave 4 no-authority transition");
}

console.log("VOID_UI_WAVE4_EARN_READONLY_V1_GREEN");
