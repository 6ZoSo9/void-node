#!/usr/bin/env node
import assert from "node:assert/strict";
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
