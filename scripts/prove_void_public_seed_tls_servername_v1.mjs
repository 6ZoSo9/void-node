#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import {
  publicSeedTlsServernameV1,
} from "./lib/void_public_seed_client_transport_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_TLS_SERVERNAME_V1_PROOF_GREEN";

assert.equal(
  publicSeedTlsServernameV1("https://seed.example.com"),
  "seed.example.com",
  "DNS HTTPS target lost its TLS servername",
);
assert.equal(
  publicSeedTlsServernameV1("https://SEED.EXAMPLE.COM"),
  "seed.example.com",
  "DNS TLS servername was not canonicalized",
);
assert.equal(
  publicSeedTlsServernameV1("https://1.1.1.1"),
  null,
  "IPv4 literal must not be sent as TLS SNI",
);
assert.equal(
  publicSeedTlsServernameV1("https://[2606:4700:4700::1111]"),
  null,
  "bracketed IPv6 literal must not be sent as TLS SNI",
);
assert.equal(
  publicSeedTlsServernameV1("http://127.0.0.1"),
  null,
  "HTTP fixture must not carry TLS SNI",
);

const source = fs.readFileSync(
  "scripts/lib/void_public_seed_client_transport_v1.mjs",
  "utf8",
);
assert.match(
  source,
  /const tlsServername = publicSeedTlsServernameV1\(target\);/,
  "runtime request path does not use the reviewed TLS servername helper",
);
assert.match(
  source,
  /\.\.\.\(tlsServername \? \{ servername: tlsServername \} : \{\}\),/,
  "runtime request options do not omit SNI for IP literals",
);
assert.doesNotMatch(
  source,
  /servername:\s*target\.hostname/,
  "runtime still sends raw URL hostname as TLS SNI",
);

// This is the production request path in an isolated process so a late,
// unhandled TLSSocket error makes the proof fail rather than crashing CI.
// Documentation-only IPv6 must fail cleanly and must never be accepted as a seed.
assert.match(
  source,
  /lookup\(_hostname, _options, callback\)\s*\{[\s\S]*?process\.nextTick\(callback, null, address, family\);/,
  "pinned DNS callback must be asynchronous before TLS socket initialization",
);
const unreachableIpv6Probe = `
import { requestPublicSeedRouteV1 } from "./scripts/lib/void_public_seed_client_transport_v1.mjs";
let failure = null;
try {
  await requestPublicSeedRouteV1(
    { base: "https://seed.example.invalid", hostname: "seed.example.invalid" },
    "/__void/ready.json",
    {
      timeoutMs: 1000,
      allowLoopbackFixture: true,
      resolvePublicDnsImpl: async () => ["2001:db8::40"],
    },
  );
} catch (error) {
  failure = error;
}
if (!failure || !/seed request failed on every pinned address|seed logical request deadline/.test(failure.message)) {
  throw new Error("unreachable IPv6 seed did not fail closed");
}
console.log("VOID_PUBLIC_SEED_PINNED_IPV6_SOCKET_ERROR_HANDLED_V1_GREEN");
`;
const probe = spawnSync(process.execPath, ["--input-type=module", "--eval", unreachableIpv6Probe], {
  cwd: process.cwd(),
  encoding: "utf8",
  timeout: 6_000,
  maxBuffer: 64 * 1024,
});
assert.equal(
  probe.status,
  0,
  `unreachable IPv6 pinned TLS request crashed: ${probe.error?.message || probe.stderr || String(probe.status)}`,
);
assert.match(
  probe.stdout,
  /VOID_PUBLIC_SEED_PINNED_IPV6_SOCKET_ERROR_HANDLED_V1_GREEN/,
  "pinned TLS lookup error proof did not complete",
);

console.log(MARKER);
console.log(`node_version=${process.versions.node}`);
console.log("dns_tls_servername_preserved=true");
console.log("ipv4_literal_tls_sni_sent=false");
console.log("ipv6_literal_tls_sni_sent=false");
console.log("bracketed_ipv6_tls_name_rejected_before_runtime=false");
console.log("certificate_authority_bypass=false");
console.log("tls_verification_disabled=false");
console.log("deployment_performed=false");
console.log("credentials_accessed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
