#!/usr/bin/env node
import process from "node:process";
import net from "node:net";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_RESOLVER_V1";
const DEFAULT_MANIFEST =
  "https://raw.githubusercontent.com/6ZoSo9/void-node/main/public/bootstrap/v1.json";
const TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.VOID_PUBLIC_BOOTSTRAP_TIMEOUT_MS || 8000) || 8000,
);
const ALLOW_LOOPBACK_FIXTURE =
  process.env.VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE === "1";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function isPrivateIpv4(hostname) {
  if (net.isIP(hostname) !== 4) return false;
  const parts = hostname.split(".").map(Number);
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function assertPublicHttpsBase(raw) {
  let url;
  try {
    url = new URL(String(raw));
  } catch {
    throw new Error("sync endpoint base is not a valid URL");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("sync endpoint base must not contain credentials, query, or fragment");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("sync endpoint base must not contain a path");
  }

  const loopbackFixture =
    ALLOW_LOOPBACK_FIXTURE &&
    url.protocol === "http:" &&
    ["127.0.0.1", "localhost", "::1"].includes(url.hostname);

  if (!loopbackFixture && url.protocol !== "https:") {
    throw new Error("sync endpoint must use HTTPS");
  }
  if (!loopbackFixture) {
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      isPrivateIpv4(host) ||
      net.isIP(host) === 6
    ) {
      throw new Error("sync endpoint resolves to a private or unsupported literal host");
    }
  }

  return url.origin;
}

async function fetchJson(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "void-node/public-bootstrap-resolver-v1" },
    });
    if (!response.ok) {
      throw new Error(`${label} returned HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function manifestUrls() {
  const configured = String(
    process.env.VOID_PUBLIC_BOOTSTRAP_MANIFEST_URLS ||
      process.env.VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL ||
      DEFAULT_MANIFEST,
  );
  return configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("manifest must be an object");
  }
  if (manifest.schema !== "void_public_bootstrap_v1") {
    throw new Error("unexpected manifest schema");
  }
  if (manifest.network !== "VOID Network" || Number(manifest.chain_id) !== 2050) {
    throw new Error("manifest network or chain ID mismatch");
  }
  if (manifest.private_tailnet_endpoints_published !== false) {
    throw new Error("manifest does not preserve the private-tailnet boundary");
  }
  if (manifest.expires_at) {
    const expires = Date.parse(String(manifest.expires_at));
    if (!Number.isFinite(expires) || expires <= Date.now()) {
      throw new Error("manifest is expired or has an invalid expiration");
    }
  }
  if (!Array.isArray(manifest.sync_endpoints)) {
    throw new Error("manifest sync_endpoints must be an array");
  }
  return manifest.sync_endpoints
    .filter((endpoint) => endpoint && endpoint.enabled !== false)
    .map((endpoint) => ({
      transport: String(endpoint.transport || ""),
      base: assertPublicHttpsBase(endpoint.base),
      priority: Number(endpoint.priority ?? 100),
    }))
    .filter((endpoint) => endpoint.transport === "https")
    .sort((a, b) => a.priority - b.priority);
}

async function probe(base) {
  const ready = await fetchJson(`${base}/__void/ready.json`, "seed readiness");
  const head = await fetchJson(`${base}/blocks/latest/number2.json`, "seed head");
  const readyHead = Number(ready?.head);
  const headNumber = Number(head?.number);
  if (ready?.ready !== true || Number(ready?.gap) !== 0 || Number(ready?.txroot_live) !== 1) {
    throw new Error("seed readiness is not exact-green");
  }
  if (!Number.isFinite(readyHead) || readyHead <= 0) {
    throw new Error("seed readiness head is not positive");
  }
  if (!Number.isFinite(headNumber) || headNumber <= 0) {
    throw new Error("seed head endpoint is not positive");
  }
  return Math.max(readyHead, headNumber);
}

const errors = [];
for (const manifestUrl of manifestUrls()) {
  try {
    const manifest = await fetchJson(manifestUrl, "bootstrap manifest");
    const endpoints = validateManifest(manifest);
    if (endpoints.length === 0) {
      throw new Error(`manifest status=${String(manifest.status || "unknown")} has no enabled HTTPS seed`);
    }
    for (const endpoint of endpoints) {
      try {
        const head = await probe(endpoint.base);
        console.error(`marker=${MARKER}`);
        console.error(`manifest=${manifestUrl}`);
        console.error(`transport=${endpoint.transport}`);
        console.error(`head=${head}`);
        console.error(`${MARKER}_GREEN`);
        process.stdout.write(`${endpoint.base}\n`);
        process.exit(0);
      } catch (error) {
        errors.push(`${endpoint.base}: ${error.message}`);
      }
    }
  } catch (error) {
    errors.push(`${manifestUrl}: ${error.message}`);
  }
}

fail(errors.join(" | ") || "no bootstrap manifest URL configured");
