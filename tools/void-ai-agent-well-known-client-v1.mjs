#!/usr/bin/env node
import process from "node:process";

const WELL_KNOWN_PATH = "/.well-known/void-agent-discovery.json";
const WELL_KNOWN_MARKER = "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1";
const WELL_KNOWN_PROTOCOL = "void-agent-discovery-well-known/1";
const CANONICAL_MARKER = "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1";
const CANONICAL_PROTOCOL = "void-agent-discovery/1";
const SAFE_METHODS = new Set(["GET", "HEAD"]);
const MAX_RESPONSE_BYTES = 262_144;
const RESPONSE_TIMEOUT_MS = 10_000;
const RESPONSE_TEARDOWN_TIMEOUT_MS = 250;

function fail(error, detail = undefined) {
  const output = {
    ok: false,
    marker: "VOID_AI_AGENT_WELL_KNOWN_CLIENT_V1",
    error,
  };
  if (detail !== undefined) output.detail = detail;
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = { base: "", probe: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--base") {
      parsed.base = argv[index + 1] ?? "";
      index += 1;
    } else if (value === "--probe") {
      parsed.probe = true;
    } else if (value === "--help" || value === "-h") {
      process.stdout.write(
        [
          "Usage:",
          "  node tools/void-ai-agent-well-known-client-v1.mjs --base https://node.example [--probe]",
          "",
          "Resolves VOID AI-agent discovery through the stable well-known entrypoint.",
          "The client performs same-origin GET requests only and sends no credentials.",
          "",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      fail("unknown_argument", value);
      return null;
    }
  }
  if (!parsed.base) {
    fail("missing_required_argument", "--base");
    return null;
  }
  return parsed;
}

function normalizeBase(value) {
  const url = new URL(value);
  const loopback =
    url.hostname === "127.0.0.1" ||
    url.hostname === "localhost" ||
    url.hostname === "::1";
  if (url.protocol !== "https:" && !loopback) {
    throw new Error("base_must_use_https_except_loopback");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function sameOriginPath(base, value, label) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    throw new Error(`${label}_must_be_same_origin_absolute_path`);
  }
  const resolved = new URL(value, base);
  if (resolved.origin !== base.origin) {
    throw new Error(`${label}_cross_origin_rejected`);
  }
  return resolved;
}

async function settleTeardownBounded(startCleanup) {
  let cleanup;
  try {
    cleanup = startCleanup?.();
  } catch {
    return;
  }
  if (!cleanup || typeof cleanup.then !== "function") return;

  let timeout;
  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(resolve, RESPONSE_TEARDOWN_TIMEOUT_MS);
  });
  try {
    await Promise.race([
      Promise.resolve(cleanup).then(
        () => undefined,
        () => undefined,
      ),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function rejectWithTeardown(response, controller, error, reader = undefined) {
  controller.abort();
  await settleTeardownBounded(() => {
    if (reader && typeof reader.cancel === "function") return reader.cancel();
    if (response?.body && typeof response.body.cancel === "function") {
      return response.body.cancel();
    }
    return undefined;
  });
  throw error;
}

async function readBoundedJson(response, label, controller) {
  const contentType = response.headers.get("content-type") ?? "";
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    await rejectWithTeardown(
      response,
      controller,
      new Error(`${label}_content_type_not_json`),
    );
  }

  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^(?:0|[1-9][0-9]*)$/.test(declaredLength)) {
      await rejectWithTeardown(
        response,
        controller,
        new Error(`${label}_content_length_invalid`),
      );
    }
    const declaredBytes = Number(declaredLength);
    if (
      !Number.isSafeInteger(declaredBytes) ||
      declaredBytes > MAX_RESPONSE_BYTES
    ) {
      await rejectWithTeardown(
        response,
        controller,
        new Error(`${label}_response_exceeds_${MAX_RESPONSE_BYTES}_bytes`),
      );
    }
  }

  if (response.body === null) {
    controller.abort();
    throw new Error(`${label}_response_body_missing`);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      let result;
      try {
        result = await reader.read();
      } catch {
        const error = controller.signal.aborted
          ? new Error(`${label}_deadline_exceeded`)
          : new Error(`${label}_response_read_failed`);
        await rejectWithTeardown(response, controller, error, reader);
      }
      const { done, value } = result;
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await rejectWithTeardown(
          response,
          controller,
          new Error(`${label}_response_exceeds_${MAX_RESPONSE_BYTES}_bytes`),
          reader,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label}_response_not_utf8`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}_response_not_json`);
  }
}

async function getJson(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "error",
      headers: {
        accept: "application/json",
        "user-agent": "void-ai-agent-well-known-client-v1",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      await rejectWithTeardown(
        response,
        controller,
        new Error(`${label}_http_${response.status}`),
      );
    }
    if (response.url !== url.href) {
      await rejectWithTeardown(
        response,
        controller,
        new Error(`${label}_final_url_mismatch`),
      );
    }
    return await readBoundedJson(response, label, controller);
  } finally {
    clearTimeout(timer);
  }
}

function validateWellKnown(base, document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("well_known_document_must_be_object");
  }
  if (document.marker !== WELL_KNOWN_MARKER) {
    throw new Error("well_known_marker_mismatch");
  }
  if (document.protocol !== WELL_KNOWN_PROTOCOL) {
    throw new Error("well_known_protocol_mismatch");
  }
  if (document.network?.chain_id !== 2050) {
    throw new Error("well_known_chain_id_mismatch");
  }
  if (document.authority?.default !== "read_only") {
    throw new Error("well_known_default_authority_not_read_only");
  }
  if (document.authority?.mutation_authority_granted !== false) {
    throw new Error("well_known_mutation_authority_claim_rejected");
  }
  if (document.authority?.credentials_required !== false) {
    throw new Error("well_known_credentials_requirement_rejected");
  }
  if (document.safety?.same_origin_only !== true) {
    throw new Error("well_known_same_origin_wall_missing");
  }
  if (document.safety?.follow_redirects !== false) {
    throw new Error("well_known_redirect_wall_missing");
  }
  if (document.safety?.send_secrets !== false) {
    throw new Error("well_known_secret_send_must_be_false");
  }
  if (document.safety?.send_wallet_material !== false) {
    throw new Error("well_known_wallet_send_must_be_false");
  }
  if (document.safety?.send_operator_keys !== false) {
    throw new Error("well_known_operator_key_send_must_be_false");
  }
  if (document.safety?.treat_unknown_as !== "not_granted") {
    throw new Error("well_known_unknown_authority_must_be_not_granted");
  }
  return sameOriginPath(
    base,
    document.canonical_discovery,
    "canonical_discovery",
  );
}

function validateCanonical(base, document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("canonical_document_must_be_object");
  }
  if (document.marker !== CANONICAL_MARKER) {
    throw new Error("canonical_marker_mismatch");
  }
  if (document.protocol !== CANONICAL_PROTOCOL) {
    throw new Error("canonical_protocol_mismatch");
  }
  if (document.network?.chain_id !== 2050) {
    throw new Error("canonical_chain_id_mismatch");
  }
  if (document.authority?.default !== "read_only") {
    throw new Error("canonical_default_authority_not_read_only");
  }
  if (document.authority?.mutation_authority_granted !== false) {
    throw new Error("canonical_mutation_authority_claim_rejected");
  }

  const methods = document.authority?.granted_http_methods;
  if (!Array.isArray(methods) || methods.length === 0) {
    throw new Error("canonical_granted_methods_missing");
  }
  for (const method of methods) {
    if (!SAFE_METHODS.has(method)) {
      throw new Error(`canonical_unsafe_granted_method_${method}`);
    }
  }

  const entrypoints = document.entrypoints;
  if (!entrypoints || typeof entrypoints !== "object") {
    throw new Error("canonical_entrypoints_missing");
  }
  for (const [name, path] of Object.entries(entrypoints)) {
    sameOriginPath(base, path, `canonical_entrypoint_${name}`);
  }

  if (document.safety?.same_origin_only !== true) {
    throw new Error("canonical_same_origin_wall_missing");
  }
  if (document.safety?.treat_unknown_capability_as !== "not_granted") {
    throw new Error("canonical_unknown_capability_must_be_not_granted");
  }
  return document;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return;

  try {
    const base = normalizeBase(args.base);
    const wellKnownUrl = sameOriginPath(
      base,
      WELL_KNOWN_PATH,
      "well_known",
    );
    const wellKnown = await getJson(wellKnownUrl, "well_known");
    const canonicalUrl = validateWellKnown(base, wellKnown);
    const canonical = validateCanonical(
      base,
      await getJson(canonicalUrl, "canonical"),
    );

    const output = {
      ok: true,
      marker: "VOID_AI_AGENT_WELL_KNOWN_CLIENT_V1",
      base_origin: base.origin,
      well_known_url: wellKnownUrl.href,
      canonical_url: canonicalUrl.href,
      network: canonical.network,
      authority: canonical.authority,
      capabilities: canonical.capabilities,
      probe: null,
    };

    if (args.probe) {
      output.probe = {};
      for (const name of ["node_identity", "public_index", "readiness"]) {
        const url = sameOriginPath(
          base,
          canonical.entrypoints[name],
          `probe_${name}`,
        );
        try {
          output.probe[name] = {
            ok: true,
            url: url.href,
            body: await getJson(url, `probe_${name}`),
          };
        } catch (error) {
          output.probe[name] = {
            ok: false,
            url: url.href,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    }

    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } catch (error) {
    fail(
      "well_known_discovery_rejected",
      error instanceof Error ? error.message : String(error),
    );
  }
}

await main();
