#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_AUTHORITY_V1,
  VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_V1,
  classifyVoidPublicBootstrapManifestMediaTypeV1,
} from "./lib/void_public_bootstrap_manifest_media_type_v1.mjs";

const SHA = "a".repeat(40);

function decision(hostname, pathname, contentType) {
  return classifyVoidPublicBootstrapManifestMediaTypeV1({
    hostname,
    pathname,
    content_type: contentType,
  });
}

for (const type of [
  "application/json",
  "application/json; charset=utf-8",
  "application/manifest+json",
  "APPLICATION/JSON ; charset=UTF-8",
]) {
  const result = decision(
    "manifest.example.org",
    "/bootstrap/v1.json",
    type,
  );
  assert.equal(result.ok, true, `generic JSON type rejected: ${type}`);
  assert.equal(result.mode, "json_media_type");
  assert.equal(result.canonical_github_raw_exception, false);
}

for (const [pathname, type] of [
  ["/6ZoSo9/void-node/main/public/bootstrap/v1.json", "text/plain"],
  [
    `/6ZoSo9/void-node/${SHA}/public/bootstrap/v1.json`,
    "text/plain; charset=utf-8",
  ],
  [
    "/6ZoSo9/void-node/main/public/bootstrap/v1.json",
    "application/octet-stream",
  ],
]) {
  const result = decision("raw.githubusercontent.com", pathname, type);
  assert.equal(result.ok, true, `canonical GitHub Raw type rejected: ${type}`);
  assert.equal(result.mode, "canonical_github_raw_json_bytes");
  assert.equal(result.canonical_github_raw_exception, true);
}

for (const [hostname, pathname, type] of [
  ["manifest.example.org", "/bootstrap/v1.json", "text/plain"],
  [
    "raw.githubusercontent.com.evil.example",
    "/6ZoSo9/void-node/main/public/bootstrap/v1.json",
    "text/plain",
  ],
  [
    "raw.githubusercontent.com",
    "/other/void-node/main/public/bootstrap/v1.json",
    "text/plain",
  ],
  [
    "raw.githubusercontent.com",
    "/6ZoSo9/other/main/public/bootstrap/v1.json",
    "text/plain",
  ],
  [
    "raw.githubusercontent.com",
    "/6ZoSo9/void-node/dev/public/bootstrap/v1.json",
    "text/plain",
  ],
  [
    "raw.githubusercontent.com",
    "/6ZoSo9/void-node/main/public/bootstrap/other.json",
    "text/plain",
  ],
  [
    "raw.githubusercontent.com",
    "/6ZoSo9/void-node/main/public/bootstrap/v1.json/extra",
    "text/plain",
  ],
  [
    "raw.githubusercontent.com",
    "/6ZoSo9/void-node/main/public/bootstrap/v1.json",
    "text/html",
  ],
  [
    "raw.githubusercontent.com",
    "/6ZoSo9/void-node/main/public/bootstrap/v1.json",
    "",
  ],
]) {
  const result = decision(hostname, pathname, type);
  assert.equal(
    result.ok,
    false,
    `unsafe media exception accepted: ${hostname}${pathname} ${type}`,
  );
  assert.equal(result.reason, "manifest_response_media_type_not_allowed");
}

assert.equal(
  VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_V1,
  "VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_V1",
);
assert.equal(
  VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_AUTHORITY_V1
    .canonical_github_raw_exception_only,
  true,
);
assert.equal(
  VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_AUTHORITY_V1
    .text_plain_global_acceptance,
  false,
);
assert.equal(
  VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_AUTHORITY_V1
    .octet_stream_global_acceptance,
  false,
);
assert.equal(
  VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_AUTHORITY_V1.network_request,
  false,
);
assert.equal(
  VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_AUTHORITY_V1.credential_access,
  false,
);
assert.equal(
  VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_AUTHORITY_V1.money_movement,
  false,
);

process.stdout.write(
  [
    "VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_V1_PROOF_GREEN",
    "generic_json_media_type_required=true",
    "structured_json_suffix_allowed=true",
    "canonical_github_raw_text_plain=true",
    "canonical_github_raw_octet_stream=true",
    "wrong_host_exception=false",
    "wrong_owner_exception=false",
    "wrong_repository_exception=false",
    "wrong_ref_exception=false",
    "wrong_path_exception=false",
    "text_plain_global_acceptance=false",
    "octet_stream_global_acceptance=false",
    "network_request=false",
    "credential_access=false",
    "money_movement=false",
    "",
  ].join("\n"),
);
