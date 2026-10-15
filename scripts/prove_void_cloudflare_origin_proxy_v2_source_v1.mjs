#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_AUTHORITY_V1,
  VOID_CLOUDFLARE_ORIGIN_CREDENTIAL_PATH_V1,
  VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
  VOID_CLOUDFLARE_ORIGIN_EARN_SUBMIT_PATH_V1,
  VOID_CLOUDFLARE_ORIGIN_HOST_V1,
  deriveVoidCloudflareOriginProxyV2SourceV1,
} from "../tools/void-cloudflare-origin-proxy-v2-source-v1.mjs";
import {
  VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-edge-composition-v1.mjs";
import {
  VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
} from "../tools/void-public-earn-proxy-v2-edge-contract-v1.mjs";
import {
  parseVoidAgentCredentialRequestProxyV2SourceV1,
  sanitizeVoidAgentCredentialRequestProxyV2HeadersV1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs";
import {
  VOID_PUBLIC_443_DISPATCH_CREDENTIAL_V1,
  VOID_PUBLIC_443_DISPATCH_EARN_V1,
  classifyVoidPublic443ProxyV2DispatchV1,
} from "../tools/void-public-443-proxy-v2-dispatch-v1.mjs";

const MARKER = "VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_V1_PROOF";

assert.equal(
  VOID_CLOUDFLARE_ORIGIN_CREDENTIAL_PATH_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1,
);
assert.equal(
  VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
  VOID_PUBLIC_EARN_CLAIM_PATH_V1,
);
assert.equal(
  VOID_CLOUDFLARE_ORIGIN_EARN_SUBMIT_PATH_V1,
  VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
);
assert.equal(VOID_CLOUDFLARE_ORIGIN_HOST_V1, "seed.nullfeed.org");

function headers(ip, extras = []) {
  return [
    "Host", "seed.nullfeed.org",
    "CF-Connecting-IP", ip,
    "X-Forwarded-For", "203.0.113.200",
    ...extras,
  ];
}

const cases = [
  Object.freeze({
    ip: "192.0.2.1",
    family: "tcp4",
    hex: "c0000201",
  }),
  Object.freeze({
    ip: "2001:db8::1",
    family: "tcp6",
    hex: "20010db8000000000000000000000001",
  }),
  Object.freeze({
    ip: "::ffff:192.0.2.1",
    family: "tcp6",
    hex: "00000000000000000000ffffc0000201",
  }),
];

const routes = [
  Object.freeze({
    path: VOID_CLOUDFLARE_ORIGIN_CREDENTIAL_PATH_V1,
    dispatch: VOID_PUBLIC_443_DISPATCH_CREDENTIAL_V1,
  }),
  Object.freeze({
    path: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
    dispatch: VOID_PUBLIC_443_DISPATCH_EARN_V1,
  }),
  Object.freeze({
    path: VOID_CLOUDFLARE_ORIGIN_EARN_SUBMIT_PATH_V1,
    dispatch: VOID_PUBLIC_443_DISPATCH_EARN_V1,
  }),
];

for (const sample of cases) {
  for (const route of routes) {
    const derived = deriveVoidCloudflareOriginProxyV2SourceV1({
      method: "POST",
      target: route.path,
      raw_headers: headers(sample.ip),
    });
    assert.equal(derived.ok, true, JSON.stringify(derived));
    assert.equal(
      derived.status,
      "CLOUDFLARE_SOURCE_TRANSLATED_NOT_TRANSPORT_TRUSTED",
    );
    assert.equal(derived.source_family, sample.family);
    assert.equal(derived.source_address_hex, sample.hex);
    assert.equal(derived.source_port, 0);
    assert.equal(derived.destination_port, 443);
    assert.equal(derived.destination_address_original_proven, false);
    assert.equal(derived.cloudflare_header_transport_trusted, false);
    assert.equal(derived.cloudflared_uid_isolation_proven, false);
    assert.equal(derived.runtime_integration, false);

    const parsed =
      parseVoidAgentCredentialRequestProxyV2SourceV1(
        derived.proxy_v2_preface,
      );
    assert.equal(parsed.ok, true, JSON.stringify(parsed));
    assert.equal(parsed.family, sample.family);
    assert.equal(parsed.source_address_hex, sample.hex);
    assert.equal(parsed.source_port, 0);
    assert.equal(parsed.destination_port, 443);
    assert.equal(parsed.source_port_in_limiter_identity, false);

    const sanitized =
      sanitizeVoidAgentCredentialRequestProxyV2HeadersV1(
        {
          host: "seed.nullfeed.org",
          "cf-connecting-ip": sample.ip,
          "x-forwarded-for": "203.0.113.201",
          forwarded: "for=203.0.113.202",
          "true-client-ip": "203.0.113.203",
          "x-real-ip": "203.0.113.204",
        },
        parsed,
      );
    assert.equal(sanitized.ok, true, JSON.stringify(sanitized));
    assert.equal(sanitized.headers.host, "seed.nullfeed.org");
    for (const removed of [
      "cf-connecting-ip",
      "x-forwarded-for",
      "forwarded",
      "true-client-ip",
      "x-real-ip",
    ]) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          sanitized.headers,
          removed,
        ),
        false,
        removed,
      );
    }

    const connectionPrefix = Buffer.concat([
      derived.proxy_v2_preface,
      Buffer.from(
        "POST " + route.path +
        " HTTP/1.1\r\nHost: seed.nullfeed.org\r\n\r\n",
        "ascii",
      ),
    ]);
    const dispatch = classifyVoidPublic443ProxyV2DispatchV1({
      connection_prefix: connectionPrefix,
    });
    assert.equal(dispatch.ok, true, JSON.stringify(dispatch));
    assert.equal(dispatch.dispatch_target, route.dispatch);
    assert.equal(
      dispatch.limiter_source_key,
      parsed.limiter_source_key,
    );
    assert.equal(dispatch.public_tls_destination_port_bound, true);
  }
}

const negative = [
  Object.freeze({
    reason: "method",
    input: {
      method: "GET",
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      raw_headers: headers("192.0.2.1"),
    },
  }),
  Object.freeze({
    reason: "query",
    input: {
      method: "POST",
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1 + "?x=1",
      raw_headers: headers("192.0.2.1"),
    },
  }),
  Object.freeze({
    reason: "trailing",
    input: {
      method: "POST",
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1 + "/",
      raw_headers: headers("192.0.2.1"),
    },
  }),
  Object.freeze({
    reason: "unrelated",
    input: {
      method: "POST",
      target: "/ready.json",
      raw_headers: headers("192.0.2.1"),
    },
  }),
  Object.freeze({
    reason: "missing source",
    input: {
      method: "POST",
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      raw_headers: ["Host", "seed.nullfeed.org"],
    },
  }),
  Object.freeze({
    reason: "duplicate source",
    input: {
      method: "POST",
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      raw_headers: [
        "Host", "seed.nullfeed.org",
        "CF-Connecting-IP", "192.0.2.1",
        "cf-connecting-ip", "192.0.2.2",
      ],
    },
  }),
  Object.freeze({
    reason: "wrong host",
    input: {
      method: "POST",
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      raw_headers: [
        "Host", "other.example",
        "CF-Connecting-IP", "192.0.2.1",
      ],
    },
  }),
  Object.freeze({
    reason: "noncanonical v4",
    input: {
      method: "POST",
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      raw_headers: headers("192.168.001.1"),
    },
  }),
  Object.freeze({
    reason: "zone v6",
    input: {
      method: "POST",
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      raw_headers: headers("fe80::1%eth0"),
    },
  }),
  Object.freeze({
    reason: "pseudo ipv4",
    input: {
      method: "POST",
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      raw_headers: headers(
        "2001:db8::1",
        ["CF-Connecting-IPv6", "2001:db8::1"],
      ),
    },
  }),
  Object.freeze({
    reason: "pseudo marker",
    input: {
      method: "POST",
      target: VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1,
      raw_headers: headers(
        "192.0.2.1",
        ["CF-Pseudo-IPv4", "240.0.0.1"],
      ),
    },
  }),
];

for (const sample of negative) {
  const result =
    deriveVoidCloudflareOriginProxyV2SourceV1(sample.input);
  assert.equal(result.ok, false, sample.reason);
  assert.equal(result.status, "HOLD", sample.reason);
  assert.equal(
    result.cloudflare_header_transport_trusted,
    false,
    sample.reason,
  );
}

for (const [key, expected] of Object.entries({
  source_contract: true,
  signed_public_origin_preserved: true,
  exact_sensitive_routes_only: true,
  cf_connecting_ip_syntax_validated: true,
  proxy_v2_destination_port_443_bound: true,
  source_port_in_participant_identity: false,
  destination_address_original_proven: false,
  cloudflare_header_transport_trusted: false,
  cloudflared_uid_isolation_proven: false,
  cloudflare_worker_route_absence_proven: false,
  pseudo_ipv4_overwrite_disabled_proven: false,
  downstream_exclusive_reachability_proven: false,
  runtime_integration: false,
  dns_or_tunnel_mutation: false,
  nftables_or_service_mutation: false,
  credential_issuance: false,
  work_credit_write: false,
  wallet_or_signer_access: false,
  transaction_broadcast: false,
  public_presale_activation: false,
  funds_movement: false,
})) {
  assert.equal(
    VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-cloudflare-origin-proxy-v2-source-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "createServer(",
  ".listen(",
  "systemctl",
  "nft",
  "cloudflared tunnel route",
  "tailscale funnel",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

const workflow = fs.readFileSync(
  ".github/workflows/cloudflare-origin-proxy-v2-source-v1.yml",
  "utf8",
);
for (const dependency of [
  "tools/void-cloudflare-origin-proxy-v2-source-v1.mjs",
  "scripts/prove_void_cloudflare_origin_proxy_v2_source_v1.mjs",
  "tools/void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs",
  "tools/void-agent-paid-work-credential-request-proxy-v2-edge-composition-v1.mjs",
  "tools/void-public-earn-proxy-v2-edge-contract-v1.mjs",
  "tools/void-public-443-proxy-v2-dispatch-v1.mjs",
]) {
  assert.equal(workflow.includes(dependency), true, dependency);
}
assert.equal(
  workflow.includes('BASE="$(git rev-parse "$HEAD^1")"'),
  true,
);
assert.equal(
  workflow.includes('git merge-base --is-ancestor "$BASE" "$HEAD"'),
  true,
);

console.log(MARKER + "_GREEN");
console.log("ipv4_translation=true");
console.log("ipv6_translation=true");
console.log("ipv4_mapped_ipv6_translation=true");
console.log("credential_route_exact=true");
console.log("earn_claim_route_exact=true");
console.log("earn_submit_route_exact=true");
console.log("cf_connecting_ip_removed_downstream=true");
console.log("spoofable_forwarding_headers_removed_downstream=true");
console.log("source_port_in_participant_identity=false");
console.log("public_destination_port=443");
console.log("cloudflare_header_transport_trusted=false");
console.log("cloudflared_uid_isolation_proven=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
