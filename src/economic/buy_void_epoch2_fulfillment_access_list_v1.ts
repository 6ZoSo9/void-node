// Canonical Epoch-2 signed-envelope identity, selected by the immutable
// successor presale contract, never by an untrusted HTTP request flag.
// Reviewed Besu plugin: VoidEpoch2RawTransactionDomainPlugin.java.
export const VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 =
  "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
export const VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1 =
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";

// The selected production E2 runtime is explicitly 18553. The retired
// Epoch-1 archive on 8545 also reports chainId 2050 and must never be
// accepted solely because its chain ID matches.
export const VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1 =
  "http://127.0.0.1:18553/";

export function buyVoidPresaleProductionRpcMatchesV1(
  target: unknown,
  rpcUrl: unknown,
): boolean {
  if (!isBuyVoidEpoch2PresaleTargetV1(target)) return true;
  return rpcUrl === VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1;
}

// Read-only public identity admission; it does not attest control of the
// private signing credential or grant deployment/payment authority.
export function buyVoidPresaleFulfillerMatchesV1(
  target: unknown,
  signer: unknown,
): boolean {
  if (!isBuyVoidEpoch2PresaleTargetV1(target)) return true;
  return typeof signer === "string" &&
    signer.toLowerCase() === VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1;
}
// Guard the executable payment runtime against accidental reuse of the
// retired Epoch-1 production checkout. It remains possible to inspect/verify
// historical E1 proof records, but not apply them on the old live endpoint.
// This check is an extra fail-closed apply fence, NOT a signer authorization.
export const VOID_BUY_VOID_RETIRED_EPOCH1_PRESALE_ADDRESS_V1 =
  "0xa40a43adfd174f88309173cb3daa6e09c10154a7";
export const VOID_BUY_VOID_RETIRED_EPOCH1_RPC_PORT_V1 = "8545";

export function buyVoidCurrentPresaleApplyTargetV1(
  target: unknown, rpcUrl: unknown, signer: unknown,
): boolean {
  if (typeof target !== "string" || typeof rpcUrl !== "string" ||
      typeof signer !== "string") return false;
  const normalizedTarget = target.toLowerCase();
  const normalizedSigner = signer.toLowerCase();
  if (normalizedTarget === VOID_BUY_VOID_RETIRED_EPOCH1_PRESALE_ADDRESS_V1) {
    return false;
  }
  let rpc: URL;
  try {
    rpc = new URL(rpcUrl);
  } catch {
    return false;
  }
  if (rpc.protocol !== "http:" || rpc.username || rpc.password ||
      rpc.search || rpc.hash) return false;
  // Both historical canonical 127.0.0.1:8545 and its loopback aliases
  // remain retired execution lanes, not a way to publish new sales.
  if (rpc.port === VOID_BUY_VOID_RETIRED_EPOCH1_RPC_PORT_V1 &&
      (rpc.hostname === "127.0.0.1" ||
       rpc.hostname === "localhost" ||
       rpc.hostname === "[::1]")) return false;
  // Match the selected production listener by parsed endpoint identity,
  // not by raw URL spelling: no slash, alternate loopback names, or added
  // path segments must turn an arbitrary contract into an allowed E2 sale.
  const selectedPortAlias =
    rpc.port === "18553" &&
    (rpc.hostname === "127.0.0.1" ||
     rpc.hostname === "localhost" ||
     rpc.hostname === "[::1]");
  if (normalizedTarget === VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 ||
      selectedPortAlias) {
    return normalizedTarget === VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 &&
      rpcUrl === VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1 &&
      normalizedSigner === VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1;
  }
  // Every executable runtime apply requires the single reviewed E2 tuple.
  // Historical and unreviewed fixtures remain testable through injected
  // inert proof dependencies, never through the live apply admission check.
  return false;
}

export const VOID_BUY_VOID_EPOCH2_MARKER_ADDRESS_V1 =
  "0x0000000000000000000000000000000000002050";
export const VOID_BUY_VOID_EPOCH2_MARKER_KEY_V1 =
  "0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7";

export type BuyVoidEpoch2AccessListEntryV1 = {
  address: string;
  storageKeys: string[];
};

export function isBuyVoidEpoch2PresaleTargetV1(target: unknown): boolean {
  return typeof target === "string" &&
    target.toLowerCase() === VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1;
}

export function buyVoidPresaleRequiredAccessListV1(
  target: unknown,
): BuyVoidEpoch2AccessListEntryV1[] {
  if (!isBuyVoidEpoch2PresaleTargetV1(target)) return [];
  return [{
    address: VOID_BUY_VOID_EPOCH2_MARKER_ADDRESS_V1,
    storageKeys: [VOID_BUY_VOID_EPOCH2_MARKER_KEY_V1],
  }];
}

export function buyVoidPresaleAccessListExactV1(
  observed: unknown,
  target: unknown,
): boolean {
  const expected = buyVoidPresaleRequiredAccessListV1(target);
  if (observed === undefined && expected.length === 0) return true;
  if (!Array.isArray(observed) || observed.length !== expected.length) {
    return false;
  }
  for (let i = 0; i < expected.length; i += 1) {
    const row = observed[i];
    if (!row || typeof row !== "object" || Array.isArray(row) ||
        typeof row.address !== "string" ||
        row.address.toLowerCase() !== expected[i].address ||
        !Array.isArray(row.storageKeys) ||
        row.storageKeys.length !== 1 ||
        typeof row.storageKeys[0] !== "string" ||
        row.storageKeys[0].toLowerCase() !== expected[i].storageKeys[0]) {
      return false;
    }
  }
  return true;
}

// Only the new successor changes its unsigned preimage. Historical
// Epoch-1 requests and their SHA-256 identities remain byte-identical.
// Zero gas fees are supported only for the exact Epoch-2 presale, whose
// reviewed Besu successor was proven capable of zero-native-gas execution.
// The caller must still observe actual RPC gas price and bind the configured
// priority fee; never infer zero fees merely from this address.
export function buyVoidPresaleFeeEnvelopeValidV1(
  maximumFeePerGas: unknown,
  priorityFeePerGas: unknown,
  target: unknown,
): boolean {
  return typeof maximumFeePerGas === "bigint" &&
    typeof priorityFeePerGas === "bigint" &&
    maximumFeePerGas >= 0n &&
    priorityFeePerGas >= 0n &&
    priorityFeePerGas <= maximumFeePerGas &&
    (maximumFeePerGas !== 0n || isBuyVoidEpoch2PresaleTargetV1(target));
}

export function buyVoidPresaleMarkerFingerprintLinesV1(
  target: unknown,
): string[] {
  return isBuyVoidEpoch2PresaleTargetV1(target)
    ? [
        "epoch2_domain=VOID_EPOCH2_SIGNED_ACCESS_LIST_V1",
        "epoch2_marker_address=" + VOID_BUY_VOID_EPOCH2_MARKER_ADDRESS_V1,
        "epoch2_marker_key=" + VOID_BUY_VOID_EPOCH2_MARKER_KEY_V1,
      ]
    : [];
}
