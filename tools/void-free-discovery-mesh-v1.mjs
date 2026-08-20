#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MARKER = "VOID_FREE_DISCOVERY_MESH_V1";
export const CONFIRMATION = "buildVoidFreeDiscoveryMeshV1";

export const PUBLIC_PATHS = Object.freeze([
  "/",
  "/discovery/",
  "/public-node",
  "/.well-known/void-public-node.json",
  "/.well-known/void-agent-discovery.json",
]);

export const CRAWLER_EXCLUSIONS = Object.freeze([
  "/admin/",
  "/internal/",
  "/operator/",
  "/private/",
  "/debug/",
  "/metrics",
]);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const CONFIG_PATH = path.join(REPO_ROOT, "config/void-free-discovery-mesh-v1.json");
const PROC_FD_ROOT = "/proc/self/fd";

export class Hold extends Error {
  constructor(message) {
    super(message);
    this.name = "Hold";
  }
}

function fail(message) {
  throw new Hold(message);
}

function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function ensureDescriptorRelativeFs() {
  let metadata;
  try {
    metadata = fs.statSync(PROC_FD_ROOT);
  } catch {
    fail("descriptor-relative filesystem authority requires /proc/self/fd");
  }
  if (!metadata.isDirectory()) {
    fail("descriptor-relative filesystem authority requires /proc/self/fd");
  }
}

function identityOf(metadata) {
  return Object.freeze({ dev: metadata.dev, ino: metadata.ino });
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function stableFileSnapshot(metadata) {
  return Object.freeze({
    dev: metadata.dev,
    ino: metadata.ino,
    size: metadata.size,
    mtimeNs: metadata.mtimeNs,
    ctimeNs: metadata.ctimeNs,
  });
}

function sameFileSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function procFdPath(fd, child = "") {
  const base = path.join(PROC_FD_ROOT, String(fd));
  return child ? path.join(base, child) : base;
}

function safeLeaf(name, label) {
  if (!name || name !== path.basename(name) || name === "." || name === "..") {
    fail(`${label} is not a safe leaf name`);
  }
  return name;
}

export function readPinnedUtf8RegularFile(
  filename,
  label = "file",
  { afterOpen = null } = {},
) {
  ensureDescriptorRelativeFs();
  const resolved = path.resolve(String(filename ?? ""));
  let fd;
  try {
    fd = fs.openSync(
      resolved,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
    );
  } catch {
    fail(`${label} must be an existing regular non-symlink file: ${resolved}`);
  }

  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile()) {
      fail(`${label} must be a regular non-symlink file: ${resolved}`);
    }
    const beforeSnapshot = stableFileSnapshot(before);

    if (afterOpen !== null) {
      if (typeof afterOpen !== "function") fail(`${label} afterOpen hook must be a function`);
      afterOpen({ path: resolved });
    }

    const text = fs.readFileSync(fd, "utf8");
    const after = fs.fstatSync(fd, { bigint: true });
    if (!after.isFile() || !sameFileSnapshot(beforeSnapshot, stableFileSnapshot(after))) {
      fail(`${label} changed while being read`);
    }

    let current;
    try {
      current = fs.lstatSync(resolved, { bigint: true });
    } catch {
      fail(`${label} path changed generation while being read`);
    }
    if (
      !current.isFile()
      || current.isSymbolicLink()
      || !sameFileSnapshot(beforeSnapshot, stableFileSnapshot(current))
    ) {
      fail(`${label} path changed generation while being read`);
    }

    return Object.freeze({
      path: resolved,
      text,
      sha256: sha256(text),
      identity: identityOf(before),
    });
  } finally {
    fs.closeSync(fd);
  }
}

function openPinnedDirectory(directory, label) {
  ensureDescriptorRelativeFs();
  const absolute = path.resolve(String(directory ?? ""));
  const root = path.parse(absolute).root;
  const relative = path.relative(root, absolute);
  const parts = relative ? relative.split(path.sep).filter(Boolean) : [];
  let fd;

  try {
    fd = fs.openSync(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
    for (const part of parts) {
      const nextPath = procFdPath(fd, part);
      let nextFd;
      try {
        nextFd = fs.openSync(
          nextPath,
          fs.constants.O_RDONLY
            | fs.constants.O_DIRECTORY
            | fs.constants.O_NOFOLLOW,
        );
      } catch {
        fail(`${label} must contain only existing real directories: ${absolute}`);
      }
      const metadata = fs.fstatSync(nextFd, { bigint: true });
      if (!metadata.isDirectory()) {
        fs.closeSync(nextFd);
        fail(`${label} must contain only real directories: ${absolute}`);
      }
      fs.closeSync(fd);
      fd = nextFd;
    }

    const metadata = fs.fstatSync(fd, { bigint: true });
    if (!metadata.isDirectory()) fail(`${label} must be a real directory: ${absolute}`);
    return Object.freeze({
      fd,
      absolute,
      identity: identityOf(metadata),
      procPath: procFdPath(fd),
    });
  } catch (error) {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // best effort only while propagating the primary HOLD
      }
    }
    throw error;
  }
}

function closePinnedDirectory(pinned) {
  fs.closeSync(pinned.fd);
}

function assertPinnedDirectoryPath(pinned, label) {
  const reread = openPinnedDirectory(pinned.absolute, label);
  try {
    if (!sameIdentity(pinned.identity, reread.identity)) {
      fail(`${label} path changed generation`);
    }
  } finally {
    closePinnedDirectory(reread);
  }
}

function boundChildPath(pinned, leaf, label = "child") {
  return procFdPath(pinned.fd, safeLeaf(leaf, label));
}

function boundChildIdentity(pinned, leaf, label) {
  let metadata;
  try {
    metadata = fs.lstatSync(boundChildPath(pinned, leaf, label), { bigint: true });
  } catch {
    fail(`${label} is missing from the pinned namespace`);
  }
  return identityOf(metadata);
}

function removeBoundChildIfIdentity(pinned, leaf, expectedIdentity) {
  const filename = boundChildPath(pinned, leaf, "cleanup child");
  try {
    const metadata = fs.lstatSync(filename, { bigint: true });
    if (sameIdentity(identityOf(metadata), expectedIdentity)) {
      fs.rmSync(filename, { recursive: true, force: true });
    }
  } catch {
    // Never delete an unknown replacement generation during cleanup.
  }
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function validateOrigin(value) {
  let parsed;
  try {
    parsed = new URL(String(value ?? ""));
  } catch {
    fail("origin must be an absolute HTTPS URL");
  }
  if (parsed.protocol !== "https:") fail("origin must use HTTPS");
  if (parsed.username || parsed.password) fail("origin credentials are forbidden");
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    fail("origin must not contain a path, query, or fragment");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".onion")
    || net.isIP(hostname) !== 0
  ) {
    fail("origin must use a public clearnet hostname");
  }
  if (parsed.port && parsed.port !== "443") fail("origin may use only the default HTTPS port");
  return parsed.origin;
}

export function validateLastmod(value) {
  const text = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) fail("lastmod must use YYYY-MM-DD");
  const parsed = new Date(`${text}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    fail("lastmod is not a real calendar date");
  }
  return text;
}

export function validateIndexNowKey(value) {
  const raw = String(value ?? "");
  const key = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
  if (raw !== key && raw !== `${key}\n`) fail("IndexNow key file has excess lines");
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) {
    fail("IndexNow key must be 8-128 letters, numbers, or dashes");
  }
  return key;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function canonicalUrls(originValue) {
  const origin = validateOrigin(originValue);
  return PUBLIC_PATHS.map((relative) => new URL(relative, `${origin}/`).href);
}

export function renderRobots(originValue) {
  const origin = validateOrigin(originValue);
  return [
    "# VOID_FREE_DISCOVERY_MESH_V1",
    "# Crawling policy is not an authorization boundary.",
    "User-agent: *",
    "Allow: /",
    ...CRAWLER_EXCLUSIONS.map((relative) => `Disallow: ${relative}`),
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

export function renderSitemap(originValue, lastmodValue) {
  const origin = validateOrigin(originValue);
  const lastmod = validateLastmod(lastmodValue);
  const entries = canonicalUrls(origin).map((url) => (
    `  <url>\n    <loc>${xmlEscape(url)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
  ));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

export function datasetJsonLd(originValue) {
  const origin = validateOrigin(originValue);
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "VOID Mainnet-0 public discovery and DataNet evidence",
    description: (
      "Machine-readable, read-only discovery metadata and verifiable public "
      + "evidence for VOID Mainnet-0, a decentralized data and useful-work network."
    ),
    url: `${origin}/discovery/`,
    sameAs: `${origin}/public-node`,
    creator: {
      "@type": "Organization",
      name: "VOID Network",
      url: `${origin}/`,
    },
    isAccessibleForFree: true,
    license: "https://github.com/6ZoSo9/void-node/blob/main/LICENSE",
    keywords: [
      "VOID Network",
      "DataNet",
      "AI agents",
      "decentralized data",
      "verifiable useful work",
    ],
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${origin}/.well-known/void-public-node.json`,
      },
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${origin}/.well-known/void-agent-discovery.json`,
      },
    ],
  };
}

export function renderLanding(originValue) {
  const origin = validateOrigin(originValue);
  const structured = prettyJson(datasetJsonLd(origin)).trimEnd().replaceAll("</script", "<\\/script");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="index,follow">
    <title>VOID Mainnet-0 public discovery</title>
    <meta name="description" content="Read-only discovery metadata and DataNet evidence for VOID Mainnet-0.">
    <link rel="canonical" href="${origin}/discovery/">
    <script type="application/ld+json">
${structured}
    </script>
  </head>
  <body>
    <main>
      <h1>VOID Mainnet-0 public discovery</h1>
      <p>Machine-readable, read-only discovery metadata and verifiable public DataNet evidence for people and AI agents.</p>
      <ul>
        <li><a href="${origin}/public-node">Public node</a></li>
        <li><a href="${origin}/.well-known/void-public-node.json">Public-node discovery JSON</a></li>
        <li><a href="${origin}/.well-known/void-agent-discovery.json">AI-agent discovery JSON</a></li>
      </ul>
      <p>This page grants no wallet, signer, payment, Work Credit, validator, operator, or mutation authority.</p>
    </main>
  </body>
</html>
`;
}

export function indexNowRequest(originValue, keyValue) {
  const origin = validateOrigin(originValue);
  const key = validateIndexNowKey(keyValue);
  const parsed = new URL(origin);
  const urlList = canonicalUrls(origin);
  if (urlList.length > 10_000) fail("IndexNow request exceeds 10,000 URLs");
  if (urlList.some((value) => new URL(value).host !== parsed.host)) {
    fail("IndexNow URL crossed the verified host boundary");
  }
  return {
    host: parsed.host,
    key,
    keyLocation: `${origin}/${key}.txt`,
    urlList,
  };
}

export function readDiscoveryConfigFile(filename = CONFIG_PATH, options = {}) {
  const evidence = readPinnedUtf8RegularFile(filename, "free-discovery config", options);
  let config;
  try {
    config = JSON.parse(evidence.text);
  } catch (error) {
    fail(`free-discovery config is invalid JSON: ${error.message}`);
  }
  if (
    config?.marker !== MARKER
    || config?.version !== 1
    || config?.activation?.state !== "source_only_not_activated"
    || config?.cost_boundary?.automatic_paid_upgrade !== false
    || config?.authority?.network_calls !== false
  ) {
    fail("free-discovery config boundary mismatch");
  }
  if (JSON.stringify(config.public_paths) !== JSON.stringify(PUBLIC_PATHS)) {
    fail("free-discovery config public-path boundary mismatch");
  }
  if (JSON.stringify(config.crawler_exclusions) !== JSON.stringify(CRAWLER_EXCLUSIONS)) {
    fail("free-discovery config crawler exclusion mismatch");
  }
  return Object.freeze({ config, sha256: evidence.sha256, identity: evidence.identity });
}

function writeFile(filename, value) {
  fs.writeFileSync(filename, value, { encoding: "utf8", mode: 0o600, flag: "wx" });
}

function relativeFileParts(relative, label) {
  const value = String(relative ?? "");
  const parts = value.split("/").map((part) => safeLeaf(part, label));
  if (!value || parts.join("/") !== value) {
    fail(`${label} is not a canonical relative file path`);
  }
  return parts;
}

function duplicatePinnedDirectory(pinned, label) {
  let fd;
  try {
    fd = fs.openSync(
      pinned.procPath,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY,
    );
    const metadata = fs.fstatSync(fd, { bigint: true });
    if (!metadata.isDirectory() || !sameIdentity(pinned.identity, identityOf(metadata))) {
      fail(`${label} changed generation before descriptor-relative verification`);
    }
    return fd;
  } catch (error) {
    if (fd !== undefined) fs.closeSync(fd);
    throw error;
  }
}

function openPinnedRelativeDirectory(rootPinned, parts, label) {
  let fd = duplicatePinnedDirectory(rootPinned, label);
  try {
    for (const part of parts) {
      const nextPath = procFdPath(fd, part);
      let nextFd;
      try {
        nextFd = fs.openSync(
          nextPath,
          fs.constants.O_RDONLY
            | fs.constants.O_DIRECTORY
            | fs.constants.O_NOFOLLOW,
        );
        const metadata = fs.fstatSync(nextFd, { bigint: true });
        const linked = fs.lstatSync(nextPath, { bigint: true });
        if (
          !metadata.isDirectory()
          || linked.isSymbolicLink()
          || !linked.isDirectory()
          || !sameIdentity(identityOf(metadata), identityOf(linked))
        ) {
          fail(`${label} directory changed generation: ${part}`);
        }
        fs.closeSync(fd);
        fd = nextFd;
        nextFd = undefined;
      } finally {
        if (nextFd !== undefined) fs.closeSync(nextFd);
      }
    }
    return fd;
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function verifyPinnedRegularFile(rootPinned, relative, expectedValue, label) {
  const parts = relativeFileParts(relative, `${label} path`);
  const leaf = parts.at(-1);
  const parentFd = openPinnedRelativeDirectory(rootPinned, parts.slice(0, -1), label);
  let fd;
  try {
    const filename = procFdPath(parentFd, leaf);
    fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile()) fail(`${label} must be a regular file: ${relative}`);
    const expected = Buffer.from(expectedValue, "utf8");
    if (before.size !== BigInt(expected.length)) {
      fail(`${label} byte length changed: ${relative}`);
    }
    const beforeSnapshot = stableFileSnapshot(before);
    const actual = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    const linked = fs.lstatSync(filename, { bigint: true });
    if (
      !after.isFile()
      || linked.isSymbolicLink()
      || !linked.isFile()
      || !sameFileSnapshot(beforeSnapshot, stableFileSnapshot(after))
      || !sameFileSnapshot(beforeSnapshot, stableFileSnapshot(linked))
    ) {
      fail(`${label} changed generation while being verified: ${relative}`);
    }
    if (!actual.equals(expected)) {
      fail(`${label} bytes changed: ${relative}`);
    }
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    fs.closeSync(parentFd);
  }
}

function collectPinnedInventory(rootPinned, label) {
  const inventory = [];
  const rootFd = duplicatePinnedDirectory(rootPinned, label);

  function walk(fd, prefix) {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isDirectory()) fail(`${label} inventory crossed a non-directory`);
    const beforeSnapshot = stableFileSnapshot(before);
    const names = fs.readdirSync(procFdPath(fd)).sort();
    for (const name of names) {
      const leaf = safeLeaf(name, `${label} inventory entry`);
      const filename = procFdPath(fd, leaf);
      const linked = fs.lstatSync(filename, { bigint: true });
      if (linked.isSymbolicLink()) fail(`${label} contains a symlink: ${prefix}${leaf}`);
      const relative = `${prefix}${leaf}`;
      if (linked.isFile()) {
        inventory.push(relative);
        continue;
      }
      if (!linked.isDirectory()) fail(`${label} contains a non-file entry: ${relative}`);
      const childFd = fs.openSync(
        filename,
        fs.constants.O_RDONLY
          | fs.constants.O_DIRECTORY
          | fs.constants.O_NOFOLLOW,
      );
      try {
        const child = fs.fstatSync(childFd, { bigint: true });
        if (!child.isDirectory() || !sameIdentity(identityOf(child), identityOf(linked))) {
          fail(`${label} directory changed generation: ${relative}`);
        }
        walk(childFd, `${relative}/`);
      } finally {
        fs.closeSync(childFd);
      }
    }
    const afterNames = fs.readdirSync(procFdPath(fd)).sort();
    const after = fs.fstatSync(fd, { bigint: true });
    if (
      JSON.stringify(names) !== JSON.stringify(afterNames)
      || !sameFileSnapshot(beforeSnapshot, stableFileSnapshot(after))
    ) {
      fail(`${label} inventory changed while being verified`);
    }
  }

  try {
    walk(rootFd, "");
    return inventory.sort();
  } finally {
    fs.closeSync(rootFd);
  }
}

function verifyPinnedTree(rootPinned, expectedFiles, label) {
  const expectedInventory = [...expectedFiles.keys()].sort();
  const beforeInventory = collectPinnedInventory(rootPinned, label);
  if (JSON.stringify(beforeInventory) !== JSON.stringify(expectedInventory)) {
    fail(`${label} inventory mismatch`);
  }
  for (const [relative, value] of expectedFiles) {
    verifyPinnedRegularFile(rootPinned, relative, value, label);
  }
  const afterInventory = collectPinnedInventory(rootPinned, label);
  if (JSON.stringify(afterInventory) !== JSON.stringify(expectedInventory)) {
    fail(`${label} inventory changed during content verification`);
  }
}

export function buildDiscoveryPack({
  origin,
  output,
  indexNowKey,
  lastmod,
  testHooks = null,
}) {
  const normalizedOrigin = validateOrigin(origin);
  const normalizedLastmod = validateLastmod(lastmod);
  const normalizedKey = validateIndexNowKey(indexNowKey);
  const configEvidence = readDiscoveryConfigFile();
  const destination = path.resolve(String(output ?? ""));
  if (!destination || destination === path.parse(destination).root) fail("output path is unsafe");
  if (isInside(REPO_ROOT, destination)) {
    fail("output must remain outside the repository so the IndexNow key is never committed");
  }

  const parent = path.dirname(destination);
  const destinationName = safeLeaf(path.basename(destination), "output destination");
  const pinnedParent = openPinnedDirectory(parent, "output parent");
  const destinationBoundPath = boundChildPath(
    pinnedParent,
    destinationName,
    "output destination",
  );
  const temporaryName = safeLeaf(
    `.${destinationName}.${process.pid}.${crypto.randomBytes(16).toString("hex")}.tmp`,
    "temporary output",
  );
  const temporaryBoundPath = boundChildPath(
    pinnedParent,
    temporaryName,
    "temporary output",
  );
  let temporaryIdentity = null;
  let temporaryPinned = null;
  let destinationIdentity = null;
  let destinationPinned = null;

  try {
    if (testHooks !== null && typeof testHooks !== "object") {
      fail("testHooks must be an object when supplied");
    }
    testHooks?.afterOutputParentPinned?.({ parent, destination });
    assertPinnedDirectoryPath(pinnedParent, "output parent");

    try {
      fs.lstatSync(destinationBoundPath);
      fail(`output already exists: ${destination}`);
    } catch (error) {
      if (error instanceof Hold) throw error;
      if (error?.code !== "ENOENT") throw error;
    }
    try {
      fs.lstatSync(temporaryBoundPath);
      fail(`temporary output already exists: ${temporaryName}`);
    } catch (error) {
      if (error instanceof Hold) throw error;
      if (error?.code !== "ENOENT") throw error;
    }

    fs.mkdirSync(temporaryBoundPath, { mode: 0o700 });
    temporaryIdentity = boundChildIdentity(
      pinnedParent,
      temporaryName,
      "temporary output",
    );
    const temporaryFd = fs.openSync(
      temporaryBoundPath,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW,
    );
    const temporaryMetadata = fs.fstatSync(temporaryFd, { bigint: true });
    if (!sameIdentity(temporaryIdentity, identityOf(temporaryMetadata))) {
      fs.closeSync(temporaryFd);
      fail("temporary output changed generation during creation");
    }
    temporaryPinned = Object.freeze({
      fd: temporaryFd,
      absolute: path.join(parent, temporaryName),
      identity: identityOf(temporaryMetadata),
      procPath: procFdPath(temporaryFd),
    });

    const publicRoot = path.join(temporaryPinned.procPath, "public");
    const discoveryRoot = path.join(publicRoot, "discovery");
    const operatorRoot = path.join(temporaryPinned.procPath, "operator");
    fs.mkdirSync(publicRoot, { mode: 0o700 });
    fs.mkdirSync(discoveryRoot, { mode: 0o700 });
    fs.mkdirSync(operatorRoot, { mode: 0o700 });

    const request = indexNowRequest(normalizedOrigin, normalizedKey);
    const checklist = {
      marker: "VOID_FREE_DISCOVERY_PROVIDER_REGISTRATION_CHECKLIST_V1",
      state: "not_activated",
      origin: normalizedOrigin,
      steps: [
        "deploy_public_directory_to_the_exact_verified_https_origin",
        "verify_all_sitemap_urls_return_expected_public_content",
        "verify_indexnow_key_location_returns_the_exact_key",
        "register_site_and_sitemap_in_google_search_console",
        "register_site_and_sitemap_in_bing_webmaster_tools",
        "choose_exactly_one_indexnow_notification_owner",
        "optionally_enable_cloudflare_crawler_hints_on_the_free_plan",
      ],
      forbidden: [
        "payment_method_attachment",
        "automatic_paid_upgrade",
        "startup_credit_activation_with_overage_billing",
        "submission_before_verified_deployment",
      ],
    };

    const outputs = new Map([
      ["public/robots.txt", renderRobots(normalizedOrigin)],
      ["public/sitemap.xml", renderSitemap(normalizedOrigin, normalizedLastmod)],
      ["public/discovery/index.html", renderLanding(normalizedOrigin)],
      ["public/discovery/void-datanet-dataset-v1.jsonld", prettyJson(datasetJsonLd(normalizedOrigin))],
      [`public/${normalizedKey}.txt`, `${normalizedKey}\n`],
      ["operator/indexnow-request-v1.json", prettyJson(request)],
      ["operator/provider-registration-checklist-v1.json", prettyJson(checklist)],
    ]);

    for (const [relative, value] of outputs) {
      writeFile(path.join(temporaryPinned.procPath, relative), value);
    }

    const files = {};
    for (const relative of [...outputs.keys()].sort()) {
      files[relative] = sha256(outputs.get(relative));
    }
    const receipt = {
      marker: "VOID_FREE_DISCOVERY_MESH_BUILD_RECEIPT_V1",
      version: 1,
      origin: normalizedOrigin,
      lastmod: normalizedLastmod,
      indexnow_key_location: request.keyLocation,
      canonical_urls: request.urlList,
      files,
      config_sha256: configEvidence.sha256,
      integrity_boundary: {
        verification_model: "descriptor_relative_per_file_snapshot",
        same_uid_concurrent_mutation_excluded: false,
        exclusive_same_uid_output_mutation_authority_required: true,
        consumer_receipt_reverification_required_after_handoff: true,
      },
      claims: {
        source_only: true,
        network_calls: false,
        live_submission: false,
        public_deployment: false,
        provider_account_mutation: false,
        payment_method_collection: false,
        billing_api_access: false,
        automatic_paid_upgrade: false,
        external_paid_service_execution: false,
        wallet_or_signer_access: false,
        fund_movement: false,
      },
    };
    const receiptText = prettyJson(receipt);
    writeFile(path.join(temporaryPinned.procPath, "build-receipt-v1.json"), receiptText);
    const expectedFiles = new Map([
      ...outputs,
      ["build-receipt-v1.json", receiptText],
    ]);

    testHooks?.beforePublish?.({
      parent,
      destination,
      temporary: temporaryPinned.absolute,
    });
    assertPinnedDirectoryPath(pinnedParent, "output parent");
    assertPinnedDirectoryPath(temporaryPinned, "temporary output");
    if (!sameIdentity(
      boundChildIdentity(pinnedParent, temporaryName, "temporary output"),
      temporaryIdentity,
    )) {
      fail("temporary output changed generation before publication");
    }
    verifyPinnedTree(temporaryPinned, expectedFiles, "staged output");

    try {
      fs.mkdirSync(destinationBoundPath, { mode: 0o700 });
    } catch (error) {
      if (error?.code === "EEXIST") {
        fail(`output became occupied before publication: ${destination}`);
      }
      throw error;
    }
    destinationIdentity = boundChildIdentity(
      pinnedParent,
      destinationName,
      "reserved output",
    );
    const destinationFd = fs.openSync(
      destinationBoundPath,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW,
    );
    const destinationMetadata = fs.fstatSync(destinationFd, { bigint: true });
    if (!sameIdentity(destinationIdentity, identityOf(destinationMetadata))) {
      fs.closeSync(destinationFd);
      fail("reserved output changed generation during creation");
    }
    destinationPinned = Object.freeze({
      fd: destinationFd,
      absolute: destination,
      identity: identityOf(destinationMetadata),
      procPath: procFdPath(destinationFd),
    });
    if (fs.readdirSync(destinationPinned.procPath).length !== 0) {
      fail("reserved output was not empty");
    }

    for (const entry of fs.readdirSync(temporaryPinned.procPath, {
      withFileTypes: true,
    })) {
      const leaf = safeLeaf(entry.name, "published output entry");
      const sourcePath = path.join(temporaryPinned.procPath, leaf);
      const targetPath = path.join(destinationPinned.procPath, leaf);
      try {
        fs.lstatSync(targetPath);
        fail(`reserved output entry already exists: ${leaf}`);
      } catch (error) {
        if (error instanceof Hold) throw error;
        if (error?.code !== "ENOENT") throw error;
      }
      fs.renameSync(sourcePath, targetPath);
    }
    if (fs.readdirSync(temporaryPinned.procPath).length !== 0) {
      fail("temporary output was not empty after reserved publication");
    }

    assertPinnedDirectoryPath(pinnedParent, "output parent");
    assertPinnedDirectoryPath(destinationPinned, "published output");
    if (!sameIdentity(
      boundChildIdentity(pinnedParent, destinationName, "published output"),
      destinationIdentity,
    )) {
      fail("published output generation does not match the reserved destination generation");
    }
    if (!sameIdentity(
      boundChildIdentity(pinnedParent, temporaryName, "temporary output"),
      temporaryIdentity,
    )) {
      fail("temporary output changed generation before cleanup");
    }
    testHooks?.afterReservedPublication?.({ parent, destination });
    verifyPinnedTree(destinationPinned, expectedFiles, "published output");
    fs.rmdirSync(temporaryBoundPath);
    temporaryIdentity = null;

    return Object.freeze({ destination, receipt });
  } catch (error) {
    if (destinationIdentity !== null) {
      removeBoundChildIfIdentity(pinnedParent, destinationName, destinationIdentity);
    }
    if (temporaryIdentity !== null) {
      removeBoundChildIfIdentity(pinnedParent, temporaryName, temporaryIdentity);
    }
    throw error;
  } finally {
    if (destinationPinned !== null) {
      try {
        closePinnedDirectory(destinationPinned);
      } catch {
        // best effort only after the primary result has been established
      }
    }
    if (temporaryPinned !== null) {
      try {
        closePinnedDirectory(temporaryPinned);
      } catch {
        // best effort only after the primary result has been established
      }
    }
    closePinnedDirectory(pinnedParent);
  }
}

function parseArgs(argv) {
  const values = { command: "", origin: "", output: "", indexNowKeyFile: "", lastmod: "", confirm: "" };
  const args = [...argv];
  values.command = args.shift() ?? "";
  while (args.length) {
    const name = args.shift();
    const value = args.shift();
    if (!value || !["--origin", "--output", "--indexnow-key-file", "--lastmod", "--confirm"].includes(name)) {
      fail(`unknown or incomplete argument: ${name ?? ""}`);
    }
    const key = {
      "--origin": "origin",
      "--output": "output",
      "--indexnow-key-file": "indexNowKeyFile",
      "--lastmod": "lastmod",
      "--confirm": "confirm",
    }[name];
    if (values[key]) fail(`duplicate argument: ${name}`);
    values[key] = value;
  }
  return values;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command !== "build") fail("command must be build");
  if (args.confirm !== CONFIRMATION) fail("confirmation phrase mismatch");
  const keyEvidence = readPinnedUtf8RegularFile(args.indexNowKeyFile, "IndexNow key file");
  const key = validateIndexNowKey(keyEvidence.text);
  console.log(`${MARKER}=START`);
  console.log("operation=build_offline_provider_neutral_discovery_pack");
  console.log("network_calls=false");
  console.log("live_submission=false");
  console.log("deployment=false");
  console.log("provider_account_mutation=false");
  console.log("payment_method_collection=false");
  console.log("automatic_paid_upgrade=false");
  console.log("wallet_or_signer_access=false");
  console.log("fund_movement=false");
  console.log("same_uid_concurrent_mutation_excluded=false");
  console.log("exclusive_same_uid_output_mutation_authority_required=true");
  console.log("consumer_receipt_reverification_required_after_handoff=true");
  const result = buildDiscoveryPack({
    origin: args.origin,
    output: args.output,
    indexNowKey: key,
    lastmod: args.lastmod,
  });
  console.log(`origin=${result.receipt.origin}`);
  console.log(`output=${result.destination}`);
  console.log(`public_file_count=${Object.keys(result.receipt.files).length}`);
  console.log(`${MARKER}_BUILD_COMPLETE=true`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`HOLD: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
