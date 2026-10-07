#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ROOT,
  canonical,
  derive as deriveEnforcementV1,
  digest,
  falsifiers,
  gitBlobSha1,
  proveCompiledGate,
  read,
  verify as verifyEnforcementV1,
} from "./prove_buy_void_enforcement_artifact_attestation_v1.mjs";

export const VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V4 =
  "VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V4";
export const MANIFEST =
  "docs/architecture/buy-void-enforcement-artifact-attestation-v4.json";

const PREDECESSOR_MANIFEST =
  "docs/architecture/buy-void-enforcement-artifact-attestation-v3.json";
const PREDECESSOR_MANIFEST_GIT_BLOB_SHA1 =
  "e06475df2e2f8ad4731c59ece9a7262b5c28f938";
const PREDECESSOR_ENFORCEMENT_SET_SHA256 =
  "7d6e000770a83a32e3c4706ac29f3474041a5376f2009c71e5ba00d04a1cdc3f";
const CURRENT_ENFORCEMENT_SET_SHA256 =
  "854fa637d25f0931c37d5d35fda641adb38ad1f55ca23b2662fb97d42a262a7b";
const CHANGED_INPUT = "Dockerfile";

const DIRECT_V4_CONSUMER_WORKFLOWS = Object.freeze([
  ".github/workflows/buy-void-enforcement-artifact-attestation-v1.yml",
  ".github/workflows/buy-void-coupled-launch-gate-v1.yml",
  ".github/workflows/buy-void-source-finality-packaged-compiled-artifact-attestation-v1.yml",
]);

const V4_TRIGGER_DEPENDENCIES = Object.freeze([
  "scripts/prove_buy_void_enforcement_artifact_attestation_v1.mjs",
  "scripts/prove_buy_void_enforcement_artifact_attestation_v2.mjs",
  "scripts/prove_buy_void_enforcement_artifact_attestation_v3.mjs",
  "scripts/prove_buy_void_enforcement_artifact_attestation_v4.mjs",
  "docs/architecture/buy-void-enforcement-artifact-attestation-v1.json",
  "docs/architecture/buy-void-enforcement-artifact-attestation-v2.json",
  "docs/architecture/buy-void-enforcement-artifact-attestation-v3.json",
  "docs/architecture/buy-void-enforcement-artifact-attestation-v4.json",
]);

function yamlScalar(value) {
  const trimmed = String(value || "").trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function workflowEventPaths(source, eventName) {
  const lines = String(source || "").split(/\r?\n/u);
  const onIndex = lines.findIndex(
    (line) => /^on:[ ]*$/u.test(line),
  );
  assert.ok(onIndex >= 0, "workflow on block missing");

  const onIndent = lines[onIndex].match(/^[ ]*/u)[0].length;
  let eventIndex = -1;
  let eventIndent = -1;

  for (let index = onIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const indent = line.match(/^[ ]*/u)[0].length;
    if (indent <= onIndent) break;
    if (
      line.trim() === eventName + ":" &&
      indent > onIndent
    ) {
      eventIndex = index;
      eventIndent = indent;
      break;
    }
  }
  if (eventIndex < 0) return null;

  let pathsIndex = -1;
  let pathsIndent = -1;
  for (let index = eventIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const indent = line.match(/^[ ]*/u)[0].length;
    if (indent <= eventIndent) break;
    if (line.trim() === "paths:") {
      pathsIndex = index;
      pathsIndent = indent;
      break;
    }
  }

  assert.notEqual(
    pathsIndex,
    -1,
    eventName + " paths filter missing",
  );

  const paths = [];
  for (let index = pathsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const indent = line.match(/^[ ]*/u)[0].length;
    if (indent <= pathsIndent) break;
    const match = /^[ ]*-[ ]+(.+?)[ ]*$/u.exec(line);
    if (match) paths.push(yamlScalar(match[1]));
  }
  return Object.freeze(paths);
}

function globMatchesPath(pattern, candidate) {
  let regex = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        regex += ".*";
        index += 1;
      } else {
        regex += "[^/]*";
      }
      continue;
    }
    if (char === "?") {
      regex += "[^/]";
      continue;
    }
    if ("\\.^$+()[]{}|".includes(char)) {
      regex += "\\" + char;
    } else {
      regex += char;
    }
  }
  regex += "$";
  return new RegExp(regex, "u").test(candidate);
}

function assertModeledGitHubPathPattern(pattern) {
  assert.equal(typeof pattern, "string", "path filter pattern must be text");
  assert.ok(pattern.length > 0, "path filter pattern must not be empty");
  assert.doesNotMatch(
    pattern,
    /[\[\]+\\]/u,
    "unsupported GitHub path-filter syntax must fail closed",
  );
}

function orderedPathFilterIncludes(patterns, candidate) {
  assert.ok(Array.isArray(patterns), "path filter must be an array");
  let included = false;
  for (const rawPattern of patterns) {
    assert.equal(typeof rawPattern, "string", "path filter pattern must be text");
    assert.ok(rawPattern.length > 0, "path filter pattern must not be empty");
    const excluded = rawPattern.startsWith("!");
    const pattern = excluded ? rawPattern.slice(1) : rawPattern;
    assert.ok(pattern.length > 0, "negated path filter must name a pattern");
    assertModeledGitHubPathPattern(pattern);
    if (globMatchesPath(pattern, candidate)) {
      included = !excluded;
    }
  }
  return included;
}

function assertV4ConsumerTriggerClosure() {
  assert.equal(
    globMatchesPath(
      "scripts/prove_buy_void_enforcement_*",
      "scripts/prove_buy_void_enforcement_artifact_attestation_v2.mjs",
    ),
    true,
  );
  assert.equal(
    globMatchesPath(
      "docs/architecture/buy-void-enforcement-artifact-attestation-v1.*",
      "docs/architecture/buy-void-enforcement-artifact-attestation-v1.json",
    ),
    true,
  );
  assert.equal(
    globMatchesPath(
      "docs/architecture/buy-void-enforcement-artifact-attestation-v1.*",
      "docs/architecture/buy-void-enforcement-artifact-attestation-v2.json",
    ),
    false,
  );
  const v2ProofPath =
    "scripts/prove_buy_void_enforcement_artifact_attestation_v2.mjs";
  assert.equal(
    orderedPathFilterIncludes(
      ["scripts/**", "!" + v2ProofPath],
      v2ProofPath,
    ),
    false,
    "later negative trigger pattern must exclude a dependency",
  );
  assert.equal(
    orderedPathFilterIncludes(
      ["scripts/**", "!" + v2ProofPath, v2ProofPath],
      v2ProofPath,
    ),
    true,
    "later positive trigger pattern must re-include a dependency",
  );
  assert.throws(
    () =>
      orderedPathFilterIncludes(
        [
          "scripts/**",
          "!scripts/prove_buy_void_enforcement_artifact_attestation_v[1-3].mjs",
        ],
        v2ProofPath,
      ),
    /unsupported GitHub path-filter syntax/u,
    "character-class filters must HOLD instead of being interpreted literally",
  );
  assert.throws(
    () =>
      orderedPathFilterIncludes(
        ["scripts/prove_buy_void_enforcement_artifact_attestation_v+.mjs"],
        v2ProofPath,
      ),
    /unsupported GitHub path-filter syntax/u,
    "unmodeled plus filters must HOLD instead of being interpreted literally",
  );
  for (const workflowPath of DIRECT_V4_CONSUMER_WORKFLOWS) {
    const source = read(ROOT, workflowPath).toString("utf8");
    const eventNames = ["pull_request"];
    if (workflowEventPaths(source, "push") !== null) {
      eventNames.push("push");
    }
    for (const eventName of eventNames) {
      const paths = workflowEventPaths(source, eventName);
      assert.ok(paths, workflowPath + " missing " + eventName + " paths");
      for (const dependency of V4_TRIGGER_DEPENDENCIES) {
        const included = orderedPathFilterIncludes(paths, dependency);
        assert.ok(
          included,
          workflowPath +
            " " +
            eventName +
            ".paths missing or excluding V4 trigger dependency: " +
            dependency,
        );
      }
    }
  }
}

function parseBoundJson(relativePath, expectedBlob) {
  const bytes = read(ROOT, relativePath);
  assert.equal(
    gitBlobSha1(bytes),
    expectedBlob,
    "bound manifest Git blob mismatch: " + relativePath,
  );
  return JSON.parse(bytes.toString("utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function byPath(records) {
  return new Map(records.map((record) => [record.path, record]));
}

function recordDelta(previousRecords, currentRecords) {
  const previous = byPath(previousRecords);
  const current = byPath(currentRecords);
  return Object.freeze({
    removed: [...previous.keys()].filter((key) => !current.has(key)).sort(),
    added: [...current.keys()].filter((key) => !previous.has(key)).sort(),
    changed: [...previous.keys()].filter(
      (key) =>
        current.has(key) &&
        canonical(previous.get(key)) !== canonical(current.get(key)),
    ).sort(),
    unchanged: [...previous.keys()].filter(
      (key) =>
        current.has(key) &&
        canonical(previous.get(key)) === canonical(current.get(key)),
    ).sort(),
  });
}

function reconstructV3Candidate(predecessor) {
  assert.equal(
    predecessor.schema,
    "void_buy_void_enforcement_artifact_attestation_v3",
  );
  assert.equal(
    predecessor.marker,
    "VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V3",
  );
  assert.equal(predecessor.version, 3);
  assert.equal(
    predecessor.current_enforcement?.enforcement_artifact_set_sha256,
    PREDECESSOR_ENFORCEMENT_SET_SHA256,
  );

  const v2Path = String(predecessor?.predecessor?.manifest_path || "");
  const v2Blob = String(
    predecessor?.predecessor?.manifest_git_blob_sha1 || "",
  );
  assert.equal(
    v2Path,
    "docs/architecture/buy-void-enforcement-artifact-attestation-v2.json",
  );
  assert.match(v2Blob, /^[0-9a-f]{40}$/u);

  const v2 = parseBoundJson(v2Path, v2Blob);
  assert.equal(
    v2.schema,
    "void_buy_void_enforcement_artifact_attestation_v2",
  );
  assert.equal(
    v2.marker,
    "VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2",
  );
  assert.equal(v2.version, 2);
  assert.equal(
    v2.enforcement_artifact_set_sha256,
    predecessor.predecessor.enforcement_artifact_set_sha256,
  );

  const v1Path = String(v2?.predecessor?.manifest_path || "");
  const v1Blob = String(
    v2?.predecessor?.manifest_git_blob_sha1 || "",
  );
  assert.equal(
    v1Path,
    "docs/architecture/buy-void-enforcement-artifact-attestation-v1.json",
    "V2 predecessor must retain the canonical V1 manifest path",
  );
  assert.match(
    v1Blob,
    /^[0-9a-f]{40}$/u,
    "V2 predecessor V1 blob must be commit-shaped",
  );
  const v1 = parseBoundJson(v1Path, v1Blob);
  assert.equal(
    v1.schema,
    "void_buy_void_enforcement_artifact_attestation_v1",
  );
  assert.equal(v1.version, 1);
  assert.equal(
    v1.enforcement_artifact_set_sha256,
    v2.predecessor.enforcement_artifact_set_sha256,
    "V1 enforcement set must match the V2 predecessor claim",
  );

  const artifacts = v2.artifacts.map((record) => clone(record));
  const inputs = v2.inputs.map((record) => clone(record));

  const changedArtifact =
    predecessor.current_enforcement?.changed_artifact;
  const changedInput =
    predecessor.current_enforcement?.changed_input;
  assert.ok(changedArtifact && typeof changedArtifact.path === "string");
  assert.ok(changedInput && typeof changedInput.path === "string");

  const artifactIndex = artifacts.findIndex(
    (record) => record.path === changedArtifact.path,
  );
  const inputIndex = inputs.findIndex(
    (record) => record.path === changedInput.path,
  );
  assert.ok(artifactIndex >= 0);
  assert.ok(inputIndex >= 0);
  artifacts[artifactIndex] = clone(changedArtifact);
  inputs[inputIndex] = clone(changedInput);

  const candidate = {
    schema: "void_buy_void_enforcement_artifact_attestation_v1",
    version: 1,
    repository: v2.repository,
    source_head: v2.source_head,
    source_tree: v2.source_tree,
    entry_artifact: v2.entry_artifact,
    artifacts,
    inputs,
    source_artifact_mapping: clone(v2.source_artifact_mapping),
    compiler: clone(v2.compiler),
    absent_build_inputs: clone(v2.absent_build_inputs),
    build_command: v2.build_command,
    derivation_node_majors: clone(v2.derivation_node_majors),
    external_dependency_boundary: v2.external_dependency_boundary,
    production_source_finality_authority_ready:
      v2.production_source_finality_authority_ready,
    deployed_artifact_generation_verified:
      v2.deployed_artifact_generation_verified,
  };
  const computed =
    digest(canonical(candidate));
  assert.equal(
    computed,
    PREDECESSOR_ENFORCEMENT_SET_SHA256,
    "reconstructed V3 enforcement set mismatch",
  );
  return Object.freeze({
    ...candidate,
    enforcement_artifact_set_sha256: computed,
  });
}

export function deriveBuyVoidEnforcementArtifactAttestationV4(
  root = ROOT,
) {
  assertV4ConsumerTriggerClosure();
  const predecessor = parseBoundJson(
    PREDECESSOR_MANIFEST,
    PREDECESSOR_MANIFEST_GIT_BLOB_SHA1,
  );
  const previousCandidate = reconstructV3Candidate(predecessor);
  const candidate = deriveEnforcementV1(root);
  assert.equal(
    candidate.enforcement_artifact_set_sha256,
    CURRENT_ENFORCEMENT_SET_SHA256,
  );

  const artifactDelta = recordDelta(
    previousCandidate.artifacts,
    candidate.artifacts,
  );
  assert.deepEqual(artifactDelta.removed, []);
  assert.deepEqual(artifactDelta.added, []);
  assert.deepEqual(artifactDelta.changed, []);
  assert.equal(artifactDelta.unchanged.length, 23);

  const inputDelta = recordDelta(
    previousCandidate.inputs,
    candidate.inputs,
  );
  assert.deepEqual(inputDelta.removed, []);
  assert.deepEqual(inputDelta.added, []);
  assert.deepEqual(inputDelta.changed, [CHANGED_INPUT]);
  assert.equal(inputDelta.unchanged.length, 29);

  const changedInput = byPath(candidate.inputs).get(CHANGED_INPUT);
  assert.ok(changedInput);

  return Object.freeze({
    schema: "void_buy_void_enforcement_artifact_attestation_v4",
    marker: VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V4,
    version: 4,
    repository: candidate.repository,
    predecessor: Object.freeze({
      schema: predecessor.schema,
      marker: predecessor.marker,
      manifest_path: PREDECESSOR_MANIFEST,
      manifest_git_blob_sha1: PREDECESSOR_MANIFEST_GIT_BLOB_SHA1,
      enforcement_artifact_set_sha256:
        PREDECESSOR_ENFORCEMENT_SET_SHA256,
    }),
    reviewed_source_generation:
      Object.freeze({ ...predecessor.reviewed_source_generation }),
    compiled_artifact_generation:
      Object.freeze({ ...predecessor.compiled_artifact_generation }),
    current_enforcement: Object.freeze({
      enforcement_artifact_set_sha256:
        candidate.enforcement_artifact_set_sha256,
      artifact_count: candidate.artifacts.length,
      input_count: candidate.inputs.length,
      changed_input: Object.freeze({ ...changedInput }),
    }),
    predecessor_delta: Object.freeze({
      removed_artifact_paths: artifactDelta.removed,
      added_artifact_paths: artifactDelta.added,
      changed_artifact_paths: artifactDelta.changed,
      unchanged_artifact_count: artifactDelta.unchanged.length,
      removed_input_paths: inputDelta.removed,
      added_input_paths: inputDelta.added,
      changed_input_paths: inputDelta.changed,
      unchanged_input_count: inputDelta.unchanged.length,
    }),
    production_source_finality_authority_ready: false,
    deployed_artifact_generation_verified: false,
  });
}

function verifyCommitted(root = ROOT) {
  const expected =
    deriveBuyVoidEnforcementArtifactAttestationV4(root);
  const manifestBytes = read(ROOT, MANIFEST);
  const exact = Buffer.from(
    JSON.stringify(expected, null, 2) + "\n",
    "utf8",
  );
  assert.equal(
    manifestBytes.equals(exact),
    true,
    "enforcement V4 manifest mismatch",
  );
  const parsed = JSON.parse(manifestBytes.toString("utf8"));
  assert.equal(
    parsed.current_enforcement.enforcement_artifact_set_sha256,
    CURRENT_ENFORCEMENT_SET_SHA256,
  );
  const candidate = deriveEnforcementV1(root);
  verifyEnforcementV1(root, candidate);
  return Object.freeze({ expected: parsed, candidate });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--derive") {
    process.stdout.write(
      JSON.stringify(
        deriveBuyVoidEnforcementArtifactAttestationV4(),
        null,
        2,
      ) + "\n",
    );
  } else {
    assert.ok(
      args.length === 0 ||
        (args.length === 2 && args[0] === "--packaged-root"),
      "invalid arguments",
    );
    const target =
      args.length === 2 ? path.resolve(args[1]) : ROOT;
    const verified = verifyCommitted(target);
    await proveCompiledGate(target);
    falsifiers(verified.candidate);
    console.log(
      "VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V4_GREEN",
    );
    console.log(
      "enforcement_artifact_set_sha256=" +
        verified.expected.current_enforcement
          .enforcement_artifact_set_sha256,
    );
    console.log("predecessor_v3_manifest_bound=true");
    console.log("v4_consumer_trigger_unmodeled_globs_fail_closed=true");
console.log("v4_consumer_trigger_ordered_negation_semantics_bound=true");
console.log("v4_consumer_trigger_closure_bound=true");
    console.log("predecessor_v2_manifest_bytes_bound=true");
    console.log("dockerfile_only_delta_exact=true");
    console.log("compiled_artifacts_unchanged=true");
    console.log("production_source_finality_authority_ready=false");
    console.log("deployed_artifact_generation_verified=false");
  }
}
