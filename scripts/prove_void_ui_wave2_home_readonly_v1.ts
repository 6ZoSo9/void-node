import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const shellDir = path.join(root, "public", "void-app-wave1-v1");
const modulePath = path.join(
  root,
  "src",
  "ui",
  "void_app_wave2_home_readonly_v1.ts"
);
const wave1ModulePath = path.join(
  root,
  "src",
  "ui",
  "void_app_wave1_foundation_v1.ts"
);
const indexPath = path.join(root, "src", "index.ts");
const docsDir = path.join(
  root,
  "docs",
  "public",
  "void-ui-wave2-home-readonly-v1"
);

const fail = (message: string): never => {
  throw new Error(`VOID_UI_WAVE2_HOME_READONLY_V1_FAIL: ${message}`);
};

const read = (file: string): string => fs.readFileSync(file, "utf8");

const moduleText = read(modulePath);
const wave1ModuleText = read(wave1ModulePath);
const indexText = read(indexPath);
const html = read(path.join(shellDir, "index.html"));
const views = read(path.join(shellDir, "assets", "js", "views.js"));
const homeLive = read(path.join(shellDir, "assets", "js", "home-live.js"));
const viewsCss = read(path.join(shellDir, "assets", "css", "views.css"));

for (const file of [
  "README.md",
  "ADAPTER_CONTRACT.md",
  "ACCEPTANCE_CRITERIA.md",
  "VISUAL_APPROVAL.md",
  "source-manifest.json",
]) {
  if (!fs.existsSync(path.join(docsDir, file))) {
    fail(`missing Wave 2 review document: ${file}`);
  }
}

for (const marker of [
  'const HOME_ROUTE = "/__void/ui/wave2/home.json"',
  'const STATUS_ROUTE = "/__void/ui/wave2-home-v1/status.json"',
  'const ROUTE_MARKER = "VOID_UI_WAVE2_HOME_READONLY_V1"',
  'process.env.VOID_UI_HOME_SOURCE_BASE',
  'parsed.hostname === "127.0.0.1"',
  'parsed.hostname === "localhost"',
  'parsed.hostname === "::1"',
  'fetchJson(base, "/health")',
  'fetchJson(base, "/__void/ready.json")',
  'fetchJson(base, "/blocks/latest/number2.json")',
  'fetchJson(base, "/p2p/peers")',
  'account: {\n        selected: false',
  'balances: {\n        available: false',
  'wallet_send: false',
  'ledger_write: false',
  'fulfillment: false',
  'wc_to_void: false',
  'validator_mutation: false',
  'operator_mutation: false',
  'money_movement: false',
]) {
  if (!moduleText.includes(marker)) {
    fail(`adapter boundary missing: ${marker}`);
  }
}

for (const forbidden of [
  "app.post(",
  "app.put(",
  "app.patch(",
  "app.delete(",
  "appendFileSync",
  "writeFileSync",
  "removeExact(",
  '"/participant"',
  '"/public-node"',
  '"/buy-void"',
  '"/wc/credit"',
  '"/wc/transfer"',
  '"/tx/submit"',
]) {
  if (moduleText.includes(forbidden)) {
    fail(`forbidden adapter marker: ${forbidden}`);
  }
}

if (!wave1ModuleText.includes("connect-src 'self'")) {
  fail("application CSP does not allow same-origin read-only adapters");
}

if (wave1ModuleText.includes("connect-src 'none'")) {
  fail("obsolete Wave 1 connect-src none policy remains");
}

for (const marker of [
  '<script type="module" src="./assets/js/home-live.js"></script>',
  'data-network-context-label',
  'data-node-footer-name',
  'No account',
  'Select in Wallet',
]) {
  if (!html.includes(marker)) {
    fail(`shell integration marker missing: ${marker}`);
  }
}

for (const marker of [
  "data-home-view",
  "data-home-refresh",
  "data-home-state-chip",
  "data-home-head-value",
  "data-home-peers-value",
  "data-home-production-wc",
]) {
  if (!views.includes(marker)) {
    fail(`Home view binding missing: ${marker}`);
  }
}

for (const marker of [
  "const HOME_ENDPOINT = '/__void/ui/wave2/home.json'",
  "method: 'GET'",
  "cache: 'no-store'",
  "credentials: 'same-origin'",
  "AbortSignal.timeout(5000)",
  "snapshot.marker !== HOME_MARKER",
  "No cached or invented values are shown",
]) {
  if (!homeLive.includes(marker)) {
    fail(`Home client boundary missing: ${marker}`);
  }
}

const fetchCount = homeLive.split("fetch(").length - 1;
if (fetchCount !== 1) {
  fail(`expected exactly one frontend fetch call, found ${fetchCount}`);
}

for (const forbidden of [
  "localStorage",
  "sessionStorage",
  "WebSocket",
  "XMLHttpRequest",
  "window.ethereum",
  "/wc/",
  "/datanet/",
  "/buy-void",
  "/validator/",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]) {
  if (homeLive.includes(forbidden)) {
    fail(`forbidden Home client marker: ${forbidden}`);
  }
}

const homeStart = views.indexOf("  home: () => `");
const homeEnd = views.indexOf("\n\n  wallet: () =>", homeStart);
if (homeStart < 0 || homeEnd < 0) {
  fail("could not isolate the Home view");
}
const homeViewText = views.slice(homeStart, homeEnd);

for (const fake of [
  "Good morning, ZoSo.",
  "0x8c99…bed7",
  "Production work verified",
  "+1 WC",
  "Dataset published",
  "1,856,587",
]) {
  if (homeViewText.includes(fake) || html.includes(fake)) {
    fail(`representative value remains in live Home surface: ${fake}`);
  }
}

if (!viewsCss.includes(".home-live-grid")) {
  fail("Wave 2 Home layout styles are missing");
}

const loader = 'require("./ui/void_app_wave2_home_readonly_v1");';
const loaderCount = indexText.split(loader).length - 1;
if (loaderCount !== 1) {
  fail(`expected one Wave 2 loader, found ${loaderCount}`);
}

for (const existing of [
  'app.get("/participant"',
  'APP.get("/public-node',
  'app.get("/public-node',
]) {
  if (!indexText.includes(existing)) {
    fail(`existing route family missing: ${existing}`);
  }
}


const approvalManifest = JSON.parse(
  read(path.join(docsDir, "source-manifest.json"))
);

if (
  approvalManifest.visual_approval?.approved !== true ||
  approvalManifest.visual_approval?.approved_by !== "ZoSo" ||
  approvalManifest.visual_approval?.surface !== "/app/#/home" ||
  approvalManifest.visual_approval?.receipt_sha256 !==
    "964f5d6977702ed3aa60f6dd7416f4845a9b3dd8d4e64cf4cbb9dadeffb237ff"
) {
  fail("Wave 2 visual approval provenance is missing or incorrect");
}

const visualApproval = read(path.join(docsDir, "VISUAL_APPROVAL.md"));

for (const marker of [
  "Approved for staging and PR preparation",
  "looks much better",
  "No wallet send, ledger write, fulfillment, WC-to-VOID",
]) {
  if (!visualApproval.includes(marker)) {
    fail(`visual approval evidence missing: ${marker}`);
  }
}

const repositoryManifest = JSON.parse(
  read(path.join(docsDir, "source-manifest.json"))
);

const repositoryHashes = repositoryManifest.repository_hashes;

const selfHashExcluded =
  repositoryManifest.repository_hash_self_reference_excluded;

if (
  selfHashExcluded !== "scripts/prove_void_ui_wave2_home_readonly_v1.ts" ||
  repositoryManifest.repository_hashes_refreshed_after_self_reference_fix !== true ||
  Object.prototype.hasOwnProperty.call(
    repositoryHashes ?? {},
    selfHashExcluded
  )
) {
  fail("Wave 2 proof self-hash exclusion is missing or incorrect");
}

if (
  repositoryManifest.repository_hashes_refreshed_after_visual_approval !== true ||
  repositoryManifest.repository_hashes_refreshed_date !== "2026-07-14" ||
  !repositoryHashes ||
  typeof repositoryHashes !== "object" ||
  Array.isArray(repositoryHashes) ||
  Object.keys(repositoryHashes).length === 0
) {
  fail("Wave 2 repository hash map is missing or stale");
}

for (const [relative, expected] of Object.entries(repositoryHashes)) {
  const target = path.join(root, relative);

  if (!fs.existsSync(target)) {
    fail(`Wave 2 repository hash target missing: ${relative}`);
  }

  const actual = createHash("sha256")
    .update(fs.readFileSync(target))
    .digest("hex");

  if (actual !== expected) {
    fail(`Wave 2 repository hash mismatch: ${relative}`);
  }
}
console.log("VOID_UI_WAVE2_HOME_READONLY_V1_GREEN");
