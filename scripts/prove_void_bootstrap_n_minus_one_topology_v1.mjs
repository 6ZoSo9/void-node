#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  buildVoidBootstrapNMinusOneTopologyV1,
  validateVoidBootstrapNMinusOneTopologyV1,
} from "./lib/void_bootstrap_n_minus_one_topology_v1.mjs";

const MARKER =
  "VOID_BOOTSTRAP_N_MINUS_ONE_TOPOLOGY_V1_PROOF_GREEN";

const components = [
  {
    component_id: "https-mirror-a",
    class: "https_record_mirror",
    failure_domain: "mirror-a",
    enabled: true,
  },
  {
    component_id: "https-mirror-b",
    class: "https_record_mirror",
    failure_domain: "mirror-b",
    enabled: true,
  },
  {
    component_id: "tor-mirror-a",
    class: "tor_record_mirror",
    failure_domain: "mirror-tor",
    enabled: true,
  },
  {
    component_id: "direct-v6-a",
    class: "direct_ipv6_seed",
    failure_domain: "seed-v6",
    enabled: true,
  },
  {
    component_id: "direct-v4-a",
    class: "direct_ipv4_seed",
    failure_domain: "seed-v4",
    enabled: true,
  },
  {
    component_id: "relay-a",
    class: "relay",
    failure_domain: "relay-a",
    enabled: true,
  },
  {
    component_id: "relay-b",
    class: "relay",
    failure_domain: "relay-b",
    enabled: true,
  },
  {
    component_id: "tor-sync-a",
    class: "tor_sync_seed",
    failure_domain: "seed-tor",
    enabled: true,
  },
];

const paths = [
  {
    path_id: "path-https-a-v6",
    record_distribution_component: "https-mirror-a",
    introduction_component: "direct-v6-a",
  },
  {
    path_id: "path-https-b-v4",
    record_distribution_component: "https-mirror-b",
    introduction_component: "direct-v4-a",
  },
  {
    path_id: "path-tor-relay-a",
    record_distribution_component: "tor-mirror-a",
    introduction_component: "relay-a",
  },
  {
    path_id: "path-tor-relay-b",
    record_distribution_component: "tor-mirror-a",
    introduction_component: "relay-b",
  },
  {
    path_id: "path-https-a-tor-sync",
    record_distribution_component: "https-mirror-a",
    introduction_component: "tor-sync-a",
  },
  {
    path_id: "path-tor-v6",
    record_distribution_component: "tor-mirror-a",
    introduction_component: "direct-v6-a",
  },
  {
    path_id: "path-tor-v4",
    record_distribution_component: "tor-mirror-a",
    introduction_component: "direct-v4-a",
  },
];

const topology = buildVoidBootstrapNMinusOneTopologyV1({
  components,
  paths,
});
const verified =
  validateVoidBootstrapNMinusOneTopologyV1(topology);

assert.match(topology.topology_id, /^voidbn1_[0-9a-f]{64}$/);
assert.equal(verified.resilience.baseline_paths, paths.length);
assert.equal(
  verified.resilience.instance_results.length,
  components.length,
);
assert.equal(
  verified.resilience.class_results.length,
  6,
);
assert(
  verified.resilience.instance_results.every(
    (entry) => entry.surviving_paths >= 1,
  ),
);
assert(
  verified.resilience.class_results.every(
    (entry) => entry.surviving_paths >= 1,
  ),
);
assert(
  verified.resilience.failure_domain_results.every(
    (entry) => entry.surviving_paths >= 1,
  ),
);

const reordered = buildVoidBootstrapNMinusOneTopologyV1({
  components: [...components].reverse(),
  paths: [...paths].reverse(),
});
assert.equal(reordered.topology_id, topology.topology_id);

const singleRequiredMirrorPaths = paths.filter(
  (path) =>
    path.record_distribution_component === "https-mirror-a",
);
assert.throws(
  () =>
    buildVoidBootstrapNMinusOneTopologyV1({
      components,
      paths: [
        ...singleRequiredMirrorPaths,
        {
          path_id: "filler-a",
          record_distribution_component: "https-mirror-a",
          introduction_component: "relay-a",
        },
        {
          path_id: "filler-b",
          record_distribution_component: "https-mirror-a",
          introduction_component: "direct-v4-a",
        },
      ],
    }),
  /does not exercise component class|single component removal/,
);

const noClassFallback = components.filter(
  (component) => component.class !== "tor_record_mirror",
);
assert.throws(
  () =>
    buildVoidBootstrapNMinusOneTopologyV1({
      components: noClassFallback,
      paths: [
        ...paths.filter(
          (path) =>
            path.record_distribution_component !== "tor-mirror-a",
        ),
        {
          path_id: "no-tor-filler",
          record_distribution_component: "https-mirror-b",
          introduction_component: "relay-a",
        },
      ],
    }),
  /does not exercise component class|requires 6 through/,
);

const sameDomainComponents = components.map((component) =>
  ["https-mirror-a", "https-mirror-b", "tor-mirror-a"].includes(
    component.component_id,
  )
    ? { ...component, failure_domain: "all-record-mirrors" }
    : component,
);
assert.throws(
  () =>
    buildVoidBootstrapNMinusOneTopologyV1({
      components: sameDomainComponents,
      paths,
    }),
  /failure-domain outage breaks all join paths|different failure domains/,
);

const samePathDomainComponents = components.map((component) =>
  component.component_id === "direct-v6-a"
    ? { ...component, failure_domain: "mirror-a" }
    : component,
);
assert.throws(
  () =>
    buildVoidBootstrapNMinusOneTopologyV1({
      components: samePathDomainComponents,
      paths,
    }),
  /different failure domains/,
);

const tampered = structuredClone(topology);
tampered.authority.wallet_authority = true;
assert.throws(
  () => validateVoidBootstrapNMinusOneTopologyV1(tampered),
  /wallet_authority must be false/,
);

const falseAcceptance = structuredClone(topology);
falseAcceptance.policy.live_acceptance_claimed = true;
assert.throws(
  () => validateVoidBootstrapNMinusOneTopologyV1(falseAcceptance),
  /live_acceptance_claimed mismatch/,
);

console.log(MARKER);
console.log(`topology_id=${topology.topology_id}`);
console.log(`baseline_paths=${verified.resilience.baseline_paths}`);
console.log("instance_n_minus_one_each_component=true");
console.log("class_n_minus_one_each_component_class=true");
console.log("failure_domain_n_minus_one=true");
console.log("https_record_mirror_class_removable=true");
console.log("tor_record_mirror_class_removable=true");
console.log("direct_ipv6_seed_class_removable=true");
console.log("direct_ipv4_seed_class_removable=true");
console.log("relay_class_removable=true");
console.log("tor_sync_seed_class_removable=true");
console.log("single_required_component=false");
console.log("component_identity_equals_network_identity=false");
console.log("live_network_calls_performed=false");
console.log("external_machine_acceptance_performed=false");
console.log("issue_1005_closure_claimed=false");
console.log("runtime_integration_performed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
