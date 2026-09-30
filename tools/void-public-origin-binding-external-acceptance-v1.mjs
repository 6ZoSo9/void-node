#!/usr/bin/env node

import { createHash, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1 =
  "VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1";

const ORIGIN = "https://seed.nullfeed.org";
const NODE_ID = "9d89483769e469e0473b489dc50dba96";
const FINGERPRINT =
  "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b";
const TRUST_REGISTRY_SHA256 =
  "49f285908fa70c72ce036b44d9ead41e11fc1bd40092384636a2c0cc3a0d3790";
const PROBE_ACCOUNT = "void-origin-binding-acceptance-v1";
const DIRECTORY_MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1";
const HANDOFF_MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1";
const PARTICIPANT_MARKER = "VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_V1";
const BINDING_PATHS = Object.freeze([
  "/.well-known/void-node-public-origin-binding-v1.json",
  "/public-node/identity/public-origin-binding-v1.json",
]);
const PARTICIPANT_STATUS_PATH =
  "/__void/public-participant/status.json";
const PARTICIPANT_PATH = "/participant";
const MAX_CHILD_STDOUT = 512 * 1024;
const MAX_CHILD_STDERR = 128 * 1024;
const MAX_JSON_BYTES = 256 * 1024;
const MAX_BINDING_BYTES = 128 * 1024;
const MAX_HTML_BYTES = 512 * 1024;
const CHILD_TIMEOUT_MS = 130_000;
const FETCH_TIMEOUT_MS = 10_000;
const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTORY_TOOL = resolve(
  HERE,
  "wc-public-opportunity-directory-v1.mjs",
);
const HANDOFF_TOOL = resolve(
  HERE,
  "wc-public-opportunity-handoff-v1.mjs",
);

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail("canonical JSON cannot contain non-finite numbers");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{"
      + Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key)
            + ":"
            + canonicalJson(value[key]),
        )
        .join(",")
      + "}"
    );
  }
  fail(
    `canonical JSON cannot contain ${typeof value}`,
  );
}

function preflightOutput(file) {
  if (
    typeof file !== "string"
    || !path.isAbsolute(file)
    || path.resolve(file) !== file
  ) {
    fail("output path must be an absolute canonical path");
  }
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent) {
    fail("output parent must be canonical");
  }
  try {
    fs.lstatSync(file);
    fail("refusing to overwrite existing output");
  } catch (error) {
    if (
      error?.message
        === "refusing to overwrite existing output"
    ) {
      throw error;
    }
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  return file;
}

function writePrivateJson(file, value) {
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY
      | fs.constants.O_CREAT
      | fs.constants.O_EXCL
      | Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    const bytes = Buffer.from(
      JSON.stringify(value, null, 2) + "\n",
      "utf8",
    );
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
    return Object.freeze({
      bytes,
      sha256: sha256(bytes),
    });
  } finally {
    fs.closeSync(fd);
  }
}

function productionChildRunner({
  tool,
  args,
}) {
  const result = spawnSync(
    process.execPath,
    [tool, ...args],
    {
      encoding: "utf8",
      timeout: CHILD_TIMEOUT_MS,
      maxBuffer: MAX_CHILD_STDOUT,
      env: process.env,
    },
  );
  return Object.freeze({
    status:
      Number.isInteger(result.status)
        ? result.status
        : 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
    error: result.error
      ? String(result.error.message || result.error)
      : null,
  });
}

function childJson(
  result,
  label,
) {
  if (
    !result
    || result.status !== 0
    || result.error
  ) {
    fail(
      `${label} failed: ${String(
        result?.error
          || result?.stderr
          || result?.stdout
          || "",
      ).trim()}`,
    );
  }
  const stdout = String(result.stdout || "");
  const stderr = String(result.stderr || "");
  if (
    Buffer.byteLength(stdout)
      > MAX_CHILD_STDOUT
    || Buffer.byteLength(stderr)
      > MAX_CHILD_STDERR
  ) {
    fail(`${label} output exceeds byte limit`);
  }
  if (stderr.trim()) {
    fail(`${label} emitted stderr`);
  }
  let value;
  try {
    value = JSON.parse(stdout);
  } catch {
    fail(`${label} returned invalid JSON`);
  }
  return Object.freeze({
    value,
    sha256: sha256(
      Buffer.from(stdout, "utf8"),
    ),
  });
}

function validateDirectory(value) {
  if (
    value?.marker !== DIRECTORY_MARKER
    || value?.status !== "green"
    || value?.directory_state !== "available"
    || value?.summary?.available < 1
    || value?.summary?.invalid_result !== 0
    || value?.summary?.award_policy_consistent !== true
    || value?.safety?.read_only !== true
    || value?.safety?.mutation_attempted !== false
    || value?.safety?.ticket_issuance_attempted !== false
    || value?.safety?.receipt_submission_attempted !== false
    || value?.safety?.wc_award_attempted !== false
    || value?.safety?.wallet_access_attempted !== false
    || value?.safety?.settlement_attempted !== false
    || !Array.isArray(value?.results)
  ) {
    fail("public opportunity directory is not acceptance-ready");
  }
  const selected = value.results.find(
    (entry) =>
      entry?.base === ORIGIN
      && entry?.state === "available"
      && entry?.trusted === true,
  );
  if (!selected) {
    fail(
      "canonical public origin is not a trusted available directory entry",
    );
  }
  return selected;
}

function validateHandoff(value) {
  const identity = value?.coordinator_identity;
  const safety = value?.safety;
  if (
    value?.marker !== HANDOFF_MARKER
    || value?.status !== "green"
    || value?.handoff_state !== "ready"
    || value?.selected?.base !== ORIGIN
    || identity?.node_id !== NODE_ID
    || identity?.trust_mode
      !== "signed_public_origin_binding"
    || identity?.public_copy_ready !== true
    || identity?.trust_registry_sha256
      !== TRUST_REGISTRY_SHA256
    || identity?.trusted_public_key_fingerprint_sha256
      !== FINGERPRINT
    || identity?.binding?.path
      !== BINDING_PATHS[0]
    || identity?.binding?.http_status !== 200
    || identity?.binding?.public_key_fingerprint_sha256
      !== FINGERPRINT
    || typeof identity?.binding?.binding_sha256
      !== "string"
    || !/^[0-9a-f]{64}$/u.test(
      identity.binding.binding_sha256,
    )
    || safety?.read_only !== true
    || safety?.cryptographic_public_origin_binding_verified
      !== true
    || safety?.public_copy_ready !== true
    || safety?.client_executed !== false
    || safety?.identity_created !== false
    || safety?.mutation_attempted !== false
    || safety?.ticket_issuance_attempted !== false
    || safety?.receipt_submission_attempted !== false
    || safety?.wc_award_attempted !== false
    || safety?.wallet_access_attempted !== false
    || safety?.settlement_attempted !== false
    || !value?.commands?.status?.argv
    || !value?.commands?.run?.argv
  ) {
    fail("public opportunity handoff is not cryptographically copy-ready");
  }
  return identity;
}

async function readResponseBounded(
  response,
  maximum,
  expectedUrl,
) {
  if (
    !response
    || response.status !== 200
    || response.redirected === true
    || response.url !== expectedUrl
  ) {
    fail(
      `external HTTP evidence rejected for ${expectedUrl}`,
    );
  }
  const declared = String(
    response.headers?.get?.("content-length") || "",
  ).trim();
  if (declared) {
    if (!/^\d+$/u.test(declared)) {
      fail("external response content-length is invalid");
    }
    if (
      BigInt(declared)
        > BigInt(maximum)
    ) {
      fail("external response exceeds byte limit");
    }
  }
  const reader =
    response.body?.getReader?.();
  if (!reader) {
    fail("external response body is not stream-readable");
  }
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } =
        await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        fail("external response chunk is invalid");
      }
      total += value.byteLength;
      if (total > maximum) {
        try {
          await reader.cancel();
        } catch (error) {
          void error;
        }
        fail("external response exceeds byte limit");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (error) {
      void error;
    }
  }
  return Buffer.concat(chunks, total);
}

async function externalBytes(
  pathname,
  maximum,
  fetchImpl,
) {
  const url = ORIGIN + pathname;
  const response = await fetchImpl(
    url,
    {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "*/*",
        "user-agent":
          "void-public-origin-binding-external-acceptance-v1",
      },
      signal: AbortSignal.timeout(
        FETCH_TIMEOUT_MS,
      ),
    },
  );
  return readResponseBounded(
    response,
    maximum,
    url,
  );
}

function strictJson(bytes, label) {
  let text;
  try {
    text = new TextDecoder(
      "utf-8",
      { fatal: true },
    ).decode(bytes);
  } catch {
    fail(`${label} is not valid UTF-8`);
  }
  try {
    return JSON.parse(text);
  } catch {
    fail(`${label} is not valid JSON`);
  }
}

function validateParticipantStatus(
  value,
  bindingSha256,
) {
  if (
    value?.marker !== PARTICIPANT_MARKER
    || value?.available !== true
    || value?.public_copy_ready !== true
    || value?.status !== "copy_ready"
    || value?.coordinator_base !== ORIGIN
    || value?.coordinator_node_id !== NODE_ID
    || value?.coordinator_node_id_trusted !== true
    || value?.identity_trust?.trust_mode
      !== "signed_public_origin_binding"
    || value?.identity_trust
      ?.cryptographic_public_origin_binding_verified
      !== true
    || value?.identity_trust?.binding?.path
      !== BINDING_PATHS[0]
    || value?.identity_trust?.binding?.binding_sha256
      !== bindingSha256
    || value?.identity_trust
      ?.trusted_public_key_fingerprint_sha256
      !== FINGERPRINT
    || value?.boundaries?.manual_coordinator_substitution
      !== false
    || !value?.commands?.status?.argv
    || !value?.commands?.run?.argv
  ) {
    fail(
      "public participant status is not cryptographically copy-ready",
    );
  }
}

function validateParticipantHtml(
  bytes,
) {
  let html;
  try {
    html = new TextDecoder(
      "utf-8",
      { fatal: true },
    ).decode(bytes);
  } catch {
    fail("participant HTML is not valid UTF-8");
  }
  for (const required of [
    'data-public-copy-ready="ready"',
    "Signed public-origin identity verified",
    ORIGIN,
    NODE_ID,
  ]) {
    if (!html.includes(required)) {
      fail(
        `participant HTML missing copy-ready marker: ${required}`,
      );
    }
  }
  for (const forbidden of [
    "PUBLIC_HTTPS_BASE",
    "COORDINATOR_NODE_ID",
    "Identity HOLD",
  ]) {
    if (html.includes(forbidden)) {
      fail(
        `participant HTML contains forbidden hold/placeholder token: ${forbidden}`,
      );
    }
  }
  return Object.freeze({
    bytes: bytes.length,
    sha256: sha256(bytes),
  });
}

export async function buildVoidPublicOriginBindingExternalAcceptanceV1({
  nowMs = Date.now(),
  childRunner = productionChildRunner,
  fetchImpl = fetch,
} = {}) {
  if (!Number.isFinite(nowMs)) {
    fail("acceptance time is invalid");
  }
  if (
    typeof childRunner !== "function"
    || typeof fetchImpl !== "function"
  ) {
    fail("acceptance dependencies are unavailable");
  }

  const directoryRun = childRunner({
    tool: DIRECTORY_TOOL,
    args: [
      "--base",
      ORIGIN,
      "--concurrency",
      "1",
      "--timeout-ms",
      "5000",
      "--expected-award-wc",
      "3",
      "--require-available",
    ],
    label: "directory",
  });
  const directory = childJson(
    directoryRun,
    "public opportunity directory",
  );
  const selected =
    validateDirectory(directory.value);

  const temporary = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "void-origin-binding-external-acceptance-v1-",
    ),
  );
  let handoff;
  try {
    const directoryFile = path.join(
      temporary,
      "directory.json",
    );
    fs.writeFileSync(
      directoryFile,
      directoryRun.stdout,
      {
        mode: 0o600,
      },
    );
    const handoffRun = childRunner({
      tool: HANDOFF_TOOL,
      args: [
        "--directory-json",
        directoryFile,
        "--account",
        PROBE_ACCOUNT,
        "--select-base",
        ORIGIN,
        "--health-timeout-ms",
        "5000",
      ],
      label: "handoff",
    });
    handoff = childJson(
      handoffRun,
      "public opportunity handoff",
    );
  } finally {
    fs.rmSync(
      temporary,
      {
        recursive: true,
        force: true,
      },
    );
  }

  const identity =
    validateHandoff(handoff.value);
  const bindingSha256 =
    identity.binding.binding_sha256;

  const aliasBodies = [];
  const aliasEvidence = [];
  for (const pathname of BINDING_PATHS) {
    const bytes = await externalBytes(
      pathname,
      MAX_BINDING_BYTES,
      fetchImpl,
    );
    const actualSha = sha256(bytes);
    if (
      actualSha !== bindingSha256
    ) {
      fail(
        "external binding alias SHA does not match handoff binding SHA",
      );
    }
    if (
      aliasBodies.length > 0
      && (
        aliasBodies[0].length
          !== bytes.length
        || !timingSafeEqual(
          aliasBodies[0],
          bytes,
        )
      )
    ) {
      fail(
        "external binding aliases are not byte-identical",
      );
    }
    aliasBodies.push(bytes);
    aliasEvidence.push(
      Object.freeze({
        path: pathname,
        http_status: 200,
        bytes: bytes.length,
        sha256: actualSha,
      }),
    );
  }

  const participantStatusBytes =
    await externalBytes(
      PARTICIPANT_STATUS_PATH,
      MAX_JSON_BYTES,
      fetchImpl,
    );
  const participantStatus =
    strictJson(
      participantStatusBytes,
      "participant status",
    );
  validateParticipantStatus(
    participantStatus,
    bindingSha256,
  );

  const participantHtmlBytes =
    await externalBytes(
      PARTICIPANT_PATH,
      MAX_HTML_BYTES,
      fetchImpl,
    );
  const participantHtml =
    validateParticipantHtml(
      participantHtmlBytes,
    );

  return Object.freeze({
    marker:
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1,
    version: 1,
    status: "external_acceptance_green",
    observed_at:
      new Date(nowMs).toISOString(),
    origin: ORIGIN,
    coordinator_identity: Object.freeze({
      node_id: NODE_ID,
      public_key_fingerprint_sha256:
        FINGERPRINT,
      trust_registry_sha256:
        TRUST_REGISTRY_SHA256,
      binding_sha256:
        bindingSha256,
      binding_issued_at:
        identity.binding.issued_at,
      binding_expires_at:
        identity.binding.expires_at,
    }),
    directory: Object.freeze({
      marker: DIRECTORY_MARKER,
      artifact_sha256:
        directory.sha256,
      state:
        directory.value.directory_state,
      available_count:
        directory.value.summary.available,
      selected_state:
        selected.state,
      selected_trusted:
        selected.trusted,
    }),
    handoff: Object.freeze({
      marker: HANDOFF_MARKER,
      artifact_sha256:
        handoff.sha256,
      state:
        handoff.value.handoff_state,
      trust_mode:
        identity.trust_mode,
      public_copy_ready:
        identity.public_copy_ready,
      client_executed:
        handoff.value.safety.client_executed,
    }),
    binding_aliases:
      Object.freeze(aliasEvidence),
    participant: Object.freeze({
      status_marker:
        PARTICIPANT_MARKER,
      status_sha256:
        sha256(
          participantStatusBytes,
        ),
      available:
        participantStatus.available,
      public_copy_ready:
        participantStatus.public_copy_ready,
      coordinator_node_id_trusted:
        participantStatus
          .coordinator_node_id_trusted,
      html_sha256:
        participantHtml.sha256,
      html_bytes:
        participantHtml.bytes,
    }),
    safety: Object.freeze({
      read_only: true,
      child_tools_read_only: true,
      external_methods: ["GET"],
      client_executed: false,
      identity_created: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
      wallet_access_attempted: false,
      settlement_attempted: false,
      service_mutation_attempted: false,
      tunnel_mutation_attempted: false,
      dns_or_tls_mutation_attempted: false,
      funds_movement_attempted: false,
    }),
  });
}

export async function writeVoidPublicOriginBindingExternalAcceptanceV1({
  outputFile,
  nowMs = Date.now(),
  childRunner = productionChildRunner,
  fetchImpl = fetch,
} = {}) {
  const output =
    preflightOutput(outputFile);
  const receipt =
    await buildVoidPublicOriginBindingExternalAcceptanceV1({
      nowMs,
      childRunner,
      fetchImpl,
    });
  const written =
    writePrivateJson(
      output,
      receipt,
    );
  return Object.freeze({
    receipt,
    artifact_sha256:
      written.sha256,
    output_mode: "0600",
  });
}

function parseArgs(argv) {
  const options = {
    command: argv[0] || "",
    outputFile: "",
  };
  for (
    let index = 1;
    index < argv.length;
    index += 1
  ) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        fail(
          `missing value for ${argument}`,
        );
      }
      return argv[index];
    };
    if (
      argument === "--output"
    ) {
      options.outputFile = next();
    } else {
      fail(
        `unknown argument: ${argument}`,
      );
    }
  }
  return options;
}

function usage() {
  console.log(
    "usage: node tools/void-public-origin-binding-external-acceptance-v1.mjs "
      + "run --output /absolute/external-acceptance-receipt.json",
  );
}

const direct =
  process.argv[1]
  && import.meta.url
    === pathToFileURL(
      process.argv[1],
    ).href;

if (direct) {
  try {
    const options =
      parseArgs(
        process.argv.slice(2),
      );
    if (
      options.command === "help"
      || options.command === "--help"
      || options.command === "-h"
    ) {
      usage();
    } else if (
      options.command === "run"
    ) {
      if (!options.outputFile) {
        fail("run requires --output");
      }
      const result =
        await writeVoidPublicOriginBindingExternalAcceptanceV1({
          outputFile:
            options.outputFile,
        });
      console.log(
        VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1,
      );
      console.log(
        `status=${result.receipt.status}`,
      );
      console.log(
        `origin=${result.receipt.origin}`,
      );
      console.log(
        `node_id=${result.receipt.coordinator_identity.node_id}`,
      );
      console.log(
        `binding_sha256=${result.receipt.coordinator_identity.binding_sha256}`,
      );
      console.log(
        `artifact_sha256=${result.artifact_sha256}`,
      );
      console.log(
        "public_copy_ready=true",
      );
      console.log(
        "client_executed=false",
      );
      console.log(
        "ticket_issuance_attempted=false",
      );
      console.log(
        "wc_award_attempted=false",
      );
      console.log(
        "service_mutation_attempted=false",
      );
      console.log(
        "funds_movement_attempted=false",
      );
    } else {
      usage();
      fail("unknown command");
    }
  } catch (error) {
    console.error(
      "VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1_HOLD",
    );
    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );
    process.exitCode = 1;
  }
}
