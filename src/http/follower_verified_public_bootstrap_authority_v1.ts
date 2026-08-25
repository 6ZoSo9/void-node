// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

function normalizedHttpOriginV1(raw: unknown): string | null {
  const token = String(raw ?? "").trim();
  if (!token) return null;

  let url: URL;
  try {
    url = new URL(token);
  } catch {
    return null;
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    return null;
  }
  return url.origin;
}

function numericLoopbackHttpOriginV1(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    url.protocol === "http:" &&
    (hostname === "127.0.0.1" || hostname === "::1")
  );
}

export function verifiedPublicBootstrapAdapterOriginV1(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (String(env.VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE || "") !== "1") {
    return null;
  }

  const peersRaw = String(env.VOID_FOLLOWER_AUTOSTART_PEERS || "").trim();
  const peerRaw = String(env.VOID_FOLLOWER_AUTOSTART_PEER || "").trim();
  const origins: string[] = [];

  if (peersRaw) {
    const peers = peersRaw.split(",").map((value) => value.trim()).filter(Boolean);
    if (peers.length !== 1) return null;
    const origin = normalizedHttpOriginV1(peers[0]);
    if (!origin) return null;
    origins.push(origin);
  }

  if (peerRaw) {
    const origin = normalizedHttpOriginV1(peerRaw);
    if (!origin) return null;
    origins.push(origin);
  }

  if (origins.length === 0) return null;
  if (new Set(origins).size !== 1) return null;

  const [origin] = origins;
  return numericLoopbackHttpOriginV1(origin) ? origin : null;
}

export function followerVerifiedPublicBootstrapOriginAuthorizedV1(
  peerHttp: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const trustedOrigin = verifiedPublicBootstrapAdapterOriginV1(env);
  if (!trustedOrigin) return false;
  const requestedOrigin = normalizedHttpOriginV1(peerHttp);
  return requestedOrigin === trustedOrigin;
}
