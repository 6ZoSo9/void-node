#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER =
  "VOID_PUBLIC_CHECKPOINT_NAMED_TUNNEL_PACKET_V1_PROOF_GREEN";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE_BUILDER = path.join(
  ROOT,
  "scripts",
  "build_void_public_seed_named_tunnel_packet_v1.mjs",
);
const BUILDER = path.join(
  ROOT,
  "scripts",
  "build_void_public_checkpoint_named_tunnel_packet_v1.mjs",
);
const VERIFIER = path.join(
  ROOT,
  "scripts",
  "verify_void_public_checkpoint_named_tunnel_packet_v1.mjs",
);
const COMPAT_COMPOSER = path.join(
  ROOT,
  "scripts",
  "compose_void_public_checkpoint_environment_compat_packet_v1.mjs",
);
const COMPAT_RENDERER = path.join(
  ROOT,
  "scripts",
  "render_void_public_checkpoint_environment_compat_dropin_v1.mjs",
);
const NEW_BUILDER_PATH =
  "scripts/build_void_public_checkpoint_named_tunnel_packet_v1.mjs";
const NEW_VERIFIER_PATH =
  "scripts/verify_void_public_checkpoint_named_tunnel_packet_v1.mjs";
const NEW_PROOF_PATH =
  "scripts/prove_void_public_checkpoint_named_tunnel_packet_v1.mjs";
const COMPAT_COMPOSER_PATH =
  "scripts/compose_void_public_checkpoint_environment_compat_packet_v1.mjs";
const COMPAT_RENDERER_PATH =
  "scripts/render_void_public_checkpoint_environment_compat_dropin_v1.mjs";
const COMPAT_PROOF_PATH =
  "scripts/prove_void_public_checkpoint_environment_compat_v1.mjs";

function run(command, args, { cwd, expect = 0 } = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== expect) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(
      `${command} ${args.join(" ")} returned ${result.status}; expected ${expect}`,
    );
  }
  return {
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  };
}

function write(file, content, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, content, { encoding: "utf8", mode });
  fs.chmodSync(file, mode);
}

function canonicalize(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
}

function baseArgs({
  repo,
  head,
  credentials,
  cloudflared,
  output,
}) {
  return [
    "--hostname",
    "seed.example.org",
    "--tunnel-id",
    "6ff42ae2-765d-4adf-8112-31c55c1551ef",
    "--credentials-file",
    credentials,
    "--repo-root",
    repo,
    "--expected-head",
    head,
    "--cloudflared",
    cloudflared,
    "--output",
    output,
  ];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-checkpoint-named-tunnel-proof-"),
);
const repo = path.join(temporary, "repo");
const secrets = path.join(temporary, "secrets");
const credentials = path.join(
  secrets,
  "6ff42ae2-765d-4adf-8112-31c55c1551ef.json",
);
const cloudflared = path.join(temporary, "cloudflared");
const checkpointPacket = path.join(temporary, "checkpoint-packet");
const boundPacket = path.join(temporary, "bound-packet");
const ordinaryPacket = path.join(temporary, "ordinary-packet");
const cleanEnvironmentDropin = path.join(
  temporary,
  "90-void-nullfeed-clean-environment.conf",
);
const compatPacket = path.join(temporary, "compat-packet");
const renderedCompatDropin = path.join(
  temporary,
  "99-void-public-seed-checkpoint-environment.conf",
);
const ordinaryRenderedCompat = path.join(
  temporary,
  "ordinary-checkpoint-environment.conf",
);

try {
  fs.mkdirSync(repo, { recursive: true, mode: 0o700 });
  fs.mkdirSync(secrets, { recursive: true, mode: 0o700 });
  fs.mkdirSync(checkpointPacket, { recursive: true, mode: 0o700 });

  write(
    path.join(repo, "tools", "void-public-seed-gateway-v1.mjs"),
    '#!/usr/bin/env node\nconsole.log("fixture gateway");\n',
    0o700,
  );

  const preflightFixture = `#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const get = (name) => {
  const i = args.indexOf(name);
  if (i < 0 || !args[i + 1]) throw new Error("missing " + name);
  return args[i + 1];
};
const packet = path.resolve(get("--packet"));
const expectedSource = get("--expected-source-sha");
const receipt = path.resolve(get("--receipt"));
const manifestBytes = fs.readFileSync(path.join(packet, "checkpoint.json"));
const manifest = JSON.parse(manifestBytes.toString("utf8"));
if (manifest.source_sha !== expectedSource) throw new Error("source mismatch");
const sha = crypto.createHash("sha256").update(manifestBytes).digest("hex");
const body = {
  schema: "void_public_checkpoint_publication_preflight_v1",
  status: "green",
  packet_root: packet,
  checkpoint_id: manifest.checkpoint_id,
  manifest_sha256: sha,
  source_sha: manifest.source_sha,
  head: manifest.head,
  block_count: manifest.block_count,
  segment_count: manifest.segment_count,
  payload_bytes: manifest.payload_bytes,
  restart_authority: {
    acceptance_id: "voidm0accept1_" + "1".repeat(64),
    source_authority_id: "voidm0auth1_" + "2".repeat(64),
    prefix_root: "3".repeat(64),
    checkpoint_descriptor_sha256: sha,
    frozen_head: manifest.head,
    block_count: manifest.block_count,
    segment_count: manifest.segment_count,
    total_prefix_bytes: manifest.payload_bytes
  },
  gateway_env: {
    VOID_PUBLIC_SEED_CHECKPOINT_ROOT: packet,
    VOID_PUBLIC_SEED_CHECKPOINT_ID: manifest.checkpoint_id,
    VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256: sha
  },
  authority: {
    publication_authority: false,
    gateway_start_authority: false,
    deployment_authority: false,
    runtime_service_authority: false,
    wallet_or_funds_authority: false
  }
};
fs.writeFileSync(receipt, JSON.stringify(body) + "\\n", {
  flag: "wx",
  mode: 0o600
});
console.log("VOID_PUBLIC_CHECKPOINT_PUBLICATION_PREFLIGHT_V1_GREEN");
`;
  write(
    path.join(
      repo,
      "tools",
      "void-public-checkpoint-publication-preflight-v1.mjs",
    ),
    preflightFixture,
    0o700,
  );

  write(
    cloudflared,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'if test "${1:-}" = "--version"; then',
      '  echo "cloudflared version 2026.7.3 (fixture)"',
      "  exit 0",
      "fi",
      'case " $* " in',
      '  *" tunnel ingress validate "*) exit 0 ;;',
      "esac",
      'echo "unexpected fixture cloudflared arguments: $*" >&2',
      "exit 2",
      "",
    ].join("\n"),
    0o700,
  );
  write(
    credentials,
    '{"AccountTag":"fixture","TunnelSecret":"not-real","TunnelID":"fixture"}\n',
    0o600,
  );

  const manifest = {
    schema: "void_public_canonical_checkpoint_v1",
    source_sha: "5".repeat(40),
    checkpoint_id: "voidpbc1_" + "a".repeat(64),
    head: 1951058,
    block_count: 1951059,
    segment_count: 196,
    payload_bytes: 452333282,
  };
  write(
    path.join(checkpointPacket, "checkpoint.json"),
    `${JSON.stringify(manifest)}\n`,
    0o600,
  );

  run("git", ["init", "-q", repo]);
  run("git", ["-C", repo, "config", "user.email", "proof@example.invalid"]);
  run("git", ["-C", repo, "config", "user.name", "VOID Proof"]);
  run("git", ["-C", repo, "add", "tools"]);
  run("git", ["-C", repo, "commit", "-qm", "fixture"]);
  const head = run("git", ["-C", repo, "rev-parse", "HEAD"]).stdout.trim();

  const built = run(
    process.execPath,
    [
      BUILDER,
      ...baseArgs({
        repo,
        head,
        credentials,
        cloudflared,
        output: boundPacket,
      }),
      "--checkpoint-packet",
      checkpointPacket,
    ],
  );
  assert.match(
    built.stdout,
    /VOID_PUBLIC_CHECKPOINT_NAMED_TUNNEL_PACKET_BUILDER_V1_GREEN/,
  );
  assert.match(built.stdout, /checkpoint_preflight_authority_bound=true/);
  assert.match(built.stdout, /gateway_three_pin_tuple_embedded=true/);
  assert.match(built.stdout, /services_started=false/);

  const verified = run(process.execPath, [
    VERIFIER,
    "--packet",
    boundPacket,
  ]);
  assert.match(
    verified.stdout,
    /VOID_PUBLIC_CHECKPOINT_NAMED_TUNNEL_PACKET_VERIFIER_V1_GREEN/,
  );
  assert.match(verified.stdout, /checkpoint_publication_configured=true/);
  assert.match(verified.stdout, /gateway_three_pin_tuple_exact=true/);

  const packet = JSON.parse(
    fs.readFileSync(path.join(boundPacket, "packet.json"), "utf8"),
  );
  const gatewayUnitPath = path.join(
    boundPacket,
    "void-public-seed-gateway-v1.service",
  );
  const gatewayUnit = fs.readFileSync(gatewayUnitPath, "utf8");
  assert.match(
    gatewayUnit,
    new RegExp(
      `Environment=VOID_PUBLIC_SEED_CHECKPOINT_ROOT=${escapeRegExp(
        checkpointPacket,
      )}`,
    ),
  );
  assert.match(
    gatewayUnit,
    new RegExp(
      `Environment=VOID_PUBLIC_SEED_CHECKPOINT_ID=${manifest.checkpoint_id}`,
    ),
  );
  assert.match(
    gatewayUnit,
    new RegExp(
      `Environment=VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256=${
        packet.checkpoint_publication.manifest_sha256
      }`,
    ),
  );
  assert.equal(
    packet.checkpoint_publication.packet_root,
    checkpointPacket,
  );
  assert.equal(
    packet.checkpoint_publication.checkpoint_id,
    manifest.checkpoint_id,
  );
  assert.equal(
    packet.checkpoint_publication.source_sha,
    manifest.source_sha,
  );
  console.log("[PASS] checkpoint preflight composed into three gateway pins");

  const nonCheckpointUnsetNames = Array.from(
    { length: 21 },
    (_unused, index) =>
      `VOID_TEST_CLEAN_${String(index + 1).padStart(2, "0")}`,
  );
  const checkpointUnsetNames = [
    "VOID_PUBLIC_SEED_CHECKPOINT_ROOT",
    "VOID_PUBLIC_SEED_CHECKPOINT_ID",
    "VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256",
  ];
  const cleanUnsetNames = [
    ...nonCheckpointUnsetNames,
    ...checkpointUnsetNames,
  ];
  const cleanDropinBody = [
    "[Service]",
    `UnsetEnvironment=${cleanUnsetNames.join(" ")}`,
    "",
  ].join("\n");
  write(cleanEnvironmentDropin, cleanDropinBody, 0o600);

  const composed = run(process.execPath, [
    COMPAT_COMPOSER,
    "--packet",
    boundPacket,
    "--clean-environment-dropin",
    cleanEnvironmentDropin,
    "--output",
    compatPacket,
  ]);
  assert.match(
    composed.stdout,
    /VOID_PUBLIC_CHECKPOINT_ENVIRONMENT_COMPAT_PACKET_COMPOSER_V1_GREEN/,
  );
  assert.match(composed.stdout, /original_unset_count=24/);
  assert.match(composed.stdout, /preserved_unset_count=21/);
  assert.match(composed.stdout, /released_checkpoint_count=3/);
  assert.match(composed.stdout, /packet_root_relocated=true/);
  assert.match(composed.stdout, /tunnel_config_path_relocated=true/);
  assert.match(composed.stdout, /install_command_paths_relocated=true/);
  assert.match(composed.stdout, /relocated_file_metadata_refreshed=true/);

  const relocatedTunnelUnit = fs.readFileSync(
    path.join(
      compatPacket,
      "void-public-seed-named-tunnel-v1.service",
    ),
    "utf8",
  );
  assert.equal(
    relocatedTunnelUnit.includes(boundPacket),
    false,
  );
  assert.equal(
    relocatedTunnelUnit.split(compatPacket).length - 1,
    1,
  );

  const relocatedInstall = fs.readFileSync(
    path.join(compatPacket, "INSTALL.txt"),
    "utf8",
  );
  assert.equal(relocatedInstall.includes(boundPacket), false);
  assert.equal(
    relocatedInstall.split(compatPacket).length - 1,
    2,
  );

  const sourceTunnelUnit = fs.readFileSync(
    path.join(
      boundPacket,
      "void-public-seed-named-tunnel-v1.service",
    ),
    "utf8",
  );
  const sourceInstall = fs.readFileSync(
    path.join(boundPacket, "INSTALL.txt"),
    "utf8",
  );
  assert.equal(sourceTunnelUnit.split(boundPacket).length - 1, 1);
  assert.equal(sourceInstall.split(boundPacket).length - 1, 2);
  console.log("[PASS] compatibility packet root relocation is exact and source packet remains unchanged");

  const compatVerified = run(process.execPath, [
    VERIFIER,
    "--packet",
    compatPacket,
  ]);
  assert.match(
    compatVerified.stdout,
    /checkpoint_environment_compat_configured=true/,
  );
  assert.match(
    compatVerified.stdout,
    /checkpoint_three_pin_unsets_released=true/,
  );
  assert.match(
    compatVerified.stdout,
    /unrelated_unset_names_preserved=true/,
  );

  const compatJson = JSON.parse(
    fs.readFileSync(path.join(compatPacket, "packet.json"), "utf8"),
  );
  assert.equal(
    compatJson.checkpoint_environment_compat.original_unset_count,
    24,
  );
  assert.equal(
    compatJson.checkpoint_environment_compat.preserved_unset_count,
    21,
  );
  assert.deepEqual(
    compatJson.checkpoint_environment_compat.released_checkpoint_names,
    checkpointUnsetNames,
  );
  assert.equal(
    Object.hasOwn(
      compatJson.checkpoint_environment_compat,
      "preserved_unset_names",
    ),
    false,
  );

  const rendered = run(process.execPath, [
    COMPAT_RENDERER,
    "--packet",
    compatPacket,
    "--output",
    renderedCompatDropin,
  ]);
  assert.match(
    rendered.stdout,
    /VOID_PUBLIC_CHECKPOINT_ENVIRONMENT_COMPAT_DROPIN_RENDERER_V1_GREEN/,
  );
  assert.match(
    rendered.stdout,
    /checkpoint_environment_compat_configured=true/,
  );
  assert.match(rendered.stdout, /preserved_unset_count=21/);
  assert.match(rendered.stdout, /released_checkpoint_count=3/);

  const renderedBody = fs.readFileSync(renderedCompatDropin, "utf8");
  assert.match(renderedBody, /\nUnsetEnvironment=\n/);
  assert.match(
    renderedBody,
    new RegExp(
      `UnsetEnvironment=${nonCheckpointUnsetNames.join(" ")}`,
    ),
  );
  for (const name of checkpointUnsetNames) {
    assert.doesNotMatch(renderedBody, new RegExp(escapeRegExp(name)));
  }

  write(
    cleanEnvironmentDropin,
    [
      "[Service]",
      `UnsetEnvironment=${cleanUnsetNames
        .filter((name) => name !== nonCheckpointUnsetNames[0])
        .join(" ")}`,
      "",
    ].join("\n"),
    0o600,
  );
  const sourceDrift = run(
    process.execPath,
    [VERIFIER, "--packet", compatPacket],
    { expect: 1 },
  );
  assert.match(
    sourceDrift.stderr,
    /differs from current source drop-in/,
  );
  write(cleanEnvironmentDropin, cleanDropinBody, 0o600);
  console.log(
    "[PASS] clean-environment compatibility preserves 21 unrelated unsets and releases only 3 checkpoint pins",
  );

  const ordinaryBuilt = run(
    process.execPath,
    [
      BASE_BUILDER,
      ...baseArgs({
        repo,
        head,
        credentials,
        cloudflared,
        output: ordinaryPacket,
      }),
    ],
  );
  assert.match(
    ordinaryBuilt.stdout,
    /VOID_PUBLIC_SEED_NAMED_TUNNEL_PACKET_BUILDER_V1_GREEN/,
  );
  const ordinaryVerified = run(process.execPath, [
    VERIFIER,
    "--packet",
    ordinaryPacket,
  ]);
  assert.match(
    ordinaryVerified.stdout,
    /checkpoint_publication_configured=false/,
  );
  assert.match(
    ordinaryVerified.stdout,
    /gateway_checkpoint_environment_present=false/,
  );
  console.log("[PASS] ordinary non-checkpoint packet compatibility");

  const ordinaryRender = run(process.execPath, [
    COMPAT_RENDERER,
    "--packet",
    ordinaryPacket,
    "--output",
    ordinaryRenderedCompat,
  ]);
  assert.match(
    ordinaryRender.stdout,
    /checkpoint_environment_compat_configured=false/,
  );
  assert.match(ordinaryRender.stdout, /output_created=false/);
  assert.equal(fs.existsSync(ordinaryRenderedCompat), false);
  console.log("[PASS] ordinary packet renders no compatibility override");

  const tamperedPacketPath = path.join(boundPacket, "packet.json");
  const tampered = JSON.parse(
    fs.readFileSync(tamperedPacketPath, "utf8"),
  );
  const wrongId = "voidpbc1_" + "0".repeat(64);
  tampered.checkpoint_publication.checkpoint_id = wrongId;
  tampered.checkpoint_publication.gateway_env
    .VOID_PUBLIC_SEED_CHECKPOINT_ID = wrongId;

  let tamperedUnit = fs.readFileSync(gatewayUnitPath, "utf8");
  tamperedUnit = tamperedUnit.replace(
    `Environment=VOID_PUBLIC_SEED_CHECKPOINT_ID=${manifest.checkpoint_id}`,
    `Environment=VOID_PUBLIC_SEED_CHECKPOINT_ID=${wrongId}`,
  );
  fs.writeFileSync(gatewayUnitPath, tamperedUnit, { mode: 0o600 });
  fs.chmodSync(gatewayUnitPath, 0o600);
  tampered.files["void-public-seed-gateway-v1.service"].bytes =
    fs.statSync(gatewayUnitPath).size;
  tampered.files["void-public-seed-gateway-v1.service"].sha256 =
    sha256File(gatewayUnitPath);
  delete tampered.packet_id;
  tampered.packet_id =
    `voidpsa1_${sha256Bytes(canonicalJson(tampered))}`;
  fs.writeFileSync(
    tamperedPacketPath,
    `${JSON.stringify(tampered, null, 2)}\n`,
    { mode: 0o600 },
  );
  fs.chmodSync(tamperedPacketPath, 0o600);

  const coherentTamper = run(
    process.execPath,
    [VERIFIER, "--packet", boundPacket],
    { expect: 1 },
  );
  assert.match(
    coherentTamper.stderr,
    /differs from fresh independent preflight/,
  );
  console.log("[PASS] coherent checkpoint binding substitution rejected");

  const installer = fs.readFileSync(
    path.join(
      ROOT,
      "ops/public/install_void_public_seed_named_tunnel_packet_v1.sh",
    ),
    "utf8",
  );
  assert.match(
    installer,
    /verify_void_public_checkpoint_named_tunnel_packet_v1\.mjs/,
  );
  assert.match(
    installer,
    /render_void_public_checkpoint_environment_compat_dropin_v1\.mjs/,
  );
  assert.match(
    installer,
    /99-void-public-seed-checkpoint-environment\.conf/,
  );
  assert.match(
    installer,
    /loaded gateway UnsetEnvironment removes checkpoint pins/,
  );

  const workflow = fs.readFileSync(
    path.join(
      ROOT,
      ".github/workflows/void-public-seed-stable-ingress-activation-v1.yml",
    ),
    "utf8",
  );
  for (const relative of [
    NEW_BUILDER_PATH,
    NEW_VERIFIER_PATH,
    NEW_PROOF_PATH,
    COMPAT_COMPOSER_PATH,
    COMPAT_RENDERER_PATH,
    COMPAT_PROOF_PATH,
  ]) {
    assert.match(workflow, new RegExp(escapeRegExp(relative)));
  }
  assert.match(
    workflow,
    /Prove checkpoint-bound stable-ingress packet/,
  );

  const documentation = fs.readFileSync(
    path.join(
      ROOT,
      "docs/public/public-seed-stable-ingress-activation-v1.md",
    ),
    "utf8",
  );
  assert.match(documentation, /Checkpoint publication binding/);
  assert.match(documentation, /--checkpoint-packet/);
  assert.match(documentation, /does not start services or alter DNS/);
  assert.match(
    documentation,
    /## Checkpoint clean-environment compatibility/,
  );
  assert.match(documentation, /UnsetEnvironment=/);

  console.log(MARKER);
  console.log("checkpoint_preflight_authority_bound=true");
  console.log("raw_checkpoint_descriptor_sha256_bound=true");
  console.log("gateway_three_pin_tuple_embedded=true");
  console.log("gateway_three_pin_tuple_reverified_at_install=true");
  console.log("ordinary_packet_compatibility=true");
  console.log("coherent_binding_substitution_rejected=true");
  console.log("clean_environment_compatibility_bound=true");
  console.log("compatibility_packet_root_relocation_exact=true");
  console.log("unrelated_unset_names_preserved=true");
  console.log("checkpoint_three_pin_unsets_released=true");
  console.log("host_source_dropin_drift_rejected=true");
  console.log("ordinary_packet_removes_managed_override=true");
  console.log("gateway_loopback_only=true");
  console.log("services_started=false");
  console.log("dns_changed=false");
  console.log("checkpoint_publication_public=false");
  console.log("wallet_authority=false");
  console.log("money_movement_authority=false");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
