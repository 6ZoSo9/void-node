import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const shellDir = path.join(root, "public", "void-app-wave1-v1");
const docsDir = path.join(
  root,
  "docs",
  "public",
  "void-ui-wave1-foundation-v1"
);
const modulePath = path.join(
  root,
  "src",
  "ui",
  "void_app_wave1_foundation_v1.ts"
);
const indexPath = path.join(root, "src", "index.ts");

const fail = (message: string): never => {
  throw new Error(`VOID_UI_WAVE1_REPOSITORY_FOUNDATION_V1_FAIL: ${message}`);
};

const read = (file: string): string => fs.readFileSync(file, "utf8");
const moduleText = read(modulePath);
const indexText = read(indexPath);
const html = read(path.join(shellDir, "index.html"));
const appJs = read(path.join(shellDir, "assets", "js", "app.js"));
const viewsJs = read(path.join(shellDir, "assets", "js", "views.js"));

const requiredShellFiles = [
  "index.html",
  "assets/css/tokens.css",
  "assets/css/base.css",
  "assets/css/layout.css",
  "assets/css/components.css",
  "assets/css/views.css",
  "assets/css/responsive.css",
  "assets/css/main.css",
  "assets/js/app.js",
  "assets/js/views.js",
];

for (const file of requiredShellFiles) {
  if (!fs.existsSync(path.join(shellDir, file))) {
    fail(`missing shell file: ${file}`);
  }
}

const requiredDocs = [
  "PRODUCT_ARCHITECTURE_V1.md",
  "WAVE1_FOUNDATION_SPEC.md",
  "VISUAL_REVIEW_CHECKLIST.md",
  "LITERATURE_NOTES.md",
  "AUDIT_REPORT.md",
  "audit.json",
  "REVIEW_PACKAGE.md",
  "APPROVAL_RECORD.md",
  "source-manifest.json",
];

for (const file of requiredDocs) {
  if (!fs.existsSync(path.join(docsDir, file))) {
    fail(`missing review document: ${file}`);
  }
}

const screenshots = [
  "desktop-home-1440x900.png",
  "desktop-foundation-1280x800.png",
  "tablet-home-768x1024.png",
  "mobile-home-390x844.png",
  "mobile-home-full-390.png",
  "mobile-network-320x568.png",
  "desktop-advanced-drawer-1440x900.png",
  "mobile-more-390x844.png",
];

for (const file of screenshots) {
  const target = path.join(docsDir, "screenshots", file);
  if (!fs.existsSync(target)) fail(`missing screenshot: ${file}`);
  if (fs.statSync(target).size < 20_000) {
    fail(`screenshot is unexpectedly small: ${file}`);
  }
}

const sourceManifest = JSON.parse(
  read(path.join(docsDir, "source-manifest.json"))
);

if (
  sourceManifest.source_package_sha256 !==
  "b9faf2a7b8058c9925dab4fbf7b075b07680fc7454521fc44f55bc54887fda3c"
) {
  fail("approved source package SHA mismatch");
}
if (sourceManifest.approved !== true) fail("approval provenance missing");

const payloadTarget = (relative: string): string => {
  if (relative.startsWith("prototype/")) {
    return path.join(
      root,
      "public",
      "void-app-wave1-v1",
      relative.slice("prototype/".length)
    );
  }

  if (relative.startsWith("docs/")) {
    return path.join(
      docsDir,
      relative.slice("docs/".length)
    );
  }

  if (relative.startsWith("screenshots/")) {
    return path.join(
      docsDir,
      "screenshots",
      relative.slice("screenshots/".length)
    );
  }

  fail(`unknown source-manifest payload path: ${relative}`);
};

const payloadHashes = sourceManifest.payload_files;

if (
  !payloadHashes ||
  typeof payloadHashes !== "object" ||
  Array.isArray(payloadHashes) ||
  Object.keys(payloadHashes).length === 0
) {
  fail("source-manifest payload hashes are missing");
}

for (const [relative, expected] of Object.entries(payloadHashes)) {
  const target = payloadTarget(relative);

  if (!fs.existsSync(target)) {
    fail(`source-manifest target missing: ${relative}`);
  }

  const actual = createHash("sha256")
    .update(fs.readFileSync(target))
    .digest("hex");

  if (actual !== expected) {
    fail(`source-manifest hash mismatch: ${relative}`);
  }
}

if (
  sourceManifest.repository_hashes_refreshed_after_whitespace_cleanup !== true
) {
  fail("repository hash refresh provenance is missing");
}


const destinations = [
  "home",
  "wallet",
  "earn",
  "data",
  "buy",
  "validate",
  "network",
];

for (const route of destinations) {
  if (!html.includes(`data-route="${route}"`)) {
    fail(`missing destination: ${route}`);
  }
}

const combined = [
  html,
  appJs,
  viewsJs,
  ...[
    "assets/css/base.css",
    "assets/css/layout.css",
    "assets/css/components.css",
    "assets/css/responsive.css",
  ].map((file) => read(path.join(shellDir, file))),
].join("\n");

for (const marker of [
  "mobile-nav",
  "Advanced",
  "Notification",
  "skip-link",
  "aria-live",
  "aria-modal",
  "prefers-reduced-motion",
]) {
  if (!combined.toLowerCase().includes(marker.toLowerCase())) {
    fail(`missing shell/accessibility marker: ${marker}`);
  }
}

const combinedFrontend = `${html}\n${appJs}\n${viewsJs}`;

for (const forbidden of [
  "fetch(",
  "XMLHttpRequest",
  "WebSocket",
  "/wc/",
  "/jobs/",
  "/datanet/",
  "/buy-void",
  "/validator/",
  "window.ethereum",
]) {
  if (combinedFrontend.includes(forbidden)) {
    fail(`feature or API logic found: ${forbidden}`);
  }
}

if (/<script[^>]*>[^<]/i.test(html)) fail("inline script behavior found");
if (/\son[a-z]+\s*=/i.test(html)) fail("inline event behavior found");
if (/\sstyle\s*=/i.test(combinedFrontend)) fail("inline style attribute found");

for (const cssFile of [
  "tokens.css",
  "base.css",
  "layout.css",
  "components.css",
  "views.css",
  "responsive.css",
  "main.css",
]) {
  const css = read(path.join(shellDir, "assets", "css", cssFile));
  if (css.includes("!important")) fail(`!important found in ${cssFile}`);
}

for (const marker of [
  'const ROUTE_PREFIX = "/app"',
  'const STATUS_ROUTE = "/__void/ui/wave1-foundation-v1/status.json"',
  'const ROUTE_MARKER = "VOID_UI_WAVE1_REPOSITORY_FOUNDATION_V1"',
  '"Content-Security-Policy"',
  "connect-src 'none'",
  '"X-Frame-Options"',
  '"Permissions-Policy"',
  '"Cross-Origin-Opener-Policy"',
  'error: "method_not_allowed"',
  'allowed: ["GET", "HEAD"]',
  "loopback_only: true",
  "api_calls: false",
  "feature_logic: false",
  "root_replaced: false",
  "participant_replaced: false",
  "public_node_replaced: false",
  "wallet_send: false",
  "ledger_write: false",
  "fulfillment: false",
  "wc_to_void: false",
  "money_movement: false",
]) {
  if (!moduleText.includes(marker)) {
    fail(`route boundary missing: ${marker}`);
  }
}

for (const forbidden of [
  "app.post(",
  "app.put(",
  "app.patch(",
  "app.delete(",
  "removeExact(",
  '"/participant"',
  '"/public-node"',
  '"/buy-void"',
  "appendFileSync",
  "writeFileSync",
]) {
  if (moduleText.includes(forbidden)) {
    fail(`forbidden module marker: ${forbidden}`);
  }
}

const loader = 'require("./ui/void_app_wave1_foundation_v1");';
const loaderCount = indexText.split(loader).length - 1;
if (loaderCount !== 1) fail(`expected one shell loader, found ${loaderCount}`);

for (const existing of [
  'app.get("/participant"',
  'APP.get("/public-node',
  'app.get("/public-node',
]) {
  if (!indexText.includes(existing)) {
    fail(`existing route family missing: ${existing}`);
  }
}


if (moduleText.includes("app.get(ROUTE_PREFIX")) {
  fail("non-strict /app redirect route was restored");
}

for (const marker of [
  "req?.originalUrl ||",
  "req?.url ||",
  'if (pathname !== ROUTE_PREFIX) return next();',
  'return res.redirect(302, `${ROUTE_PREFIX}/`);',
]) {
  if (!moduleText.includes(marker)) {
    fail(`exact /app redirect guard missing: ${marker}`);
  }
}

console.log("VOID_UI_WAVE1_REPOSITORY_FOUNDATION_V1_GREEN");
