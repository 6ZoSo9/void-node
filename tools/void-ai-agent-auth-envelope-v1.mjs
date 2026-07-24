#!/usr/bin/env node
import {
  createHash,
  generateKeyPairSync,
  sign,
  verify,
  randomBytes,
  createPublicKey,
} from "node:crypto";
import process from "node:process";

const MARKER = "VOID_AI_AGENT_AUTH_ENVELOPE_TOOL_V1";
const ENVELOPE_MARKER = "VOID_AI_AGENT_SIGNED_READONLY_REQUEST_V1";
const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb924" +
  "27ae41e4649b934ca495991b7852b855";

function fail(error, detail = undefined) {
  const output = {
    ok: false,
    marker: MARKER,
    error,
  };
  if (detail !== undefined) {
    output.detail = detail;
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exitCode = 1;
}

function canonicalize(value) {
  if (value === null) return "null";

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("non_finite_number_rejected");
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalize(value[key])}`,
      )
      .join(",")}}`;
  }

  throw new Error(`unsupported_canonical_type_${typeof value}`);
}

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function deriveAgentId(publicJwk) {
  const canonicalJwk = canonicalize({
    crv: publicJwk.crv,
    kty: publicJwk.kty,
    x: publicJwk.x,
  });
  const digest = createHash("sha256").update(canonicalJwk).digest();
  return `void-agent:ed25519:${base64url(digest)}`;
}

function parseArgs(argv) {
  const parsed = {
    command: "demo",
    path: "/public-node/agents/capabilities-v1.json",
    capability: "capability_negotiation",
    ttlSeconds: 60,
  };

  if (argv[0] && !argv[0].startsWith("-")) {
    parsed.command = argv[0];
    argv = argv.slice(1);
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--path") {
      parsed.path = argv[index + 1] ?? "";
      index += 1;
    } else if (value === "--capability") {
      parsed.capability = argv[index + 1] ?? "";
      index += 1;
    } else if (value === "--ttl-seconds") {
      parsed.ttlSeconds = Number.parseInt(
        argv[index + 1] ?? "",
        10,
      );
      index += 1;
    } else if (value === "--help" || value === "-h") {
      process.stdout.write(
        [
          "Usage:",
          "  node tools/void-ai-agent-auth-envelope-v1.mjs demo \\",
          "    --path /public-node/agents/capabilities-v1.json \\",
          "    --capability capability_negotiation \\",
          "    --ttl-seconds 60",
          "",
          "Generates an ephemeral Ed25519 key pair in memory, creates a",
          "signed read-only request envelope, verifies it locally, and",
          "prints only public material. The private key is never emitted.",
          "",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      fail("unknown_argument", value);
      return null;
    }
  }

  if (parsed.command !== "demo") {
    fail("unsupported_command", parsed.command);
    return null;
  }

  if (
    !parsed.path.startsWith("/") ||
    parsed.path.startsWith("//") ||
    parsed.path.includes("?") ||
    parsed.path.includes("#")
  ) {
    fail("path_must_be_same_origin_absolute_without_query");
    return null;
  }

  if (!/^[a-z0-9_]+$/.test(parsed.capability)) {
    fail("capability_id_invalid");
    return null;
  }

  if (
    !Number.isInteger(parsed.ttlSeconds) ||
    parsed.ttlSeconds < 1 ||
    parsed.ttlSeconds > 60
  ) {
    fail("ttl_seconds_out_of_range");
    return null;
  }

  return parsed;
}

const args = parseArgs(process.argv.slice(2));

if (args) {
  try {
    const { publicKey, privateKey } = generateKeyPairSync(
      "ed25519",
    );
    const publicJwk = publicKey.export({ format: "jwk" });
    const agentId = deriveAgentId(publicJwk);

    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + args.ttlSeconds * 1_000,
    );

    const envelope = {
      marker: ENVELOPE_MARKER,
      version: 1,
      network_chain_id: 2050,
      agent_id: agentId,
      public_key_jwk: {
        crv: publicJwk.crv,
        kty: publicJwk.kty,
        x: publicJwk.x,
      },
      capability_id: args.capability,
      method: "GET",
      path: args.path,
      query: "",
      body_sha256: EMPTY_SHA256,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      nonce: base64url(randomBytes(16)),
    };

    const canonicalEnvelope = canonicalize(envelope);
    const signature = sign(
      null,
      Buffer.from(canonicalEnvelope, "utf8"),
      privateKey,
    );
    const reconstructedPublicKey = createPublicKey({
      key: envelope.public_key_jwk,
      format: "jwk",
    });
    const verified = verify(
      null,
      Buffer.from(canonicalEnvelope, "utf8"),
      reconstructedPublicKey,
      signature,
    );

    if (!verified) {
      throw new Error("local_signature_verification_failed");
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          marker: MARKER,
          canonicalization: "void-canonical-json/1",
          signature_algorithm: "Ed25519",
          agent_id: agentId,
          public_key_jwk: envelope.public_key_jwk,
          envelope,
          canonical_envelope_sha256: createHash("sha256")
            .update(canonicalEnvelope)
            .digest("hex"),
          signature: base64url(signature),
          verified,
          private_key_emitted: false,
          verifier_runtime_active: false,
          authenticated_routes_active: false,
          send_signed_envelopes_now: false,
        },
        null,
        2,
      )}\n`,
    );
  } catch (error) {
    fail("authentication_envelope_demo_failed", String(error));
  }
}
