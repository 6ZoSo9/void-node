// SPDX-License-Identifier: VCL-1.0
import { createHash, verify as verifySignature } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type OfficialNetworkIdentityStatus =
  | "official"
  | "unverified"
  | "conflicting"
  | "revoked";

interface OfficialNetworkIdentityManifestV1 {
  schema: "void.official-network-identity.v1";
  marker: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_WALL_V1";
  status:
    | "draft_unsealed"
    | "official"
    | "unverified"
    | "conflicting"
    | "revoked";
  project: "VOID Network";
  repository: "6ZoSo9/void-node";
  source_base_commit: string;
  canonical: {
    chain_id: number;
    network_name: string;
    genesis_network_name: string;
    genesis_file: "genesis.json";
    genesis_sha256: string;
  };
  forensic_fingerprint_registry: {
    path: "config/source-forensic-fingerprint-registry-v1.json";
    canonical_sha256: string;
  };
  authority: {
    algorithm: "ed25519";
    key_id: string | null;
    public_key_pem: string | null;
    signature_base64: string | null;
  };
}

export interface VerifyOfficialNetworkIdentityV1Input {
  repoRoot: string;
  trustedPublicKeyPem?: string;
}

export interface VerifyOfficialNetworkIdentityV1Result {
  status: OfficialNetworkIdentityStatus;
  reasons: string[];
  chainId?: number;
  networkName?: string;
  genesisSha256?: string;
  keyId?: string;
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function canonicalJson(value: unknown): Buffer {
  const sortValue = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(sortValue);
    if (input !== null && typeof input === "object") {
      const record = input as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(record)
          .sort()
          .map((key) => [key, sortValue(record[key])]),
      );
    }
    return input;
  };
  return Buffer.from(`${JSON.stringify(sortValue(value))}\n`, "utf8");
}

export function officialNetworkIdentitySignaturePayloadV1(
  manifest: OfficialNetworkIdentityManifestV1,
): Buffer {
  return canonicalJson({
    schema: manifest.schema,
    marker: manifest.marker,
    project: manifest.project,
    repository: manifest.repository,
    source_base_commit: manifest.source_base_commit,
    canonical: manifest.canonical,
    forensic_fingerprint_registry: manifest.forensic_fingerprint_registry,
    authority: {
      algorithm: manifest.authority.algorithm,
      key_id: manifest.authority.key_id,
      public_key_pem: manifest.authority.public_key_pem,
    },
  });
}

export async function verifyOfficialNetworkIdentityV1(
  input: VerifyOfficialNetworkIdentityV1Input,
): Promise<VerifyOfficialNetworkIdentityV1Result> {
  const manifestPath = resolve(
    input.repoRoot,
    "config/official-network-identity-v1.json",
  );
  const manifest = JSON.parse(
    await readFile(manifestPath, "utf8"),
  ) as OfficialNetworkIdentityManifestV1;

  const reasons: string[] = [];
  if (manifest.schema !== "void.official-network-identity.v1") {
    reasons.push("schema mismatch");
  }
  if (manifest.marker !== "VOID_OFFICIAL_NETWORK_AUTHENTICITY_WALL_V1") {
    reasons.push("marker mismatch");
  }

  const genesisPath = resolve(input.repoRoot, manifest.canonical.genesis_file);
  const genesisBytes = await readFile(genesisPath);
  const genesis = JSON.parse(genesisBytes.toString("utf8")) as {
    chainId?: unknown;
    networkName?: unknown;
  };
  const actualGenesisSha256 = sha256(genesisBytes);

  if (genesis.chainId !== manifest.canonical.chain_id) {
    reasons.push("chain id conflicts with genesis");
  }
  if (genesis.networkName !== manifest.canonical.genesis_network_name) {
    reasons.push("legacy genesis network name conflicts with genesis");
  }
  if (actualGenesisSha256 !== manifest.canonical.genesis_sha256) {
    reasons.push("genesis SHA-256 mismatch");
  }

  const registryPath = resolve(
    input.repoRoot,
    manifest.forensic_fingerprint_registry.path,
  );
  const registry = JSON.parse(await readFile(registryPath, "utf8")) as unknown;
  const actualRegistrySha256 = sha256(canonicalJson(registry));
  if (
    actualRegistrySha256 !==
    manifest.forensic_fingerprint_registry.canonical_sha256
  ) {
    reasons.push("forensic fingerprint registry SHA-256 mismatch");
  }

  if (reasons.length > 0) {
    return {
      status: "conflicting",
      reasons,
      chainId:
        typeof genesis.chainId === "number" ? genesis.chainId : undefined,
      networkName:
        typeof genesis.networkName === "string"
          ? genesis.networkName
          : undefined,
      genesisSha256: actualGenesisSha256,
    };
  }

  if (manifest.status === "revoked") {
    return {
      status: "revoked",
      reasons: ["manifest status is revoked"],
      chainId: manifest.canonical.chain_id,
      networkName: manifest.canonical.network_name,
      genesisSha256: actualGenesisSha256,
      keyId: manifest.authority.key_id ?? undefined,
    };
  }

  const trustedKey = input.trustedPublicKeyPem;
  const manifestKey = manifest.authority.public_key_pem;
  const signature = manifest.authority.signature_base64;

  if (!trustedKey || !manifestKey || !signature || !manifest.authority.key_id) {
    return {
      status: "unverified",
      reasons: ["trusted offline signature is not fully configured"],
      chainId: manifest.canonical.chain_id,
      networkName: manifest.canonical.network_name,
      genesisSha256: actualGenesisSha256,
      keyId: manifest.authority.key_id ?? undefined,
    };
  }

  if (trustedKey.trim() !== manifestKey.trim()) {
    return {
      status: "conflicting",
      reasons: ["manifest key conflicts with pinned trusted key"],
      chainId: manifest.canonical.chain_id,
      networkName: manifest.canonical.network_name,
      genesisSha256: actualGenesisSha256,
      keyId: manifest.authority.key_id,
    };
  }

  const valid = verifySignature(
    null,
    officialNetworkIdentitySignaturePayloadV1(manifest),
    trustedKey,
    Buffer.from(signature, "base64"),
  );

  return {
    status: valid ? "official" : "conflicting",
    reasons: valid ? [] : ["Ed25519 signature verification failed"],
    chainId: manifest.canonical.chain_id,
    networkName: manifest.canonical.network_name,
    genesisSha256: actualGenesisSha256,
    keyId: manifest.authority.key_id,
  };
}
