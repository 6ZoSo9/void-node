import {
  BOOTSTRAP_RECORD_V2_PREFIX,
  deriveMirroredRecordUrl,
  validateBootstrapRecordV2,
  validateMirrorSet,
} from "./void_public_bootstrap_record_v2_mirror_contract_v1.mjs";

export const VOID_BOOTSTRAP_RECORD_V2_LOCATOR_RESOLVER_V1 =
  "void_public_bootstrap_record_v2_locator_resolver_v1";

export const MAX_BOOTSTRAP_RECORD_V2_BYTES = 1024 * 1024;

const RECORD_ID_RE = /^voidpbr2_[0-9a-f]{64}$/;

function requireExpectedRecordId(raw) {
  const recordId = String(raw || "");
  if (!RECORD_ID_RE.test(recordId)) {
    throw new Error(
      `exact expected ${BOOTSTRAP_RECORD_V2_PREFIX}<sha256> record ID is required`,
    );
  }
  return recordId;
}

function boundedBytes(raw) {
  let bytes;
  if (Buffer.isBuffer(raw)) bytes = Buffer.from(raw);
  else if (raw instanceof Uint8Array) bytes = Buffer.from(raw);
  else if (typeof raw === "string") bytes = Buffer.from(raw, "utf8");
  else throw new Error("record locator fetch must return bytes or UTF-8 text");

  if (bytes.length < 2 || bytes.length > MAX_BOOTSTRAP_RECORD_V2_BYTES) {
    throw new Error(
      `bootstrap record mirror bytes must be from 2 through ${MAX_BOOTSTRAP_RECORD_V2_BYTES}`,
    );
  }
  return bytes;
}

function parseRecordBytes(bytes) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("bootstrap record mirror returned invalid JSON");
  }
}

function boundedError(error) {
  return String(error?.message || error || "unknown locator mirror failure")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 320);
}

/**
 * Resolve one exact caller-pinned bootstrap record from a replaceable locator
 * mirror set.
 *
 * Locator mirrors are distribution only. They are deliberately outside the
 * bootstrap record, so changing the locator plan cannot change record_id.
 *
 * The caller MUST already possess the expected voidpbr2_ content ID through a
 * separately reviewed release/trust-root mechanism. A mirror is never allowed
 * to substitute a different self-consistent record.
 *
 * fetchBytes is injected by the eventual transport integration. This source
 * contract performs no network I/O itself.
 */
export async function resolveBootstrapRecordV2FromLocatorMirrors({
  locatorMirrors,
  expectedRecordId,
  fetchBytes,
  nowMs = Date.now(),
}) {
  if (typeof fetchBytes !== "function") {
    throw new Error("bootstrap record locator resolver requires fetchBytes");
  }
  if (!Number.isFinite(nowMs)) {
    throw new Error("bootstrap record locator verification time is invalid");
  }

  const recordId = requireExpectedRecordId(expectedRecordId);
  const mirrors = validateMirrorSet(locatorMirrors);
  const failures = [];

  for (const mirror of mirrors) {
    const url = deriveMirroredRecordUrl(mirror, recordId);
    try {
      const bytes = boundedBytes(
        await fetchBytes({
          mirror,
          url,
          expected_record_id: recordId,
        }),
      );
      const parsed = parseRecordBytes(bytes);
      const record = validateBootstrapRecordV2(parsed, { nowMs });

      if (record.record_id !== recordId) {
        throw new Error(
          "locator mirror returned a valid but unpinned bootstrap record ID",
        );
      }

      return Object.freeze({
        marker: VOID_BOOTSTRAP_RECORD_V2_LOCATOR_RESOLVER_V1,
        expected_record_id: recordId,
        record,
        bytes,
        locator_mirror: mirror,
        url,
        attempted_mirrors: failures.length + 1,
        prior_failures: Object.freeze([...failures]),
      });
    } catch (error) {
      failures.push(
        Object.freeze({
          mirror: mirror.base_url,
          failure_domain: mirror.failure_domain,
          error: boundedError(error),
        }),
      );
    }
  }

  const summary = failures
    .map(
      (entry) =>
        `${entry.failure_domain}/${entry.mirror}: ${entry.error}`,
    )
    .join("; ");

  throw new Error(`all bootstrap record locator mirrors failed: ${summary}`);
}
