import crypto from "node:crypto";

export const VOID_BOOTSTRAP_N_MINUS_ONE_TOPOLOGY_V1 =
  "void_bootstrap_n_minus_one_topology_v1";

const TOPOLOGY_ID_RE = /^voidbn1_[0-9a-f]{64}$/;
const COMPONENT_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const FAILURE_DOMAIN_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PATH_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export const COMPONENT_CLASSES_V1 = Object.freeze([
  "https_record_mirror",
  "tor_record_mirror",
  "direct_ipv6_seed",
  "direct_ipv4_seed",
  "relay",
  "tor_sync_seed",
]);

const COMPONENT_CLASS_SET = new Set(COMPONENT_CLASSES_V1);

const TOPOLOGY_KEYS = Object.freeze([
  "schema",
  "components",
  "paths",
  "policy",
  "authority",
  "topology_id",
]);

const COMPONENT_KEYS = Object.freeze([
  "component_id",
  "class",
  "failure_domain",
  "enabled",
]);

const PATH_KEYS = Object.freeze([
  "path_id",
  "record_distribution_component",
  "introduction_component",
]);

const POLICY_KEYS = Object.freeze([
  "minimum_paths",
  "minimum_component_failure_domains",
  "instance_n_minus_one_required",
  "class_n_minus_one_required",
  "failure_domain_n_minus_one_required",
  "single_required_component_allowed",
  "live_acceptance_claimed",
]);

const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

function canonicalize(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonical JSON cannot contain non-finite numbers");
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  throw new Error(`canonical JSON cannot contain ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function contentId(prefix, value, idField) {
  const body = structuredClone(value);
  delete body[idField];
  return `${prefix}${crypto
    .createHash("sha256")
    .update(canonicalJson(body))
    .digest("hex")}`;
}

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function validateComponentId(value, label) {
  const text = String(value || "");
  if (!COMPONENT_ID_RE.test(text)) {
    throw new Error(`${label} is invalid`);
  }
  return text;
}

function validateFailureDomain(value, label) {
  const text = String(value || "");
  if (!FAILURE_DOMAIN_RE.test(text)) {
    throw new Error(`${label} is invalid`);
  }
  return text;
}

function validatePathId(value) {
  const text = String(value || "");
  if (!PATH_ID_RE.test(text)) {
    throw new Error("bootstrap path ID is invalid");
  }
  return text;
}

function expectedPolicy() {
  return Object.freeze({
    minimum_paths: 4,
    minimum_component_failure_domains: 3,
    instance_n_minus_one_required: true,
    class_n_minus_one_required: true,
    failure_domain_n_minus_one_required: true,
    single_required_component_allowed: false,
    live_acceptance_claimed: false,
  });
}

function zeroAuthority() {
  return Object.freeze(
    Object.fromEntries(AUTHORITY_KEYS.map((key) => [key, false])),
  );
}

function validatePolicy(raw) {
  const policy = exactKeys(raw, POLICY_KEYS, "N-1 topology policy");
  const expected = expectedPolicy();
  for (const key of POLICY_KEYS) {
    if (policy[key] !== expected[key]) {
      throw new Error(`N-1 topology policy ${key} mismatch`);
    }
  }
  return expected;
}

function validateAuthority(raw) {
  const authority = exactKeys(
    raw,
    AUTHORITY_KEYS,
    "N-1 topology authority",
  );
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) {
      throw new Error(`N-1 topology authority ${key} must be false`);
    }
  }
  return zeroAuthority();
}

function normalizeComponent(raw) {
  const component = exactKeys(
    structuredClone(raw),
    COMPONENT_KEYS,
    "bootstrap component",
  );
  const componentId = validateComponentId(
    component.component_id,
    "bootstrap component ID",
  );
  const componentClass = String(component.class || "");
  if (!COMPONENT_CLASS_SET.has(componentClass)) {
    throw new Error(`unsupported bootstrap component class ${componentClass}`);
  }
  const failureDomain = validateFailureDomain(
    component.failure_domain,
    "bootstrap component failure domain",
  );
  if (component.enabled !== true) {
    throw new Error("N-1 topology contains a disabled component");
  }
  return Object.freeze({
    component_id: componentId,
    class: componentClass,
    failure_domain: failureDomain,
    enabled: true,
  });
}

function normalizePath(raw, componentsById) {
  const path = exactKeys(
    structuredClone(raw),
    PATH_KEYS,
    "bootstrap join path",
  );
  const pathId = validatePathId(path.path_id);
  const recordComponent = validateComponentId(
    path.record_distribution_component,
    "record distribution component ID",
  );
  const introductionComponent = validateComponentId(
    path.introduction_component,
    "introduction component ID",
  );

  if (recordComponent === introductionComponent) {
    throw new Error(
      "record distribution and introduction must be separate components",
    );
  }

  const record = componentsById.get(recordComponent);
  const introduction = componentsById.get(introductionComponent);
  if (!record || !introduction) {
    throw new Error("bootstrap path references an unknown component");
  }

  if (
    !["https_record_mirror", "tor_record_mirror"].includes(record.class)
  ) {
    throw new Error(
      "bootstrap path record component must be an HTTPS or Tor record mirror",
    );
  }

  if (
    ![
      "direct_ipv6_seed",
      "direct_ipv4_seed",
      "relay",
      "tor_sync_seed",
    ].includes(introduction.class)
  ) {
    throw new Error(
      "bootstrap path introduction component class is invalid",
    );
  }

  if (record.failure_domain === introduction.failure_domain) {
    throw new Error(
      "bootstrap path record and introduction components must use different failure domains",
    );
  }

  return Object.freeze({
    path_id: pathId,
    record_distribution_component: recordComponent,
    introduction_component: introductionComponent,
  });
}

function pathAvailable(path, componentsById, removed) {
  return (
    !removed.has(path.record_distribution_component) &&
    !removed.has(path.introduction_component) &&
    componentsById.get(path.record_distribution_component)?.enabled === true &&
    componentsById.get(path.introduction_component)?.enabled === true
  );
}

function availablePaths(paths, componentsById, removed) {
  return paths.filter((path) =>
    pathAvailable(path, componentsById, removed),
  );
}

function removalSetForClass(components, componentClass) {
  return new Set(
    components
      .filter((component) => component.class === componentClass)
      .map((component) => component.component_id),
  );
}

function removalSetForFailureDomain(components, failureDomain) {
  return new Set(
    components
      .filter(
        (component) => component.failure_domain === failureDomain,
      )
      .map((component) => component.component_id),
  );
}

function classesInPaths(paths, componentsById) {
  const set = new Set();
  for (const path of paths) {
    set.add(componentsById.get(path.record_distribution_component).class);
    set.add(componentsById.get(path.introduction_component).class);
  }
  return set;
}

function validateResilience(components, paths) {
  const componentsById = new Map(
    components.map((component) => [component.component_id, component]),
  );

  const baseline = availablePaths(paths, componentsById, new Set());
  if (baseline.length < expectedPolicy().minimum_paths) {
    throw new Error(
      `N-1 topology requires at least ${expectedPolicy().minimum_paths} usable baseline paths`,
    );
  }

  const usedClasses = classesInPaths(baseline, componentsById);
  for (const componentClass of COMPONENT_CLASSES_V1) {
    if (!usedClasses.has(componentClass)) {
      throw new Error(
        `N-1 topology does not exercise component class ${componentClass}`,
      );
    }
  }

  const instanceResults = [];
  for (const component of components) {
    const surviving = availablePaths(
      paths,
      componentsById,
      new Set([component.component_id]),
    );
    if (surviving.length === 0) {
      throw new Error(
        `single component removal breaks all join paths: ${component.component_id}`,
      );
    }
    instanceResults.push(
      Object.freeze({
        removed_component: component.component_id,
        surviving_paths: surviving.length,
      }),
    );
  }

  const classResults = [];
  for (const componentClass of COMPONENT_CLASSES_V1) {
    const removed = removalSetForClass(components, componentClass);
    if (removed.size === 0) {
      throw new Error(`component class ${componentClass} is unrepresented`);
    }
    const surviving = availablePaths(paths, componentsById, removed);
    if (surviving.length === 0) {
      throw new Error(
        `component-class outage breaks all join paths: ${componentClass}`,
      );
    }
    classResults.push(
      Object.freeze({
        removed_class: componentClass,
        removed_components: removed.size,
        surviving_paths: surviving.length,
      }),
    );
  }

  const failureDomains = [
    ...new Set(components.map((component) => component.failure_domain)),
  ].sort();

  if (
    failureDomains.length <
    expectedPolicy().minimum_component_failure_domains
  ) {
    throw new Error(
      `N-1 topology requires at least ${expectedPolicy().minimum_component_failure_domains} failure domains`,
    );
  }

  const domainResults = [];
  for (const failureDomain of failureDomains) {
    const removed = removalSetForFailureDomain(
      components,
      failureDomain,
    );
    const surviving = availablePaths(paths, componentsById, removed);
    if (surviving.length === 0) {
      throw new Error(
        `failure-domain outage breaks all join paths: ${failureDomain}`,
      );
    }
    domainResults.push(
      Object.freeze({
        removed_failure_domain: failureDomain,
        removed_components: removed.size,
        surviving_paths: surviving.length,
      }),
    );
  }

  return Object.freeze({
    baseline_paths: baseline.length,
    instance_results: Object.freeze(instanceResults),
    class_results: Object.freeze(classResults),
    failure_domain_results: Object.freeze(domainResults),
  });
}

export function buildVoidBootstrapNMinusOneTopologyV1({
  components,
  paths,
}) {
  if (!Array.isArray(components) || components.length < 6 || components.length > 32) {
    throw new Error("N-1 topology requires 6 through 32 components");
  }
  if (!Array.isArray(paths) || paths.length < 4 || paths.length > 64) {
    throw new Error("N-1 topology requires 4 through 64 paths");
  }

  const normalizedComponents = components.map(normalizeComponent);
  const componentIds = new Set();
  for (const component of normalizedComponents) {
    if (componentIds.has(component.component_id)) {
      throw new Error("N-1 topology contains duplicate component IDs");
    }
    componentIds.add(component.component_id);
  }

  const componentsById = new Map(
    normalizedComponents.map((component) => [
      component.component_id,
      component,
    ]),
  );
  const normalizedPaths = paths.map((path) =>
    normalizePath(path, componentsById),
  );

  const pathIds = new Set();
  for (const path of normalizedPaths) {
    if (pathIds.has(path.path_id)) {
      throw new Error("N-1 topology contains duplicate path IDs");
    }
    pathIds.add(path.path_id);
  }

  const componentsSorted = [...normalizedComponents].sort((a, b) =>
    a.component_id.localeCompare(b.component_id),
  );
  const pathsSorted = [...normalizedPaths].sort((a, b) =>
    a.path_id.localeCompare(b.path_id),
  );

  const body = {
    schema: VOID_BOOTSTRAP_N_MINUS_ONE_TOPOLOGY_V1,
    components: componentsSorted,
    paths: pathsSorted,
    policy: expectedPolicy(),
    authority: zeroAuthority(),
  };

  const topology = Object.freeze({
    ...body,
    topology_id: contentId("voidbn1_", body, "topology_id"),
  });
  validateVoidBootstrapNMinusOneTopologyV1(topology);
  return topology;
}

export function validateVoidBootstrapNMinusOneTopologyV1(rawTopology) {
  const topology = exactKeys(
    structuredClone(rawTopology),
    TOPOLOGY_KEYS,
    "N-1 bootstrap topology",
  );
  if (topology.schema !== VOID_BOOTSTRAP_N_MINUS_ONE_TOPOLOGY_V1) {
    throw new Error("N-1 bootstrap topology schema mismatch");
  }
  if (!TOPOLOGY_ID_RE.test(String(topology.topology_id || ""))) {
    throw new Error("N-1 bootstrap topology ID is malformed");
  }

  if (
    !Array.isArray(topology.components) ||
    topology.components.length < 6 ||
    topology.components.length > 32
  ) {
    throw new Error("N-1 topology component count is invalid");
  }
  if (
    !Array.isArray(topology.paths) ||
    topology.paths.length < 4 ||
    topology.paths.length > 64
  ) {
    throw new Error("N-1 topology path count is invalid");
  }

  const components = topology.components.map(normalizeComponent);
  const componentsById = new Map();
  for (const component of components) {
    if (componentsById.has(component.component_id)) {
      throw new Error("N-1 topology contains duplicate component IDs");
    }
    componentsById.set(component.component_id, component);
  }

  const paths = topology.paths.map((path) =>
    normalizePath(path, componentsById),
  );
  const pathIds = new Set();
  for (const path of paths) {
    if (pathIds.has(path.path_id)) {
      throw new Error("N-1 topology contains duplicate path IDs");
    }
    pathIds.add(path.path_id);
  }

  const sortedComponents = [...components].sort((a, b) =>
    a.component_id.localeCompare(b.component_id),
  );
  const sortedPaths = [...paths].sort((a, b) =>
    a.path_id.localeCompare(b.path_id),
  );

  if (canonicalJson(components) !== canonicalJson(sortedComponents)) {
    throw new Error("N-1 topology components are not canonical/sorted");
  }
  if (canonicalJson(paths) !== canonicalJson(sortedPaths)) {
    throw new Error("N-1 topology paths are not canonical/sorted");
  }

  validatePolicy(topology.policy);
  validateAuthority(topology.authority);
  const resilience = validateResilience(components, paths);

  const expectedId = contentId("voidbn1_", topology, "topology_id");
  if (topology.topology_id !== expectedId) {
    throw new Error("N-1 topology ID does not match content");
  }

  return Object.freeze({
    topology: Object.freeze(structuredClone(topology)),
    resilience,
  });
}
