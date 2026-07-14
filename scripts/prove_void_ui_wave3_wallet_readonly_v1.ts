import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();

function fail(message: string): never {
  throw new Error(`VOID_UI_WAVE3_WALLET_READONLY_V1_FAIL: ${message}`);
}

function read(relative: string): string {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

const moduleSource = read("src/ui/void_app_wave3_wallet_readonly_v1.ts");
const client = read("public/void-app-wave1-v1/assets/js/wallet-live.js");
const views = read("public/void-app-wave1-v1/assets/js/views.js");
const css = read("public/void-app-wave1-v1/assets/css/views.css");
const indexHtml = read("public/void-app-wave1-v1/index.html");
const wave2Module = read("src/ui/void_app_wave2_home_readonly_v1.ts");

for (const marker of [
  'const ROUTE_MARKER = "VOID_UI_WAVE3_WALLET_READONLY_V1"',
  'const WALLET_ROUTE = "/__void/ui/wave3/wallet.json"',
  'const STATUS_ROUTE = "/__void/ui/wave3-wallet-v1/status.json"',
  'const ACCOUNT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/',
  'value === "127.0.0.1"',
  'value === "::1"',
  'method !== "GET" && method !== "HEAD"',
  '"/__void/participant/wallet/status"',
  '"/wc/balance"',
  '"/wc/production/balance"',
  "sanitized_source_bodies: true",
  "wallet_connection: false",
  "wallet_mutation: false",
  "ledger_write: false",
  "money_movement: false",
]) {
  if (!moduleSource.includes(marker)) {
    fail(`server marker missing: ${marker}`);
  }
}

for (const forbidden of [
  "/__void/participant/wallet/create",
  "/__void/participant/wallet/import",
  "/__void/participant/wallet/unlock",
  "/__void/participant/wallet/export",
  "/__void/participant/wallet/send-void",
  "/__void/participant/wallet/trade/wc-to-void",
  "privateKey",
  "ciphertext",
  "mnemonic",
]) {
  if (moduleSource.includes(forbidden)) {
    fail(`server contains forbidden capability or secret marker: ${forbidden}`);
  }
}

const adapterFetches = [
  ...client.matchAll(/fetch\(\s*([`'"])(.*?)\1/gms),
].map((match) => match[2]);

if (
  adapterFetches.length !== 1 ||
  !adapterFetches[0].includes("/__void/ui/wave3/wallet.json?account=")
) {
  fail(`frontend must fetch exactly one Wave 3 adapter, found ${adapterFetches.length}`);
}

for (const forbidden of [
  "window.ethereum",
  "globalThis.ethereum",
  "new Wallet(",
  "ethers",
  "web3",
  "sendTransaction",
  "personal_sign",
  "eth_sendTransaction",
  "/__void/participant/wallet/",
  "/wc/balance",
  "/wc/production/balance",
]) {
  if (client.includes(forbidden)) {
    fail(`frontend contains forbidden direct wallet/source marker: ${forbidden}`);
  }
}

for (const marker of [
  "function walletView()",
  "data-wallet-account-form",
  "data-wallet-account-input",
  "data-wallet-void-balance",
  "data-wallet-ledger-wc",
  "data-wallet-production-wc",
  "No authority",
  "No verified read-only VOID balance source yet",
]) {
  if (!views.includes(marker)) {
    fail(`Wallet view marker missing: ${marker}`);
  }
}

if (views.includes("wallet: () => placeholderView('Wallet'")) {
  fail("Wallet placeholder remains active");
}

for (const marker of [
  "./assets/js/wallet-live.js",
  "./assets/js/home-live.js",
]) {
  if (!indexHtml.includes(marker)) {
    fail(`application script marker missing: ${marker}`);
  }
}

for (const marker of [
  ".wallet-account-form",
  ".wallet-facts",
  ".wallet-source-details",
]) {
  if (!css.includes(marker)) {
    fail(`Wallet CSS marker missing: ${marker}`);
  }
}

if (
  !wave2Module.startsWith(
    'import "./void_app_wave3_wallet_readonly_v1.js";'
  )
) {
  fail("Wave 3 module import is not anchored in the deployed app module");
}

for (const relative of [
  "docs/public/void-ui-wave3-wallet-readonly-v1/README.md",
  "docs/public/void-ui-wave3-wallet-readonly-v1/ADAPTER_CONTRACT.md",
  "docs/public/void-ui-wave3-wallet-readonly-v1/ACCEPTANCE_CRITERIA.md",
  "docs/public/void-ui-wave3-wallet-readonly-v1/source-manifest.json",
]) {
  if (!fs.existsSync(path.join(root, relative))) {
    fail(`Wave 3 document missing: ${relative}`);
  }
}

const manifest = JSON.parse(
  read("docs/public/void-ui-wave3-wallet-readonly-v1/source-manifest.json")
);

if (
  manifest.marker !== "VOID_UI_WAVE3_WALLET_READONLY_V1" ||
  manifest.base !== "c2441e3514d47006c3256158f694a8f2dbc8c056" ||
  manifest.account_input_kind !== "participant_account_id" ||
  manifest.loopback_only !== true ||
  manifest.get_head_only !== true ||
  manifest.authority_added !== false
) {
  fail("Wave 3 source manifest contract is incorrect");
}

const hashes = manifest.repository_hashes;

if (!hashes || typeof hashes !== "object" || Array.isArray(hashes)) {
  fail("Wave 3 repository hash map is missing");
}

for (const [relative, expected] of Object.entries(hashes)) {
  const target = path.join(root, relative);

  if (!fs.existsSync(target)) {
    fail(`Wave 3 repository hash target missing: ${relative}`);
  }

  const actual = createHash("sha256")
    .update(fs.readFileSync(target))
    .digest("hex");

  if (actual !== expected) {
    fail(`Wave 3 repository hash mismatch: ${relative}`);
  }
}

console.log("VOID_UI_WAVE3_WALLET_READONLY_V1_GREEN");
