// Canonical Epoch-2 signed-envelope identity, selected by the immutable
// successor presale contract, never by an untrusted HTTP request flag.
// Reviewed Besu plugin: VoidEpoch2RawTransactionDomainPlugin.java.
export const VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 =
  "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
export const VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1 =
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";

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
