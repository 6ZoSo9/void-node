#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_AUTHORITY_V2,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V2,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_EXPECTED_FILES_V2,
  buildVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2,
  canonicalLegacyHistoryNimoRuntimeBundleJsonV1,
  parseLegacyHistoryNimoRuntimeImportsV1,
  testOnlyCompileReviewedRuntimeWithBoundCompilerV2,
  testOnlyLegacyHistoryNimoCompilerIdentityV2,
  verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2,
} from "../tools/void-buy-legacy-request-history-nimo-runtime-bundle-candidate-v2.mjs";

const candidate =
  buildVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2();

assert.equal(
  candidate.marker,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V2,
);
assert.match(candidate.candidate_id, /^voidblrhnrb2_[0-9a-f]{64}$/u);
assert.equal(candidate.version, 2);
assert.equal(
  candidate.parent_plan.exact_parent_head,
  "a89523ac7f6e6d013a86054e998fcb51f051ec51",
);
assert.equal(
  candidate.parent_plan.git_blob_sha1,
  "3d41834140eaaca46fb9f5a771278bed49384c65",
);
assert.match(candidate.parent_plan.plan_id, /^voidblrhnip1_[0-9a-f]{64}$/u);
assert.equal(
  candidate.entrypoint,
  "tools/void-buy-legacy-request-history-nimo-forced-command-v1.mjs",
);
assert.equal(
  candidate.planned_handler_root,
  "/usr/local/libexec/void-legacy-history-witness-v1/void",
);
assert.equal(
  candidate.planned_handler_path,
  "/usr/local/libexec/void-legacy-history-witness-v1/void/void-buy-legacy-request-history-nimo-forced-command-v1.mjs",
);
assert.deepEqual(
  candidate.runtime_files.map((record) => record.path).sort(),
  [...VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_EXPECTED_FILES_V2].sort(),
);
assert.equal(candidate.runtime_files.length, 14);
assert.equal(
  candidate.runtime_files.filter(
    (record) => record.runtime_kind === "compiled_typescript",
  ).length,
  9,
);
assert.equal(
  candidate.runtime_files.filter(
    (record) => record.runtime_kind === "tracked_source",
  ).length,
  5,
);
assert.equal(candidate.parent_source_inputs.length, 19);
assert.deepEqual(candidate.third_party_runtime_packages, []);
assert.deepEqual(candidate.node_modules_runtime_files, []);
assert.ok(
  candidate.external_node_builtins.length > 0 &&
    candidate.external_node_builtins.every((value) => value.startsWith("node:")),
);
assert.equal(candidate.compiler.typescript_version, "5.9.3");
assert.deepEqual(
  candidate.compiler.compiler_files.map((record) => record.path),
  [
    "node_modules/typescript/bin/tsc",
    "node_modules/typescript/lib/tsc.js",
    "node_modules/typescript/lib/_tsc.js",
    "node_modules/typescript/lib/typescript.js",
  ],
);
assert.deepEqual(candidate.compiler.cli_edges, [
  {
    kind: "file",
    from: "node_modules/typescript/bin/tsc",
    specifier: "../lib/tsc.js",
    to: "node_modules/typescript/lib/tsc.js",
  },
  {
    kind: "node_builtin",
    from: "node_modules/typescript/lib/tsc.js",
    specifier: "node:module",
    to: "node:module",
  },
  {
    kind: "file",
    from: "node_modules/typescript/lib/tsc.js",
    specifier: "./_tsc.js",
    to: "node_modules/typescript/lib/_tsc.js",
  },
]);
assert.deepEqual(
  testOnlyLegacyHistoryNimoCompilerIdentityV2(),
  candidate.compiler,
);

assert.deepEqual(candidate.compiler_snapshot.compiler, candidate.compiler);
assert.match(
  candidate.compiler_snapshot.snapshot_id,
  /^voidblrhntscsnap2_[0-9a-f]{64}$/u,
);
assert.equal(
  candidate.compiler_snapshot.layout,
  "typescript_cli_four_file_relative_v1",
);
assert.equal(candidate.compiler_snapshot.fixed_parent, "/tmp");
assert.equal(
  candidate.compiler_snapshot.fixed_parent_root_owned_sticky_required,
  true,
);
assert.equal(candidate.compiler_snapshot.private_parent_mode, "0555");
assert.equal(candidate.compiler_snapshot.directory_mode, "0555");
assert.equal(candidate.compiler_snapshot.file_mode, "0444");
assert.equal(candidate.compiler_snapshot.custody_uid, 0);
assert.equal(candidate.compiler_snapshot.custody_gid, 0);
assert.equal(candidate.compiler_snapshot.builder_uid_direct_mutation_denied, true);
assert.match(candidate.compiler_snapshot.package_lock_integrity, /^sha512-/u);
assert.ok(candidate.compiler_snapshot.package_file_count > 4);
assert.ok(candidate.compiler_snapshot.package_total_bytes > 0);
assert.match(candidate.compiler_snapshot.package_tree_sha256, /^[0-9a-f]{64}$/u);
assert.equal(candidate.compiler_snapshot.nonwritable_during_build, true);
assert.equal(
  candidate.compiler_snapshot.source_compiler_identity_revalidated_after_build,
  true,
);
assert.equal(
  candidate.compiler_snapshot.snapshot_identity_revalidated_after_build,
  true,
);

{
  const fixture = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-legacy-history-nimo-tsc-v2-"),
  );
  const compilerPaths = [
    "package-lock.json",
    "node_modules/typescript/package.json",
    ...candidate.compiler.compiler_files.map((record) => record.path),
  ];
  try {
    for (const relative of compilerPaths) {
      const source = path.resolve(relative);
      const target = path.join(fixture, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }

    assert.deepEqual(
      testOnlyLegacyHistoryNimoCompilerIdentityV2(fixture),
      candidate.compiler,
    );

    const binTsc = path.join(
      fixture,
      "node_modules/typescript/bin/tsc",
    );
    const binOriginal = fs.readFileSync(binTsc, "utf8");
    fs.writeFileSync(binTsc, binOriginal + "\n// v2-cli-byte-tamper\n", "utf8");
    assert.throws(
      () => testOnlyLegacyHistoryNimoCompilerIdentityV2(fixture),
      /legacy_history_nimo_bundle_typescript_compiler_file_identity_mismatch/u,
    );
    fs.writeFileSync(binTsc, binOriginal, "utf8");

    const badBin = binOriginal.replace(
      "../lib/tsc.js",
      "../lib/not-tsc.js",
    );
    assert.notEqual(badBin, binOriginal);
    fs.writeFileSync(binTsc, badBin, "utf8");
    assert.throws(
      () => testOnlyLegacyHistoryNimoCompilerIdentityV2(fixture),
      /legacy_history_nimo_bundle_typescript_compiler_file_identity_mismatch/u,
    );
    fs.writeFileSync(binTsc, binOriginal, "utf8");

    const libTsc = path.join(
      fixture,
      "node_modules/typescript/lib/tsc.js",
    );
    const loaderOriginal = fs.readFileSync(libTsc, "utf8");
    fs.writeFileSync(
      libTsc,
      loaderOriginal + "\n// v2-loader-byte-tamper\n",
      "utf8",
    );
    assert.throws(
      () => testOnlyLegacyHistoryNimoCompilerIdentityV2(fixture),
      /legacy_history_nimo_bundle_typescript_compiler_file_identity_mismatch/u,
    );
    fs.writeFileSync(libTsc, loaderOriginal, "utf8");

    const badLoader = loaderOriginal.replace(
      "./_tsc.js",
      "./not-_tsc.js",
    );
    assert.notEqual(badLoader, loaderOriginal);
    fs.writeFileSync(libTsc, badLoader, "utf8");
    assert.throws(
      () => testOnlyLegacyHistoryNimoCompilerIdentityV2(fixture),
      /legacy_history_nimo_bundle_typescript_compiler_file_identity_mismatch/u,
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}
{
  const fixture = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-legacy-history-nimo-tsc-aba-v2-"),
  );
  const binRelative = "node_modules/typescript/bin/tsc";
  const binTarget = path.join(fixture, binRelative);
  let binOriginal = null;
  let observedSnapshotRoot = null;
  try {
    fs.copyFileSync(
      path.resolve("package-lock.json"),
      path.join(fixture, "package-lock.json"),
    );
    fs.mkdirSync(path.join(fixture, "node_modules"), { recursive: true });
    fs.cpSync(
      path.resolve("node_modules/typescript"),
      path.join(fixture, "node_modules/typescript"),
      { recursive: true },
    );
    fs.mkdirSync(path.join(fixture, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(fixture, "src/probe.ts"),
      'export const compilerSnapshotProbe = "green";\n',
      "utf8",
    );
    fs.writeFileSync(
      path.join(fixture, "tsconfig.build.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "CommonJS",
          outDir: "dist",
          rootDir: "src",
          sourceMap: false,
          declaration: false,
        },
        include: ["src/**/*.ts"],
      }) + "\n",
      "utf8",
    );

    binOriginal = fs.readFileSync(binTarget);
    const probePath = path.join(fixture, "src/probe.ts");
    const configPath = path.join(fixture, "tsconfig.build.json");
    const probeOriginal = fs.readFileSync(probePath);
    const configOriginal = fs.readFileSync(configPath);
    const fixtureBuildInputProfile = Object.freeze({
      project_files: Object.freeze([
        Object.freeze({path:"src/probe.ts",git_blob_sha1:gitBlob(probeOriginal)}),
        Object.freeze({path:"tsconfig.build.json",git_blob_sha1:gitBlob(configOriginal)}),
      ]),
      compile_files: Object.freeze(["src/probe.ts"]),
      package_roots: Object.freeze([]),
      types: Object.freeze([]),
    });
    let observedBuildInputSnapshotRoot = null;
    const compiled =
      testOnlyCompileReviewedRuntimeWithBoundCompilerV2(fixture, {
        after_snapshot_before_build({
          snapshot_root, compiler_snapshot,
          build_input_snapshot_root, build_input_snapshot,
        }) {
          observedSnapshotRoot = snapshot_root;
          observedBuildInputSnapshotRoot = build_input_snapshot_root;
          assert.match(build_input_snapshot.snapshot_id, /^voidblrhnbsnap2_[0-9a-f]{64}$/u);
          assert.equal(
            compiler_snapshot.snapshot_id,
            candidate.compiler_snapshot.snapshot_id,
          );
          const snapshotEntry = path.join(snapshot_root, binRelative);
          const snapshotRootStat = fs.lstatSync(snapshot_root);
          const snapshotEntryStat = fs.lstatSync(snapshotEntry);
          assert.equal(snapshotRootStat.uid, 0);
          assert.equal(snapshotRootStat.gid, 0);
          assert.equal(snapshotRootStat.mode & 0o7777, 0o555);
          assert.equal(snapshotEntryStat.uid, 0);
          assert.equal(snapshotEntryStat.gid, 0);
          assert.equal(snapshotEntryStat.mode & 0o7777, 0o444);
          for (const mutate of [
            () => fs.chmodSync(snapshotEntry, 0o600),
            () => fs.appendFileSync(snapshotEntry, "\n// forbidden\n"),
            () => fs.unlinkSync(snapshotEntry),
          ]) {
            assert.throws(
              mutate,
              (error) =>
                error?.code === "EACCES" ||
                error?.code === "EPERM" ||
                error?.code === "EROFS",
            );
          }
          for (const snapshotEntry of [
            path.join(build_input_snapshot_root, "src/probe.ts"),
            path.join(build_input_snapshot_root, "tsconfig.build.json"),
          ]) {
            const st = fs.lstatSync(snapshotEntry);
            assert.equal(st.uid, 0);
            assert.equal(st.gid, 0);
            assert.equal(st.mode & 0o7777, 0o444);
            for (const mutate of [
              () => fs.chmodSync(snapshotEntry, 0o600),
              () => fs.appendFileSync(snapshotEntry, "\n// forbidden\n"),
              () => fs.unlinkSync(snapshotEntry),
            ]) {
              assert.throws(
                mutate,
                (error) =>
                  error?.code === "EACCES" ||
                  error?.code === "EPERM" ||
                  error?.code === "EROFS",
              );
            }
          }
          fs.writeFileSync(
            binTarget,
            '#!/usr/bin/env node\nthrow new Error("checkout compiler ABA executed");\n',
            "utf8",
          );
          fs.writeFileSync(probePath,'export const compilerSnapshotProbe = "red";\n',"utf8");
          fs.writeFileSync(configPath,JSON.stringify({
            compilerOptions:{
              target:"ES2022",module:"CommonJS",outDir:"dist",rootDir:"src",noEmit:true,
            },
            include:["src/**/*.ts"],
          })+"\n","utf8");
        },
        after_build_before_revalidation() {
          assert.equal(fs.existsSync(path.join(fixture, "dist/probe.js")),true);
          const emitted=fs.readFileSync(path.join(fixture,"dist/probe.js"),"utf8");
          assert.match(emitted,/green/u);
          assert.doesNotMatch(emitted,/red/u);
          fs.writeFileSync(binTarget, binOriginal);
          fs.writeFileSync(probePath, probeOriginal);
          fs.writeFileSync(configPath, configOriginal);
        },
      }, fixtureBuildInputProfile);

    assert.ok(observedSnapshotRoot);
    assert.ok(observedBuildInputSnapshotRoot);
    assert.deepEqual(compiled.compiler, candidate.compiler);
    assert.deepEqual(
      compiled.compiler_snapshot,
      candidate.compiler_snapshot,
    );
    assert.deepEqual(
      testOnlyLegacyHistoryNimoCompilerIdentityV2(fixture),
      candidate.compiler,
    );
    assert.match(compiled.build_input_snapshot.snapshot_id,/^voidblrhnbsnap2_[0-9a-f]{64}$/u);
    assert.equal(fs.existsSync(observedSnapshotRoot), false);
    assert.equal(fs.existsSync(observedBuildInputSnapshotRoot), false);
  } finally {
    if (binOriginal && fs.existsSync(binTarget)) {
      fs.writeFileSync(binTarget, binOriginal);
    }
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

assert.equal(
  candidate.build_recipe.dependency_install,
  "npm ci --ignore-scripts --no-audit --no-fund",
);
assert.equal(
  candidate.build_recipe.compile,
  "node <private-compiler-snapshot>/node_modules/typescript/bin/tsc -p <root-custodied-build-input-snapshot>/tsconfig.nimo-runtime-bundle-snapshot-v2.json --outDir <candidate-dist>",
);
assert.equal(
  candidate.build_recipe.compile_node_executable_source,
  "process.execPath",
);
assert.deepEqual(candidate.build_recipe.compile_environment, {
  PATH: "/usr/bin:/bin",
  LANG: "C",
  LC_ALL: "C",
  TZ: "UTC",
  NODE_DISABLE_COMPILE_CACHE: "1",
});
assert.equal(candidate.build_recipe.candidate_owned_rebuild_required, true);
assert.equal(candidate.build_recipe.compiler_pre_post_identity_required, true);
assert.equal(candidate.build_recipe.compiler_snapshot_required, true);
assert.equal(candidate.build_recipe.compiler_snapshot_nonwritable_required, true);
assert.equal(candidate.build_recipe.compiler_snapshot_root_custody_required, true);
assert.equal(
  candidate.build_recipe.compiler_snapshot_builder_uid_direct_mutation_denied_required,
  true,
);
assert.equal(candidate.build_recipe.compiler_source_post_revalidation_required, true);
assert.equal(candidate.build_recipe.compiler_snapshot_post_revalidation_required, true);
assert.equal(candidate.build_recipe.build_input_snapshot_required, true);
assert.equal(candidate.build_recipe.build_input_snapshot_root_custody_required, true);
assert.equal(candidate.build_recipe.build_input_snapshot_builder_uid_direct_mutation_denied_required, true);
assert.equal(candidate.build_recipe.build_input_snapshot_post_revalidation_required, true);
assert.match(candidate.build_input_snapshot.snapshot_id,/^voidblrhnbsnap2_[0-9a-f]{64}$/u);
assert.equal(candidate.build_input_snapshot.project_files.length,18);
assert.equal(candidate.build_input_snapshot.compile_files.length,15);
assert.deepEqual(candidate.build_input_snapshot.compiler_types,["node"]);
assert.equal(candidate.build_input_snapshot.package_roots.length,2);
assert.equal(candidate.build_recipe.source_maps_expected, false);
assert.deepEqual(candidate.build_recipe.supported_node_majors, [22, 24, 26]);
assert.equal(candidate.build_recipe.three_node_byte_equality_required, true);
assert.equal(candidate.runtime_bundle_candidate_accepted, false);
assert.equal(candidate.runtime_bundle_lock_created, false);
assert.equal(candidate.protected_runtime_install_authorized, false);
assert.equal(candidate.live_nimo_installed, false);
assert.equal(candidate.authorized_keys_mutation_authorized, false);
assert.equal(candidate.public_key_selected, false);
assert.equal(candidate.external_transport_authenticated, false);
assert.equal(candidate.witness_read_performed, false);
assert.equal(candidate.witness_append_performed, false);
assert.equal(candidate.sovereign_signing, false);
assert.equal(candidate.payment_acceptance, false);
assert.equal(candidate.public_presale_activation, false);
assert.equal(candidate.wc_void_market_activation, false);
assert.equal(candidate.funds_movement, false);
assert.equal(
  candidate.next_gate,
  "void_buy_void_legacy_history_nimo_runtime_bundle_lock_v2",
);
assert.equal(
  verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(candidate),
  true,
);

assert.deepEqual(
  parseLegacyHistoryNimoRuntimeImportsV1(
    [
      'import crypto from "node:crypto";',
      'import { x } from "./a.js";',
      'import "./b.mjs";',
      'export { y } from "./c.js";',
    ].join("\n"),
  ),
  ["./a.js", "./b.mjs", "./c.js", "node:crypto"],
);
assert.throws(
  () =>
    parseLegacyHistoryNimoRuntimeImportsV1(
      'const value = import("./dynamic.js");',
    ),
  /legacy_history_nimo_bundle_dynamic_loader_forbidden/u,
);
assert.throws(
  () =>
    parseLegacyHistoryNimoRuntimeImportsV1(
      'const value = require("./dynamic.cjs");',
    ),
  /legacy_history_nimo_bundle_dynamic_loader_forbidden/u,
);

{
  const tampered = structuredClone(candidate);
  tampered.runtime_files[0].sha256 = "0".repeat(64);
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(tampered),
    /legacy_history_nimo_bundle_candidate_id_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  tampered.authority.live_nimo_installed = true;
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(tampered),
    /legacy_history_nimo_bundle_candidate_id_invalid/u,
  );
}

for (const [key, expected] of Object.entries({
  source_candidate_only: true,
  exact_parent_plan_bound: true,
  parent_reviewed_source_generation_bound: true,
  runtime_entrypoint_bound: true,
  package_free_runtime_required: true,
  complete_transitive_runtime_closure_bound: true,
  compiled_runtime_closure_bound: true,
  compiler_identity_bound: true,
  compiler_cli_entry_chain_bound: true,
  compiler_cli_loader_edges_bound: true,
  compiler_exact_file_identity_allowlist_bound: true,
  compiler_execution_generation_bound: true,
  compiler_private_snapshot_required: true,
  compiler_snapshot_content_addressed: true,
  compiler_package_snapshot_bound: true,
  compiler_snapshot_nonwritable_during_build: true,
  compiler_snapshot_root_custody_required: true,
  compiler_snapshot_builder_uid_direct_mutation_denied: true,
  compiler_source_post_revalidation_required: true,
  compiler_snapshot_post_revalidation_required: true,
  build_input_private_snapshot_required: true,
  build_input_snapshot_content_addressed: true,
  build_input_snapshot_root_custody_required: true,
  build_input_snapshot_builder_uid_direct_mutation_denied: true,
  build_input_snapshot_post_revalidation_required: true,
  build_input_source_generation_bound: true,
  build_input_tsconfig_generation_bound: true,
  build_input_type_packages_bound: true,
  candidate_owned_rebuild_required: true,
  three_node_byte_equality_required: true,
  candidate_report_filesystem_write: true,
  candidate_build_artifact_filesystem_write: true,
  runtime_bundle_candidate_accepted: false,
  runtime_bundle_lock_created: false,
  protected_runtime_install_authorized: false,
  live_nimo_installed: false,
  authorized_keys_mutation_authorized: false,
  public_key_selected: false,
  private_key_access: false,
  witness_read_performed: false,
  witness_append_performed: false,
  sovereign_signing: false,
  payment_acceptance: false,
  transaction: false,
  public_presale_activation: false,
  wc_void_market_activation: false,
  funds_movement: false,
})) {
  assert.equal(
    VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_AUTHORITY_V2[key],
    expected,
    key,
  );
}

function rehashCandidate(value) {
  const clone = structuredClone(value);
  const { candidate_id: _ignored, ...body } = clone;
  clone.candidate_id =
    "voidblrhnrb2_" +
    crypto
      .createHash("sha256")
      .update(
        Buffer.from(
          canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body) + "\n",
          "utf8",
        ),
      )
      .digest("hex");
  return clone;
}

{
  const tampered = structuredClone(candidate);
  const compiled = tampered.runtime_files.find(
    (record) => record.runtime_kind === "compiled_typescript",
  );
  assert.ok(compiled);
  compiled.sha256 = "0".repeat(64);
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_runtime_bytes_identity_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  assert.equal(
    tampered.compiler.compiler_files[0].path,
    "node_modules/typescript/bin/tsc",
  );
  tampered.compiler.compiler_files[0].sha256 = "0".repeat(64);
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_compiler_snapshot_identity_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  tampered.compiler_snapshot.snapshot_id =
    "voidblrhntscsnap2_" + "0".repeat(64);
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_compiler_snapshot_identity_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  tampered.compiler_snapshot.custody_uid = 1000;
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_compiler_snapshot_identity_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  assert.equal(
    tampered.compiler.compiler_files[1].path,
    "node_modules/typescript/lib/tsc.js",
  );
  tampered.compiler.compiler_files[1].sha256 = "f".repeat(64);
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_compiler_snapshot_identity_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  tampered.compiler.cli_edges[0].to =
    "node_modules/typescript/lib/not-tsc.js";
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_compiler_file_identity_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  tampered.build_recipe.post_compile = "node unreviewed-helper.mjs";
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_build_recipe_shape_invalid/u,
  );
}

{
  const tampered = structuredClone(candidate);
  const tracked = tampered.runtime_files.find(
    (record) => record.runtime_kind === "tracked_source",
  );
  tracked.runtime_kind = "compiled_typescript";
  tracked.tracked_source_git_blob_sha1 = null;
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_runtime_kind_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  tampered.external_node_builtins.push("fs");
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_node_builtin_set_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  tampered.compiler.compiler_files[0].path =
    "node_modules/typescript/lib/not-the-compiler.js";
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_compiler_file_identity_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  tampered.planned_handler_path += ".wrong";
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_planned_layout_invalid/u,
  );
}
{
  const tampered = structuredClone(candidate);
  tampered.public_key_selected = true;
  assert.throws(
    () =>
      verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
        rehashCandidate(tampered),
      ),
    /legacy_history_nimo_bundle_candidate_identity_invalid/u,
  );
}

const canonical = canonicalLegacyHistoryNimoRuntimeBundleJsonV1(candidate);
assert.equal(
  canonical,
  canonicalLegacyHistoryNimoRuntimeBundleJsonV1(JSON.parse(canonical)),
);

console.log(
  "VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V2_PROOF_GREEN",
);
console.log("runtime_file_count=14");
console.log("compiled_runtime_file_count=9");
console.log("tracked_runtime_source_file_count=5");
console.log("parent_source_input_count=19");
console.log("typescript_version=5.9.3");
console.log("compiler_file_count=4");
console.log("typescript_cli_entry_bound=true");
console.log("typescript_cli_loader_bound=true");
console.log("compiler_cli_edges_exact=true");
console.log("typescript_compile_cache_builtin_bound=true");
console.log("typescript_compiler_exact_file_allowlist_bound=true");
console.log("candidate_owned_compiler_rebuild=true");
console.log("compiler_pre_post_identity_stable=true");
console.log("compiler_private_snapshot_bound=true");
console.log("compiler_package_snapshot_bound=true");
console.log("compiler_snapshot_nonwritable=true");
console.log("compiler_snapshot_root_custody=true");
console.log("compiler_snapshot_builder_uid_direct_mutation_denied=true");
console.log("compiler_snapshot_chmod_substitute_restore_rejected=true");
console.log("compiler_snapshot_post_revalidated=true");
console.log("compiler_aba_checkout_mutation_isolated=true");
console.log("build_input_snapshot_bound=true");
console.log("build_input_snapshot_root_custody=true");
console.log("build_input_snapshot_builder_uid_direct_mutation_denied=true");
console.log("build_input_snapshot_post_revalidated=true");
console.log("build_input_source_aba_isolated=true");
console.log("build_input_tsconfig_aba_isolated=true");
console.log("compiler_closed_environment=true");
console.log("typescript_cli_entry_fixture_tamper_rejected=true");
console.log("typescript_cli_loader_fixture_tamper_rejected=true");
console.log("typescript_cli_edge_fixture_tamper_rejected=true");
console.log("third_party_runtime_packages=0");
console.log("node_modules_runtime_files=0");
console.log("rehashed_runtime_bytes_tamper_rejected=true");
console.log("rehashed_compiler_bytes_tamper_rejected=true");
console.log("rehashed_compiler_snapshot_tamper_rejected=true");
console.log("rehashed_cli_entry_tamper_rejected=true");
console.log("rehashed_cli_loader_tamper_rejected=true");
console.log("rehashed_cli_edge_tamper_rejected=true");
console.log("rehashed_build_recipe_extra_field_rejected=true");
console.log("rehashed_runtime_kind_tamper_rejected=true");
console.log("rehashed_builtin_set_tamper_rejected=true");
console.log("rehashed_compiler_identity_tamper_rejected=true");
console.log("rehashed_planned_layout_tamper_rejected=true");
console.log("rehashed_authority_tamper_rejected=true");
console.log("runtime_bundle_candidate_accepted=false");
console.log("runtime_bundle_lock_created=false");
console.log("protected_runtime_install_authorized=false");
console.log("live_nimo_installed=false");
console.log("authorized_keys_mutation_authorized=false");
console.log("external_transport_authenticated=false");
console.log("witness_read_performed=false");
console.log("witness_append_performed=false");
console.log("sovereign_signing=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
