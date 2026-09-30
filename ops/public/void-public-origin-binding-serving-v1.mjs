import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS,
  normalizeVoidPublicOriginV1,
} from "../../tools/lib/void-node-public-origin-binding-v1.mjs";
import {
  verifyReviewedVoidNodePublicOriginBindingV1,
} from "../../tools/lib/void-public-node-identity-trust-v1.mjs";

export const VOID_PUBLIC_ORIGIN_BINDING_SERVING_V1 =
  "VOID_PUBLIC_ORIGIN_BINDING_SERVING_V1";
export const VOID_PUBLIC_ORIGIN_BINDING_MAX_BYTES_V1 =
  128 * 1024;

const NODE_ID_PATTERN = /^[0-9a-f]{32}$/u;
const PUBLIC_DNS_LABEL =
  /^(?!-)[a-z0-9-]{1,63}(?<!-)$/u;
const ROUTES = new Set(
  VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS,
);

function fail(message) {
  throw new Error(message);
}

function canonicalPublicHttpsOrigin(value) {
  const normalized = normalizeVoidPublicOriginV1(
    value,
    "expected public origin",
  );
  const parsed = new URL(normalized);
  const labels = parsed.hostname.split(".");
  if (
    parsed.protocol !== "https:"
    || parsed.port
    || parsed.hostname.endsWith(".onion")
    || parsed.hostname.length > 253
    || labels.length < 2
    || labels.some((label) => !PUBLIC_DNS_LABEL.test(label))
    || !/^[a-z]{2,63}$/u.test(labels.at(-1))
  ) {
    fail(
      "expected public origin must be a canonical default-port HTTPS DNS origin",
    );
  }
  if (normalized !== value) {
    fail("expected public origin must already be canonical");
  }
  return normalized;
}

function canonicalNodeId(value) {
  if (
    typeof value !== "string"
    || !NODE_ID_PATTERN.test(value)
  ) {
    fail(
      "expected node_id must be 32 lowercase hexadecimal characters",
    );
  }
  return value;
}

function readDirectRegularFileBounded(filePath) {
  if (
    typeof filePath !== "string"
    || !filePath.startsWith("/")
  ) {
    fail("public-origin binding file path must be absolute");
  }

  const flags =
    fs.constants.O_RDONLY
    | Number(fs.constants.O_NOFOLLOW || 0);
  let fd;
  try {
    fd = fs.openSync(filePath, flags);
  } catch (error) {
    fail(
      `public-origin binding file could not be opened directly: ${error.message}`,
    );
  }

  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile()) {
      fail("public-origin binding source must be a regular file");
    }
    if (
      before.size < 1n
      || before.size
        > BigInt(VOID_PUBLIC_ORIGIN_BINDING_MAX_BYTES_V1)
    ) {
      fail("public-origin binding file size is invalid");
    }

    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    if (
      before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || BigInt(bytes.length) !== before.size
    ) {
      fail(
        "public-origin binding file changed during read",
      );
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function decodeJson(bytes) {
  let text;
  try {
    text = new TextDecoder(
      "utf-8",
      { fatal: true },
    ).decode(bytes);
  } catch {
    fail("public-origin binding file is not valid UTF-8");
  }
  try {
    return JSON.parse(text);
  } catch {
    fail("public-origin binding file is not valid JSON");
  }
}

export function loadVoidPublicOriginBindingServingFileV1({
  filePath,
  expectedOrigin,
  expectedNodeId,
  verifyBinding =
    verifyReviewedVoidNodePublicOriginBindingV1,
} = {}) {
  if (typeof verifyBinding !== "function") {
    fail("public-origin binding verifier is unavailable");
  }

  const origin = canonicalPublicHttpsOrigin(
    expectedOrigin,
  );
  const nodeId = canonicalNodeId(expectedNodeId);
  const bytes = readDirectRegularFileBounded(filePath);
  const binding = decodeJson(bytes);
  const verified = verifyBinding(binding, {
    expectedOrigin: origin,
    expectedNodeId: nodeId,
  });

  if (
    verified?.origin !== origin
    || verified?.node_id !== nodeId
  ) {
    fail(
      "public-origin binding verifier returned mismatched identity",
    );
  }

  const sha256 = crypto
    .createHash("sha256")
    .update(bytes)
    .digest("hex");

  return {
    configured: true,
    marker: VOID_PUBLIC_ORIGIN_BINDING_SERVING_V1,
    bytes,
    sha256,
    origin,
    node_id: nodeId,
    binding_sha256: verified.binding_sha256,
    expires_at: verified.expires_at,
    paths: [...VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS],
    authority: {
      read_only: true,
      get_head_only: true,
      generic_well_known_proxy: false,
      upstream_proxy: false,
      private_key_access: false,
      wallet_or_signer_access: false,
      signature_creation: false,
      publication_write: false,
      runtime_mutation: false,
      work_credit_mutation: false,
      funds_movement: false,
    },
  };
}

export function configureVoidPublicOriginBindingServingFromEnvV1(
  env = {},
) {
  const filePath = String(
    env.VOID_PUBLIC_ORIGIN_BINDING_FILE || "",
  ).trim();
  const expectedOrigin = String(
    env.VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_ORIGIN
      || "",
  ).trim();
  const expectedNodeId = String(
    env.VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_NODE_ID
      || "",
  ).trim();

  const populated = [
    filePath,
    expectedOrigin,
    expectedNodeId,
  ].filter(Boolean).length;

  if (populated === 0) {
    return {
      configured: false,
      marker: VOID_PUBLIC_ORIGIN_BINDING_SERVING_V1,
      bytes: null,
      sha256: null,
      origin: null,
      node_id: null,
      binding_sha256: null,
      expires_at: null,
      paths: [...VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS],
      authority: {
        read_only: true,
        get_head_only: true,
        generic_well_known_proxy: false,
        upstream_proxy: false,
        private_key_access: false,
        wallet_or_signer_access: false,
        signature_creation: false,
        publication_write: false,
        runtime_mutation: false,
        work_credit_mutation: false,
        funds_movement: false,
      },
    };
  }

  if (populated !== 3) {
    fail(
      "public-origin binding file, expected origin, and expected node_id must be configured together",
    );
  }

  return loadVoidPublicOriginBindingServingFileV1({
    filePath,
    expectedOrigin,
    expectedNodeId,
  });
}

export function publicOriginBindingServingStatusV1(state) {
  return {
    marker: VOID_PUBLIC_ORIGIN_BINDING_SERVING_V1,
    configured: state?.configured === true,
    origin:
      state?.configured === true ? state.origin : null,
    node_id:
      state?.configured === true ? state.node_id : null,
    artifact_sha256:
      state?.configured === true ? state.sha256 : null,
    binding_sha256:
      state?.configured === true
        ? state.binding_sha256
        : null,
    expires_at:
      state?.configured === true
        ? state.expires_at
        : null,
    paths: [...VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS],
    methods: ["GET", "HEAD"],
    generic_well_known_proxy: false,
    upstream_proxy: false,
    private_key_access: false,
    signature_creation: false,
    publication_write: false,
    runtime_mutation: false,
  };
}

function sendText(req, res, status, text, headers = {}) {
  const body = Buffer.from(text, "utf8");
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "content-length": String(body.length),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-void-public-origin-binding-serving": "v1",
    ...headers,
  });
  if (req.method === "HEAD") {
    res.end();
  } else {
    res.end(body);
  }
}

export function serveVoidPublicOriginBindingV1(
  req,
  res,
  url,
  state,
) {
  if (!ROUTES.has(url.pathname)) return false;

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(
      req,
      res,
      405,
      "method_not_allowed\n",
      { allow: "GET, HEAD" },
    );
    return true;
  }

  if (url.search) {
    sendText(
      req,
      res,
      400,
      "public_origin_binding_query_not_allowed\n",
    );
    return true;
  }

  if (state?.configured !== true) {
    sendText(req, res, 404, "not_public\n");
    return true;
  }

  const bytes = state.bytes;
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(bytes.length),
    "cache-control": "no-store",
    etag: `"${state.sha256}"`,
    "x-content-type-options": "nosniff",
    "x-void-marker":
      "VOID_NODE_PUBLIC_ORIGIN_BINDING_V1",
    "x-void-public-origin-binding-serving": "v1",
  });
  if (req.method === "HEAD") {
    res.end();
  } else {
    res.end(bytes);
  }
  return true;
}
