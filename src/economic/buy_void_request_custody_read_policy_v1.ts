export const VOID_BUY_VOID_REQUEST_CUSTODY_READ_POLICY_V1 =
  "VOID_BUY_VOID_REQUEST_CUSTODY_READ_POLICY_V1";

export const VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_ENV_V1 =
  "VOID_BUY_REQUEST_CUSTODY_READ_GID";

export const VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1 = 0o750;
export const VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1 = 0o640;

export const VOID_BUY_VOID_REQUEST_CUSTODY_READ_POLICY_AUTHORITY_V1 =
  Object.freeze({
    opt_in_only: true,
    absolute_preprovisioned_request_root_required: true,
    runtime_uid_remains_owner: true,
    dedicated_ipc_gid_required: true,
    request_directory_group_read_execute_required: true,
    fixed_journals_preprovisioned_required: true,
    fixed_journals_group_readable_only: true,
    customer_sidecars_group_readable: false,
    operator_sidecars_group_readable: false,
    group_write_authority: false,
    other_read_authority: false,
    custody_write_authority: false,
    service_mutation: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const GID = /^[1-9][0-9]{0,9}$/u;

export function parseBuyVoidRequestCustodyReadGidV1(
  raw: unknown,
): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (
    typeof raw !== "string" ||
    raw !== raw.trim() ||
    !GID.test(raw)
  ) {
    throw new Error("buy_void_request_custody_read_gid_invalid");
  }
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 0x7fff_ffff
  ) {
    throw new Error("buy_void_request_custody_read_gid_invalid");
  }
  return value;
}

export const VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_V1 =
  parseBuyVoidRequestCustodyReadGidV1(
    process.env[VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_ENV_V1],
  );

export const VOID_BUY_VOID_REQUEST_CUSTODY_READ_ENABLED_V1 =
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_V1 !== null;
