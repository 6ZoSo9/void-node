import fs from "node:fs";
import path from "node:path";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BOOTSTRAP_MANIFEST_V1_PREFIX,
  BOOTSTRAP_RECORD_V2_PREFIX,
  contentId,
  validateBootstrapRecordV2,
} from "../../scripts/lib/void_public_bootstrap_record_v2_mirror_contract_v1.mjs";

export const VOID_PUBLIC_BOOTSTRAP_V2_STATIC_V1 =
  "VOID_PUBLIC_BOOTSTRAP_V2_STATIC_V1";

const MODULE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_ROOT = resolve(MODULE_ROOT, "public/void/bootstrap/v2");
const MAX_BYTES = 1024 * 1024;
const MANIFEST_RE =
  /^\/void\/bootstrap\/v2\/manifests\/(voidpbm1_[0-9a-f]{64})\.json$/;
const RECORD_RE =
  /^\/void\/bootstrap\/v2\/records\/(voidpbr2_[0-9a-f]{64})\.json$/;

function sameFileIdentity(a, b) {
  return a.dev === b.dev && a.ino === b.ino &&
    a.mode === b.mode && a.nlink === b.nlink &&
    a.size === b.size && a.mtimeNs === b.mtimeNs &&
    a.ctimeNs === b.ctimeNs;
}

// The manifest ID is content-addressed, but hashing after an unbounded
// read is not a resource or file-identity guard. Hold directory descriptors
// and cap the actual bytes consumed from the same O_NOFOLLOW file descriptor.
function regularBoundedFile(rootDir, relative) {
  const root = fs.realpathSync(rootDir);
  const segments = relative.split("/");
  if (segments.length !== 2 ||
      !["manifests", "records"].includes(segments[0]) ||
      !/^(?:voidpbm1_|voidpbr2_)[0-9a-f]{64}\.json$/.test(segments[1])) {
    throw new Error("bootstrap_v2_static_path_escape");
  }
  const candidate = resolve(root, relative);
  const parent = path.join(root, segments[0]);
  if (candidate === root || !candidate.startsWith(root + path.sep)) {
    throw new Error("bootstrap_v2_static_path_escape");
  }
  const nofollow = fs.constants.O_NOFOLLOW;
  const directory = fs.constants.O_DIRECTORY;
  const nonblock = fs.constants.O_NONBLOCK;
  if (!Number.isInteger(nofollow) || !Number.isInteger(directory) ||
      !Number.isInteger(nonblock) || !fs.existsSync("/proc/self/fd")) {
    throw new Error("bootstrap_v2_static_descriptor_unavailable");
  }

  const directoryFlags = fs.constants.O_RDONLY | directory | nofollow;
  const fileFlags = fs.constants.O_RDONLY | nofollow | nonblock;
  let rootFd;
  let parentFd;
  let fileFd;
  try {
    const rootVisible = fs.lstatSync(root, { bigint: true });
    if (!rootVisible.isDirectory() || rootVisible.isSymbolicLink()) {
      throw new Error("bootstrap_v2_static_root_invalid");
    }
    rootFd = fs.openSync(root, directoryFlags);
    const rootPinned = fs.fstatSync(rootFd, { bigint: true });
    if (!rootPinned.isDirectory() ||
        !sameFileIdentity(rootVisible, rootPinned)) {
      throw new Error("bootstrap_v2_static_root_replaced");
    }
    const parentVisible = fs.lstatSync(parent, { bigint: true });
    if (!parentVisible.isDirectory() || parentVisible.isSymbolicLink()) {
      throw new Error("bootstrap_v2_static_parent_invalid");
    }
    parentFd = fs.openSync(
      "/proc/self/fd/" + rootFd + "/" + segments[0], directoryFlags,
    );
    const parentPinned = fs.fstatSync(parentFd, { bigint: true });
    if (!parentPinned.isDirectory() ||
        !sameFileIdentity(parentVisible, parentPinned)) {
      throw new Error("bootstrap_v2_static_parent_replaced");
    }

    const anchored = "/proc/self/fd/" + parentFd + "/" + segments[1];
    const visibleBefore = fs.lstatSync(anchored, { bigint: true });
    if (!visibleBefore.isFile() || visibleBefore.isSymbolicLink() ||
        visibleBefore.nlink !== 1n) {
      throw new Error("bootstrap_v2_static_not_regular");
    }
    if (visibleBefore.size < 2n || visibleBefore.size > BigInt(MAX_BYTES)) {
      throw new Error("bootstrap_v2_static_size_invalid");
    }
    fileFd = fs.openSync(anchored, fileFlags);
    const before = fs.fstatSync(fileFd, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n ||
        !sameFileIdentity(visibleBefore, before)) {
      throw new Error("bootstrap_v2_static_descriptor_replaced");
    }
    const expectedSize = Number(before.size);
    const bounded = Buffer.alloc(expectedSize + 1);
    let readBytes = 0;
    while (readBytes < bounded.length) {
      const n = fs.readSync(
        fileFd, bounded, readBytes, bounded.length - readBytes, readBytes,
      );
      if (n === 0) break;
      readBytes += n;
    }
    if (readBytes !== expectedSize) {
      throw new Error("bootstrap_v2_static_size_changed_during_read");
    }
    const after = fs.fstatSync(fileFd, { bigint: true });
    const anchoredAfter = fs.lstatSync(anchored, { bigint: true });
    const pathAfter = fs.lstatSync(candidate, { bigint: true });
    const parentAfter = fs.lstatSync(parent, { bigint: true });
    const rootAfter = fs.lstatSync(root, { bigint: true });
    if (!anchoredAfter.isFile() || anchoredAfter.isSymbolicLink() ||
        !pathAfter.isFile() || pathAfter.isSymbolicLink() ||
        !parentAfter.isDirectory() || parentAfter.isSymbolicLink() ||
        !rootAfter.isDirectory() || rootAfter.isSymbolicLink() ||
        !sameFileIdentity(before, after) ||
        !sameFileIdentity(after, anchoredAfter) ||
        !sameFileIdentity(after, pathAfter) ||
        !sameFileIdentity(parentPinned, parentAfter) ||
        !sameFileIdentity(rootPinned, rootAfter)) {
      throw new Error("bootstrap_v2_static_file_or_path_changed");
    }
    return bounded.subarray(0, expectedSize);
  } finally {
    if (fileFd !== undefined) fs.closeSync(fileFd);
    if (parentFd !== undefined) fs.closeSync(parentFd);
    if (rootFd !== undefined) fs.closeSync(rootFd);
  }
}

function validateManifestBody(body, expectedId) {
  const value = JSON.parse(body.toString("utf8"));
  if (
    value?.schema !== "void_public_bootstrap_v1" ||
    value?.manifest_id !== expectedId ||
    contentId(BOOTSTRAP_MANIFEST_V1_PREFIX, value, "manifest_id") !== expectedId
  ) {
    throw new Error("bootstrap_v2_static_manifest_identity_invalid");
  }
}

function validateRecordBody(body, expectedId) {
  const value = JSON.parse(body.toString("utf8"));
  if (
    value?.schema !== "void_public_bootstrap_record_v2" ||
    value?.record_id !== expectedId ||
    contentId(BOOTSTRAP_RECORD_V2_PREFIX, value, "record_id") !== expectedId
  ) {
    throw new Error("bootstrap_v2_static_record_identity_invalid");
  }
  const generatedAt = Date.parse(String(value.generated_at || ""));
  if (!Number.isFinite(generatedAt)) {
    throw new Error("bootstrap_v2_static_record_generated_at_invalid");
  }
  validateBootstrapRecordV2(value, { nowMs: generatedAt });
}

export function loadVoidPublicBootstrapV2StaticV1(
  rawPathname,
  { rootDir = DEFAULT_ROOT } = {},
) {
  const pathname = String(rawPathname || "");
  const manifest = MANIFEST_RE.exec(pathname);
  if (manifest) {
    const id = manifest[1];
    const body = regularBoundedFile(rootDir, `manifests/${id}.json`);
    validateManifestBody(body, id);
    return Object.freeze({ kind: "manifest", id, body });
  }

  const record = RECORD_RE.exec(pathname);
  if (record) {
    const id = record[1];
    const body = regularBoundedFile(rootDir, `records/${id}.json`);
    validateRecordBody(body, id);
    return Object.freeze({ kind: "record", id, body });
  }

  return null;
}

export function serveVoidPublicBootstrapV2StaticV1(
  req,
  res,
  url,
  { rootDir = DEFAULT_ROOT } = {},
) {
  const pathname = String(url?.pathname || "");
  if (!pathname.startsWith("/void/bootstrap/v2/")) return false;

  const method = String(req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, {
      allow: "GET, HEAD",
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-void-public-bootstrap-v2-static": "v1",
    });
    res.end("method_not_allowed\n");
    return true;
  }

  if (url.search || url.hash) {
    res.writeHead(400, {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-void-public-bootstrap-v2-static": "v1",
    });
    res.end("query_not_allowed\n");
    return true;
  }

  let loaded;
  try {
    loaded = loadVoidPublicBootstrapV2StaticV1(pathname, { rootDir });
  } catch {
    res.writeHead(503, {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-void-public-bootstrap-v2-static": "v1",
    });
    res.end("bootstrap_v2_static_unavailable\n");
    return true;
  }

  if (!loaded) {
    res.writeHead(404, {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-void-public-bootstrap-v2-static": "v1",
    });
    res.end("not_found\n");
    return true;
  }

  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(loaded.body.length),
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    "x-void-public-bootstrap-v2-static": "v1",
    "x-void-bootstrap-content-kind": loaded.kind,
    "x-void-bootstrap-content-id": loaded.id,
  });
  if (method === "HEAD") res.end();
  else res.end(loaded.body);
  return true;
}
