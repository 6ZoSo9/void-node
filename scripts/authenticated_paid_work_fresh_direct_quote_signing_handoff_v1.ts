import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  FRESH_DIRECT_FINALIZATION_INPUT_MARKER,
  FRESH_DIRECT_PROVIDER_SIGNATURE_SUBMISSION_MARKER,
  finalizeAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1,
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1,
  prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1,
  verifyAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1,
  verifyAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1,
  verifyAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1,
  type AuthenticatedPaidWorkFreshDirectAuthenticationPreparationPacketV1,
  type AuthenticatedPaidWorkFreshDirectProviderSigningRequestPacketV1,
  type AuthenticatedPaidWorkFreshDirectRequesterSigningRequestPacketV1,
} from "./authenticated_paid_work_fresh_direct_quote_authentication_preparation_v1.js";

export const FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_V1" as const;
export const FRESH_DIRECT_QUOTE_MAX_JSON_BYTES = 32 * 1024 * 1024;

export type FreshDirectQuoteSignerRoleV1 = "provider" | "requester";

export interface FreshDirectQuoteExternalSignatureV1 {
  marker: typeof FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER;
  version: 1;
  signer_role: FreshDirectQuoteSignerRoleV1;
  key_id: string;
  signing_bytes_sha256: string;
  signature_base64: string;
}

type RecordValue = Record<string, unknown>;

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function requireRecord(value: unknown, label: string): RecordValue {
  assertCondition(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as RecordValue;
}

function requireExactKeys(
  value: RecordValue,
  label: string,
  keys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} must contain exactly: ${expected.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  pattern: RegExp,
  length: number,
): string {
  assertCondition(
    typeof value === "string" &&
      value.length === length &&
      value === value.trim() &&
      pattern.test(value),
    `${label} has invalid format`,
  );
  return value;
}

export function readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(
  file: string,
): unknown {
  const resolved = path.resolve(file);
  const noFollow = fs.constants.O_NOFOLLOW;
  assertCondition(
    Number.isInteger(noFollow) && noFollow !== 0,
    "O_NOFOLLOW is unavailable on this platform",
  );

  let descriptor: number;
  try {
    descriptor = fs.openSync(resolved, fs.constants.O_RDONLY | noFollow);
  } catch (error: unknown) {
    const code =
      error instanceof Error && "code" in error
        ? String((error as NodeJS.ErrnoException).code ?? "")
        : "";
    if (code === "ELOOP") fail("symlink input forbidden");
    throw error;
  }

  try {
    const metadata = fs.fstatSync(descriptor);
    assertCondition(metadata.isFile(), "regular file input required");
    assertCondition(
      metadata.size <= FRESH_DIRECT_QUOTE_MAX_JSON_BYTES,
      "JSON input too large",
    );

    const chunks: Buffer[] = [];
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let totalBytes = 0;
    for (;;) {
      const remaining = FRESH_DIRECT_QUOTE_MAX_JSON_BYTES - totalBytes;
      const bytesRead = fs.readSync(
        descriptor,
        buffer,
        0,
        Math.min(buffer.length, remaining + 1),
        null,
      );
      if (bytesRead === 0) break;
      totalBytes += bytesRead;
      assertCondition(
        totalBytes <= FRESH_DIRECT_QUOTE_MAX_JSON_BYTES,
        "JSON input too large",
      );
      chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
    }

    return JSON.parse(
      Buffer.concat(chunks, totalBytes).toString("utf8"),
    ) as unknown;
  } finally {
    fs.closeSync(descriptor);
  }
}

function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(path.resolve(file), `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
}

function validateExternalSignature(
  value: unknown,
  role: FreshDirectQuoteSignerRoleV1,
  expectedKeyId: string,
  expectedDigest: string,
): FreshDirectQuoteExternalSignatureV1 {
  const root = requireRecord(value, `${role} signature`);
  requireExactKeys(root, `${role} signature`, [
    "marker",
    "version",
    "signer_role",
    "key_id",
    "signing_bytes_sha256",
    "signature_base64",
  ]);
  assertCondition(
    root.marker === FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER,
    `${role} signature marker mismatch`,
  );
  assertCondition(root.version === 1, `${role} signature version mismatch`);
  assertCondition(root.signer_role === role, `${role} signer role mismatch`);
  const keyId = requireString(
    root.key_id,
    `${role} key_id`,
    /^ed25519:[0-9a-f]{64}$/,
    72,
  );
  assertCondition(keyId === expectedKeyId, `${role} key ID mismatch`);
  const digest = requireString(
    root.signing_bytes_sha256,
    `${role} signing_bytes_sha256`,
    /^[0-9a-f]{64}$/,
    64,
  );
  assertCondition(digest === expectedDigest, `${role} signing digest mismatch`);
  const signature = requireString(
    root.signature_base64,
    `${role} signature_base64`,
    /^(?:[A-Za-z0-9+/]{4}){21}[A-Za-z0-9+/]{2}==$/,
    88,
  );
  const decoded = Buffer.from(signature, "base64");
  assertCondition(
    decoded.length === 64 && decoded.toString("base64") === signature,
    `${role} signature is not canonical Ed25519 base64`,
  );
  return {
    marker: FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER,
    version: 1,
    signer_role: role,
    key_id: keyId,
    signing_bytes_sha256: digest,
    signature_base64: signature,
  };
}

export function prepareAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
  input: unknown,
): AuthenticatedPaidWorkFreshDirectProviderSigningRequestPacketV1 {
  return prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(input);
}

export function advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
  input: unknown,
  providerPacketValue: unknown,
  providerSignatureValue: unknown,
): AuthenticatedPaidWorkFreshDirectRequesterSigningRequestPacketV1 {
  const providerPacket =
    verifyAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
      input,
      providerPacketValue,
    );
  const providerSignature = validateExternalSignature(
    providerSignatureValue,
    "provider",
    providerPacket.key_bindings.provider.key_id,
    providerPacket.provider_signing_request.signing_bytes_sha256,
  );
  return prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1({
    marker: FRESH_DIRECT_PROVIDER_SIGNATURE_SUBMISSION_MARKER,
    version: 1,
    preparation_input: input,
    provider_signing_request_packet: providerPacket,
    provider_signature_base64: providerSignature.signature_base64,
  });
}

function buildFinalizationInput(
  input: unknown,
  providerPacketValue: unknown,
  providerSignatureValue: unknown,
  requesterPacketValue: unknown,
  requesterSignatureValue: unknown,
): RecordValue {
  const providerPacket =
    verifyAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
      input,
      providerPacketValue,
    );
  const providerSignature = validateExternalSignature(
    providerSignatureValue,
    "provider",
    providerPacket.key_bindings.provider.key_id,
    providerPacket.provider_signing_request.signing_bytes_sha256,
  );
  const providerSubmission = {
    marker: FRESH_DIRECT_PROVIDER_SIGNATURE_SUBMISSION_MARKER,
    version: 1,
    preparation_input: input,
    provider_signing_request_packet: providerPacket,
    provider_signature_base64: providerSignature.signature_base64,
  } as const;
  const requesterPacket =
    verifyAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(
      providerSubmission,
      requesterPacketValue,
    );
  const requesterSignature = validateExternalSignature(
    requesterSignatureValue,
    "requester",
    providerPacket.key_bindings.requester.key_id,
    requesterPacket.requester_signing_request.signing_bytes_sha256,
  );
  return {
    marker: FRESH_DIRECT_FINALIZATION_INPUT_MARKER,
    version: 1,
    preparation_input: input,
    provider_signing_request_packet: providerPacket,
    provider_signature_base64: providerSignature.signature_base64,
    requester_signing_request_packet: requesterPacket,
    requester_signature_base64: requesterSignature.signature_base64,
  };
}

export function finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
  input: unknown,
  providerPacketValue: unknown,
  providerSignatureValue: unknown,
  requesterPacketValue: unknown,
  requesterSignatureValue: unknown,
): AuthenticatedPaidWorkFreshDirectAuthenticationPreparationPacketV1 {
  return finalizeAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1(
    buildFinalizationInput(
      input,
      providerPacketValue,
      providerSignatureValue,
      requesterPacketValue,
      requesterSignatureValue,
    ),
  );
}

export function verifyAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1(
  input: unknown,
  providerPacketValue: unknown,
  providerSignatureValue: unknown,
  requesterPacketValue: unknown,
  requesterSignatureValue: unknown,
  finalPacketValue: unknown,
): AuthenticatedPaidWorkFreshDirectAuthenticationPreparationPacketV1 {
  return verifyAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1(
    buildFinalizationInput(
      input,
      providerPacketValue,
      providerSignatureValue,
      requesterPacketValue,
      requesterSignatureValue,
    ),
    finalPacketValue,
  );
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts prepare <input.json> <provider-request.json>",
      "  tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts advance <input.json> <provider-request.json> <provider-signature.json> <requester-request.json>",
      "  tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts finalize <input.json> <provider-request.json> <provider-signature.json> <requester-request.json> <requester-signature.json> <final-packet.json>",
      "  tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts verify-final <input.json> <provider-request.json> <provider-signature.json> <requester-request.json> <requester-signature.json> <final-packet.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "prepare") {
    assertCondition(args.length === 2, "prepare requires two paths");
    const packet = prepareAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[0]!),
    );
    writeJson(args[1]!, packet);
    console.log(`packet_id=${packet.packet_id}`);
    console.log(`status=${packet.status}`);
    console.log(
      `signing_bytes_sha256=${packet.provider_signing_request.signing_bytes_sha256}`,
    );
    console.log("private_key_access=false");
    console.log("atomic_persistence=false");
    console.log("payment_execution=false");
    console.log("money_movement=false");
    return;
  }
  if (mode === "advance") {
    assertCondition(args.length === 4, "advance requires four paths");
    const packet = advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[0]!),
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[1]!),
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[2]!),
    );
    writeJson(args[3]!, packet);
    console.log(`packet_id=${packet.packet_id}`);
    console.log(`status=${packet.status}`);
    console.log("provider_signature_verified=true");
    console.log(
      `signing_bytes_sha256=${packet.requester_signing_request.signing_bytes_sha256}`,
    );
    console.log("atomic_persistence=false");
    console.log("payment_execution=false");
    console.log("money_movement=false");
    return;
  }
  if (mode === "finalize" || mode === "verify-final") {
    assertCondition(args.length === 6, `${mode} requires six paths`);
    const input = readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[0]!);
    const providerPacket =
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[1]!);
    const providerSignature =
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[2]!);
    const requesterPacket =
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[3]!);
    const requesterSignature =
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[4]!);
    if (mode === "finalize") {
      const packet = finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
        input,
        providerPacket,
        providerSignature,
        requesterPacket,
        requesterSignature,
      );
      writeJson(args[5]!, packet);
      console.log(`packet_id=${packet.packet_id}`);
      console.log(`status=${packet.status}`);
      console.log(
        `direct_authentication_packet_id=${packet.materialized.direct_authentication_packet.packet_id}`,
      );
      console.log(
        `eligible_for_atomic_activation_persistence=${packet.preparation_gate.eligible_for_atomic_activation_persistence}`,
      );
      console.log("atomic_persistence=false");
      console.log("payment_execution=false");
      console.log("work_dispatch=false");
      console.log("wallet_access=false");
      console.log("money_movement=false");
      return;
    }
    const packet = verifyAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1(
      input,
      providerPacket,
      providerSignature,
      requesterPacket,
      requesterSignature,
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[5]!),
    );
    console.log(`packet_id=${packet.packet_id}`);
    console.log(`status=${packet.status}`);
    console.log("canonical_final_packet_verified=true");
    console.log("payment_execution=false");
    console.log("money_movement=false");
    return;
  }
  usage();
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedUrl) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`HOLD: ${message}`);
    process.exitCode = 1;
  }
}
