#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import {
  MARKER,
  CONFIRM,
  EXPECTED_ADDRESS,
  EPOCH2_SOURCE_TUPLE_BLOBS,
  keccak256,
  keyMaterial,
  privateKeyFromCredential,
  openCredentialGeneration,
  buildChallenge,
  parseSystemdObservation,
  redactedLoadCredentialBindingFromShow,
  serviceCgroupBound,
  canonicalUserBusPaths,
} from "./void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";

const ROOT = process.cwd();
const SEALED =
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";
const LEGACY =
  "scripts/void_buy_void_epoch2_credential_attestation_v1.ts";
const OPERATOR_DOC =
  "docs/operators/buy-void-epoch2-credential-attestation-sealed-v2.md";
const WORKFLOW =
  ".github/workflows/buy-void-epoch2-credential-attestation-sealed-v2.yml";
const GIT = "/usr/bin/git";

function cleanEnv(extra = {}) {
  return {
    PATH: "/usr/bin:/bin",
    HOME: String(process.env.HOME || ""),
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    ...extra,
  };
}

function git(cwd, args, input) {
  return execFileSync(GIT, [
    "-C", cwd,
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    ...args,
  ], {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 10_000,
    maxBuffer: 512 * 1024,
    env: cleanEnv(),
  });
}

const sealedSource = git(ROOT, ["show", "HEAD:" + SEALED]);
assert.ok(sealedSource.length > 10_000);
assert.equal(Object.keys(EPOCH2_SOURCE_TUPLE_BLOBS).length, 27);
assert.doesNotMatch(
  sealedSource,
  /execFileSync\(process[.]execPath/u,
  "sealed probe must not execute mutable repository source modules",
);
assert.match(
  sealedSource,
  /Object[.]entries\(EPOCH2_SOURCE_TUPLE_BLOBS\)/u,
  "sealed probe must verify the reviewed Epoch-2 source tuple as data",
);
const expectedHeadCheckAt = sealedSource.indexOf(
  'if (source.head !== expectedHead)',
);
const liveSystemdAt = sealedSource.indexOf("const before = observeLiveSystemd();");
assert.ok(
  expectedHeadCheckAt > 0 && liveSystemdAt > expectedHeadCheckAt,
  "expected source head must be bound before live systemd observation",
);
assert.match(sealedSource, /--expected-head/u);
const operatorDoc = fs.readFileSync(path.join(ROOT, OPERATOR_DOC), "utf8");
assert.match(operatorDoc, /rev-parse --verify HEAD/u);
assert.match(
  operatorDoc,
  /show "\$\{head\}:scripts\/void_buy_void_epoch2_credential_attestation_sealed_v1[.]mjs"/u,
);
assert.match(operatorDoc, /--expected-head "\$head"/u);
const workflowSource = fs.readFileSync(path.join(ROOT, WORKFLOW), "utf8");
for (const relative of Object.keys(EPOCH2_SOURCE_TUPLE_BLOBS)) {
  assert.equal(
    workflowSource.includes('      - "' + relative + '"'),
    true,
    "workflow trigger missing reviewed Epoch-2 source path: " + relative,
  );
}
const importSpecs = [...sealedSource.matchAll(
  /^import .* from "([^"]+)";$/gmu,
)].map((match) => match[1]);
assert.deepEqual(importSpecs.sort(), [
  "node:child_process",
  "node:crypto",
  "node:fs",
  "node:path",
  "node:url",
].sort());
assert.equal(/\bimport\s*\(/u.test(sealedSource), false);
assert.equal(/from ["']ethers["']/u.test(sealedSource), false);
assert.equal(/base64url/u.test(sealedSource), false);
assert.equal(/format: "jwk"/u.test(sealedSource), false);
assert.match(sealedSource, /type: "sec1"/u);
assert.equal(/--import\s+tsx/u.test(sealedSource), false);
assert.equal(/eth_sendRawTransaction/u.test(sealedSource), false);
assert.equal(/fulfill\s*\(/u.test(sealedSource), false);
assert.match(sealedSource, /transaction_constructed: false/u);
for (const publicEvidenceField of [
  "nonce_hex",
  "public_signature_p1363_hex",
  "public_key_spki_der_hex",
  "public_key_uncompressed_sha256",
  "public_signature_output: true",
  "public_key_output: true",
]) {
  assert.equal(
    sealedSource.includes(publicEvidenceField),
    true,
    "sealed probe missing independently verifiable public evidence field: " +
      publicEvidenceField,
  );
}
assert.match(sealedSource, /GIT_NO_REPLACE_OBJECTS/u);
assert.match(sealedSource, /epoch2_sealed_node_execution_context_invalid/u);
assert.match(sealedSource, /root_owned_node_binary_verified: true/u);
assert.match(sealedSource, /node_loader_environment_empty: true/u);
assert.match(sealedSource, /native_loader_environment_empty: true/u);
assert.match(sealedSource, /LD_PRELOAD/u);
assert.match(sealedSource, /LD_LIBRARY_PATH/u);
assert.match(sealedSource, /LD_AUDIT/u);
assert.equal(sealedSource.includes("Object.entries(process.env)"), false);
assert.match(sealedSource, /process[.]argv\[1\] !== "-"/u);

assert.equal(
  /process[.]env[.]DBUS_SESSION_BUS_ADDRESS/u.test(sealedSource),
  false,
);
assert.equal(/process[.]env[.]XDG_RUNTIME_DIR/u.test(sealedSource), false);
assert.match(
  sealedSource,
  /epoch2_sealed_service_main_pid_cgroup_mismatch/u,
);
assert.match(sealedSource, /epoch2_sealed_process_invocation_mismatch/u);

const proofUid = typeof process.getuid === "function" ? process.getuid() : 1000;
const busPaths = canonicalUserBusPaths(proofUid);
assert.equal(busPaths.runtime_directory, "/run/user/" + String(proofUid));
assert.equal(busPaths.bus_path, busPaths.runtime_directory + "/bus");
assert.equal(busPaths.bus_address, "unix:path=" + busPaths.bus_path);

const invocation = "a".repeat(32);
const processCommit = "b".repeat(40);
const processTree = "c".repeat(40);
const show = [
  "ActiveState=active",
  "SubState=running",
  "MainPID=4242",
  "InvocationID=" + invocation,
  "LoadCredential=buy-void-epoch2-fulfiller-v1:/private/e2-fulfiller.key",
  "",
].join("\n");
const environment = Buffer.from([
  "INVOCATION_ID=" + invocation,
  "CREDENTIALS_DIRECTORY=/run/user/" + String(proofUid) +
    "/credentials/void-node-live.service",
  "VOID_PROCESS_SOURCE_COMMIT=" + processCommit,
  "VOID_PROCESS_SOURCE_TREE=" + processTree,
  "VOID_PROCESS_SOURCE_BRANCH=main",
  "",
].join("\0"), "utf8");
const goodCgroup =
  "0::/user.slice/user-" + String(proofUid) +
  ".slice/user@" + String(proofUid) +
  ".service/app.slice/void-node-live.service\n";
const badCgroup =
  "0::/user.slice/user-" + String(proofUid) +
  ".slice/user@" + String(proofUid) +
  ".service/app.slice/other.service\n";
assert.equal(serviceCgroupBound(goodCgroup, proofUid), true);
assert.equal(serviceCgroupBound(badCgroup, proofUid), false);
const systemdObserved =
  parseSystemdObservation(show, environment, goodCgroup, proofUid);
assert.equal(systemdObserved.main_pid, 4242);
assert.equal(systemdObserved.invocation_id, invocation);
assert.equal(systemdObserved.process_invocation_id, invocation);
assert.match(systemdObserved.main_pid_cgroup_sha256, /^[0-9a-f]{64}$/u);
assert.throws(
  () => parseSystemdObservation(show, environment, badCgroup, proofUid),
  /epoch2_sealed_service_main_pid_cgroup_mismatch/u,
);
const wrongInvocationEnvironment = Buffer.from(
  environment.toString("utf8").replace(
    "INVOCATION_ID=" + invocation,
    "INVOCATION_ID=" + "d".repeat(32),
  ),
  "utf8",
);
assert.throws(
  () => parseSystemdObservation(
    show,
    wrongInvocationEnvironment,
    goodCgroup,
    proofUid,
  ),
  /epoch2_sealed_process_invocation_mismatch/u,
);

// Ubuntu/systemd may redact LoadCredential from systemctl show as exactly
// "[unprintable]". In that mode the sealed probe may recover only the one
// reviewed E2 binding from its active private drop-in; all other semantics
// remain tied to the cgroup-bound process and materialized credential directory.
{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-e2-loadcredential-redacted-"),
  );
  const dropIn = path.join(
    root,
    "97-buy-void-epoch2-fulfiller-credential-v1.conf",
  );
  fs.writeFileSync(
    dropIn,
    "[Service]\n" +
      "LoadCredential=buy-void-epoch2-fulfiller-v1:" +
      "/private/e2-fulfiller.key\n",
    { encoding: "utf8", mode: 0o600 },
  );
  fs.chmodSync(dropIn, 0o600);
  try {
    const redactedShow = [
      "ActiveState=active",
      "SubState=running",
      "MainPID=4242",
      "InvocationID=" + invocation,
      "LoadCredential=[unprintable]",
      "DropInPaths=" + dropIn,
      "",
    ].join("\n");
    const binding =
      redactedLoadCredentialBindingFromShow(redactedShow, proofUid);
    assert.equal(
      binding,
      "buy-void-epoch2-fulfiller-v1:/private/e2-fulfiller.key",
    );
    const redactedObserved = parseSystemdObservation(
      redactedShow,
      environment,
      goodCgroup,
      proofUid,
      binding,
    );
    assert.equal(
      redactedObserved.loadcredential_binding_sha256,
      systemdObserved.loadcredential_binding_sha256,
    );
    assert.equal(
      redactedObserved.credentials_directory_sha256,
      systemdObserved.credentials_directory_sha256,
    );
    assert.equal(
      redactedObserved.main_pid_cgroup_sha256,
      systemdObserved.main_pid_cgroup_sha256,
    );
    assert.throws(
      () => parseSystemdObservation(
        redactedShow,
        environment,
        goodCgroup,
        proofUid,
      ),
      /epoch2_sealed_loadcredential_cardinality_invalid/u,
    );

    fs.chmodSync(dropIn, 0o644);
    assert.throws(
      () => redactedLoadCredentialBindingFromShow(redactedShow, proofUid),
      /epoch2_sealed_redacted_dropin_policy_invalid/u,
    );
    fs.chmodSync(dropIn, 0o600);

    const wrongId = fs.readFileSync(dropIn, "utf8").replace(
      "buy-void-epoch2-fulfiller-v1:",
      "buy-void-native-fulfillment-wallet-v1:",
    );
    fs.writeFileSync(dropIn, wrongId, { encoding: "utf8", mode: 0o600 });
    assert.throws(
      () => redactedLoadCredentialBindingFromShow(redactedShow, proofUid),
      /epoch2_sealed_redacted_dropin_semantics_invalid/u,
    );

    const realParent = path.join(root, "real-parent");
    const linkedParent = path.join(root, "linked-parent");
    fs.mkdirSync(realParent, { mode: 0o700 });
    const realDropIn = path.join(
      realParent,
      "97-buy-void-epoch2-fulfiller-credential-v1.conf",
    );
    fs.writeFileSync(
      realDropIn,
      "[Service]\n" +
        "LoadCredential=buy-void-epoch2-fulfiller-v1:" +
        "/private/e2-fulfiller.key\n",
      { encoding: "utf8", mode: 0o600 },
    );
    fs.symlinkSync(realParent, linkedParent, "dir");
    const symlinkShow = redactedShow.replace(
      dropIn,
      path.join(
        linkedParent,
        "97-buy-void-epoch2-fulfiller-credential-v1.conf",
      ),
    );
    assert.throws(
      () => redactedLoadCredentialBindingFromShow(symlinkShow, proofUid),
      /epoch2_sealed_redacted_dropin_namespace_untrusted/u,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const syntheticSource = Object.freeze({
  head: processCommit,
  tree: processTree,
  branch: "main",
});
const signedChallenge = buildChallenge(syntheticSource, systemdObserved);
try {
  assert.match(signedChallenge.nonce_hex, /^[0-9a-f]{64}$/u);
  const expectedChallenge = Buffer.from([
    "VOID_BUY_VOID_EPOCH2_CREDENTIAL_CHALLENGE_SEALED_V2",
    processCommit,
    processTree,
    "main",
    "void-node-live.service",
    "4242",
    invocation,
    "buy-void-epoch2-fulfiller-v1",
    systemdObserved.loadcredential_binding_sha256,
    systemdObserved.credentials_directory_sha256,
    systemdObserved.main_pid_cgroup_sha256,
    processCommit,
    processTree,
    "main",
    signedChallenge.nonce_hex,
  ].join("\0"), "utf8");
  try {
    assert.deepEqual(signedChallenge.message, expectedChallenge);
    assert.equal(
      crypto.createHash("sha256").update(expectedChallenge).digest("hex"),
      signedChallenge.challenge_sha256,
    );
  } finally {
    expectedChallenge.fill(0);
  }
} finally {
  signedChallenge.message.fill(0);
}


// Retained credential-generation authority must survive through the signing
// window and fail closed on same-shape file or directory replacement.
function writeSyntheticCredential(directory, digit = "1") {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  const file = path.join(directory, "buy-void-epoch2-fulfiller-v1");
  fs.writeFileSync(file, digit.repeat(64), { encoding: "ascii", mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return file;
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-e2-generation-stable-"));
  const directory = path.join(root, "credentials");
  writeSyntheticCredential(directory, "1");
  const generation = openCredentialGeneration(directory);
  try {
    assert.equal(generation.bytes.toString("ascii"), "1".repeat(64));
    assert.equal(generation.revalidate(), true);
  } finally {
    generation.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-e2-generation-file-swap-"));
  const directory = path.join(root, "credentials");
  const file = writeSyntheticCredential(directory, "1");
  const generation = openCredentialGeneration(directory);
  try {
    const replacement = path.join(root, "replacement");
    fs.writeFileSync(replacement, "2".repeat(64), {
      encoding: "ascii",
      mode: 0o600,
    });
    fs.chmodSync(replacement, 0o600);
    const before = fs.lstatSync(file, { bigint: true });
    fs.renameSync(replacement, file);
    const after = fs.lstatSync(file, { bigint: true });
    assert.equal(before.size, after.size);
    assert.equal(before.mode & 0o777n, after.mode & 0o777n);
    assert.notEqual(before.ino, after.ino);
    assert.throws(
      () => generation.revalidate(),
      /epoch2_sealed_credential_generation_changed_after_read/u,
    );
  } finally {
    generation.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-e2-generation-dir-swap-"));
  const directory = path.join(root, "credentials");
  writeSyntheticCredential(directory, "1");
  const generation = openCredentialGeneration(directory);
  try {
    const replacement = path.join(root, "replacement-dir");
    writeSyntheticCredential(replacement, "1");
    const parked = path.join(root, "parked-dir");
    fs.renameSync(directory, parked);
    fs.renameSync(replacement, directory);
    assert.throws(
      () => generation.revalidate(),
      /epoch2_sealed_credential_generation_changed_after_read|epoch2_sealed_credential_parent_changed_after_read/u,
    );
  } finally {
    generation.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

assert.match(
  sealedSource,
  /privileged_first_entry_authenticated: false/u,
);
assert.match(
  sealedSource,
  /credential_generation_retained_through_signing: true/u,
);
assert.match(
  sealedSource,
  /credential_generation_revalidated_after_final_observation: true/u,
);

// Independent crypto vectors: the sealed probe does not rely on ethers or tsx.
assert.equal(
  keccak256(Buffer.alloc(0)).toString("hex"),
  "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
);
const privateOne = Buffer.alloc(32);
privateOne[31] = 1;
try {
  const material = keyMaterial(privateOne);
  assert.equal(
    material.address,
    "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf",
  );
  const message = Buffer.from(
    "VOID_BUY_VOID_EPOCH2_SEALED_PROOF_LOCAL_CHALLENGE_V2",
    "utf8",
  );
  const signature = crypto.sign(
    "sha256",
    message,
    { key: material.privateObject, dsaEncoding: "ieee-p1363" },
  );
  try {
    assert.equal(signature.length, 64);
    assert.match(material.publicSpkiDerHex, /^[0-9a-f]+$/u);
    const publicSpki = Buffer.from(material.publicSpkiDerHex, "hex");
    const independentPublic = crypto.createPublicKey({
      key: publicSpki,
      format: "der",
      type: "spki",
    });
    assert.equal(
      crypto.verify(
        "sha256",
        message,
        { key: independentPublic, dsaEncoding: "ieee-p1363" },
        signature,
      ),
      true,
    );
    const jwk = independentPublic.export({ format: "jwk" });
    assert.equal(jwk.kty, "EC");
    assert.equal(jwk.crv, "secp256k1");
    const x = Buffer.from(String(jwk.x || ""), "base64url");
    const y = Buffer.from(String(jwk.y || ""), "base64url");
    assert.equal(x.length, 32);
    assert.equal(y.length, 32);
    const uncompressed = Buffer.concat([Buffer.from([4]), x, y]);
    const address =
      "0x" + keccak256(uncompressed.subarray(1))
        .subarray(12).toString("hex").toLowerCase();
    assert.equal(address, material.address);
    assert.equal(
      crypto.createHash("sha256").update(uncompressed).digest("hex"),
      material.publicFingerprint,
    );
    publicSpki.fill(0);
    x.fill(0);
    y.fill(0);
    uncompressed.fill(0);
  } finally {
    signature.fill(0);
  }
} finally {
  privateOne.fill(0);
}
const parsedOne = privateKeyFromCredential(Buffer.from(
  "  0x" + "0".repeat(63) + "1\n",
  "utf8",
));
try {
  assert.equal(parsedOne.length, 32);
  assert.equal(parsedOne.subarray(0, 31).equals(Buffer.alloc(31)), true);
  assert.equal(parsedOne[31], 1);
} finally {
  parsedOne.fill(0);
}

// Direct mutable-worktree execution is not a live authority path.
const direct = spawnSync(
  process.execPath,
  [path.join(ROOT, SEALED), "--probe", "--confirm", CONFIRM],
  {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnv(),
    timeout: 10_000,
    maxBuffer: 256 * 1024,
  },
);
assert.equal(direct.status, 2);
assert.match(direct.stderr, /epoch2_sealed_git_object_stdin_required/u);
assert.equal(direct.stdout, "");

// The old tsx entrypoint is permanently non-authoritative for explicit probe.
const legacySource = fs.readFileSync(path.join(ROOT, LEGACY), "utf8");
assert.match(
  legacySource,
  /throw new Error\("epoch2_attestation_sealed_git_object_probe_required"\)/u,
);
const legacyThrow = legacySource.indexOf(
  'throw new Error("epoch2_attestation_sealed_git_object_probe_required")',
);
const legacySystemd = legacySource.indexOf(
  "const systemd = observeLiveSystemdCredential(",
);
assert.ok(legacyThrow > 0 && legacySystemd > legacyThrow);

// Required dirty-entrypoint/top-level-sentinel adversary.
// The sealed Git-object program must HOLD on worktree dirt before it can load
// any modified repository module, call systemd, read a credential or sign.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-e2-sealed-proof-"));
const target =
  "src/economic/buy_void_epoch2_fulfillment_access_list_v1.ts";
const absoluteTarget = path.join(temp, target);
try {
  git(temp, ["init", "-b", "main"]);
  git(temp, ["config", "user.email", "void-proof@example.invalid"]);
  git(temp, ["config", "user.name", "VOID proof"]);
  fs.mkdirSync(path.dirname(absoluteTarget), { recursive: true });
  fs.writeFileSync(
    absoluteTarget,
    'export const SAFE_SENTINEL_BASE = true;\n',
    "utf8",
  );
  git(temp, ["add", target]);
  git(temp, ["commit", "-m", "proof base"]);
  const tempHead = git(temp, ["rev-parse", "--verify", "HEAD"]).trim();
  assert.match(tempHead, /^[0-9a-f]{40}$/u);
  fs.appendFileSync(
    absoluteTarget,
    '\nthrow new Error("VOID_E2_TOP_LEVEL_SENTINEL_EXECUTED");\n',
    "utf8",
  );

  const dirty = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-",
      "--probe",
      "--confirm",
      CONFIRM,
      "--expected-head",
      tempHead,
    ],
    {
      cwd: temp,
      input: sealedSource,
      encoding: "utf8",
      env: cleanEnv(),
      timeout: 10_000,
      maxBuffer: 256 * 1024,
    },
  );
  assert.equal(dirty.status, 2);
  assert.match(dirty.stderr, /epoch2_sealed_tracked_worktree_dirty/u);
  assert.doesNotMatch(dirty.stderr, /VOID_E2_TOP_LEVEL_SENTINEL_EXECUTED/u);
  assert.equal(dirty.stdout, "");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

assert.equal(
  EXPECTED_ADDRESS,
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a",
);
assert.equal(
  MARKER,
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V2",
);

console.log("VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V2_PROOF_GREEN");
console.log("builtin_only_probe=true");
console.log("tsx_loader_in_live_probe=false");
console.log("node_modules_in_live_probe=false");
console.log("git_object_stdin_required=true");
console.log("operator_wrapper_pins_git_object_head=true");
console.log("expected_head_checked_before_systemd=true");
console.log("epoch2_source_tuple_data_only=true");
console.log("repository_source_module_execution=false");
console.log("epoch2_source_tuple_workflow_trigger_complete=true");
console.log("direct_worktree_probe_rejected=true");
console.log("dirty_top_level_sentinel_never_executed=true");
console.log("keccak_empty_vector_green=true");
console.log("ethereum_private_key_one_address_vector_green=true");
console.log("domain_separated_nontransaction_signature_green=true");
console.log("public_verification_signature_output=true");
console.log("public_verification_key_output=true");
console.log("public_challenge_nonce_output=true");
console.log("offline_signature_verification_proven=true");
console.log("public_key_derives_expected_ethereum_address=true");
console.log("private_key_string_materialization=false");
console.log("sec1_der_buffer_zeroed=true");
console.log("trusted_node_binary_required=true");
console.log("node_loader_environment_empty=true");
console.log("native_loader_environment_empty=true");
console.log("ambient_dbus_session_address_ignored=true");
console.log("canonical_user_bus_path_bound=true");
console.log("main_pid_systemd_cgroup_bound=true");
console.log("process_invocation_id_bound=true");
console.log("signed_challenge_binds_full_systemd_observation=true");
console.log("signed_challenge_binds_loadcredential_hash=true");
console.log("signed_challenge_binds_credentials_directory_hash=true");
console.log("signed_challenge_binds_service_cgroup_hash=true");
console.log("signed_challenge_binds_runtime_source=true");
console.log("transaction_constructed=false");
console.log("rpc_call=false");
console.log("transaction_broadcast=false");
console.log("privileged_first_entry_authenticated=false");
console.log("credential_generation_retained_through_signing=true");
console.log("same_shape_credential_replacement_rejected=true");
console.log("credential_directory_replacement_rejected=true");
console.log("credential_access_in_proof=false");
console.log("funds_movement=false");
