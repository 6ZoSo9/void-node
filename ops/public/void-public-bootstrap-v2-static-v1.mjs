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

function regularBoundedFile(rootDir, relative) {
  const root = fs.realpathSync(rootDir);
  const candidate = resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    throw new Error("bootstrap_v2_static_path_escape");
  }
  const lst = fs.lstatSync(candidate);
  if (lst.isSymbolicLink() || !lst.isFile()) {
    throw new Error("bootstrap_v2_static_not_regular");
  }
  if (lst.size < 2 || lst.size > MAX_BYTES) {
    throw new Error("bootstrap_v2_static_size_invalid");
  }
  const real = fs.realpathSync(candidate);
  if (real !== candidate || !real.startsWith(root + path.sep)) {
    throw new Error("bootstrap_v2_static_realpath_invalid");
  }
  return fs.readFileSync(real);
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
