// SPDX-License-Identifier: VCL-1.0
import {
  createHash,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";

export interface OfficialNetworkAuthenticityRootV2 {
  schema: "void.official-network-authenticity-root.v2";
  marker: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2";
  signature_domain: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2";
  algorithm: "ed25519";
  key_id: string;
  public_key_pem: string;
  payload_sha256: string;
  signature_base64: string;
  status: "ceremony_complete_unpublished";
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalize(record[key])]),
    );
  }
  return value;
}

function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(canonicalize(value))}\n`, "utf8");
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function verifyOfficialNetworkAuthenticityRootV2(
  payload: unknown,
  root: OfficialNetworkAuthenticityRootV2,
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const payloadBytes = canonicalBytes(payload);

  if (root.schema !== "void.official-network-authenticity-root.v2") {
    reasons.push("schema mismatch");
  }
  if (root.marker !== "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2") {
    reasons.push("marker mismatch");
  }
  if (root.signature_domain !== "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2") {
    reasons.push("domain mismatch");
  }
  if (root.algorithm !== "ed25519") reasons.push("algorithm mismatch");
  if (root.status !== "ceremony_complete_unpublished") reasons.push("status mismatch");
  if (root.payload_sha256 !== sha256(payloadBytes)) reasons.push("payload mismatch");

  try {
    const publicKey = createPublicKey(root.public_key_pem);
    const publicDer = publicKey.export({ format: "der", type: "spki" });
    if (root.key_id !== `ed25519:${sha256(publicDer)}`) reasons.push("key ID mismatch");
    if (
      !verifySignature(
        null,
        payloadBytes,
        publicKey,
        Buffer.from(root.signature_base64, "base64"),
      )
    ) reasons.push("signature mismatch");
  } catch {
    reasons.push("public key or signature parse failure");
  }

  return { valid: reasons.length === 0, reasons };
}
