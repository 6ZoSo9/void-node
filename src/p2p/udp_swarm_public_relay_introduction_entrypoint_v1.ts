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

type FixedTrustAfterFstatHookV1 = (
  input: Readonly<{
    relativePath: string;
    target: string;
    configDir: string;
  }>,
) => void;

function sameOpenedFileStateV1(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function sameOpenedDirectoryIdentityV1(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid
  );
}

function fixedJson(
  rootDir: string,
  relativePath: string,
  testOnlyAfterFstat?: FixedTrustAfterFstatHookV1,
): unknown {
  const root = path.resolve(rootDir);
  const target = path.resolve(root, relativePath);
  const configDir = path.dirname(target);
  if (!target.startsWith(`${root}${path.sep}`)) {
    fail(`fixed trust path escaped repository root: ${relativePath}`);
  }

  const noFollow = fs.constants.O_NOFOLLOW;
  const directoryOnly = fs.constants.O_DIRECTORY;
  if (
    typeof noFollow !== "number" ||
    typeof directoryOnly !== "number"
  ) {
    fail("fixed trust descriptor safety is unavailable");
  }

  const directoryFlags =
    fs.constants.O_RDONLY |
    noFollow |
    directoryOnly |
    fs.constants.O_NONBLOCK;
  let rootDescriptor = -1;
  let configDescriptor = -1;
  let descriptor = -1;
  try {
    try {
      rootDescriptor = fs.openSync(root, directoryFlags);
      configDescriptor = fs.openSync(
        `/proc/self/fd/${rootDescriptor}/${path.dirname(relativePath)}`,
        directoryFlags,
      );
      descriptor = fs.openSync(
        `/proc/self/fd/${configDescriptor}/${path.basename(relativePath)}`,
        fs.constants.O_RDONLY |
          noFollow |
          fs.constants.O_NONBLOCK,
      );
    } catch {
      fail(
        `required fixed trust artifact is not descriptor-openable: ${relativePath}`,
      );
    }

    const rootBefore = fs.fstatSync(rootDescriptor, { bigint: true });
    const configBefore = fs.fstatSync(configDescriptor, { bigint: true });
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!rootBefore.isDirectory() || !configBefore.isDirectory()) {
      fail(`fixed trust artifact must remain directory-rooted: ${relativePath}`);
    }
    if (
      !before.isFile() ||
      before.isSymbolicLink()
    ) {
      fail(
        `fixed trust artifact must be a regular non-symlink file: ${relativePath}`,
      );
    }
    if (
      before.size < 2n ||
      before.size >
        BigInt(VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FETCH_MAX_BYTES_V1)
    ) {
      fail(`fixed trust artifact size is outside its bound: ${relativePath}`);
    }

    testOnlyAfterFstat?.(
      Object.freeze({ relativePath, target, configDir }),
    );

    const expectedBytes = Number(before.size);
    const bytes = Buffer.alloc(expectedBytes);
    let offset = 0;
    while (offset < expectedBytes) {
      const count = fs.readSync(
        descriptor,
        bytes,
        offset,
        expectedBytes - offset,
        offset,
      );
      if (count <= 0) {
        fail(`fixed trust artifact changed during descriptor read: ${relativePath}`);
      }
      offset += count;
    }
    const eofProbe = Buffer.alloc(1);
    if (fs.readSync(descriptor, eofProbe, 0, 1, expectedBytes) !== 0) {
      fail(`fixed trust artifact changed during descriptor read: ${relativePath}`);
    }

    const after = fs.fstatSync(descriptor, { bigint: true });
    if (!sameOpenedFileStateV1(before, after)) {
      fail(`fixed trust artifact changed during descriptor read: ${relativePath}`);
    }

    let rootVisible: fs.BigIntStats;
    let configVisible: fs.BigIntStats;
    let fileVisible: fs.BigIntStats;
    try {
      rootVisible = fs.lstatSync(root, { bigint: true });
      configVisible = fs.lstatSync(configDir, { bigint: true });
      fileVisible = fs.lstatSync(target, { bigint: true });
    } catch {
      fail(`fixed trust artifact path changed during descriptor read: ${relativePath}`);
    }
    if (
      rootVisible.isSymbolicLink() ||
      configVisible.isSymbolicLink() ||
      fileVisible.isSymbolicLink() ||
      !rootVisible.isDirectory() ||
      !configVisible.isDirectory() ||
      !fileVisible.isFile() ||
      !sameOpenedDirectoryIdentityV1(rootBefore, rootVisible) ||
      !sameOpenedDirectoryIdentityV1(configBefore, configVisible) ||
      !sameOpenedFileStateV1(after, fileVisible)
    ) {
      fail(`fixed trust artifact path changed during descriptor read: ${relativePath}`);
    }

    try {
      return JSON.parse(bytes.toString("utf8"));
    } catch {
      fail(`fixed trust artifact is not valid JSON: ${relativePath}`);
    }
  } finally {
    if (descriptor >= 0) fs.closeSync(descriptor);
    if (configDescriptor >= 0) fs.closeSync(configDescriptor);
    if (rootDescriptor >= 0) fs.closeSync(rootDescriptor);
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
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<Record<string, any>>;
  const [releaseModule, authorizationModule, mirrorModule] =
    await Promise.all([
      dynamicImport(
        new URL(
          "../../scripts/lib/void_bootstrap_record_release_root_v1.mjs",
          import.meta.url,
        ).href,
      ),
      dynamicImport(
        new URL(
          "../../scripts/lib/void_p2p_udp_swarm_signed_observer_authorization_v1.mjs",
          import.meta.url,
        ).href,
      ),
      dynamicImport(
        new URL(
          "../../scripts/lib/void_public_bootstrap_record_v2_mirror_contract_v1.mjs",
          import.meta.url,
        ).href,
      ),
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
      if (!value || value.byteLength === 0) {
        void reader.cancel().catch(() => undefined);
        throw new Error("bootstrap content response stream made no progress");
      }
      byteCount += value.byteLength;
      if (
        byteCount >
        VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FETCH_MAX_BYTES_V1
      ) {
        void reader.cancel().catch(() => undefined);
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
  testOnlyAfterFixedTrustFstat,
}: Readonly<{
  rootDir: string;
  env?: EnvironmentV1;
  udpRuntimeEnabled: boolean;
  nowMs?: number;
  testOnlyAfterFixedTrustFstat?: FixedTrustAfterFstatHookV1;
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
    testOnlyAfterFixedTrustFstat,
  );
  const validatedRoot = validators.validateReleaseRoot(
    releaseRoot,
    { allowHold: false },
  );

  const observerAuthorization = fixedJson(
    rootDir,
    VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_OBSERVER_AUTHORIZATION_V1,
    testOnlyAfterFixedTrustFstat,
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
