export const VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_V1 =
  "VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_V1";

export const VOID_PUBLIC_BOOTSTRAP_MANIFEST_MEDIA_TYPE_AUTHORITY_V1 =
  Object.freeze({
    generic_json_media_type_required: true,
    structured_json_suffix_allowed: true,
    canonical_github_raw_exception_only: true,
    canonical_repository_owner: "6ZoSo9",
    canonical_repository_name: "void-node",
    canonical_manifest_path: "public/bootstrap/v1.json",
    github_raw_main_or_exact_commit_only: true,
    text_plain_global_acceptance: false,
    octet_stream_global_acceptance: false,
    redirect_authority: false,
    network_request: false,
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
  });

const JSON_MEDIA_TYPE =
  /^application\/(?:json|[a-z0-9!#$&^_.+-]+\+json)$/u;
const CANONICAL_RAW_MEDIA_TYPE =
  /^(?:text\/plain|application\/octet-stream)$/u;
const CANONICAL_RAW_PATH =
  /^\/6ZoSo9\/void-node\/(?:main|[0-9a-f]{40})\/public\/bootstrap\/v1\.json$/u;

function mediaType(value) {
  return String(value || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

function hostname(value) {
  return String(value || "").trim().toLowerCase();
}

function pathname(value) {
  const normalized = String(value || "").trim();
  return normalized.startsWith("/") ? normalized : "";
}

export function classifyVoidPublicBootstrapManifestMediaTypeV1(input) {
  const type = mediaType(input?.content_type);
  const host = hostname(input?.hostname);
  const path = pathname(input?.pathname);

  if (JSON_MEDIA_TYPE.test(type)) {
    return Object.freeze({
      ok: true,
      mode: "json_media_type",
      media_type: type,
      canonical_github_raw_exception: false,
    });
  }

  if (
    host === "raw.githubusercontent.com" &&
    CANONICAL_RAW_PATH.test(path) &&
    CANONICAL_RAW_MEDIA_TYPE.test(type)
  ) {
    return Object.freeze({
      ok: true,
      mode: "canonical_github_raw_json_bytes",
      media_type: type,
      canonical_github_raw_exception: true,
    });
  }

  return Object.freeze({
    ok: false,
    mode: "held",
    reason: "manifest_response_media_type_not_allowed",
    media_type: type || "missing",
    canonical_github_raw_exception: false,
  });
}
