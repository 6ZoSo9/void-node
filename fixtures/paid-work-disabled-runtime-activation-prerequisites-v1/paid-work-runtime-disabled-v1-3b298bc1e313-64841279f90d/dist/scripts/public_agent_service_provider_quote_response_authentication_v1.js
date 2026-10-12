import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { canonicalJson, } from "./agent_paid_work_order_envelope_v1.js";
import { materializePublicAgentServiceProviderQuoteResponseV1, validatePublicAgentServiceProviderQuoteResponseV1, } from "./public_agent_service_provider_quote_response_v1.js";
export const PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_MARKER = "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1";
export const PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_PACKET_MARKER = "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_PACKET_V1";
export const PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER = "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_V1";
export const PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_EVIDENCE_MARKER = "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_EVIDENCE_V1";
export const PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_VERSION = 1;
export const PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_SIGNATURE_SCHEME = "ed25519-spki-sha256-v1";
export const PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_SIGNATURE_DOMAIN = "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1";
export const PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_CANONICALIZATION = "void-canonical-json-v1";
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const NONCE_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const KEY_ID_PATTERN = /^ed25519:[0-9a-f]{64}$/;
const BINDING_ID_PATTERN = /^voidapkb1_[0-9a-f]{64}$/;
const AUTHENTICATION_ID_PATTERN = /^voidawqa1_[0-9a-f]{64}$/;
const RESPONSE_ID_PATTERN = /^voidawqr1_[0-9a-f]{64}$/;
const QUOTE_ID_PATTERN = /^voidawq1_[0-9a-f]{64}$/;
const HANDOFF_ID_PATTERN = /^voidawqh1_[0-9a-f]{64}$/;
const WORK_ORDER_ID_PATTERN = /^voidawo1_[0-9a-f]{64}$/;
const SUBMISSION_ID_PATTERN = /^voidawsr1_[0-9a-f]{64}$/;
const RECEIPT_ID_PATTERN = /^voidawsi1_[0-9a-f]{64}$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4}){21}[A-Za-z0-9+/]{2}==$/;
function fail(message) {
    throw new Error(message);
}
function assertCondition(condition, message) {
    if (!condition)
        fail(message);
}
function isRecord(value) {
    return Boolean(value
        && typeof value === "object"
        && !Array.isArray(value));
}
function requireRecord(value, label) {
    assertCondition(isRecord(value), `${label} must be an object`);
    return value;
}
function requireExactKeys(value, label, keys) {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    assertCondition(JSON.stringify(actual) === JSON.stringify(expected), `${label} must contain exactly: ${expected.join(", ")}`);
}
function requireString(value, label, pattern, minimum = 1, maximum = 4096) {
    assertCondition(typeof value === "string", `${label} must be a string`);
    assertCondition(value === value.trim(), `${label} must be trimmed`);
    assertCondition(value.length >= minimum && value.length <= maximum, `${label} length is outside bounds`);
    if (pattern) {
        assertCondition(pattern.test(value), `${label} has invalid format`);
    }
    return value;
}
function requireIsoUtc(value, label) {
    const result = requireString(value, label, ISO_UTC_PATTERN, 20, 20);
    assertCondition(Number.isFinite(Date.parse(result)), `${label} is not a valid UTC timestamp`);
    return result;
}
function requireCanonicalPublicKeyPem(value, label) {
    assertCondition(typeof value === "string", `${label} must be a string`);
    assertCondition(value.length >= 80 && value.length <= 2048, `${label} length is outside bounds`);
    assertCondition(!value.includes("\r"), `${label} must use LF line endings`);
    assertCondition(value === value.trimStart(), `${label} must not contain leading whitespace`);
    assertCondition(value === `${value.trimEnd()}\n`, `${label} must end with exactly one newline`);
    assertCondition(value.startsWith("-----BEGIN PUBLIC KEY-----\n"), `${label} must begin with a public-key PEM header`);
    assertCondition(value.endsWith("\n-----END PUBLIC KEY-----\n"), `${label} must end with a public-key PEM footer`);
    return value;
}
function sha256Hex(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function publicKeyFromPem(pem) {
    let key;
    try {
        key = crypto.createPublicKey(pem);
    }
    catch {
        return fail("provider public key PEM could not be parsed");
    }
    assertCondition(key.asymmetricKeyType === "ed25519", "provider public key must be Ed25519");
    return key;
}
export function providerQuoteResponseAuthenticationKeyIdV1(publicKeyPem) {
    const key = publicKeyFromPem(publicKeyPem);
    const der = key.export({
        format: "der",
        type: "spki",
    });
    return `ed25519:${sha256Hex(der)}`;
}
export function providerKeyBindingIdV1(draft) {
    return `voidapkb1_${sha256Hex(canonicalJson(draft))}`;
}
function exactProviderQuoteResponseAuthenticationBodyV1(value) {
    return {
        marker: value.marker,
        version: value.version,
        signature_scheme: value.signature_scheme,
        signature_domain: value.signature_domain,
        canonicalization: value.canonicalization,
        response_id: value.response_id,
        quote_id: value.quote_id,
        handoff_id: value.handoff_id,
        work_order_id: value.work_order_id,
        submission_id: value.submission_id,
        request_sha256: value.request_sha256,
        receipt_id: value.receipt_id,
        provider_id: value.provider_id,
        catalog_fingerprint_sha256: value.catalog_fingerprint_sha256,
        provider_key_binding_id: value.provider_key_binding_id,
        authentication_nonce: value.authentication_nonce,
        created_at_utc: value.created_at_utc,
        expires_at_utc: value.expires_at_utc,
    };
}
export function providerQuoteResponseAuthenticationSigningBytesV1(body) {
    const exactBody = exactProviderQuoteResponseAuthenticationBodyV1(body);
    return Buffer.from(`${PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_SIGNATURE_DOMAIN}\n`
        + canonicalJson(exactBody), "utf8");
}
export function providerQuoteResponseAuthenticationIdV1(envelopeWithoutId) {
    return `voidawqa1_${sha256Hex(canonicalJson(envelopeWithoutId))}`;
}
function validateProviderKeyBinding(value) {
    const root = requireRecord(value, "provider_key_binding");
    requireExactKeys(root, "provider_key_binding", [
        "marker",
        "version",
        "binding_status",
        "provider_id",
        "authority_scope",
        "key_id",
        "public_key_pem",
        "valid_from_utc",
        "expires_at_utc",
        "revoked_at_utc",
        "binding_nonce",
        "binding_id",
    ]);
    assertCondition(root.marker === PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER, "provider key binding marker mismatch");
    assertCondition(root.version === 1, "provider key binding version mismatch");
    assertCondition(root.binding_status === "example_fixture"
        || root.binding_status === "operator_approved_snapshot", "provider key binding status is invalid");
    const providerId = requireString(root.provider_id, "provider_key_binding.provider_id", SAFE_ID_PATTERN, 3, 128);
    assertCondition(root.authority_scope === "provider_quote_response_authenticate", "provider key binding authority scope mismatch");
    const keyId = requireString(root.key_id, "provider_key_binding.key_id", KEY_ID_PATTERN, 72, 72);
    const publicKeyPem = requireCanonicalPublicKeyPem(root.public_key_pem, "provider_key_binding.public_key_pem");
    const validFrom = requireIsoUtc(root.valid_from_utc, "provider_key_binding.valid_from_utc");
    const expiresAt = requireIsoUtc(root.expires_at_utc, "provider_key_binding.expires_at_utc");
    assertCondition(Date.parse(expiresAt) > Date.parse(validFrom), "provider key binding expiry must follow activation");
    let revokedAt = null;
    if (root.revoked_at_utc !== null) {
        revokedAt = requireIsoUtc(root.revoked_at_utc, "provider_key_binding.revoked_at_utc");
        assertCondition(Date.parse(revokedAt) >= Date.parse(validFrom), "provider key revocation cannot predate activation");
    }
    const bindingNonce = requireString(root.binding_nonce, "provider_key_binding.binding_nonce", NONCE_PATTERN, 8, 128);
    const bindingId = requireString(root.binding_id, "provider_key_binding.binding_id", BINDING_ID_PATTERN, 74, 74);
    const derivedKeyId = providerQuoteResponseAuthenticationKeyIdV1(publicKeyPem);
    assertCondition(keyId === derivedKeyId, "provider key_id does not match Ed25519 SPKI public key");
    const draft = {
        marker: PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
        version: 1,
        binding_status: root.binding_status,
        provider_id: providerId,
        authority_scope: "provider_quote_response_authenticate",
        key_id: keyId,
        public_key_pem: publicKeyPem,
        valid_from_utc: validFrom,
        expires_at_utc: expiresAt,
        revoked_at_utc: revokedAt,
        binding_nonce: bindingNonce,
    };
    assertCondition(bindingId === providerKeyBindingIdV1(draft), "provider key binding_id does not match canonical binding");
    return {
        ...draft,
        binding_id: bindingId,
    };
}
function validateAuthenticationEnvelope(value) {
    const root = requireRecord(value, "authentication_envelope");
    requireExactKeys(root, "authentication_envelope", [
        "marker",
        "version",
        "signature_scheme",
        "signature_domain",
        "canonicalization",
        "response_id",
        "quote_id",
        "handoff_id",
        "work_order_id",
        "submission_id",
        "request_sha256",
        "receipt_id",
        "provider_id",
        "catalog_fingerprint_sha256",
        "provider_key_binding_id",
        "authentication_nonce",
        "created_at_utc",
        "expires_at_utc",
        "signature_base64",
        "authentication_id",
    ]);
    assertCondition(root.marker
        === PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_EVIDENCE_MARKER, "provider authentication evidence marker mismatch");
    assertCondition(root.version === 1, "authentication evidence version mismatch");
    assertCondition(root.signature_scheme
        === PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_SIGNATURE_SCHEME, "authentication signature scheme mismatch");
    assertCondition(root.signature_domain
        === PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_SIGNATURE_DOMAIN, "authentication signature domain mismatch");
    assertCondition(root.canonicalization
        === PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_CANONICALIZATION, "authentication canonicalization mismatch");
    const body = {
        marker: PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_EVIDENCE_MARKER,
        version: 1,
        signature_scheme: PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_SIGNATURE_SCHEME,
        signature_domain: PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_SIGNATURE_DOMAIN,
        canonicalization: PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_CANONICALIZATION,
        response_id: requireString(root.response_id, "authentication_envelope.response_id", RESPONSE_ID_PATTERN, 74, 74),
        quote_id: requireString(root.quote_id, "authentication_envelope.quote_id", QUOTE_ID_PATTERN, 73, 73),
        handoff_id: requireString(root.handoff_id, "authentication_envelope.handoff_id", HANDOFF_ID_PATTERN, 74, 74),
        work_order_id: requireString(root.work_order_id, "authentication_envelope.work_order_id", WORK_ORDER_ID_PATTERN, 73, 73),
        submission_id: requireString(root.submission_id, "authentication_envelope.submission_id", SUBMISSION_ID_PATTERN, 74, 74),
        request_sha256: requireString(root.request_sha256, "authentication_envelope.request_sha256", SHA256_PATTERN, 64, 64),
        receipt_id: requireString(root.receipt_id, "authentication_envelope.receipt_id", RECEIPT_ID_PATTERN, 74, 74),
        provider_id: requireString(root.provider_id, "authentication_envelope.provider_id", SAFE_ID_PATTERN, 3, 128),
        catalog_fingerprint_sha256: requireString(root.catalog_fingerprint_sha256, "authentication_envelope.catalog_fingerprint_sha256", SHA256_PATTERN, 64, 64),
        provider_key_binding_id: requireString(root.provider_key_binding_id, "authentication_envelope.provider_key_binding_id", BINDING_ID_PATTERN, 74, 74),
        authentication_nonce: requireString(root.authentication_nonce, "authentication_envelope.authentication_nonce", NONCE_PATTERN, 8, 128),
        created_at_utc: requireIsoUtc(root.created_at_utc, "authentication_envelope.created_at_utc"),
        expires_at_utc: requireIsoUtc(root.expires_at_utc, "authentication_envelope.expires_at_utc"),
    };
    assertCondition(Date.parse(body.expires_at_utc) > Date.parse(body.created_at_utc), "authentication expiry must follow creation");
    const signatureBase64 = requireString(root.signature_base64, "authentication_envelope.signature_base64", BASE64_PATTERN, 88, 88);
    const signatureBytes = Buffer.from(signatureBase64, "base64");
    assertCondition(signatureBytes.length === 64
        && signatureBytes.toString("base64") === signatureBase64, "authentication signature must be canonical 64-byte base64");
    const authenticationId = requireString(root.authentication_id, "authentication_envelope.authentication_id", AUTHENTICATION_ID_PATTERN, 74, 74);
    assertCondition(authenticationId
        === providerQuoteResponseAuthenticationIdV1({
            ...body,
            signature_base64: signatureBase64,
        }), "authentication_id does not match canonical signed envelope");
    return {
        ...body,
        signature_base64: signatureBase64,
        authentication_id: authenticationId,
    };
}
export function validatePublicAgentServiceProviderQuoteResponseAuthenticationV1(value) {
    const root = requireRecord(value, "provider authentication input");
    requireExactKeys(root, "provider authentication input", [
        "marker",
        "version",
        "evidence_mode",
        "provider_quote_response_input",
        "provider_key_binding",
        "authentication_envelope",
    ]);
    assertCondition(root.marker
        === PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_MARKER, "provider authentication input marker mismatch");
    assertCondition(root.version === 1, "provider authentication input version mismatch");
    assertCondition(root.evidence_mode === "example_fixture"
        || root.evidence_mode === "external_provider_evidence", "provider authentication evidence mode is invalid");
    return {
        marker: PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_MARKER,
        version: PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_VERSION,
        evidence_mode: root.evidence_mode,
        provider_quote_response_input: validatePublicAgentServiceProviderQuoteResponseV1(root.provider_quote_response_input),
        provider_key_binding: validateProviderKeyBinding(root.provider_key_binding),
        authentication_envelope: validateAuthenticationEnvelope(root.authentication_envelope),
    };
}
function verifyBindings(input, responsePacket) {
    const binding = input.provider_key_binding;
    const evidence = input.authentication_envelope;
    assertCondition(binding.provider_id === responsePacket.provider_claim.provider_id, "provider key binding does not match response provider claim");
    assertCondition(evidence.provider_id === binding.provider_id, "authentication provider_id does not match key binding");
    assertCondition(evidence.provider_key_binding_id === binding.binding_id, "authentication provider key binding ID mismatch");
    assertCondition(evidence.response_id === responsePacket.response_id, "authentication response_id mismatch");
    assertCondition(evidence.quote_id === responsePacket.source.quote_id, "authentication quote_id mismatch");
    assertCondition(evidence.handoff_id === responsePacket.source.handoff_id, "authentication handoff_id mismatch");
    assertCondition(evidence.work_order_id === responsePacket.source.work_order_id, "authentication work_order_id mismatch");
    assertCondition(evidence.submission_id === responsePacket.source.submission_id, "authentication submission_id mismatch");
    assertCondition(evidence.request_sha256 === responsePacket.source.request_sha256, "authentication request_sha256 mismatch");
    assertCondition(evidence.receipt_id === responsePacket.source.receipt_id, "authentication receipt_id mismatch");
    assertCondition(evidence.catalog_fingerprint_sha256
        === responsePacket.source.catalog_fingerprint_sha256, "authentication catalog fingerprint mismatch");
    const created = Date.parse(evidence.created_at_utc);
    const expires = Date.parse(evidence.expires_at_utc);
    const bindingStart = Date.parse(binding.valid_from_utc);
    const bindingEnd = Date.parse(binding.expires_at_utc);
    const quoteCreated = Date.parse(responsePacket.quote_envelope.created_at_utc);
    const quoteExpires = Date.parse(responsePacket.quote_envelope.expires_at_utc);
    assertCondition(created >= bindingStart && created < bindingEnd, "authentication creation is outside provider key binding window");
    assertCondition(expires <= bindingEnd, "authentication outlives provider key binding");
    assertCondition(created >= quoteCreated, "authentication cannot predate quote creation");
    assertCondition(expires <= quoteExpires, "authentication cannot outlive quote");
    if (binding.revoked_at_utc !== null) {
        assertCondition(created < Date.parse(binding.revoked_at_utc), "provider key was revoked before authentication");
    }
    const publicKey = publicKeyFromPem(binding.public_key_pem);
    const verified = crypto.verify(null, providerQuoteResponseAuthenticationSigningBytesV1(evidence), publicKey, Buffer.from(evidence.signature_base64, "base64"));
    assertCondition(verified, "provider quote-response authentication signature is invalid");
}
export function materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(inputValue, catalogValue) {
    const input = validatePublicAgentServiceProviderQuoteResponseAuthenticationV1(inputValue);
    const responsePacket = materializePublicAgentServiceProviderQuoteResponseV1(input.provider_quote_response_input, catalogValue);
    verifyBindings(input, responsePacket);
    if (input.evidence_mode === "example_fixture") {
        assertCondition(responsePacket.status === "example_only", "example authentication must bind an example-only response");
        assertCondition(input.provider_key_binding.binding_status === "example_fixture", "example authentication requires example key binding");
    }
    else {
        assertCondition(responsePacket.status === "provider_authentication_required", "external authentication must bind an external response");
        assertCondition(input.provider_key_binding.binding_status
            === "operator_approved_snapshot", "external authentication requires approved provider key binding");
    }
    const example = input.evidence_mode === "example_fixture";
    return {
        marker: PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_PACKET_MARKER,
        version: PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_VERSION,
        authentication_id: input.authentication_envelope.authentication_id,
        status: example
            ? "example_only"
            : "provider_authenticated_for_acceptance",
        source: {
            catalog_fingerprint_sha256: responsePacket.source.catalog_fingerprint_sha256,
            response_id: responsePacket.response_id,
            quote_id: responsePacket.source.quote_id,
            handoff_id: responsePacket.source.handoff_id,
            work_order_id: responsePacket.source.work_order_id,
            submission_id: responsePacket.source.submission_id,
            request_sha256: responsePacket.source.request_sha256,
            receipt_id: responsePacket.source.receipt_id,
            provider_id: responsePacket.provider_claim.provider_id,
            provider_key_binding_id: input.provider_key_binding.binding_id,
            key_id: input.provider_key_binding.key_id,
        },
        provider_key_binding: input.provider_key_binding,
        authentication_envelope: input.authentication_envelope,
        response_packet: responsePacket,
        verification: {
            signature_scheme: PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_SIGNATURE_SCHEME,
            signature_domain: PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_SIGNATURE_DOMAIN,
            canonicalization: PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_CANONICALIZATION,
            key_id_verified: true,
            binding_id_verified: true,
            provider_binding_verified: true,
            signature_verified: true,
            time_window_verified: true,
            nonce_verified: true,
            provider_authentication_verified: true,
        },
        acceptance_gate: {
            eligible_for_acceptance: !example,
            reason: example
                ? "example_fixture_not_live_trust"
                : "provider_authentication_verified",
            separate_acceptance_required: true,
            authentication_replay_protection_required: true,
            authentication_id_consumption_required: true,
            single_active_acceptance_per_quote_required: true,
        },
        authority: {
            provider_selection: false,
            provider_key_binding_creation: false,
            provider_key_registry_write: false,
            quote_generation: false,
            quote_submission: false,
            quote_acceptance: false,
            payment_authorization: false,
            payment_execution: false,
            work_execution_authorization: false,
            work_dispatch: false,
            wallet_access: false,
            production_signing: false,
            transaction_broadcast: false,
            work_credit_write: false,
            http_submission: false,
            credential_change: false,
            runtime_mutation: false,
            money_movement: false,
        },
    };
}
export function verifyPublicAgentServiceProviderQuoteResponseAuthenticationV1(inputValue, catalogValue, packetValue) {
    const expected = materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(inputValue, catalogValue);
    assertCondition(isRecord(packetValue), "provider authentication packet must be an object");
    assertCondition(canonicalJson(packetValue) === canonicalJson(expected), "provider authentication packet does not match source evidence");
    return expected;
}
function readJson(file) {
    const resolved = path.resolve(file);
    const fileStat = fs.lstatSync(resolved);
    assertCondition(!fileStat.isSymbolicLink(), "symlink input forbidden");
    assertCondition(fileStat.isFile(), "regular file input required");
    assertCondition(fileStat.size <= MAX_JSON_BYTES, "JSON input too large");
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
}
function usage() {
    return fail([
        "usage:",
        "  tsx scripts/public_agent_service_provider_quote_response_authentication_v1.ts materialize <input.json> <authentication-packet.json>",
        "  tsx scripts/public_agent_service_provider_quote_response_authentication_v1.ts verify <input.json> <authentication-packet.json>",
    ].join("\n"));
}
function main() {
    const [mode, inputPath, packetPath, ...extra] = process.argv.slice(2);
    assertCondition(extra.length === 0, "unexpected arguments");
    assertCondition(Boolean(inputPath && packetPath), "input and packet paths are required");
    const catalog = readJson("ops/public/agent-services-v1/catalog.json");
    const input = readJson(inputPath);
    if (mode === "materialize") {
        const packet = materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(input, catalog);
        fs.writeFileSync(path.resolve(packetPath), `${JSON.stringify(packet, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
        console.log(`marker=${packet.marker}`);
        console.log(`authentication_id=${packet.authentication_id}`);
        console.log(`status=${packet.status}`);
        console.log(`response_id=${packet.source.response_id}`);
        console.log(`quote_id=${packet.source.quote_id}`);
        console.log(`provider_id=${packet.source.provider_id}`);
        console.log("provider_authentication_verified=true");
        console.log(`eligible_for_acceptance=${packet.acceptance_gate.eligible_for_acceptance}`);
        console.log("provider_selection=false");
        console.log("provider_key_binding_creation=false");
        console.log("provider_key_registry_write=false");
        console.log("quote_acceptance=false");
        console.log("payment_authorization=false");
        console.log("payment_execution=false");
        console.log("work_dispatch=false");
        console.log("production_signing=false");
        console.log("http_submission=false");
        console.log("credential_change=false");
        console.log("runtime_mutation=false");
        console.log("money_movement=false");
        console.log(`output=${path.resolve(packetPath)}`);
        return;
    }
    if (mode === "verify") {
        const packet = readJson(packetPath);
        const result = verifyPublicAgentServiceProviderQuoteResponseAuthenticationV1(input, catalog, packet);
        console.log(`marker=${result.marker}`);
        console.log(`authentication_id=${result.authentication_id}`);
        console.log(`status=${result.status}`);
        console.log("provider_authentication_verified=true");
        console.log(`eligible_for_acceptance=${result.acceptance_gate.eligible_for_acceptance}`);
        console.log("provider_selection=false");
        console.log("provider_key_binding_creation=false");
        console.log("provider_key_registry_write=false");
        console.log("quote_acceptance=false");
        console.log("payment_authorization=false");
        console.log("payment_execution=false");
        console.log("work_dispatch=false");
        console.log("production_signing=false");
        console.log("http_submission=false");
        console.log("credential_change=false");
        console.log("runtime_mutation=false");
        console.log("money_movement=false");
        return;
    }
    usage();
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
