// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as fs from "node:fs";
import * as path from "node:path";

export const VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENTRYPOINT_V1 =
  "VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENTRYPOINT_V1";
export const VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FLAG_V1 =
  "VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENABLED";
export const VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1 =
  "config/void-bootstrap-record-release-root-v1.json";
export const VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_OBSERVER_AUTHORIZATION_V1 =
  "config/void-p2p-udp-swarm-observer-authorization-v1.json";
export const VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FETCH_MAX_BYTES_V1 =
  1024 * 1024;
export const VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FETCH_TIMEOUT_MS_V1 =
  10_000;

type EnvironmentV1 = Readonly<Record<string, string | undefined>>;

export type VoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1 =
  Readonly<{
    observerAuthorization: unknown;
    releaseRoot: unknown;
    fetchRecordBytes: (input: unknown) => Promise<Buffer>;
    fetchManifestBytes: (input: unknown) => Promise<Buffer>;
  }>;

function fail(message: string): never {
  throw new Error(`${VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENTRYPOINT_V1}: ${message}`);
}

function exactFlag(
  env: EnvironmentV1,
  name: string,
): boolean {
  const raw = env[name];
  if (raw === undefined || raw === "0") return false;
  if (raw === "1") return true;
  fail(`${name} must be exactly 0 or 1`);
}

function fixedJson(
  rootDir: string,
  relativePath: string,
): unknown {
  const root = path.resolve(rootDir);
  const target = path.resolve(root, relativePath);
  if (!target.startsWith(`${root}${path.sep}`)) {
    fail(`fixed trust path escaped repository root: ${relativePath}`);
  }
  if (!fs.existsSync(target)) {
    fail(`required fixed trust artifact is missing: ${relativePath}`);
  }
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    fail(`fixed trust artifact must be a regular non-symlink file: ${relativePath}`);
  }
  if (
    stat.size < 2 ||
    stat.size > VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FETCH_MAX_BYTES_V1
  ) {
    fail(`fixed trust artifact size is outside its bound: ${relativePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    fail(`fixed trust artifact is not valid JSON: ${relativePath}`);
  }
}

async function trustValidatorsV1(): Promise<Readonly<{
  validateReleaseRoot: (
    value: unknown,
    options: Readonly<{ allowHold: boolean }>,
  ) => any;
  validateObserverAuthorization: (
    value: unknown,
    releaseRoot: unknown,
    options: Readonly<{ nowMs: number }>,
  ) => any;
  normalizeMirrorRoot: (value: unknown) => Readonly<{
    transport: string;
    base_url: string;
    failure_domain: string;
  }>;
}>> {
  const [releaseModule, authorizationModule, mirrorModule] =
    await Promise.all([
      import("../../scripts/lib/void_bootstrap_record_release_root_v1.mjs"),
      import("../../scripts/lib/void_p2p_udp_swarm_signed_observer_authorization_v1.mjs"),
      import("../../scripts/lib/void_public_bootstrap_record_v2_mirror_contract_v1.mjs"),
    ]);
  if (
    typeof releaseModule.validateVoidBootstrapRecordReleaseRootV1 !== "function" ||
    typeof authorizationModule.validateVoidP2pUdpSwarmObserverAuthorizationV1
      !== "function" ||
    typeof mirrorModule.normalizeMirrorRoot !== "function"
  ) {
    fail("required public-P2P trust validators are unavailable");
  }
  return Object.freeze({
    validateReleaseRoot:
      releaseModule.validateVoidBootstrapRecordReleaseRootV1,
    validateObserverAuthorization:
      authorizationModule.validateVoidP2pUdpSwarmObserverAuthorizationV1,
    normalizeMirrorRoot: mirrorModule.normalizeMirrorRoot,
  });
}

function exactFetchInput(
  raw: unknown,
): Readonly<{ mirror: unknown; url: string }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("bootstrap content fetch input must be an object");
  }
  const input = raw as Record<string, unknown>;
  if (typeof input.url !== "string") {
    fail("bootstrap content fetch URL must be an exact string");
  }
  if (!input.mirror || typeof input.mirror !== "object" || Array.isArray(input.mirror)) {
    fail("bootstrap content fetch mirror must be an object");
  }
  return Object.freeze({ mirror: input.mirror, url: input.url });
}

async function readBoundedResponseBytesV1(
  response: Response,
): Promise<Buffer> {
  const contentType = String(response.headers.get("content-type") || "")
    .toLowerCase()
    .split(";", 1)[0]
    ?.trim();
  if (contentType !== "application/json") {
    throw new Error("bootstrap content response content type is not JSON");
  }
  const contentLength = response.headers.get("content-length");
  if (
    contentLength !== null &&
    (
      !/^(?:0|[1-9][0-9]*)$/u.test(contentLength) ||
      BigInt(contentLength) >
        BigInt(VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FETCH_MAX_BYTES_V1)
    )
  ) {
    throw new Error("bootstrap content response content length is invalid");
  }
  if (!response.body) {
    throw new Error("bootstrap content response body is unavailable");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      byteCount += value.byteLength;
      if (
        byteCount >
        VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FETCH_MAX_BYTES_V1
      ) {
        await reader.cancel().catch(() => undefined);
        throw new Error("bootstrap content response exceeds its byte bound");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (byteCount < 2) {
    throw new Error("bootstrap content response is empty");
  }
  return Buffer.concat(chunks, byteCount);
}

export async function fetchVoidPublicP2pBootstrapContentBytesV1(
  rawInput: unknown,
): Promise<Buffer> {
  const input = exactFetchInput(rawInput);
  const validators = await trustValidatorsV1();
  const mirror = validators.normalizeMirrorRoot(input.mirror);
  let requested: URL;
  try {
    requested = new URL(input.url);
  } catch {
    fail("bootstrap content fetch URL is invalid");
  }
  if (
    requested.username ||
    requested.password ||
    requested.search ||
    requested.hash
  ) {
    fail("bootstrap content fetch URL contains forbidden URL components");
  }

  const mirrorRoot = new URL(mirror.base_url);
  if (
    requested.protocol !== mirrorRoot.protocol ||
    requested.hostname !== mirrorRoot.hostname ||
    requested.port !== mirrorRoot.port
  ) {
    fail("bootstrap content fetch URL escaped the validated mirror origin");
  }
  const rootPath = mirrorRoot.pathname.endsWith("/")
    ? mirrorRoot.pathname.slice(0, -1)
    : mirrorRoot.pathname;
  if (
    !requested.pathname.startsWith(`${rootPath}/records/`) &&
    !requested.pathname.startsWith(`${rootPath}/manifests/`)
  ) {
    fail("bootstrap content fetch URL escaped the immutable content namespace");
  }
  if (!requested.pathname.endsWith(".json")) {
    fail("bootstrap content fetch URL must address an immutable JSON object");
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FETCH_TIMEOUT_MS_V1,
  );
  timer.unref?.();
  try {
    const response = await fetch(requested, {
      method: "GET",
      headers: { accept: "application/json" },
      redirect: "error",
      signal: controller.signal,
    });
    if (response.redirected || (response.url && response.url !== requested.href)) {
      throw new Error("bootstrap content fetch final URL mismatch");
    }
    if (response.status !== 200) {
      throw new Error(
        `bootstrap content fetch returned HTTP ${response.status}`,
      );
    }
    return await readBoundedResponseBytesV1(response);
  } finally {
    clearTimeout(timer);
  }
}

export async function readVoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1({
  rootDir,
  env = process.env,
  udpRuntimeEnabled,
  nowMs = Date.now(),
}: Readonly<{
  rootDir: string;
  env?: EnvironmentV1;
  udpRuntimeEnabled: boolean;
  nowMs?: number;
}>): Promise<VoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1 | null> {
  const enabled = exactFlag(
    env,
    VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FLAG_V1,
  );
  if (!enabled) return null;
  if (udpRuntimeEnabled !== true) {
    fail(
      `${VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FLAG_V1}=1 requires VOID_P2P_UDP_SWARM_RUNTIME_ENABLED=1`,
    );
  }
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    fail("trust validation time is invalid");
  }

  const validators = await trustValidatorsV1();
  const releaseRoot = fixedJson(
    rootDir,
    VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1,
  );
  const validatedRoot = validators.validateReleaseRoot(
    releaseRoot,
    { allowHold: false },
  );

  const observerAuthorization = fixedJson(
    rootDir,
    VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_OBSERVER_AUTHORIZATION_V1,
  );
  validators.validateObserverAuthorization(
    observerAuthorization,
    validatedRoot.root,
    { nowMs },
  );

  return Object.freeze({
    observerAuthorization,
    releaseRoot,
    fetchRecordBytes: fetchVoidPublicP2pBootstrapContentBytesV1,
    fetchManifestBytes: fetchVoidPublicP2pBootstrapContentBytesV1,
  });
}
