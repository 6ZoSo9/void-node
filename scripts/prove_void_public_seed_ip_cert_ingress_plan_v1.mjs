#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildVoidPublicSeedIpCertIngressPlanV1,
  validateVoidPublicSeedIpCertIngressPlanV1,
} from "./build_void_public_seed_ip_cert_ingress_plan_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_IP_CERT_INGRESS_PLAN_V1_PROOF_GREEN";
const SOURCE_SHA = "a".repeat(40);
const ROOTS = Object.freeze({
  repoRoot: "/srv/void-node-source",
  stateRoot: "/var/lib/void-public-seed",
  acmeWebroot: "/var/lib/void-public-seed-acme",
  certRoot: "/var/lib/void-public-seed-tls",
  nodeDataRoot: "/var/lib/void-node-data",
});

function expectThrow(fn, pattern, label) {
  assert.throws(fn, pattern, label);
  console.log(`[PASS] ${label}`);
}

function plan(publicIp = "1.1.1.1", overrides = {}) {
  return buildVoidPublicSeedIpCertIngressPlanV1({
    publicIp,
    sourceSha: SOURCE_SHA,
    ...ROOTS,
    ...overrides,
  });
}

for (const [address, endpoint] of [
  ["1.1.1.1", "https://1.1.1.1"],
  ["2606:4700:4700::1111", "https://[2606:4700:4700::1111]"],
]) {
  const value = plan(address);
  validateVoidPublicSeedIpCertIngressPlanV1(value);
  assert.equal(value.endpoint, endpoint);
  assert.deepEqual(
    value.seed_service_ports.public_any_source_tcp,
    [80, 443, 4700],
  );
  assert.equal(value.private_service_ports.node_http.public, false);
  assert.equal(value.private_service_ports.node_http.port, 4100);
  assert.equal(value.private_service_ports.restricted_gateway.public, false);
  assert.equal(value.private_service_ports.restricted_gateway.port, 4111);
  assert.equal(value.acme.challenge, "http-01");
  assert.equal(value.acme.external_validation_port, 80);
  assert.equal(value.acme.profile, "shortlived");
  assert.equal(value.acme.certificate_validity_hours, 160);
  assert.equal(value.acme.certbot_minimum_version, "5.4");
  assert.equal(value.acme.automatic_reload_required, true);
  assert.equal(value.firewall.management_source_allowlist_required, true);
  assert.equal(value.deployment_performed, false);
  assert.equal(value.manifest_published, false);
}
console.log("[PASS] IPv4 and IPv6 plans preserve exact public/private port boundaries");

for (const address of [
  "0.0.0.0",
  "10.0.0.1",
  "100.64.0.1",
  "127.0.0.1",
  "169.254.0.1",
  "172.16.0.1",
  "192.0.2.1",
  "192.168.0.1",
  "198.18.0.1",
  "198.51.100.1",
  "203.0.113.1",
  "224.0.0.1",
  "240.0.0.1",
  "::1",
  "100::1",
  "2001:db8::1",
  "fc00::1",
  "fe80::1",
  "ff02::1",
]) {
  expectThrow(
    () => plan(address),
    /not globally routable/,
    `non-public address rejected: ${address}`,
  );
}

expectThrow(
  () => plan("seed.example.com"),
  /must be an IP literal/,
  "DNS hostname rejected from domain-free plan",
);
expectThrow(
  () => plan("1.1.1.1", { sourceSha: "abc" }),
  /source SHA/,
  "malformed source SHA rejected",
);
expectThrow(
  () => plan("1.1.1.1", { stateRoot: "relative/state" }),
  /absolute path/,
  "relative state path rejected",
);
expectThrow(
  () => plan("1.1.1.1", { stateRoot: "/srv/void-node-source/state" }),
  /outside the repository/,
  "repository-contained state path rejected",
);
expectThrow(
  () => plan("1.1.1.1", {
    acmeWebroot: "/var/lib/shared",
    certRoot: "/var/lib/shared",
  }),
  /duplicates/,
  "duplicate security roots rejected",
);
expectThrow(
  () => plan("1.1.1.1", { renewIntervalHours: 0 }),
  /renew interval hours/,
  "zero-hour renewal loop rejected",
);
expectThrow(
  () => plan("1.1.1.1", { renewIntervalHours: 13 }),
  /renew interval hours/,
  "overlong renewal interval rejected",
);

const tamperedPort = structuredClone(plan());
tamperedPort.seed_service_ports.public_any_source_tcp.push(4100);
expectThrow(
  () => validateVoidPublicSeedIpCertIngressPlanV1(tamperedPort),
  /plan ID mismatch/,
  "tampered public node HTTP exposure rejected",
);

const tamperedAuthority = structuredClone(plan());
tamperedAuthority.authority.credential_access = true;
expectThrow(
  () => validateVoidPublicSeedIpCertIngressPlanV1(tamperedAuthority),
  /plan ID mismatch/,
  "tampered credential authority rejected",
);

const resealed = structuredClone(plan());
resealed.seed_service_ports.public_any_source_tcp = [80, 443, 4100, 4700];
delete resealed.plan_id;
const { createHash } = await import("node:crypto");
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
resealed.plan_id =
  `voidpsip1_${createHash("sha256").update(canonical(resealed)).digest("hex")}`;
expectThrow(
  () => validateVoidPublicSeedIpCertIngressPlanV1(resealed),
  /seed_service_ports mismatch/,
  "resealed arbitrary public TCP 4100 exposure rejected",
);

console.log(MARKER);
console.log("public_acme_http01_tcp=80");
console.log("public_restricted_https_tcp=443");
console.log("public_native_p2p_tcp=4700");
console.log("public_node_http_tcp_4100=false");
console.log("public_plaintext_gateway_tcp_4111=false");
console.log("shortlived_ip_certificate_profile_required=true");
console.log("automatic_certificate_reload_required=true");
console.log("domain_registrar_required=false");
console.log("vps_purchased=false");
console.log("certificate_issued=false");
console.log("firewall_mutated=false");
console.log("manifest_published=false");
console.log("deployment_performed=false");
console.log("credentials_accessed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
