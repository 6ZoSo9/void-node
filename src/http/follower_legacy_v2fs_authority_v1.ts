// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

function parseHttpOriginV1(raw: string, requireOriginOnly: boolean): string {
  const token = String(raw || "").trim();
  if (!token) throw new Error("VOID_FOLLOWER_LEGACY_V2FS_ORIGINS contains an empty origin");

  let url: URL;
  try {
    url = new URL(token);
  } catch {
    throw new Error(`VOID_FOLLOWER_LEGACY_V2FS_ORIGINS invalid URL: ${token}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`VOID_FOLLOWER_LEGACY_V2FS_ORIGINS requires http(s): ${token}`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`VOID_FOLLOWER_LEGACY_V2FS_ORIGINS rejects URL authority extras: ${token}`);
  }
  if (requireOriginOnly && url.pathname !== "/") {
    throw new Error(`VOID_FOLLOWER_LEGACY_V2FS_ORIGINS requires an exact origin: ${token}`);
  }

  return url.origin;
}

export function followerLegacyV2fsOriginsFromRawV1(raw: unknown): Set<string> {
  const text = String(raw ?? "").trim();
  if (!text) return new Set();

  const origins = new Set<string>();
  for (const token of text.split(/[,\s]+/).filter(Boolean)) {
    origins.add(parseHttpOriginV1(token, true));
  }
  return origins;
}

export function followerLegacyV2fsOriginAuthorizedV1(
  peerHttp: string,
  configuredOrigins: unknown,
): boolean {
  const allowed = followerLegacyV2fsOriginsFromRawV1(configuredOrigins);
  if (allowed.size === 0) return false;
  const peerOrigin = parseHttpOriginV1(String(peerHttp || ""), false);
  return allowed.has(peerOrigin);
}
