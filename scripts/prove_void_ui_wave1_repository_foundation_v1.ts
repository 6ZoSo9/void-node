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
const networkLiveJs = read(path.join(shellDir, "assets", "js", "network-live.js"));
const viewsJs = read(path.join(shellDir, "assets", "js", "views.js"));
const componentsCss = read(
  path.join(shellDir, "assets", "css", "components.css")
);

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
const historicalAdvancedScreenshot =
  sourceManifest.advanced_unavailable_controls_truth_repair
    ?.historical_screenshot_declassified;
const historicalAdvancedScreenshotPath =
  "screenshots/desktop-advanced-drawer-1440x900.png";
if (
  !historicalAdvancedScreenshot ||
  historicalAdvancedScreenshot.path !== historicalAdvancedScreenshotPath ||
  historicalAdvancedScreenshot.sha256 !==
    "320256fbd39a10ba03278be817e0cc59a573954efe0c5b2ce7beaccef9256e04" ||
  historicalAdvancedScreenshot.represents_source_before_repair !== true ||
  historicalAdvancedScreenshot.current_acceptance_evidence !== false
) {
  fail("stale Advanced screenshot declassification is missing");
}
if (
  Object.prototype.hasOwnProperty.call(
    payloadHashes,
    historicalAdvancedScreenshotPath
  )
) {
  fail("stale Advanced screenshot must not remain current payload evidence");
}
const historicalAdvancedScreenshotFile = payloadTarget(
  historicalAdvancedScreenshotPath
);
if (!fs.existsSync(historicalAdvancedScreenshotFile)) {
  fail("historical Advanced screenshot record is missing");
}
const historicalAdvancedScreenshotHash = createHash("sha256")
  .update(fs.readFileSync(historicalAdvancedScreenshotFile))
  .digest("hex");
if (historicalAdvancedScreenshotHash !== historicalAdvancedScreenshot.sha256) {
  fail("historical Advanced screenshot record changed");
}


if (
  !payloadHashes ||
  typeof payloadHashes !== "object" ||
  Array.isArray(payloadHashes) ||
  Object.keys(payloadHashes).length === 0
) {
  fail("source-manifest payload hashes are missing");
}

if (sourceManifest.payload_hashes_are_source_bundle_only !== true) {
  fail("source-package payload scope is missing");
}
for (const [relative, expected] of Object.entries(payloadHashes)) {
  payloadTarget(relative);
  if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
    fail(`source-package payload hash is invalid: ${relative}`);
  }
}

const repositoryHashes = sourceManifest.repository_hashes;
const requiredCurrentShellHashes = [
  "public/void-app-wave1-v1/index.html",
  "public/void-app-wave1-v1/assets/css/components.css",
  "public/void-app-wave1-v1/assets/js/app.js",
];
if (
  !repositoryHashes ||
  typeof repositoryHashes !== "object" ||
  Array.isArray(repositoryHashes)
) {
  fail("current repository hash map is missing");
}
for (const relative of requiredCurrentShellHashes) {
  const expected = repositoryHashes[relative];
  if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
    fail(`current repository hash is invalid: ${relative}`);
  }
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    fail(`current repository target is missing: ${relative}`);
  }
  const actual = createHash("sha256")
    .update(fs.readFileSync(target))
    .digest("hex");
  if (actual !== expected) {
    fail(`current repository hash mismatch: ${relative}`);
  }
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

for (const marker of [
  "const appShell = document.getElementById('app-shell');",
  "const modalBackgroundRoots = [",
  "document.querySelector('.skip-link'),",
  "document.querySelector('.prototype-banner'),",
  "appShell,",
  "function setModalBackgroundInert(value) {",
  "modalBackgroundRoots.forEach((element) => {",
  "element.inert = value;",
  "setModalBackgroundInert(true);",
  "setModalBackgroundInert(false);",
  "if (!activeLayer()) lastFocused = document.activeElement;",
]) {
  if (!appJs.includes(marker)) {
    fail(`missing modal background isolation marker: ${marker}`);
  }
}

type HtmlTagTokenV1 = {
  raw: string;
  end: number;
  closing: boolean;
  selfClosing: boolean;
  name: string;
};

const readHtmlTagTokenV1 = (
  documentText: string,
  start: number
): HtmlTagTokenV1 => {
  let quote: "'" | '"' | null = null;
  let end = start + 1;

  for (; end < documentText.length; end += 1) {
    const character = documentText[end];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === ">") break;
  }
  if (end >= documentText.length) fail("HTML tag is incomplete");

  const raw = documentText.slice(start, end + 1);
  const match = raw.match(/^<\s*(\/?)\s*([a-z][a-z0-9:-]*)\b/i);
  if (!match) fail(`unsupported HTML tag token: ${raw}`);

  return {
    raw,
    end: end + 1,
    closing: match[1] === "/",
    selfClosing: /\/\s*>$/.test(raw),
    name: match[2].toLowerCase(),
  };
};

const topLevelBodySurfaceOpenersV1 = (documentText: string): string[] => {
  const bodyStart = documentText.search(/<body\b/i);
  if (bodyStart < 0) fail("body element is missing");

  const bodyOpen = readHtmlTagTokenV1(documentText, bodyStart);
  if (bodyOpen.closing || bodyOpen.name !== "body") {
    fail("body opener is invalid");
  }

  const voidElements = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);
  const surfaces: string[] = [];
  let cursor = bodyOpen.end;
  let depth = 0;

  while (cursor < documentText.length) {
    const nextTagStart = documentText.indexOf("<", cursor);
    if (nextTagStart < 0) fail("body element is incomplete");

    if (documentText.startsWith("<!--", nextTagStart)) {
      const commentEnd = documentText.indexOf("-->", nextTagStart + 4);
      if (commentEnd < 0) fail("HTML comment is incomplete");
      cursor = commentEnd + 3;
      continue;
    }

    if (
      documentText.startsWith("<!", nextTagStart) ||
      documentText.startsWith("<?", nextTagStart)
    ) {
      const declarationEnd = documentText.indexOf(">", nextTagStart + 2);
      if (declarationEnd < 0) fail("HTML declaration is incomplete");
      cursor = declarationEnd + 1;
      continue;
    }

    const tag = readHtmlTagTokenV1(documentText, nextTagStart);
    if (tag.closing && tag.name === "body") {
      if (depth !== 0) fail("body closes before a nested element");
      return surfaces;
    }

    if (tag.closing) {
      if (depth === 0) fail(`unexpected direct closing tag: ${tag.raw}`);
      depth -= 1;
      cursor = tag.end;
      continue;
    }

    if (depth === 0 && tag.name !== "script") surfaces.push(tag.raw);

    if (tag.name === "script" && !tag.selfClosing) {
      const scriptClose = documentText
        .slice(tag.end)
        .match(/<\/script\s*>/i);
      if (!scriptClose || scriptClose.index === undefined) {
        fail("script element is incomplete");
      }
      cursor = tag.end + scriptClose.index + scriptClose[0].length;
      continue;
    }

    if (!tag.selfClosing && !voidElements.has(tag.name)) depth += 1;
    cursor = tag.end;
  }

  fail("body element is incomplete");
};

const directBodySurfaceIndentationRegression =
  topLevelBodySurfaceOpenersV1(`<body><nav id="direct-zero"></nav>
\t<main id="direct-tab"></main>
    <section id="direct-four-spaces"></section>
  <header id="direct-two-spaces"></header>
  <script type="module">const fake = '<aside id="script-fake"></aside>';</script>
  <div id="direct-wrapper"><aside id="nested-aside"></aside></div>
</body>`);
for (const marker of [
  'id="direct-zero"',
  'id="direct-tab"',
  'id="direct-four-spaces"',
  'id="direct-two-spaces"',
  'id="direct-wrapper"',
]) {
  if (
    directBodySurfaceIndentationRegression.filter((line) =>
      line.includes(marker)
    ).length !== 1
  ) {
    fail(`structural direct-body surface discovery missed: ${marker}`);
  }
}
for (const forbidden of ['id="script-fake"', 'id="nested-aside"']) {
  if (
    directBodySurfaceIndentationRegression.some((line) =>
      line.includes(forbidden)
    )
  ) {
    fail(`non-surface element entered direct-body inventory: ${forbidden}`);
  }
}
if (directBodySurfaceIndentationRegression.length !== 5) {
  fail("direct-body surface inventory must ignore scripts and nested elements");
}

const topLevelBodySurfaces = topLevelBodySurfaceOpenersV1(html);
const expectedTopLevelSurfaceMarkers = [
  'class="skip-link"',
  'class="prototype-banner"',
  'id="app-shell"',
  'id="overlay"',
  'id="advanced-drawer"',
  'id="notification-drawer"',
  'id="mobile-more"',
  'id="command-menu"',
  'id="toast-region"',
];

if (topLevelBodySurfaces.length !== expectedTopLevelSurfaceMarkers.length) {
  fail(
    `unexpected top-level body surface count: ${topLevelBodySurfaces.length}`
  );
}
for (const marker of expectedTopLevelSurfaceMarkers) {
  if (topLevelBodySurfaces.filter((line) => line.includes(marker)).length !== 1) {
    fail(`top-level body surface is missing or duplicated: ${marker}`);
  }
}

const rootsStart = appJs.indexOf("const modalBackgroundRoots = [");
const rootsEnd = appJs.indexOf("].filter(Boolean);", rootsStart);
if (rootsStart < 0 || rootsEnd < 0) {
  fail("modal background root declaration is incomplete");
}
const rootsBlock = appJs.slice(rootsStart, rootsEnd);
for (const marker of [
  "document.querySelector('.skip-link'),",
  "document.querySelector('.prototype-banner'),",
  "appShell,",
]) {
  if (!rootsBlock.includes(marker)) {
    fail(`non-modal background root is not isolated: ${marker}`);
  }
}
for (const forbidden of [
  "overlay",
  "advanced-drawer",
  "notification-drawer",
  "mobile-more",
  "command-menu",
  "toast-region",
]) {
  if (rootsBlock.includes(forbidden)) {
    fail(`active modal or intentionally live surface became inert: ${forbidden}`);
  }
}
if (
  !html.includes(
    '<div class="toast-region" aria-live="polite" aria-atomic="true" id="toast-region">'
  )
) {
  fail("intentional toast live region marker is missing");
}

const routeContainerTag =
  html.match(/<div\b[^>]*\bid=["']view-root["'][^>]*>/i)?.[0] ?? "";
if (!routeContainerTag) {
  fail("route content container is missing");
}
if (
  /\baria-live\s*=|\brole\s*=\s*["'](?:status|log|alert)["']/i.test(
    routeContainerTag
  )
) {
  fail("route content container must not be a live region");
}

for (const marker of [
  "const homeStatus = root.querySelector('[data-home-summary]');",
  "homeStatus.setAttribute('role', 'status');",
  "homeStatus.setAttribute('aria-live', 'polite');",
  "homeStatus.setAttribute('aria-atomic', 'true');",
]) {
  if (!appJs.includes(marker)) {
    fail(`Home async status live-region contract missing: ${marker}`);
  }
}

if (
  !networkLiveJs.includes(
    '<p data-network-live-summary role="status" aria-live="polite" aria-atomic="true">'
  )
) {
  fail("Network async status summary must remain a bounded polite atomic live region");
}

for (const marker of [
  '<p data-wallet-message role="status" aria-live="polite" aria-atomic="true">',
  '<p data-earn-message role="status" aria-live="polite" aria-atomic="true">',
]) {
  if (!viewsJs.includes(marker)) {
    fail(`Wallet/Earn async status live-region contract missing: ${marker}`);
  }
}

const inertOpenIndex = appJs.indexOf("setModalBackgroundInert(true);");
const modalFocusIndex = appJs.indexOf("target.querySelector('button, input, a')?.focus();");
const inertCloseIndex = appJs.indexOf("setModalBackgroundInert(false);");
const restoreFocusIndex = appJs.indexOf("focusTarget?.focus?.();");

if (inertOpenIndex > modalFocusIndex) {
  fail("modal focus moves before every background root becomes inert");
}
if (
  inertCloseIndex < 0 ||
  restoreFocusIndex < 0 ||
  inertCloseIndex > restoreFocusIndex
) {
  fail("focus restores before every background root leaves inert state");
}
if ((appJs.match(/setModalBackgroundInert\(true\);/g) ?? []).length !== 1) {
  fail("modal open must isolate all background roots exactly once");
}
if ((appJs.match(/setModalBackgroundInert\(false\);/g) ?? []).length !== 1) {
  fail("modal close must restore all background roots exactly once");
}
if (appJs.includes("requestAnimationFrame(() => target.querySelector")) {
  fail("modal focus must not remain in an inert background root for a frame");
}

const renderStart = appJs.indexOf("function render() {");
const renderEnd = appJs.indexOf("\nfunction setExpanded(", renderStart);
if (renderStart < 0 || renderEnd < 0) {
  fail("render function boundary is incomplete");
}
const renderBlock = appJs.slice(renderStart, renderEnd);
const routeCloseIndex = renderBlock.indexOf("closeAll(false);");
const routeFocusIndex = renderBlock.indexOf(
  "document.getElementById('app-main').focus({ preventScroll: true });"
);
if (routeCloseIndex < 0 || routeFocusIndex < 0 || routeCloseIndex > routeFocusIndex) {
  fail("route changes must close the active modal before focusing app-main");
}
if ((renderBlock.match(/closeAll\(false\);/g) ?? []).length !== 1) {
  fail("render must close the active modal exactly once");
}

const openLayerStart = appJs.indexOf("function openLayer(name) {");
const openLayerEnd = appJs.indexOf("\nfunction closeAll(", openLayerStart);
if (openLayerStart < 0 || openLayerEnd < 0) {
  fail("openLayer function boundary is incomplete");
}
const openLayerBlock = appJs.slice(openLayerStart, openLayerEnd);
if (
  !openLayerBlock.includes(
    "if (!activeLayer()) lastFocused = document.activeElement;"
  )
) {
  fail("layer transitions must preserve the original background opener");
}
if (
  (openLayerBlock.match(/lastFocused = document\.activeElement;/g) ?? [])
    .length !== 1
) {
  fail("openLayer must capture the background opener exactly once");
}

const closeAllStart = appJs.indexOf("function closeAll(restore = true) {");
const closeAllEnd = appJs.indexOf("\nfunction activeLayer(", closeAllStart);
if (closeAllStart < 0 || closeAllEnd < 0) {
  fail("closeAll function boundary is incomplete");
}
const closeAllBlock = appJs.slice(closeAllStart, closeAllEnd);
for (const marker of [
  "const hadActiveLayer = Boolean(activeLayer());",
  "const focusTarget = hadActiveLayer && restore ? lastFocused : null;",
  "lastFocused = null;",
  "focusTarget?.focus?.();",
]) {
  if (!closeAllBlock.includes(marker)) {
    fail(`closeAll missing one-shot restoration marker: ${marker}`);
  }
}
if (closeAllBlock.includes("lastFocused?.focus?.()")) {
  fail("closeAll retains stale reusable focus restoration");
}
if (
  !appJs.includes(
    "if (event.key === 'Escape' && activeLayer()) closeAll();"
  )
) {
  fail("Escape without an active layer must not restore stale focus");
}

const sameRouteCloseStart = appJs.indexOf(
  "function closeNavigationLayer(event) {"
);
const sameRouteCloseEnd = appJs.indexOf(
  "\ndocument.querySelectorAll('.command-results a, .mobile-more-grid a')",
  sameRouteCloseStart
);
if (sameRouteCloseStart < 0 || sameRouteCloseEnd < 0) {
  fail("same-route navigation close handler is incomplete");
}
const sameRouteCloseBlock = appJs.slice(sameRouteCloseStart, sameRouteCloseEnd);
for (const marker of [
  "const destinationHash = event.currentTarget.hash;",
  "closeAll(false);",
  "if (destinationHash === location.hash) {",
  "document.getElementById('app-main').focus({ preventScroll: true });",
]) {
  if (!sameRouteCloseBlock.includes(marker)) {
    fail(`same-route navigation close handler missing: ${marker}`);
  }
}
if (
  sameRouteCloseBlock.indexOf("closeAll(false);") >
  sameRouteCloseBlock.indexOf(
    "document.getElementById('app-main').focus({ preventScroll: true });"
  )
) {
  fail("same-route navigation must close the modal before moving focus");
}
if (
  !appJs.includes(
    "link.addEventListener('click', closeNavigationLayer);"
  )
) {
  fail("command and mobile navigation links must share the same-route focus repair");
}

const commandMenuHtmlStart = html.indexOf(
  '<div class="command-menu" id="command-menu"'
);
const commandMenuHtmlEnd = html.indexOf(
  '\n  </div>\n\n  <div class="toast-region"',
  commandMenuHtmlStart
);
if (commandMenuHtmlStart < 0 || commandMenuHtmlEnd < 0) {
  fail("command menu markup boundary is incomplete");
}
const commandMenuHtml = html.slice(commandMenuHtmlStart, commandMenuHtmlEnd);
for (const marker of [
  'id="command-search"',
  'autocomplete="off"',
  'aria-describedby="command-search-help command-empty"',
  'aria-controls="command-results"',
  'id="command-results"',
  'id="command-empty"',
  'role="status"',
  'aria-live="polite"',
  'aria-atomic="true"',
  'hidden>No matching destinations.</p>',
]) {
  if (!commandMenuHtml.includes(marker)) {
    fail(`command search accessibility contract missing: ${marker}`);
  }
}

const commandMenuPrimaryRoutes = [
  "home",
  "wallet",
  "earn",
  "data",
  "buy",
  "validate",
  "network",
];
for (const route of commandMenuPrimaryRoutes) {
  const marker = `href="#/${route}"`;
  if (commandMenuHtml.split(marker).length - 1 !== 1) {
    fail(`command menu primary destination missing or duplicated: ${route}`);
  }
}
if (
  !commandMenuHtml.includes(
    '<a href="#/validate">Validate <span>Eligibility and readiness</span></a>'
  )
) {
  fail("command search must expose the existing Validate destination");
}
const commandDestinationLinks =
  commandMenuHtml.match(/<a href="#\/[a-z-]+">/g) ?? [];
if (commandDestinationLinks.length !== 8) {
  fail(`unexpected command destination count: ${commandDestinationLinks.length}`);
}
const commandValidateRepair =
  sourceManifest.command_search_validate_destination_repair;
if (
  commandValidateRepair?.date !== "2026-10-23" ||
  commandValidateRepair?.surface !== "command-menu" ||
  commandValidateRepair?.route !== "#/validate" ||
  commandValidateRepair?.primary_destination !== true ||
  commandValidateRepair?.destinations_after_repair !== 8 ||
  commandValidateRepair?.authority_added !== false
) {
  fail("command Validate destination repair manifest is invalid");
}

const commandFilterStart = appJs.indexOf("function filterCommandResults() {");
const commandFilterEnd = appJs.indexOf(
  "\nfunction currentRoute() {",
  commandFilterStart
);
if (commandFilterStart < 0 || commandFilterEnd < 0) {
  fail("command search filter boundary is incomplete");
}
const commandFilterBlock = appJs.slice(commandFilterStart, commandFilterEnd);
for (const marker of [
  "const query = normalizeCommandQuery(commandSearch.value);",
  "normalizeCommandQuery(link.textContent).includes(query)",
  "link.hidden = !matches;",
  "commandEmpty.hidden = visibleCount !== 0;",
  "commandSearch.value = '';",
  "filterCommandResults();",
]) {
  if (!commandFilterBlock.includes(marker)) {
    fail(`command search filter missing: ${marker}`);
  }
}
if (commandFilterBlock.includes("toLocaleLowerCase")) {
  fail("command search normalization must not depend on the host locale");
}
const normalizeCommandQueryMarker = "function normalizeCommandQuery(value) {";
const normalizeCommandQueryStart = appJs.indexOf(normalizeCommandQueryMarker);
const normalizeCommandQuerySecond = appJs.indexOf(
  normalizeCommandQueryMarker,
  normalizeCommandQueryStart + normalizeCommandQueryMarker.length
);
if (
  normalizeCommandQueryStart < 0 ||
  normalizeCommandQueryStart >= commandFilterStart ||
  normalizeCommandQuerySecond >= 0
) {
  fail("command search normalization helper boundary is invalid");
}
const normalizeCommandQueryEnd = appJs.indexOf(
  "\n}",
  normalizeCommandQueryStart
);
if (
  normalizeCommandQueryEnd < 0 ||
  normalizeCommandQueryEnd >= commandFilterStart
) {
  fail("command search normalization helper boundary is invalid");
}
const normalizeCommandQueryBlock = appJs.slice(
  normalizeCommandQueryStart,
  normalizeCommandQueryEnd + 2
);
if (normalizeCommandQueryBlock.includes("toLocaleLowerCase")) {
  fail("command search normalization helper must not depend on the host locale");
}
const normalizeCommandQueryMatch = normalizeCommandQueryBlock.match(
  /function normalizeCommandQuery\(value\) \{\n([\s\S]*?)\n\}/
);
if (!normalizeCommandQueryMatch) {
  fail("command search normalization helper is missing");
}
const normalizeCommandQuery = new Function(
  "value",
  normalizeCommandQueryMatch[1]
) as (value: string) => string;

for (const [input, expected] of [
  [" VOID ", "void"],
  ["I", "i"],
  ["İ", "i\u0307"],
]) {
  if (normalizeCommandQuery(input) !== expected) {
    fail(`command search normalization regression: ${JSON.stringify(input)}`);
  }
}

for (const marker of [
  "if (name === 'command') resetCommandSearch();",
  "commandSearch.addEventListener('input', filterCommandResults);",
  "if (!['Enter', 'ArrowDown'].includes(event.key)) return;",
  "const firstVisible = filterCommandResults()[0];",
  "if (event.key === 'Enter') firstVisible.click();",
  "else firstVisible.focus();",
]) {
  if (!appJs.includes(marker)) {
    fail(`command search keyboard/reset contract missing: ${marker}`);
  }
}
for (const marker of [
  ".command-results a[hidden] { display: none; }",
  ".command-empty {",
]) {
  if (!componentsCss.includes(marker)) {
    fail(`command search CSS contract missing: ${marker}`);
  }
}

const advancedSettingsStart = html.indexOf(
  '<div class="settings-list" role="list">'
);
const advancedSettingsEnd = html.indexOf(
  "\n      </div>\n    </div>\n  </aside>",
  advancedSettingsStart
);
if (advancedSettingsStart < 0 || advancedSettingsEnd < 0) {
  fail("Advanced availability list is incomplete");
}
const advancedSettingsBlock = html.slice(
  advancedSettingsStart,
  advancedSettingsEnd
);
if (/<button\b/i.test(advancedSettingsBlock)) {
  fail("unavailable Advanced destinations must not remain enabled controls");
}
for (const name of ["Records", "Diagnostics", "Operator tools", "Developer"]) {
  const marker =
    `<div class="settings-list__item" role="listitem"><span><strong>${name}</strong>`;
  if (!advancedSettingsBlock.includes(marker)) {
    fail(`Advanced availability item missing: ${name}`);
  }
}
if (
  (advancedSettingsBlock.match(/Unavailable in the public app\./g) ?? [])
    .length !== 4
) {
  fail("every unavailable Advanced destination needs participant-facing copy");
}
if (
  (
    advancedSettingsBlock.match(
      /class="status-chip status-chip--warning" aria-hidden="true">Unavailable<\/span>/g
    ) ?? []
  ).length !== 4
) {
  fail("every unavailable Advanced destination needs one visible status");
}
for (const marker of [
  ".settings-list button, .settings-list__item {",
  ".settings-list__item > span:first-child",
  ".settings-list__item .status-chip { flex: none; }",
]) {
  if (!componentsCss.includes(marker)) {
    fail(`Advanced availability styling missing: ${marker}`);
  }
}

const drawerStyle = componentsCss.match(/\.drawer\s*\{([^}]*)\}/)?.[1] ?? "";
for (const marker of [
  "top: 0;",
  "bottom: 0;",
  "overflow-y: auto;",
  "overscroll-behavior: contain;",
]) {
  if (!drawerStyle.includes(marker)) {
    fail(`Advanced drawer short-viewport scroll boundary missing: ${marker}`);
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
  "connect-src 'self'",
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
