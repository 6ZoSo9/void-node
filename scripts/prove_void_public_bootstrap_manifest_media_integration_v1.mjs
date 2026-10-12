#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const MARKER =
  "VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_INTEGRATION_V1_PROOF_GREEN";
const resolverPath = "scripts/resolve_void_public_bootstrap_v1.mjs";
const source = fs.readFileSync(resolverPath, "utf8");

function includes(value, label) {
  assert.equal(source.includes(value), true, `${label} missing`);
}

includes(
  'from "./lib/void_public_bootstrap_manifest_media_type_v1.mjs";',
  "bounded media policy import",
);
includes(
  "classifyVoidPublicBootstrapManifestMediaTypeV1({",
  "bounded media policy call",
);
includes(
  "hostname: normalized.hostname",
  "normalized hostname binding",
);
includes(
  "pathname: normalized.url.pathname",
  "normalized path binding",
);
includes(
  'content_type: response.headers["content-type"]',
  "response media binding",
);
includes(
  'terminalManifestError(\n              "manifest response media type is not allowed"',
  "media rejection",
);

assert.equal(
  source.includes('contentType.startsWith("application/json")'),
  false,
  "legacy global JSON-prefix gate remains",
);
assert.equal(
  source.includes("manifest response is not application/json"),
  false,
  "legacy global media error remains",
);

for (const [needle, label] of [
  [
    "manifest request connected to unexpected address",
    "pinned connected address guard",
  ],
  [
    "manifest request connected to non-public address",
    "public connected address guard",
  ],
  [
    "manifest request redirected with HTTP",
    "redirect rejection",
  ],
  [
    "manifest request returned HTTP",
    "non-200 rejection",
  ],
  [
    "manifest advertised an oversized response",
    "advertised-size guard",
  ],
  [
    "manifest exceeded the response limit",
    "streamed-size guard",
  ],
  [
    'parseJsonBytes(Buffer.concat(chunks, total), "bootstrap manifest")',
    "bounded JSON parse",
  ],
  [
    "const validated = validateManifest(await fetchManifest(manifestUrl));",
    "post-fetch manifest validation",
  ],
  ["verifyManifestId(manifest);", "manifest content-ID validation"],
  ["exactKeys(", "closed schema validation"],
  ["probePublicSeedSample(endpoint.base", "live seed revalidation"],
]) {
  includes(needle, label);
}

process.stdout.write(
  [
    MARKER,
    "bounded_media_policy_imported=true",
    "normalized_host_path_bound=true",
    "legacy_global_json_prefix_gate=false",
    "address_pinning_preserved=true",
    "public_ip_guard_preserved=true",
    "redirect_rejection_preserved=true",
    "response_size_guards_preserved=true",
    "bounded_json_parse_preserved=true",
    "closed_manifest_schema_preserved=true",
    "manifest_content_id_preserved=true",
    "live_seed_revalidation_preserved=true",
    "",
  ].join("\n"),
);
