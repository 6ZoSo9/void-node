#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_AUTHORITY_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_TRUSTED_SOURCE_HEADER_V1,
  parseVoidAgentCredentialRequestProxyV2SourceV1,
  planVoidAgentCredentialRequestProxyV2RateLimitV1,
  sanitizeVoidAgentCredentialRequestProxyV2HeadersV1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs";

const SIG = Buffer.from([
  0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d,
  0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a,
]);

function ipv4(value) {
  const parts = value.split(".").map(Number);
  assert.equal(parts.length, 4);
  for (const part of parts) {
    assert.ok(Number.isInteger(part) && part >= 0 && part <= 255);
  }
  return Buffer.from(parts);
}

function tcp4Frame({
  source = "203.0.113.7",
  destination = "100.64.0.1",
  sourcePort = 50000,
  destinationPort = 443,
  tlv = Buffer.alloc(0),
  versionCommand = 0x21,
  familyProtocol = 0x11,
  trailing = Buffer.alloc(0),
} = {}) {
  const address = Buffer.alloc(12);
  ipv4(source).copy(address, 0);
  ipv4(destination).copy(address, 4);
  address.writeUInt16BE(sourcePort, 8);
  address.writeUInt16BE(destinationPort, 10);
  const payload = Buffer.concat([address, tlv]);
  const fixed = Buffer.alloc(16);
  SIG.copy(fixed, 0);
  fixed[12] = versionCommand;
  fixed[13] = familyProtocol;
  fixed.writeUInt16BE(payload.length, 14);
  return Buffer.concat([fixed, payload, trailing]);
}

function tcp6Frame({
  sourceHex =
    "20010db8000000000000000000000001",
  destinationHex =
    "fd7a115ca1e000000000000011112222",
  sourcePort = 50001,
  destinationPort = 443,
  tlv = Buffer.alloc(0),
  trailing = Buffer.alloc(0),
} = {}) {
  const source = Buffer.from(sourceHex, "hex");
  const destination = Buffer.from(destinationHex, "hex");
  assert.equal(source.length, 16);
  assert.equal(destination.length, 16);
  const address = Buffer.alloc(36);
  source.copy(address, 0);
  destination.copy(address, 16);
  address.writeUInt16BE(sourcePort, 32);
  address.writeUInt16BE(destinationPort, 34);
  const payload = Buffer.concat([address, tlv]);
  const fixed = Buffer.alloc(16);
  SIG.copy(fixed, 0);
  fixed[12] = 0x21;
  fixed[13] = 0x21;
  fixed.writeUInt16BE(payload.length, 14);
  return Buffer.concat([fixed, payload, trailing]);
}

function requireOk(value) {
  if (value?.ok !== true) {
    throw new Error(value?.reason || "unexpected HOLD");
  }
  return value;
}

function expectHeld(value, reason) {
  assert.equal(value.ok, false);
  assert.equal(value.reason, reason);
}

const httpPrefix = Buffer.from(
  "POST /__void/agents/paid-work/credential-requests/v1 HTTP/1.1\r\n",
  "utf8",
);

const a = requireOk(
  parseVoidAgentCredentialRequestProxyV2SourceV1(
    tcp4Frame({ trailing: httpPrefix }),
  ),
);
assert.equal(a.status, "PROXY_V2_SOURCE_BOUND_NOT_TRUSTED");
assert.equal(a.family, "tcp4");
assert.equal(a.source_address, "203.0.113.7");
assert.equal(a.source_address_hex, "cb007107");
assert.equal(a.source_port, 50000);
assert.equal(a.destination_address, "100.64.0.1");
assert.equal(a.destination_port, 443);
assert.equal(a.consumed_bytes, 28);
assert.equal(a.tlv_bytes, 0);
assert.match(a.limiter_source_key, /^voidcrsrc1_[0-9a-f]{64}$/u);
assert.equal(a.source_port_in_limiter_identity, false);
assert.equal(a.spoofable_forwarding_headers_trusted, false);

const aPortRotated = requireOk(
  parseVoidAgentCredentialRequestProxyV2SourceV1(
    tcp4Frame({ sourcePort: 60000 }),
  ),
);
assert.equal(
  aPortRotated.limiter_source_key,
  a.limiter_source_key,
  "ephemeral source ports must not rotate the limiter bucket",
);

const b = requireOk(
  parseVoidAgentCredentialRequestProxyV2SourceV1(
    tcp4Frame({ source: "203.0.113.8", sourcePort: 50000 }),
  ),
);
assert.notEqual(
  b.limiter_source_key,
  a.limiter_source_key,
  "different source addresses need independent limiter buckets",
);

const v6 = requireOk(
  parseVoidAgentCredentialRequestProxyV2SourceV1(
    tcp6Frame({ trailing: httpPrefix }),
  ),
);
assert.equal(v6.family, "tcp6");
assert.equal(
  v6.source_address_hex,
  "20010db8000000000000000000000001",
);
assert.equal(v6.source_address, null);
assert.equal(v6.destination_port, 443);
assert.notEqual(v6.limiter_source_key, a.limiter_source_key);

const withTlv = requireOk(
  parseVoidAgentCredentialRequestProxyV2SourceV1(
    tcp4Frame({
      tlv: Buffer.from([0x01, 0x00, 0x02, 0xaa, 0xbb]),
      trailing: httpPrefix,
    }),
  ),
);
assert.equal(withTlv.tlv_bytes, 5);
assert.equal(withTlv.consumed_bytes, 33);
assert.equal(withTlv.limiter_source_key, a.limiter_source_key);

expectHeld(
  parseVoidAgentCredentialRequestProxyV2SourceV1(
    Buffer.alloc(15),
  ),
  "proxy_v2_header_incomplete",
);

const badSignature = tcp4Frame();
badSignature[0] ^= 0xff;
expectHeld(
  parseVoidAgentCredentialRequestProxyV2SourceV1(badSignature),
  "proxy_v2_signature_invalid",
);

expectHeld(
  parseVoidAgentCredentialRequestProxyV2SourceV1(
    tcp4Frame({ versionCommand: 0x11 }),
  ),
  "proxy_v2_version_invalid",
);

expectHeld(
  parseVoidAgentCredentialRequestProxyV2SourceV1(
    tcp4Frame({ versionCommand: 0x20 }),
  ),
  "proxy_v2_proxy_command_required",
);

expectHeld(
  parseVoidAgentCredentialRequestProxyV2SourceV1(
    tcp4Frame({ familyProtocol: 0x12 }),
  ),
  "proxy_v2_tcp4_or_tcp6_required",
);

expectHeld(
  parseVoidAgentCredentialRequestProxyV2SourceV1(
    tcp4Frame({ familyProtocol: 0x31 }),
  ),
  "proxy_v2_tcp4_or_tcp6_required",
);

const tooShortAddress = tcp4Frame();
tooShortAddress.writeUInt16BE(11, 14);
expectHeld(
  parseVoidAgentCredentialRequestProxyV2SourceV1(
    tooShortAddress.subarray(0, 27),
  ),
  "proxy_v2_address_payload_too_short",
);

const truncated = tcp4Frame();
truncated.writeUInt16BE(20, 14);
expectHeld(
  parseVoidAgentCredentialRequestProxyV2SourceV1(truncated),
  "proxy_v2_header_truncated",
);

const oversized = tcp4Frame({
  tlv: Buffer.alloc(485),
});
expectHeld(
  parseVoidAgentCredentialRequestProxyV2SourceV1(oversized),
  "proxy_v2_header_too_large",
);

const sanitized = requireOk(
  sanitizeVoidAgentCredentialRequestProxyV2HeadersV1(
    {
      Host: "voidchain.example",
      "Content-Type": "application/json",
      Forwarded: "for=198.51.100.99",
      "X-Forwarded-For": "198.51.100.99",
      "x-forwarded-host": "evil.example",
      "x-forwarded-proto": "http",
      "X-Real-IP": "198.51.100.99",
      "X-Void-Trusted-Funnel-Source-V1":
        "voidcrsrc1_" + "0".repeat(64),
    },
    a,
  ),
);
assert.deepEqual(
  sanitized.removed_spoofable_headers,
  [
    "forwarded",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-real-ip",
    "x-void-trusted-funnel-source-v1",
  ],
);
assert.equal(sanitized.headers.host, "voidchain.example");
assert.equal(
  sanitized.headers[VOID_AGENT_CREDENTIAL_REQUEST_TRUSTED_SOURCE_HEADER_V1],
  a.limiter_source_key,
);
assert.equal(
  sanitized.headers["x-forwarded-for"],
  undefined,
);
assert.equal(sanitized.local_transport_trust_proven, false);

expectHeld(
  sanitizeVoidAgentCredentialRequestProxyV2HeadersV1(
    { Host: "voidchain.example" },
    {
      ...a,
      limiter_source_key: "voidcrsrc1_" + "0".repeat(64),
    },
  ),
  "proxy_v2_trusted_source_invalid",
);

expectHeld(
  planVoidAgentCredentialRequestProxyV2RateLimitV1({
    parsed_source: {
      ...a,
      limiter_source_key: "voidcrsrc1_" + "0".repeat(64),
    },
    now_ms: 1_800_000_000_000,
    window_ms: 60_000,
    max_requests_per_source: 3,
    prior_events: [],
  }),
  "proxy_v2_trusted_source_invalid",
);

expectHeld(
  sanitizeVoidAgentCredentialRequestProxyV2HeadersV1(
    {
      Host: "one.example",
      host: "two.example",
    },
    a,
  ),
  "proxy_v2_http_header_case_collision",
);

const now = 1_800_000_000_000;
const priorEvents = [
  { source_key: a.limiter_source_key, at_ms: now - 100 },
  { source_key: a.limiter_source_key, at_ms: now - 200 },
  { source_key: a.limiter_source_key, at_ms: now - 300 },
  { source_key: b.limiter_source_key, at_ms: now - 100 },
  { source_key: a.limiter_source_key, at_ms: now - 120_000 },
];

const aLimited =
  planVoidAgentCredentialRequestProxyV2RateLimitV1({
    parsed_source: a,
    now_ms: now,
    window_ms: 60_000,
    max_requests_per_source: 3,
    prior_events: priorEvents,
  });
assert.equal(aLimited.ok, false);
assert.equal(aLimited.status, "RATE_LIMITED");
assert.equal(
  aLimited.reason,
  "credential_request_proxy_source_rate_limited",
);
assert.equal(aLimited.source_request_count, 3);
assert.equal(
  aLimited.next_events.some(
    (event) => event.at_ms === now - 120_000,
  ),
  false,
  "expired rate events must be pruned",
);

const aRotatedPortLimited =
  planVoidAgentCredentialRequestProxyV2RateLimitV1({
    parsed_source: aPortRotated,
    now_ms: now,
    window_ms: 60_000,
    max_requests_per_source: 3,
    prior_events: priorEvents,
  });
assert.equal(aRotatedPortLimited.ok, false);

const bAllowed = requireOk(
  planVoidAgentCredentialRequestProxyV2RateLimitV1({
    parsed_source: b,
    now_ms: now,
    window_ms: 60_000,
    max_requests_per_source: 3,
    prior_events: priorEvents,
  }),
);
assert.equal(bAllowed.status, "SOURCE_RATE_ALLOWED_NOT_MOUNTED");
assert.equal(bAllowed.source_request_count_before, 1);
assert.equal(bAllowed.source_request_count_after, 2);
assert.equal(
  bAllowed.next_events.filter(
    (event) => event.source_key === a.limiter_source_key,
  ).length,
  3,
  "caller B admission must not consume or reset caller A's bucket",
);

const trueKeys = new Set([
  "source_contract",
  "proxy_protocol_v2_parse",
  "tcp4_source_identity",
  "tcp6_source_identity",
  "raw_source_address_bound",
  "source_port_excluded_from_limiter_identity",
  "trusted_source_header_replaced",
  "per_source_rate_limit_planning",
]);
for (const [key, value] of Object.entries(
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_AUTHORITY_V1,
)) {
  assert.equal(value, trueKeys.has(key), key);
}

assert.equal(
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1,
  "VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1",
);
console.log(
  "VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1_GREEN",
);
console.log("tcp4_tcp6_source_identity=true");
console.log("source_port_bucket_rotation=false");
console.log("bounded_proxy_v2_header=true");
console.log("spoofed_forwarding_headers_trusted=false");
console.log("per_source_rate_limit_isolation=true");
console.log("local_transport_trust_proven=false");
console.log("tailscale_funnel_configuration_verified=false");
console.log("runtime_integration=false");
console.log("credential_issuance=false");
console.log("work_credit_write=false");
console.log("funds_movement=false");
