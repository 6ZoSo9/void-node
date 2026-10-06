#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_AGENT_CREDENTIAL_REQUEST_MAX_BODY_BYTES_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_AUTHORITY_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_TIMEOUT_MS_V1,
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-edge-composition-v1.mjs";

const SIGNATURE = Buffer.from([
  0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d,
  0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a,
]);

function ipv4Bytes(value) {
  const parts = value.split(".").map(Number);
  assert.equal(parts.length, 4);
  assert.equal(
    parts.every(
      (v) => Number.isInteger(v) && v >= 0 && v <= 255,
    ),
    true,
  );
  return Buffer.from(parts);
}

function proxy4({
  source,
  sourcePort,
  destinationPort = 443,
  requestLine,
}) {
  const payload = Buffer.alloc(12);
  ipv4Bytes(source).copy(payload, 0);
  ipv4Bytes("127.0.0.1").copy(payload, 4);
  payload.writeUInt16BE(sourcePort, 8);
  payload.writeUInt16BE(destinationPort, 10);
  const header = Buffer.alloc(16);
  SIGNATURE.copy(header, 0);
  header[12] = 0x21;
  header[13] = 0x11;
  header.writeUInt16BE(payload.length, 14);
  return Buffer.concat([
    header,
    payload,
    Buffer.from(
      requestLine + "\r\nHost: voidchain.org\r\n\r\n",
      "ascii",
    ),
  ]);
}

function proxy6({
  sourceHex =
    "20010db8000000000000000000000001",
  destinationHex =
    "fd7a115ca1e000000000000011112222",
  sourcePort = 50001,
  requestLine,
}) {
  const source = Buffer.from(sourceHex, "hex");
  const destination = Buffer.from(destinationHex, "hex");
  assert.equal(source.length, 16);
  assert.equal(destination.length, 16);
  const payload = Buffer.alloc(36);
  source.copy(payload, 0);
  destination.copy(payload, 16);
  payload.writeUInt16BE(sourcePort, 32);
  payload.writeUInt16BE(443, 34);
  const header = Buffer.alloc(16);
  SIGNATURE.copy(header, 0);
  header[12] = 0x21;
  header[13] = 0x21;
  header.writeUInt16BE(payload.length, 14);
  return Buffer.concat([
    header,
    payload,
    Buffer.from(
      requestLine + "\r\nHost: voidchain.org\r\n\r\n",
      "ascii",
    ),
  ]);
}

const spoofedHeaders = {
  Host: "voidchain.org",
  "Content-Type": "application/json",
  "X-Forwarded-For": "198.51.100.250",
  "x-forwarded-made-up": "spoof",
  Forwarded: "for=198.51.100.250",
  "CF-Connecting-IP": "198.51.100.250",
  "True-Client-IP": "198.51.100.250",
  "X-Real-IP": "198.51.100.250",
  "X-Void-Trusted-Funnel-Source-V1": "spoof",
};

const baseRate = {
  now_ms: 100_000,
  window_ms: 60_000,
  max_requests_per_source: 2,
  prior_events: [],
};

function exhaustedEvents(sourceKey) {
  return [
    { source_key: sourceKey, at_ms: 90_000 },
    { source_key: sourceKey, at_ms: 95_000 },
  ];
}

const a = classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
  connection_prefix: proxy4({
    source: "203.0.113.10",
    sourcePort: 40000,
    requestLine:
      "POST " +
      VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 +
      " HTTP/1.1",
  }),
  headers: spoofedHeaders,
  ...baseRate,
});
assert.equal(a.ok, true);
assert.equal(
  a.status,
  "CREDENTIAL_SOURCE_RATE_ALLOWED_NOT_TRUSTED",
);
assert.equal(a.credential_source_rate_applied, true);
assert.equal(a.source_identity_forwarded_to_gateway, false);
assert.equal(a.local_transport_trust_proven, false);
assert.equal(a.http_parser_stream_binding_proven, false);
assert.equal(a.credential_route_limits_enforced, false);
assert.equal(a.rotation_resistant_fairness_proven, false);
assert.equal(a.rate_state_custody_proven, false);
assert.equal(a.concurrent_rate_state_serialization_proven, false);
assert.equal(a.gateway_runtime_configuration_verified, false);
assert.equal(a.runtime_integration, false);
assert.equal(a.credential_route_limits.max_body_bytes, 64 * 1024);
assert.equal(
  a.credential_route_limits.upstream_timeout_ms,
  15_000,
);
assert.equal(
  a.credential_route_limits.max_response_bytes,
  4 * 1024 * 1024,
);
assert.equal(a.sanitized_headers.host, "voidchain.org");
for (const name of [
  "x-forwarded-for",
  "x-forwarded-made-up",
  "forwarded",
  "cf-connecting-ip",
  "true-client-ip",
  "x-real-ip",
  "x-void-trusted-funnel-source-v1",
]) {
  assert.equal(
    Object.hasOwn(a.sanitized_headers, name),
    false,
    name,
  );
}

const aOtherPort =
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
    connection_prefix: proxy4({
      source: "203.0.113.10",
      sourcePort: 49999,
      requestLine:
        "POST " +
        VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 +
        " HTTP/1.1",
    }),
    headers: { Host: "voidchain.org" },
    ...baseRate,
  });
assert.equal(aOtherPort.ok, true);
assert.equal(
  aOtherPort.edge_limiter_source_key,
  a.edge_limiter_source_key,
);

const aExhausted =
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
    connection_prefix: proxy4({
      source: "203.0.113.10",
      sourcePort: 41000,
      requestLine:
        "POST " +
        VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 +
        " HTTP/1.1",
    }),
    headers: { Host: "voidchain.org" },
    now_ms: 100_000,
    window_ms: 60_000,
    max_requests_per_source: 2,
    prior_events: exhaustedEvents(a.edge_limiter_source_key),
  });
assert.equal(aExhausted.ok, false);
assert.equal(aExhausted.status, "RATE_LIMITED");
assert.equal(
  aExhausted.reason,
  "credential_request_proxy_source_rate_limited",
);

const b = classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
  connection_prefix: proxy4({
    source: "203.0.113.11",
    sourcePort: 42000,
    requestLine:
      "POST " +
      VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 +
      " HTTP/1.1",
  }),
  headers: {
    Host: "voidchain.org",
    "X-Forwarded-For": "203.0.113.10",
  },
  now_ms: 100_000,
  window_ms: 60_000,
  max_requests_per_source: 2,
  prior_events: aExhausted.next_rate_events,
});
assert.equal(b.ok, true);
assert.notEqual(
  b.edge_limiter_source_key,
  a.edge_limiter_source_key,
);
assert.equal(b.source_request_count_before, 0);

const v6 =
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
    connection_prefix: proxy6({
      requestLine:
        "POST " +
        VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 +
        " HTTP/1.1",
    }),
    headers: { Host: "voidchain.org" },
    ...baseRate,
  });
assert.equal(v6.ok, true);
assert.equal(
  v6.status,
  "CREDENTIAL_SOURCE_RATE_ALLOWED_NOT_TRUSTED",
);
assert.equal(v6.credential_source_rate_applied, true);
assert.notEqual(
  v6.edge_limiter_source_key,
  a.edge_limiter_source_key,
  "TCP6 source identity must remain distinct from TCP4",
);

const normalizationAliases = [
  VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 + "?",
  "/__void/agents/paid-work/./credential-requests/v1",
  "/__void/agents/paid-work/%2e/credential-requests/v1",
  "/__void/agents/paid-work/x/%2e%2e/credential-requests/v1",
  "/__void/agents/paid-work\\credential-requests/v1",
];

for (const target of normalizationAliases) {
  const alias4 =
    classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
      connection_prefix: proxy4({
        source: "203.0.113.10",
        sourcePort: 47000,
        requestLine: "POST " + target + " HTTP/1.1",
      }),
      headers: { Host: "voidchain.org" },
      now_ms: 100_000,
      window_ms: 60_000,
      max_requests_per_source: 2,
      prior_events: exhaustedEvents(a.edge_limiter_source_key),
    });
  assert.equal(alias4.ok, false, target);
  assert.equal(alias4.status, "HOLD", target);
  assert.equal(
    alias4.reason,
    "edge_credential_request_target_noncanonical",
    target,
  );

  const alias6 =
    classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
      connection_prefix: proxy6({
        sourcePort: 47001,
        requestLine: "POST " + target + " HTTP/1.1",
      }),
      headers: { Host: "voidchain.org" },
      now_ms: 100_000,
      window_ms: 60_000,
      max_requests_per_source: 2,
      prior_events: exhaustedEvents(v6.edge_limiter_source_key),
    });
  assert.equal(alias6.ok, false, target);
  assert.equal(alias6.status, "HOLD", target);
  assert.equal(
    alias6.reason,
    "edge_credential_request_target_noncanonical",
    target,
  );
}

const nonEmptyQueryUnderExhaustedSource =
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
    connection_prefix: proxy4({
      source: "203.0.113.10",
      sourcePort: 47002,
      requestLine:
        "POST " +
        VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 +
        "?bad=1 HTTP/1.1",
    }),
    headers: { Host: "voidchain.org" },
    now_ms: 100_000,
    window_ms: 60_000,
    max_requests_per_source: 2,
    prior_events: exhaustedEvents(a.edge_limiter_source_key),
  });
assert.equal(nonEmptyQueryUnderExhaustedSource.ok, true);
assert.equal(
  nonEmptyQueryUnderExhaustedSource.status,
  "FORWARD_SANITIZED_NOT_TRUSTED",
);
assert.equal(
  nonEmptyQueryUnderExhaustedSource.credential_source_rate_applied,
  false,
);
assert.equal(
  nonEmptyQueryUnderExhaustedSource.rate_event_state_mutation_required,
  false,
);

const genuineNonCredentialUnderExhaustedSource =
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
    connection_prefix: proxy4({
      source: "203.0.113.10",
      sourcePort: 47003,
      requestLine:
        "GET /public-node/agents/discovery-v1.json HTTP/1.1",
    }),
    headers: { Host: "voidchain.org" },
    now_ms: 100_000,
    window_ms: 60_000,
    max_requests_per_source: 2,
    prior_events: exhaustedEvents(a.edge_limiter_source_key),
  });
assert.equal(genuineNonCredentialUnderExhaustedSource.ok, true);
assert.equal(
  genuineNonCredentialUnderExhaustedSource.status,
  "FORWARD_SANITIZED_NOT_TRUSTED",
);
assert.equal(
  genuineNonCredentialUnderExhaustedSource.credential_source_rate_applied,
  false,
);
assert.equal(
  genuineNonCredentialUnderExhaustedSource.next_rate_events,
  null,
);

for (const [method, target] of [
  ["GET", "/public-node/agents/discovery-v1.json"],
  ["POST", "/__void/agents/paid-work/submissions/v1"],
  [
    "POST",
    VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 + "?bad=1",
  ],
]) {
  const pass =
    classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
      connection_prefix: proxy4({
        source: "203.0.113.12",
        sourcePort: 43000,
        requestLine:
          method + " " + target + " HTTP/1.1",
      }),
      headers: {
        Host: "voidchain.org",
        "X-Forwarded-For": "spoof",
      },
    });
  assert.equal(pass.ok, true);
  assert.equal(pass.status, "FORWARD_SANITIZED_NOT_TRUSTED");
  assert.equal(pass.forward_method, method);
  assert.equal(pass.forward_target, target);
  assert.equal(pass.credential_source_rate_applied, false);
  assert.equal(
    pass.rate_event_state_mutation_required,
    false,
  );
  assert.equal(pass.next_rate_events, null);
  assert.equal(
    Object.hasOwn(
      pass.sanitized_headers,
      "x-forwarded-for",
    ),
    false,
  );
}

const wrongDestinationPort =
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
    connection_prefix: proxy4({
      source: "203.0.113.30",
      sourcePort: 45000,
      destinationPort: 8443,
      requestLine:
        "POST " +
        VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 +
        " HTTP/1.1",
    }),
    headers: { Host: "voidchain.org" },
    ...baseRate,
  });
assert.equal(wrongDestinationPort.ok, false);
assert.equal(
  wrongDestinationPort.reason,
  "edge_proxy_destination_port_invalid",
);

const malformed =
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
    connection_prefix: Buffer.from(
      "POST " +
        VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 +
        " HTTP/1.1\r\n\r\n",
      "ascii",
    ),
    headers: { Host: "voidchain.org" },
    ...baseRate,
  });
assert.equal(malformed.ok, false);
assert.match(malformed.reason, /^edge_proxy_v2_/u);

const duplicatePreface =
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
    connection_prefix: Buffer.concat([
      proxy4({
        source: "203.0.113.20",
        sourcePort: 44000,
        requestLine: "GET /ignored HTTP/1.1",
      }).subarray(0, 28),
      proxy4({
        source: "203.0.113.21",
        sourcePort: 44001,
        requestLine: "GET /also-ignored HTTP/1.1",
      }),
    ]),
    headers: { Host: "voidchain.org" },
  });
assert.equal(duplicatePreface.ok, false);
assert.equal(
  duplicatePreface.reason,
  "edge_http_request_line_invalid",
);

const highBitRequestLine =
  classifyVoidAgentCredentialRequestProxyV2EdgeCompositionV1({
    connection_prefix: Buffer.concat([
      proxy4({
        source: "203.0.113.22",
        sourcePort: 44002,
        requestLine: "GET /ignored HTTP/1.1",
      }).subarray(0, 28),
      Buffer.from([0xd0]),
      Buffer.from(
        "OST " +
          VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 +
          " HTTP/1.1\r\n\r\n",
        "ascii",
      ),
    ]),
    headers: { Host: "voidchain.org" },
    ...baseRate,
  });
assert.equal(highBitRequestLine.ok, false);
assert.equal(
  highBitRequestLine.reason,
  "edge_http_request_line_invalid",
);

const gatewaySource = fs.readFileSync(
  path.join(
    process.cwd(),
    "ops",
    "void-ai-agent-public-gateway-v1.mjs",
  ),
  "utf8",
);
assert.match(
  gatewaySource,
  /const AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH =\s*\n\s*"\/__void\/agents\/paid-work\/credential-requests\/v1";/u,
);
assert.match(
  gatewaySource,
  /VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_BODY_BYTES \|\|\s*\n\s*String\(64 \* 1024\)/u,
);
assert.match(
  gatewaySource,
  /VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_TIMEOUT_MS \|\| "15000"/u,
);
assert.match(
  gatewaySource,
  /VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES \|\|\s*\n\s*String\(4 \* 1024 \* 1024\)/u,
);

assert.deepEqual(
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_AUTHORITY_V1,
  {
    source_contract: true,
    proxy_v2_source_required: true,
    proxy_v2_source_contract_reused: true,
    http_request_line_bound: true,
    public_tls_destination_port_bound: true,
    all_forwarded_headers_sanitized: true,
    http_parser_stream_binding_proven: false,
    credential_route_source_rate_planning: true,
    credential_route_normalization_aliases_rejected: true,
    noncredential_route_passthrough: true,
    credential_route_limits_bound: true,
    credential_route_limits_enforced: false,
    rate_state_custody_proven: false,
    concurrent_rate_state_serialization_proven: false,
    gateway_runtime_configuration_verified: false,
    source_identity_forwarded_to_gateway: false,
    upstream_loopback_limiter_modified: false,
    rotation_resistant_fairness_proven: false,
    nat_independent_participant_isolation_proven: false,
    source_address_stability_proven: false,
    local_transport_trust_proven: false,
    tailscale_funnel_configuration_verified: false,
    listener_created: false,
    public_gateway_modified: false,
    runtime_integration: false,
    credential_issuance: false,
    credential_registry_write: false,
    paid_work_dispatch: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    market_activation: false,
    public_presale_activation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  },
);

assert.equal(
  VOID_AGENT_CREDENTIAL_REQUEST_MAX_BODY_BYTES_V1,
  65_536,
);
assert.equal(
  VOID_AGENT_CREDENTIAL_REQUEST_TIMEOUT_MS_V1,
  15_000,
);
assert.equal(
  VOID_AGENT_CREDENTIAL_REQUEST_MAX_RESPONSE_BYTES_V1,
  4_194_304,
);

console.log(
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_EDGE_COMPOSITION_V1 +
    "_PROOF_GREEN",
);
console.log("exact_proxy_v2_preface_required=true");
console.log("public_tls_destination_port_bound=true");
console.log("tcp4_tcp6_composition=true");
console.log("all_forwarded_headers_sanitized=true");
console.log("credential_route_source_isolation=true");
console.log("credential_route_normalization_aliases_rejected=true");
console.log("ipv4_ipv6_exhausted_source_alias_bypass_rejected=true");
console.log("nonempty_query_downstream_rejection_preserved=true");
console.log("other_routes_preserved=true");
console.log("credential_max_body_bytes=65536");
console.log("credential_timeout_ms=15000");
console.log("credential_max_response_bytes=4194304");
console.log("source_identity_forwarded_to_gateway=false");
console.log("upstream_loopback_limiter_modified=false");
console.log("rate_state_custody_proven=false");
console.log("concurrent_rate_state_serialization_proven=false");
console.log("gateway_runtime_configuration_verified=false");
console.log("http_parser_stream_binding_proven=false");
console.log("credential_route_limits_enforced=false");
console.log("rotation_resistant_fairness_proven=false");
console.log("nat_independent_participant_isolation_proven=false");
console.log("source_address_stability_proven=false");
console.log("local_transport_trust_proven=false");
console.log("tailscale_funnel_configuration_verified=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
