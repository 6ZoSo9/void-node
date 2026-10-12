import process from "node:process";

export const VOID_MULTIPATH_PUBLIC_BOOTSTRAP_SUPERVISOR_V1 =
  "void_multipath_public_bootstrap_supervisor_v1";

const LOOPBACKS = new Set(["127.0.0.1", "::1"]);
const TRANSPORTS = new Set(["https", "tor"]);

function nonempty(raw) {
  return String(raw || "").trim();
}

export function bootstrapTransportPlanV1({
  httpsPeers = "",
  torPeers = "",
  requireMultipath = false,
} = {}) {
  const https = nonempty(httpsPeers);
  const tor = nonempty(torPeers);
  const transports = [];
  if (https) transports.push("https");
  if (tor) transports.push("tor");

  if (transports.length === 0) {
    throw new Error("at least one verified public bootstrap transport is required");
  }
  if (requireMultipath && transports.length !== 2) {
    throw new Error("multipath acceptance requires both HTTPS and Tor transport classes");
  }

  return Object.freeze({
    httpsPeers: https,
    torPeers: tor,
    transports: Object.freeze(transports),
    requireMultipath: Boolean(requireMultipath),
    followerFailoverEnabled: transports.length > 1,
  });
}

export function validateLoopbackAdapterOriginV1(rawBase, transport) {
  if (!TRANSPORTS.has(transport)) {
    throw new Error("adapter transport must be https or tor");
  }
  let url;
  try {
    url = new URL(String(rawBase || ""));
  } catch {
    throw new Error(`${transport} adapter origin is invalid`);
  }
  if (
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    throw new Error(`${transport} adapter must be an unadorned local HTTP origin`);
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!LOOPBACKS.has(hostname)) {
    throw new Error(`${transport} adapter must bind to numeric loopback`);
  }
  return Object.freeze({ transport, base: url.origin });
}

export function composeFollowerOriginsV1(rawAdapters) {
  if (!Array.isArray(rawAdapters) || rawAdapters.length < 1 || rawAdapters.length > 2) {
    throw new Error("one or two bootstrap adapters are required");
  }
  const adapters = rawAdapters.map((entry) =>
    validateLoopbackAdapterOriginV1(entry?.base, entry?.transport),
  );
  const seenTransports = new Set();
  const seenBases = new Set();
  for (const adapter of adapters) {
    if (seenTransports.has(adapter.transport)) {
      throw new Error(`duplicate ${adapter.transport} adapter`);
    }
    if (seenBases.has(adapter.base)) {
      throw new Error("bootstrap adapters must use distinct loopback origins");
    }
    seenTransports.add(adapter.transport);
    seenBases.add(adapter.base);
  }
  return Object.freeze({
    adapters: Object.freeze(adapters),
    followerOrigins: Object.freeze(adapters.map((entry) => entry.base)),
    transportClasses: Object.freeze(adapters.map((entry) => entry.transport)),
  });
}

export function requireBooleanEnvV1(name, fallback = false) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  if (raw === "1") return true;
  if (raw === "0") return false;
  throw new Error(`${name} must be exactly 0 or 1`);
}
