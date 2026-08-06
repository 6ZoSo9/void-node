#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildBootstrapManifest,
  createQualificationReceipt,
  ipAddressesEqual,
  normalizePublicSeedBase,
  resolvePublicSeedAddresses,
  validateQualificationReceipt,
} from "./lib/void_public_seed_qualification_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_IP_LITERAL_QUALIFICATION_V1_PROOF_GREEN";
const NOW_MS = Date.parse("2026-08-06T16:00:00.000Z");

function expectThrow(fn, pattern) {
  assert.throws(fn, pattern);
}

function sample({ addressSource, endpointAddress, dnsAddresses, connectedAddresses, index }) {
  const head = 4000 + index;
  return {
    observed_at: new Date(NOW_MS - 120_000 + index * 60_000).toISOString(),
    duration_ms: 10,
    ready: true,
    gap: 0,
    txroot_live: 1,
    ready_head: head,
    head,
    range_head: head,
    gateway_header: "v1",
    private_route_status: 404,
    private_route_error: "route_not_public",
    mutation_status: 405,
    mutation_error: "method_not_allowed",
    address_source: addressSource,
    endpoint_address: endpointAddress,
    dns_addresses: dnsAddresses,
    connected_addresses: connectedAddresses,
  };
}

const publicV4 = normalizePublicSeedBase("https://1.1.1.1");
assert.equal(publicV4.address_source, "ip_literal");
assert.equal(publicV4.endpoint_address, "1.1.1.1");
let lookupCalls = 0;
assert.deepEqual(
  await resolvePublicSeedAddresses(publicV4, {
    lookup: async () => {
      lookupCalls += 1;
      return [{ address: "100.64.0.1", family: 4 }];
    },
  }),
  ["1.1.1.1"],
);
assert.equal(lookupCalls, 0, "IP-literal resolution unexpectedly called DNS");

const publicV6 = normalizePublicSeedBase("https://[2606:4700:4700::1111]");
assert.equal(publicV6.address_source, "ip_literal");
assert.equal(publicV6.endpoint_address, "2606:4700:4700::1111");
assert.deepEqual(await resolvePublicSeedAddresses(publicV6), ["2606:4700:4700::1111"]);
assert.equal(
  ipAddressesEqual(
    "2606:4700:4700::1111",
    "2606:4700:4700:0:0:0:0:1111",
  ),
  true,
  "equivalent IPv6 text forms were not treated as the same endpoint",
);
assert.equal(
  ipAddressesEqual("2606:4700:4700::1111", "2606:4700:4700::1001"),
  false,
  "different IPv6 endpoints were treated as equal",
);

for (const endpoint of [
  "https://127.0.0.1",
  "https://10.0.0.1",
  "https://100.64.0.1",
  "https://169.254.1.1",
  "https://172.16.0.1",
  "https://192.168.0.1",
  "https://192.0.2.1",
  "https://192.31.196.1",
  "https://192.52.193.1",
  "https://192.88.99.1",
  "https://192.175.48.1",
  "https://198.18.0.1",
  "https://224.0.0.1",
  "https://240.0.0.1",
  "https://[::1]",
  "https://[64:ff9b::1]",
  "https://[64:ff9b:1::1]",
  "https://[100::1]",
  "https://[100:0:0:1::1]",
  "https://[2001:2::1]",
  "https://[2001:20::1]",
  "https://[2001:db8::1]",
  "https://[2002::1]",
  "https://[2620:4f:8000::1]",
  "https://[3fff::1]",
  "https://[4000::1]",
  "https://[5f00::1]",
  "https://[fc00::1]",
  "https://[fe80::1]",
  "https://[ff00::1]",
]) {
  expectThrow(
    () => normalizePublicSeedBase(endpoint),
    /IP literal is non-public/,
  );
}

const ipSamples = [0, 1, 2].map((index) =>
  sample({
    addressSource: "ip_literal",
    endpointAddress: "1.1.1.1",
    dnsAddresses: [],
    connectedAddresses: ["1.1.1.1"],
    index,
  }),
);
const ipReceipt = createQualificationReceipt({
  endpoint: "https://1.1.1.1",
  samples: ipSamples,
  generatedAt: new Date(NOW_MS).toISOString(),
});
const validatedIp = validateQualificationReceipt(ipReceipt, { nowMs: NOW_MS });
assert.equal(validatedIp.endpoint, "https://1.1.1.1");
assert.equal(validatedIp.latest_head, 4002);
const ipManifest = buildBootstrapManifest([ipReceipt], { nowMs: NOW_MS });
assert.equal(ipManifest.sync_endpoints[0].base, "https://1.1.1.1");
assert.equal(ipManifest.sync_endpoints[0].temporary, false);

const mixedDns = structuredClone(ipReceipt);
mixedDns.samples[0].dns_addresses = ["1.1.1.1"];
mixedDns.qualification_id = createQualificationReceipt({
  endpoint: mixedDns.endpoint,
  samples: mixedDns.samples,
  generatedAt: mixedDns.generated_at,
}).qualification_id;
expectThrow(
  () => validateQualificationReceipt(mixedDns, { nowMs: NOW_MS }),
  /must not contain DNS evidence/,
);

const wrongConnectionSamples = ipSamples.map((entry) => structuredClone(entry));
wrongConnectionSamples[0].connected_addresses = ["8.8.8.8"];
const wrongConnection = createQualificationReceipt({
  endpoint: "https://1.1.1.1",
  samples: wrongConnectionSamples,
  generatedAt: new Date(NOW_MS).toISOString(),
});
expectThrow(
  () => validateQualificationReceipt(wrongConnection, { nowMs: NOW_MS }),
  /does not match endpoint/,
);

const dnsSamples = [0, 1, 2].map((index) =>
  sample({
    addressSource: "dns",
    endpointAddress: null,
    dnsAddresses: ["1.1.1.1"],
    connectedAddresses: ["1.1.1.1"],
    index,
  }),
);
const dnsReceipt = createQualificationReceipt({
  endpoint: "https://seed.example.org",
  samples: dnsSamples,
  generatedAt: new Date(NOW_MS).toISOString(),
});
assert.equal(validateQualificationReceipt(dnsReceipt, { nowMs: NOW_MS }).latest_head, 4002);

console.log(MARKER);
console.log("public_ipv4_accepted=true");
console.log("public_ipv6_accepted=true");
console.log("dns_lookup_for_ip_literal=false");
console.log("connected_address_must_equal_endpoint=true");
console.log("mixed_dns_ip_evidence_accepted=false");
console.log("private_reserved_ip_accepted=false");
console.log("iana_special_purpose_ip_accepted=false");
console.log("ipv6_global_unicast_required=true");
console.log("fqdn_dns_rebinding_path_preserved=true");
console.log("manifest_published=false");
console.log("vps_provisioned=false");
console.log("wallet_signer_validator_wc_money_authority=0");
