import {
  validateVoidBootstrapRecordReleaseRootV1,
  validateVoidBootstrapRecordSignedIdV1,
} from "./void_bootstrap_record_release_root_v1.mjs";
import {
  resolveManifestFromBootstrapRecordV2,
} from "./void_public_bootstrap_record_v2_mirror_contract_v1.mjs";
import {
  resolveBootstrapRecordV2FromLocatorMirrors,
} from "./void_public_bootstrap_record_v2_locator_resolver_v1.mjs";

export const VOID_PUBLIC_BOOTSTRAP_RELEASE_LOCATOR_COMPOSITION_V1 =
  "void_public_bootstrap_release_locator_composition_v1";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireFetchFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(`${label} must be a function`);
  }
  return value;
}

/**
 * Compose the portable release trust root with the record locator and manifest
 * mirror contracts. Transport remains injected and untrusted; this function
 * performs no network I/O by itself.
 */
export async function resolveVoidPublicBootstrapFromReleaseRootV1({
  releaseRoot,
  signedRecordId,
  locatorMirrors,
  fetchRecordBytes,
  fetchManifestBytes,
  nowMs = Date.now(),
}) {
  if (!Number.isFinite(nowMs)) {
    throw new Error("bootstrap release composition verification time is invalid");
  }

  // Both trust checks deliberately happen before transport callbacks are
  // accepted or invoked. A hold root therefore cannot trigger locator traffic.
  const validatedRoot = validateVoidBootstrapRecordReleaseRootV1(releaseRoot, {
    allowHold: false,
  });
  const signedId = validateVoidBootstrapRecordSignedIdV1(
    signedRecordId,
    validatedRoot,
  );
  const recordFetcher = requireFetchFunction(
    fetchRecordBytes,
    "bootstrap record locator fetch",
  );
  const manifestFetcher = requireFetchFunction(
    fetchManifestBytes,
    "bootstrap manifest mirror fetch",
  );

  const recordResolution =
    await resolveBootstrapRecordV2FromLocatorMirrors({
      locatorMirrors,
      expectedRecordId: signedId.recordId,
      fetchBytes: recordFetcher,
      nowMs,
    });

  if (recordResolution.record.record_id !== signedId.recordId) {
    throw new Error("release-authorized bootstrap record ID changed after resolution");
  }

  const manifestResolution = await resolveManifestFromBootstrapRecordV2(
    recordResolution.record,
    manifestFetcher,
    { nowMs },
  );

  if (manifestResolution.record.record_id !== signedId.recordId) {
    throw new Error("manifest resolution escaped the release-authorized record");
  }

  return deepFreeze({
    marker: VOID_PUBLIC_BOOTSTRAP_RELEASE_LOCATOR_COMPOSITION_V1,
    release_root_id: validatedRoot.root.root_id,
    release_signature_domain: validatedRoot.root.signature_domain,
    release_threshold: validatedRoot.root.threshold,
    valid_record_id_signature_count: signedId.validSignatureCount,
    record_id: signedId.recordId,
    record_locator: {
      transport: recordResolution.locator_mirror.transport,
      failure_domain: recordResolution.locator_mirror.failure_domain,
      url: recordResolution.url,
      attempted_mirrors: recordResolution.attempted_mirrors,
      prior_failure_count: recordResolution.prior_failures.length,
    },
    manifest_id: manifestResolution.record.manifest.manifest_id,
    manifest_locator: {
      transport: manifestResolution.mirror.transport,
      failure_domain: manifestResolution.mirror.failure_domain,
      url: manifestResolution.url,
      prior_failure_count: manifestResolution.failures.length,
    },
    manifest: structuredClone(manifestResolution.manifest),
    transport_is_authority: false,
    network_io_implemented: false,
    launcher_activation_performed: false,
  });
}
