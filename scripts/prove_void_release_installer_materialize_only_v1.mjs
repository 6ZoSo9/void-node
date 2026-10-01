#!/usr/bin/env node

import assert from "node:assert/strict";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_RELEASE_INSTALLER_MATERIALIZE_ONLY_V1_PROOF_GREEN";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STANDARD = path.join(ROOT, "ops", "public", "install-void-node-v1.sh");
const PORTABLE = path.join(
  ROOT,
  "ops",
  "public",
  "install-void-node-portable-runtime-v1.sh",
);

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (options.check !== false && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed rc=${result.status}: ${output}`,
    );
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    output,
  };
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureDir(directory, mode = 0o755) {
  fs.mkdirSync(directory, { recursive: true, mode });
  fs.chmodSync(directory, mode);
}

function writeFile(file, value, mode = 0o644) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, value);
  fs.chmodSync(file, mode);
}

function createFixture(root, { version, commit, portable }) {
  const fixtureRoot = path.join(
    root,
    portable ? "portable-fixture" : "standard-fixture",
  );
  const topName = `void-node-${version}`;
  const releaseRoot = path.join(fixtureRoot, topName);
  ensureDir(releaseRoot);
  fs.chmodSync(releaseRoot, 0o750);
  const releaseRootMode = fs.lstatSync(releaseRoot).mode & 0o7777;

  const payload = path.join(releaseRoot, "bin", "payload");
  writeFile(payload, "#!/usr/bin/env bash\nprintf 'payload\\n'\n", 0o755);
  fs.symlinkSync("bin/payload", path.join(releaseRoot, "payload-link"));

  const build = {
    version,
    git_commit: commit,
  };

  const internalEntries = ["BUILD-INFO.json", "bin/payload"];

  if (portable) {
    const runtime = path.join(releaseRoot, "runtime", "bin", "node");
    writeFile(
      runtime,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "case \"${1:-}\" in",
        "  --version) printf 'v22.99.0\\n' ;;",
        "  -p) printf '22\\n' ;;",
        "  *) exit 0 ;;",
        "esac",
        "",
      ].join("\n"),
      0o755,
    );
    writeFile(
      path.join(releaseRoot, "runtime", "LICENSE.nodejs"),
      "fixture license\n",
      0o644,
    );
    Object.assign(build, {
      runtime_delivery: "bundled",
      host_node_required: false,
      bundled_node_runtime: true,
      bundled_node_version: "v22.99.0",
      bundled_node_major: 22,
      bundled_node_path: "runtime/bin/node",
      bundled_node_sha256: sha256File(runtime),
    });
    internalEntries.push("runtime/bin/node", "runtime/LICENSE.nodejs");
  }

  writeJson(path.join(releaseRoot, "BUILD-INFO.json"), build);

  const internalSums = internalEntries
    .sort()
    .map((relative) => {
      return `${sha256File(path.join(releaseRoot, relative))}  ${relative}`;
    });
  writeFile(
    path.join(releaseRoot, "RELEASE-CONTENTS-SHA256"),
    `${internalSums.join("\n")}\n`,
    0o644,
  );

  const archiveName = `void-node-${version}.tar.gz`;
  const archive = path.join(fixtureRoot, archiveName);
  run("tar", ["-czf", archive, "-C", fixtureRoot, topName]);

  const checksums = path.join(fixtureRoot, "SHA256SUMS");
  writeFile(
    checksums,
    `${sha256File(archive)}  ${archiveName}\n`,
    0o644,
  );

  const manifest = {
    marker: "VOID_PUBLIC_RELEASE_MANIFEST_V1",
    version,
    git_commit: commit,
    archive: archiveName,
    checksums: "SHA256SUMS",
    archive_sha256: sha256File(archive),
  };
  if (portable) {
    Object.assign(manifest, {
      runtime_delivery: build.runtime_delivery,
      host_node_required: build.host_node_required,
      bundled_node_runtime: build.bundled_node_runtime,
      bundled_node_version: build.bundled_node_version,
      bundled_node_major: build.bundled_node_major,
      bundled_node_path: build.bundled_node_path,
      bundled_node_sha256: build.bundled_node_sha256,
    });
  }
  const manifestFile = path.join(
    fixtureRoot,
    "void-node-release-manifest.json",
  );
  writeJson(manifestFile, manifest);

  return {
    version,
    archive,
    checksums,
    manifest: manifestFile,
    releaseRootMode,
  };
}

function snapshotTree(root) {
  if (!fs.existsSync(root)) return null;
  const output = {};
  const visit = (absolute, relative) => {
    const metadata = fs.lstatSync(absolute);
    const mode = metadata.mode & 0o7777;
    if (metadata.isSymbolicLink()) {
      output[relative] = {
        kind: "symlink",
        mode,
        target: fs.readlinkSync(absolute),
      };
      return;
    }
    if (metadata.isDirectory()) {
      output[relative] = { kind: "directory", mode };
      for (const name of fs.readdirSync(absolute).sort()) {
        visit(path.join(absolute, name), relative ? `${relative}/${name}` : name);
      }
      return;
    }
    if (metadata.isFile()) {
      output[relative] = {
        kind: "file",
        mode,
        size: metadata.size,
        sha256: sha256File(absolute),
      };
      return;
    }
    output[relative] = { kind: "other", mode };
  };
  visit(root, ".");
  return output;
}

function createHarness(root, name) {
  const base = path.join(root, name);
  const home = path.join(base, "home");
  const installRoot = path.join(base, "install");
  const releases = path.join(installRoot, "releases");
  const binDir = path.join(base, "external-bin");
  const configDir = path.join(base, "external-config");
  const stateDir = path.join(base, "external-state");
  const systemdDir = path.join(base, "external-systemd");

  for (const directory of [
    home,
    installRoot,
    releases,
    binDir,
    configDir,
    stateDir,
    systemdDir,
  ]) {
    ensureDir(directory);
  }

  const oldA = path.join(releases, "old-a");
  const oldB = path.join(releases, "old-b");
  const oldC = path.join(releases, "old-c");
  for (const [directory, text] of [
    [oldA, "old-a\n"],
    [oldB, "old-b\n"],
    [oldC, "old-c\n"],
  ]) {
    ensureDir(directory);
    writeFile(path.join(directory, "sentinel.txt"), text);
  }
  fs.symlinkSync(oldA, path.join(installRoot, "current"));
  fs.symlinkSync(oldB, path.join(installRoot, "previous"));

  for (const [directory, text] of [
    [binDir, "bin\n"],
    [configDir, "config\n"],
    [stateDir, "state\n"],
    [systemdDir, "systemd\n"],
  ]) {
    writeFile(path.join(directory, "sentinel.txt"), text);
  }

  return {
    home,
    installRoot,
    releases,
    binDir,
    configDir,
    stateDir,
    systemdDir,
    oldReleases: [oldA, oldB, oldC],
    currentTarget: fs.readlinkSync(path.join(installRoot, "current")),
    previousTarget: fs.readlinkSync(path.join(installRoot, "previous")),
    installRootMode: fs.lstatSync(installRoot).mode & 0o7777,
    releasesMode: fs.lstatSync(releases).mode & 0o7777,
    externalSnapshots: {
      bin: snapshotTree(binDir),
      config: snapshotTree(configDir),
      state: snapshotTree(stateDir),
      systemd: snapshotTree(systemdDir),
    },
    oldSnapshots: new Map(
      [oldA, oldB, oldC].map((release) => [release, snapshotTree(release)]),
    ),
  };
}

function environment(harness) {
  return {
    HOME: harness.home,
    VOID_NODE_CONFIG_DIR: harness.configDir,
    VOID_NODE_STATE_DIR: harness.stateDir,
    VOID_NODE_SYSTEMD_DIR: harness.systemdDir,
    VOID_NODE_KEEP_RELEASES: "1",
    VOID_NODE_INSTALL_ALLOW_UNSUPPORTED_NODE: "1",
    VOID_NODE_ALLOW_ROOT_INSTALL: "1",
  };
}

function materializeArgs(installer, fixture, harness, command = "install") {
  return [
    installer,
    command,
    "--archive",
    fixture.archive,
    "--checksums",
    fixture.checksums,
    "--manifest",
    fixture.manifest,
    "--install-root",
    harness.installRoot,
    "--bin-dir",
    harness.binDir,
    "--yes",
    "--materialize-only",
  ];
}

function assertBoundary(harness, candidateDir) {
  assert.equal(
    fs.readlinkSync(path.join(harness.installRoot, "current")),
    harness.currentTarget,
  );
  assert.equal(
    fs.readlinkSync(path.join(harness.installRoot, "previous")),
    harness.previousTarget,
  );
  assert.equal(
    fs.lstatSync(harness.installRoot).mode & 0o7777,
    harness.installRootMode,
  );
  assert.equal(
    fs.lstatSync(harness.releases).mode & 0o7777,
    harness.releasesMode,
  );

  for (const release of harness.oldReleases) {
    assert.deepEqual(snapshotTree(release), harness.oldSnapshots.get(release));
  }
  assert.equal(fs.existsSync(candidateDir), true);

  for (const forbidden of [
    ".current.next",
    ".previous.next",
    "control",
    "bin",
  ]) {
    assert.equal(
      fs.existsSync(path.join(harness.installRoot, forbidden)),
      false,
      `materialize-only created forbidden install-root path: ${forbidden}`,
    );
  }

  assert.deepEqual(snapshotTree(harness.binDir), harness.externalSnapshots.bin);
  assert.deepEqual(
    snapshotTree(harness.configDir),
    harness.externalSnapshots.config,
  );
  assert.deepEqual(snapshotTree(harness.stateDir), harness.externalSnapshots.state);
  assert.deepEqual(
    snapshotTree(harness.systemdDir),
    harness.externalSnapshots.systemd,
  );
}

function expectMaterializeFailure(
  installer,
  fixture,
  harness,
  expectedPattern,
) {
  const result = run(
    "bash",
    materializeArgs(installer, fixture, harness, "update"),
    {
      env: environment(harness),
      check: false,
    },
  );
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, expectedPattern);
  return result;
}

function proveInstaller({
  label,
  installer,
  fixture,
  harness,
  portable,
}) {
  const staleStage = path.join(
    harness.releases,
    `.${fixture.version}.materialize-next`,
  );
  fs.symlinkSync(harness.configDir, staleStage);

  const first = run(
    "bash",
    materializeArgs(installer, fixture, harness, "install"),
    { env: environment(harness) },
  );
  assert.match(first.output, /MATERIALIZE_ONLY_GREEN/u);
  assert.match(first.output, /materialized_release_durable=true/u);
  assert.match(first.output, /materialize_parent_durable=true/u);
  assert.match(first.output, /release_root_mode_bound=true/u);
  assert.match(first.output, /current_pointer_mutated=false/u);
  assert.match(first.output, /previous_pointer_mutated=false/u);
  assert.match(first.output, /stable_manager_published=false/u);
  assert.match(first.output, /command_symlink_published=false/u);
  assert.match(first.output, /config_state_mutated=false/u);
  assert.match(first.output, /service_unit_written=false/u);
  assert.match(first.output, /service_action_performed=false/u);
  assert.match(first.output, /retention_pruned=false/u);
  assert.match(first.output, /money_movement=false/u);
  if (portable) {
    assert.match(first.output, /host_node_required=false/u);
    assert.match(first.output, /bundled_node_version=v22\.99\.0/u);
  }

  const candidateDir = path.join(harness.releases, fixture.version);
  assert.equal(
    fs.existsSync(staleStage) || (() => {
      try {
        fs.lstatSync(staleStage);
        return true;
      } catch {
        return false;
      }
    })(),
    false,
    "stale materialize staging entry survived successful retry",
  );
  assertBoundary(harness, candidateDir);
  const verifiedExtractionRootMode =
    fixture.releaseRootMode & ~0o077 & 0o7777;
  assert.equal(
    fs.lstatSync(candidateDir).mode & 0o7777,
    verifiedExtractionRootMode,
    "new materialized candidate root mode must match umask-adjusted verified extraction",
  );

  const second = run(
    "bash",
    materializeArgs(installer, fixture, harness, "update"),
    { env: environment(harness) },
  );
  assert.match(second.output, /existing_materialized_release_exact=true/u);
  assert.match(second.output, /MATERIALIZE_ONLY_GREEN/u);
  assertBoundary(harness, candidateDir);

  const candidateRootMode = fs.lstatSync(candidateDir).mode & 0o7777;
  fs.chmodSync(candidateDir, candidateRootMode === 0o700 ? 0o750 : 0o700);
  expectMaterializeFailure(
    installer,
    fixture,
    harness,
    /existing release tree differs from verified candidate/u,
  );
  fs.chmodSync(candidateDir, candidateRootMode);
  assertBoundary(harness, candidateDir);

  const payload = path.join(candidateDir, "bin", "payload");
  const payloadMode = fs.lstatSync(payload).mode & 0o7777;
  fs.chmodSync(payload, 0o600);
  expectMaterializeFailure(
    installer,
    fixture,
    harness,
    /existing release tree differs from verified candidate/u,
  );
  assertBoundary(harness, candidateDir);
  fs.chmodSync(payload, payloadMode);

  const link = path.join(candidateDir, "payload-link");
  assert.equal(fs.readlinkSync(link), "bin/payload");
  fs.unlinkSync(link);
  fs.symlinkSync("BUILD-INFO.json", link);
  expectMaterializeFailure(
    installer,
    fixture,
    harness,
    /existing release tree differs from verified candidate/u,
  );
  assertBoundary(harness, candidateDir);
  fs.unlinkSync(link);
  fs.symlinkSync("bin/payload", link);

  const extra = path.join(candidateDir, "unexpected.txt");
  fs.writeFileSync(extra, "unexpected\n");
  expectMaterializeFailure(
    installer,
    fixture,
    harness,
    /existing release tree differs from verified candidate/u,
  );
  assertBoundary(harness, candidateDir);
  fs.unlinkSync(extra);

  const forbidden = run(
    "bash",
    [
      installer,
      "update",
      "--materialize-only",
      "--enable",
    ],
    {
      env: environment(harness),
      check: false,
    },
  );
  assert.notEqual(forbidden.status, 0);
  assert.match(
    forbidden.output,
    /--materialize-only cannot be combined with --enable\/--start/u,
  );
  assertBoundary(harness, candidateDir);

  const destructive = run(
    "bash",
    [
      installer,
      "uninstall",
      "--materialize-only",
      "--yes",
      "--install-root",
      harness.installRoot,
      "--bin-dir",
      harness.binDir,
    ],
    {
      env: environment(harness),
      check: false,
    },
  );
  assert.notEqual(destructive.status, 0);
  assert.match(
    destructive.output,
    /--materialize-only supports install\/update only/u,
  );
  assertBoundary(harness, candidateDir);

  console.log(`${label}_initial_materialization_green=true`);
  console.log(`${label}_idempotent_exact_retry_green=true`);
  console.log(`${label}_release_root_mode_preserved=true`);
  console.log(`${label}_release_root_mode_drift_rejected=true`);
  console.log(`${label}_mode_drift_rejected=true`);
  console.log(`${label}_symlink_target_drift_rejected=true`);
  console.log(`${label}_extra_path_rejected=true`);
  console.log(`${label}_activation_flags_rejected=true`);
  console.log(`${label}_destructive_command_rejected=true`);
  console.log(`${label}_stale_stage_symlink_recovered=true`);
  console.log(`${label}_pointer_and_external_sentinels_unchanged=true`);
  console.log(`${label}_retention_pruning_suppressed=true`);
}

function proveFreshParentCreation({
  label,
  installer,
  fixture,
  portable,
  root,
}) {
  const base = path.join(root, `${label}-fresh-parent`);
  const home = path.join(base, "home");
  const installRoot = path.join(base, "new-a", "new-b", "install");
  const binDir = path.join(base, "external-bin");
  const configDir = path.join(base, "external-config");
  const stateDir = path.join(base, "external-state");
  const systemdDir = path.join(base, "external-systemd");
  for (const directory of [home, binDir, configDir, stateDir, systemdDir]) {
    ensureDir(directory);
    writeFile(path.join(directory, "sentinel.txt"), `${label}\n`);
  }
  const harness = {
    home,
    installRoot,
    releases: path.join(installRoot, "releases"),
    binDir,
    configDir,
    stateDir,
    systemdDir,
  };
  const result = run(
    "bash",
    materializeArgs(installer, fixture, harness, "install"),
    { env: environment(harness) },
  );
  assert.match(result.output, /MATERIALIZE_ONLY_GREEN/u);
  assert.match(result.output, /materialize_parent_durable=true/u);
  assert.match(result.output, /materialized_release_durable=true/u);
  const candidateDir = path.join(harness.releases, fixture.version);
  assert.equal(fs.existsSync(candidateDir), true);
  assert.equal(
    fs.lstatSync(candidateDir).mode & 0o7777,
    fixture.releaseRootMode & ~0o077 & 0o7777,
  );
  assert.equal(fs.existsSync(path.join(installRoot, "current")), false);
  assert.equal(fs.existsSync(path.join(installRoot, "previous")), false);
  for (const directory of [binDir, configDir, stateDir, systemdDir]) {
    assert.equal(
      fs.readFileSync(path.join(directory, "sentinel.txt"), "utf8"),
      `${label}\n`,
    );
  }
  if (portable) {
    assert.match(result.output, /host_node_required=false/u);
  }
  console.log(`${label}_fresh_parent_creation_durable_green=true`);
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-release-materialize-only-v1-"),
);

try {
  const standardFixture = createFixture(root, {
    version: "9.9.1",
    commit: "a".repeat(40),
    portable: false,
  });
  const portableFixture = createFixture(root, {
    version: "9.9.2",
    commit: "b".repeat(40),
    portable: true,
  });

  proveInstaller({
    label: "standard",
    installer: STANDARD,
    fixture: standardFixture,
    harness: createHarness(root, "standard-harness"),
    portable: false,
  });
  proveInstaller({
    label: "portable",
    installer: PORTABLE,
    fixture: portableFixture,
    harness: createHarness(root, "portable-harness"),
    portable: true,
  });
  proveFreshParentCreation({
    label: "standard",
    installer: STANDARD,
    fixture: standardFixture,
    portable: false,
    root,
  });
  proveFreshParentCreation({
    label: "portable",
    installer: PORTABLE,
    fixture: portableFixture,
    portable: true,
    root,
  });

  console.log(MARKER);
  console.log("materialized_release_durable=true");
  console.log("materialize_parent_durable=true");
  console.log("release_root_mode_bound=true");
  console.log("current_pointer_mutated=false");
  console.log("previous_pointer_mutated=false");
  console.log("stable_manager_published=false");
  console.log("command_symlink_published=false");
  console.log("config_state_mutated=false");
  console.log("service_unit_written=false");
  console.log("service_action_performed=false");
  console.log("retention_pruned=false");
  console.log("runtime_activation=false");
  console.log("money_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
