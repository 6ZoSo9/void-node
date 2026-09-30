#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto, {
  generateKeyPairSync,
} from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  signVoidNodePublicOriginBindingV1,
  verifyVoidNodePublicOriginBindingV1,
} from "../tools/lib/void-node-public-origin-binding-v1.mjs";
import {
  configureVoidPublicOriginBindingServingFromEnvV1,
  loadVoidPublicOriginBindingServingFileV1,
  publicOriginBindingServingStatusV1,
  serveVoidPublicOriginBindingV1,
} from "../ops/public/void-public-origin-binding-serving-v1.mjs";

const ROOT = process.cwd();
const ADAPTER = path.join(
  ROOT,
  "ops/public/public-seed-adapter-v1.mjs",
);
const adapterSource = fs.readFileSync(ADAPTER, "utf8");
const SEED_GATEWAY = path.join(
  ROOT,
  "tools/void-public-seed-gateway-v1.mjs",
);
const seedGatewaySource = fs.readFileSync(
  SEED_GATEWAY,
  "utf8",
);
const work = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-public-origin-binding-serving-v1-",
  ),
);

function fingerprint(publicKey) {
  return crypto
    .createHash("sha256")
    .update(
      publicKey.export({
        type: "spki",
        format: "der",
      }),
    )
    .digest("hex");
}

function responseCapture() {
  const capture = {
    status: null,
    headers: null,
    body: Buffer.alloc(0),
  };
  return {
    capture,
    response: {
      writeHead(status, headers) {
        capture.status = status;
        capture.headers = headers;
      },
      end(body) {
        capture.body = body === undefined
          ? Buffer.alloc(0)
          : Buffer.from(body);
      },
    },
  };
}

function serve(
  state,
  pathname,
  method = "GET",
  servingNowMs = Date.parse(
    "2026-10-01T00:00:00.000Z",
  ),
) {
  const { capture, response } = responseCapture();
  const handled = serveVoidPublicOriginBindingV1(
    { method },
    response,
    new URL(pathname, "https://proof.example"),
    state,
    { nowMs: servingNowMs },
  );
  return { handled, ...capture };
}

try {
  const { privateKey, publicKey } =
    generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const publicKeyFingerprint = fingerprint(publicKey);
  const nodeId = "0123456789abcdef0123456789abcdef";
  const origin = "https://proof.example";
  const issuedAt = "2026-09-30T00:00:00.000Z";
  const expiresAt = "2026-10-30T00:00:00.000Z";
  const nowMs =
    Date.parse("2026-10-01T00:00:00.000Z");

  const binding = signVoidNodePublicOriginBindingV1({
    privateKey,
    publicKey,
    nodeId,
    origin,
    issuedAt,
    expiresAt,
  });
  const bindingPath = path.join(work, "binding.json");
  const bindingBytes = Buffer.from(
    JSON.stringify(binding, null, 2) + "\n",
    "utf8",
  );
  fs.writeFileSync(bindingPath, bindingBytes, {
    mode: 0o644,
  });

  const verifyBinding = (
    value,
    { expectedOrigin, expectedNodeId },
  ) => verifyVoidNodePublicOriginBindingV1(
    value,
    {
      expectedOrigin,
      expectedNodeId,
      expectedPublicKeyFingerprintSha256:
        publicKeyFingerprint,
      nowMs,
    },
  );

  const state =
    loadVoidPublicOriginBindingServingFileV1({
      filePath: bindingPath,
      expectedOrigin: origin,
      expectedNodeId: nodeId,
      verifyBinding,
    });

  assert.equal(state.configured, true);
  assert.equal(state.origin, origin);
  assert.equal(state.node_id, nodeId);
  assert.equal(
    state.sha256,
    crypto
      .createHash("sha256")
      .update(bindingBytes)
      .digest("hex"),
  );
  assert.equal(state.authority.read_only, true);
  assert.equal(
    state.authority.generic_well_known_proxy,
    false,
  );
  assert.equal(state.authority.upstream_proxy, false);
  assert.equal(state.authority.private_key_access, false);
  assert.equal(
    state.authority.wallet_or_signer_access,
    false,
  );
  assert.equal(state.authority.signature_creation, false);
  assert.equal(state.authority.publication_write, false);
  assert.equal(state.authority.runtime_mutation, false);
  assert.equal(state.authority.work_credit_mutation, false);
  assert.equal(state.authority.funds_movement, false);

  const wellKnown = serve(
    state,
    "/.well-known/void-node-public-origin-binding-v1.json",
  );
  const alias = serve(
    state,
    "/public-node/identity/public-origin-binding-v1.json",
  );
  assert.equal(wellKnown.handled, true);
  assert.equal(alias.handled, true);
  assert.equal(wellKnown.status, 200);
  assert.equal(alias.status, 200);
  assert.deepEqual(wellKnown.body, bindingBytes);
  assert.deepEqual(alias.body, bindingBytes);
  assert.deepEqual(wellKnown.body, alias.body);
  assert.equal(
    wellKnown.headers["content-length"],
    String(bindingBytes.length),
  );
  assert.equal(
    wellKnown.headers["x-void-marker"],
    "VOID_NODE_PUBLIC_ORIGIN_BINDING_V1",
  );

  const head = serve(
    state,
    "/.well-known/void-node-public-origin-binding-v1.json",
    "HEAD",
  );
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(
    head.headers["content-length"],
    String(bindingBytes.length),
  );

  const query = serve(
    state,
    "/.well-known/void-node-public-origin-binding-v1.json?cache=1",
  );
  assert.equal(query.status, 400);
  assert.match(
    query.body.toString("utf8"),
    /query_not_allowed/u,
  );

  const post = serve(
    state,
    "/.well-known/void-node-public-origin-binding-v1.json",
    "POST",
  );
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, "GET, HEAD");

  const expired = serve(
    state,
    "/.well-known/void-node-public-origin-binding-v1.json",
    "GET",
    Date.parse("2026-10-30T00:00:00.000Z"),
  );
  assert.equal(expired.status, 503);
  assert.match(
    expired.body.toString("utf8"),
    /binding_expired/u,
  );

  const unrelated = serve(
    state,
    "/.well-known/void-agent-discovery.json",
  );
  assert.equal(unrelated.handled, false);

  const disabled =
    configureVoidPublicOriginBindingServingFromEnvV1({});
  assert.equal(disabled.configured, false);
  const disabledRoute = serve(
    disabled,
    "/.well-known/void-node-public-origin-binding-v1.json",
  );
  assert.equal(disabledRoute.status, 404);

  assert.throws(
    () =>
      configureVoidPublicOriginBindingServingFromEnvV1({
        VOID_PUBLIC_ORIGIN_BINDING_FILE: bindingPath,
      }),
    /must be configured together/u,
  );

  assert.throws(
    () =>
      loadVoidPublicOriginBindingServingFileV1({
        filePath: bindingPath,
        expectedOrigin: "http://proof.example",
        expectedNodeId: nodeId,
        verifyBinding,
      }),
    /HTTPS DNS origin/u,
  );

  assert.throws(
    () =>
      loadVoidPublicOriginBindingServingFileV1({
        filePath: bindingPath,
        expectedOrigin: origin,
        expectedNodeId: "a".repeat(32),
        verifyBinding,
      }),
    /node_id does not match live health identity/u,
  );

  const tampered = structuredClone(binding);
  tampered.origin.value = "https://attacker.example";
  const tamperedPath = path.join(work, "tampered.json");
  fs.writeFileSync(
    tamperedPath,
    JSON.stringify(tampered, null, 2) + "\n",
    "utf8",
  );
  assert.throws(
    () =>
      loadVoidPublicOriginBindingServingFileV1({
        filePath: tamperedPath,
        expectedOrigin: origin,
        expectedNodeId: nodeId,
        verifyBinding,
      }),
    /binding origin does not match/u,
  );

  const oversizedPath = path.join(work, "oversized.json");
  fs.writeFileSync(
    oversizedPath,
    Buffer.alloc(128 * 1024 + 1, 0x20),
  );
  assert.throws(
    () =>
      loadVoidPublicOriginBindingServingFileV1({
        filePath: oversizedPath,
        expectedOrigin: origin,
        expectedNodeId: nodeId,
        verifyBinding,
      }),
    /file size is invalid/u,
  );

  const symlinkPath = path.join(work, "binding-link.json");
  fs.symlinkSync(bindingPath, symlinkPath);
  assert.throws(
    () =>
      loadVoidPublicOriginBindingServingFileV1({
        filePath: symlinkPath,
        expectedOrigin: origin,
        expectedNodeId: nodeId,
        verifyBinding,
      }),
    /must not traverse symlinks or aliases/u,
  );

  const realParent = path.join(work, "real-parent");
  const aliasParent = path.join(work, "alias-parent");
  fs.mkdirSync(realParent);
  const nestedBinding = path.join(realParent, "binding.json");
  fs.writeFileSync(nestedBinding, bindingBytes, { mode: 0o644 });
  fs.symlinkSync(realParent, aliasParent);
  assert.throws(
    () =>
      loadVoidPublicOriginBindingServingFileV1({
        filePath: path.join(aliasParent, "binding.json"),
        expectedOrigin: origin,
        expectedNodeId: nodeId,
        verifyBinding,
      }),
    /must not traverse symlinks or aliases/u,
  );

  const aliasedPath =
    work + "/real-parent/../real-parent/binding.json";
  assert.throws(
    () =>
      loadVoidPublicOriginBindingServingFileV1({
        filePath: aliasedPath,
        expectedOrigin: origin,
        expectedNodeId: nodeId,
        verifyBinding,
      }),
    /must not traverse symlinks or aliases/u,
  );

  const status = publicOriginBindingServingStatusV1(
    state,
  );
  assert.equal(status.configured, true);
  assert.equal(status.origin, origin);
  assert.equal(status.node_id, nodeId);
  assert.deepEqual(status.methods, ["GET", "HEAD"]);
  assert.equal(status.generic_well_known_proxy, false);
  assert.equal(status.upstream_proxy, false);
  assert.equal(status.private_key_access, false);
  assert.equal(status.signature_creation, false);
  assert.equal(status.publication_write, false);
  assert.equal(status.runtime_mutation, false);

  for (const marker of [
    'from "./void-public-origin-binding-serving-v1.mjs"',
    "configureVoidPublicOriginBindingServingFromEnvV1(process.env)",
    "serveVoidPublicOriginBindingV1(",
    "publicOriginBindingServingStatusV1(",
  ]) {
    assert.equal(
      adapterSource.includes(marker),
      true,
      `public seed adapter missing binding-serving marker: ${marker}`,
    );
  }
  assert.ok(
    adapterSource.indexOf(
      "serveVoidPublicOriginBindingV1(",
    ) < adapterSource.indexOf(
      "if (!allowed(url.pathname, url.search))",
    ),
    "binding route must be resolved before generic allowlist rejection",
  );
  assert.equal(
    adapterSource.includes(
      'prefixAllow = [\n  "/.well-known"',
    ),
    false,
    "generic /.well-known prefix exposure is forbidden",
  );
  assert.equal(
    adapterSource.includes(
      '"/.well-known/void-node-public-origin-binding-v1.json",',
    ),
    false,
    "binding path must not be added to generic proxy exactAllow",
  );

  for (const marker of [
    'from "../ops/public/void-public-origin-binding-serving-v1.mjs"',
    "configureVoidPublicOriginBindingServingFromEnvV1(process.env)",
    "serveVoidPublicOriginBindingV1(",
    "publicOriginBindingServingStatusV1(",
  ]) {
    assert.equal(
      seedGatewaySource.includes(marker),
      true,
      `canonical 4111 seed gateway missing binding-serving marker: ${marker}`,
    );
  }
  assert.ok(
    seedGatewaySource.indexOf(
      "serveVoidPublicOriginBindingV1(",
    ) < seedGatewaySource.indexOf(
      "requestUrl.pathname === CHECKPOINT_DISCOVERY_ROUTE_V1",
    ),
    "canonical 4111 seed gateway must resolve exact binding aliases before checkpoint/generic routing",
  );
  assert.equal(
    seedGatewaySource.includes(
      '"/.well-known/void-node-public-origin-binding-v1.json"',
    ),
    false,
    "canonical 4111 gateway must compose the reviewed exact-route server instead of duplicating a literal allowlist",
  );

  console.log(
    "VOID_PUBLIC_ORIGIN_BINDING_SERVING_V1_PROOF_GREEN",
  );
  console.log("signed_binding_verified_before_serve=true");
  console.log("two_aliases_byte_identical=true");
  console.log("canonical_4111_seed_gateway_composed=true");
  console.log("get_head_only=true");
  console.log("query_rejected=true");
  console.log("runtime_expiry_rechecked=true");
  console.log("expired_binding_not_served=true");
  console.log("disabled_route_not_public=true");
  console.log("partial_configuration_fails_closed=true");
  console.log("public_https_origin_required=true");
  console.log("expected_node_id_required=true");
  console.log("direct_regular_file_required=true");
console.log("canonical_non_symlink_path_required=true");
console.log("symlinked_parent_directory_rejected=true");
  console.log("bounded_artifact_bytes=true");
  console.log("generic_well_known_proxy=false");
  console.log("upstream_proxy=false");
  console.log("private_key_access=false");
  console.log("wallet_or_signer_access=false");
  console.log("signature_creation=false");
  console.log("publication_write=false");
  console.log("runtime_mutation=false");
  console.log("work_credit_mutation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
