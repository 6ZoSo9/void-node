#!/usr/bin/env node
import { isIP } from "node:net";

export const VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_V1 =
  "VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_V1";
export const VOID_CLOUDFLARE_ORIGIN_HOST_V1 = "seed.nullfeed.org";
export const VOID_CLOUDFLARE_ORIGIN_CREDENTIAL_PATH_V1 =
  "/__void/agents/paid-work/credential-requests/v1";
export const VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1 =
  "/wc/public-earning-pilot-v1/claim-ticket";
export const VOID_CLOUDFLARE_ORIGIN_EARN_SUBMIT_PATH_V1 =
  "/wc/public-earning-pilot-v1/submit-result";

export const VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    signed_public_origin_preserved: true,
    exact_sensitive_routes_only: true,
    cf_connecting_ip_syntax_validated: true,
    proxy_v2_destination_port_443_bound: true,
    source_port_in_participant_identity: false,
    destination_address_original_proven: false,
    cloudflare_header_transport_trusted: false,
    cloudflared_uid_isolation_proven: false,
    cloudflare_worker_route_absence_proven: false,
    pseudo_ipv4_overwrite_disabled_proven: false,
    downstream_exclusive_reachability_proven: false,
    runtime_integration: false,
    dns_or_tunnel_mutation: false,
    nftables_or_service_mutation: false,
    credential_issuance: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SIGNATURE = Buffer.from([
  0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d,
  0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a,
]);
const MAX_RAW_HEADER_ENTRIES = 128;
const MAX_HEADER_NAME_BYTES = 128;
const MAX_HEADER_VALUE_BYTES = 8 * 1024;
const HEADER_NAME = /^[!#$%&'*+\-.^_\`|~0-9A-Za-z]+$/u;

function fail(code) {
  throw new Error(code);
}

function held(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_V1,
    version: 1,
    reason,
    cloudflare_header_transport_trusted: false,
    cloudflared_uid_isolation_proven: false,
    runtime_integration: false,
    funds_movement: false,
    authority: VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_AUTHORITY_V1,
  });
}

function headerInventory(rawHeaders) {
  if (
    !Array.isArray(rawHeaders) ||
    rawHeaders.length < 2 ||
    rawHeaders.length > MAX_RAW_HEADER_ENTRIES ||
    rawHeaders.length % 2 !== 0
  ) {
    fail("cloudflare_origin_raw_headers_invalid");
  }
  const values = new Map();
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const rawName = rawHeaders[i];
    const rawValue = rawHeaders[i + 1];
    if (typeof rawName !== "string" || typeof rawValue !== "string") {
      fail("cloudflare_origin_raw_header_type_invalid");
    }
    if (
      rawName !== rawName.trim() ||
      !HEADER_NAME.test(rawName) ||
      Buffer.byteLength(rawName, "utf8") > MAX_HEADER_NAME_BYTES
    ) {
      fail("cloudflare_origin_raw_header_name_invalid");
    }
    if (
      Buffer.byteLength(rawValue, "utf8") > MAX_HEADER_VALUE_BYTES ||
      /[\u0000-\u0008\u000a-\u001f\u007f]/u.test(rawValue)
    ) {
      fail("cloudflare_origin_raw_header_value_invalid");
    }
    const name = rawName.toLowerCase();
    const prior = values.get(name) || [];
    prior.push(rawValue);
    values.set(name, prior);
  }
  return values;
}

function exactOneHeader(values, name, code) {
  const rows = values.get(name);
  if (!rows || rows.length !== 1) fail(code);
  return rows[0];
}

function parseIpv4Bytes(raw) {
  if (isIP(raw) !== 4) fail("cloudflare_origin_source_ip_invalid");
  const parts = raw.split(".");
  if (parts.length !== 4) fail("cloudflare_origin_source_ip_invalid");
  const bytes = Buffer.alloc(4);
  for (let i = 0; i < 4; i += 1) {
    if (!/^(?:0|[1-9][0-9]{0,2})$/u.test(parts[i])) {
      fail("cloudflare_origin_source_ip_noncanonical");
    }
    const value = Number(parts[i]);
    if (!Number.isSafeInteger(value) || value < 0 || value > 255) {
      fail("cloudflare_origin_source_ip_invalid");
    }
    bytes[i] = value;
  }
  return bytes;
}

function parseIpv6Bytes(raw) {
  if (raw.includes("%") || isIP(raw) !== 6) {
    fail("cloudflare_origin_source_ip_invalid");
  }
  let text = raw.toLowerCase();
  if (text.includes(".")) {
    const colon = text.lastIndexOf(":");
    if (colon < 0) fail("cloudflare_origin_source_ip_invalid");
    const v4 = parseIpv4Bytes(text.slice(colon + 1));
    text = text.slice(0, colon + 1) +
      v4.readUInt16BE(0).toString(16) + ":" +
      v4.readUInt16BE(2).toString(16);
  }
  const split = text.split("::");
  if (split.length > 2) fail("cloudflare_origin_source_ip_invalid");
  const parseSide = (part) => {
    if (!part) return [];
    const rows = part.split(":");
    for (const row of rows) {
      if (!/^[0-9a-f]{1,4}$/u.test(row)) {
        fail("cloudflare_origin_source_ip_invalid");
      }
    }
    return rows.map((row) => Number.parseInt(row, 16));
  };
  const left = parseSide(split[0]);
  const right = split.length === 2 ? parseSide(split[1]) : [];
  let groups;
  if (split.length === 1) {
    if (left.length !== 8) fail("cloudflare_origin_source_ip_invalid");
    groups = left;
  } else {
    const zeros = 8 - left.length - right.length;
    if (zeros < 1) fail("cloudflare_origin_source_ip_invalid");
    groups = [...left, ...Array(zeros).fill(0), ...right];
  }
  if (groups.length !== 8) fail("cloudflare_origin_source_ip_invalid");
  const bytes = Buffer.alloc(16);
  for (let i = 0; i < groups.length; i += 1) {
    bytes.writeUInt16BE(groups[i], i * 2);
  }
  return bytes;
}

function sourceBytes(raw) {
  if (typeof raw !== "string" || raw !== raw.trim() || !raw) {
    fail("cloudflare_origin_source_ip_invalid");
  }
  if (isIP(raw) === 4) {
    return Object.freeze({ family: "tcp4", bytes: parseIpv4Bytes(raw) });
  }
  if (isIP(raw) === 6) {
    return Object.freeze({ family: "tcp6", bytes: parseIpv6Bytes(raw) });
  }
  fail("cloudflare_origin_source_ip_invalid");
}

function buildProxyV2(source) {
  const ipv4 = source.family === "tcp4";
  const addressBytes = ipv4 ? 12 : 36;
  const output = Buffer.alloc(16 + addressBytes);
  SIGNATURE.copy(output, 0);
  output[12] = 0x21;
  output[13] = ipv4 ? 0x11 : 0x21;
  output.writeUInt16BE(addressBytes, 14);
  if (ipv4) {
    source.bytes.copy(output, 16);
    output.writeUInt16BE(0, 24);
    output.writeUInt16BE(443, 26);
  } else {
    source.bytes.copy(output, 16);
    output.writeUInt16BE(0, 48);
    output.writeUInt16BE(443, 50);
  }
  return output;
}

function sensitiveRoute(method, target) {
  if (method !== "POST") {
    fail("cloudflare_origin_sensitive_post_required");
  }
  if (
    target !== VOID_CLOUDFLARE_ORIGIN_CREDENTIAL_PATH_V1 &&
    target !== VOID_CLOUDFLARE_ORIGIN_EARN_CLAIM_PATH_V1 &&
    target !== VOID_CLOUDFLARE_ORIGIN_EARN_SUBMIT_PATH_V1
  ) {
    fail("cloudflare_origin_sensitive_target_invalid");
  }
  return target;
}

export function deriveVoidCloudflareOriginProxyV2SourceV1(input) {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      fail("cloudflare_origin_input_invalid");
    }
    const method = String(input.method || "");
    const target = String(input.target || "");
    sensitiveRoute(method, target);

    const headers = headerInventory(input.raw_headers);
    const host = exactOneHeader(
      headers,
      "host",
      "cloudflare_origin_host_missing_or_duplicated",
    );
    if (host !== VOID_CLOUDFLARE_ORIGIN_HOST_V1) {
      fail("cloudflare_origin_host_invalid");
    }
    const connectingIp = exactOneHeader(
      headers,
      "cf-connecting-ip",
      "cloudflare_origin_source_header_missing_or_duplicated",
    );
    if (
      headers.has("cf-connecting-ipv6") ||
      headers.has("cf-pseudo-ipv4")
    ) {
      fail("cloudflare_origin_pseudo_ipv4_mode_forbidden");
    }

    const source = sourceBytes(connectingIp);
    const preface = buildProxyV2(source);
    return Object.freeze({
      ok: true,
      status: "CLOUDFLARE_SOURCE_TRANSLATED_NOT_TRANSPORT_TRUSTED",
      marker: VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_V1,
      version: 1,
      sensitive_route: target,
      source_family: source.family,
      source_address_hex: source.bytes.toString("hex"),
      source_port: 0,
      destination_address_original_proven: false,
      destination_port: 443,
      proxy_v2_preface: Buffer.from(preface),
      cloudflare_header_transport_trusted: false,
      cloudflared_uid_isolation_proven: false,
      cloudflare_worker_route_absence_proven: false,
      pseudo_ipv4_overwrite_disabled_proven: false,
      downstream_exclusive_reachability_proven: false,
      runtime_integration: false,
      funds_movement: false,
      authority: VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : String(error));
  }
}
