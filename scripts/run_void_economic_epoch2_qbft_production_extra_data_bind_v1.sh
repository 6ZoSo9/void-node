#!/usr/bin/env bash
set -Eeuo pipefail

BESU_IMAGE_CANONICAL="hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042"
BESU_IMAGE="${BESU_IMAGE:-$BESU_IMAGE_CANONICAL}"

binding="${1:?usage: $0 BINDING_JSON OUTPUT_DIR}"
output_dir="${2:?usage: $0 BINDING_JSON OUTPUT_DIR}"

test "$BESU_IMAGE" = "$BESU_IMAGE_CANONICAL"
test -f "$binding"

work="$(mktemp -d "${TMPDIR:-/tmp}/void-qbft-production-extra-data-v1.XXXXXX")"
chmod 0755 "$work"
cleanup() {
  rm -rf "$work"
}
trap cleanup EXIT INT TERM

validators="$work/validators.json"
extra_data="$work/qbft-extra-data.txt"

echo "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_BIND_RUNTIME_V1"
echo "besu_image=$BESU_IMAGE"
echo "binding=$binding"
echo "production_validator_set_bound=false"
echo "validator_mutation=false"
echo "authoritative_chain2050_write=false"
echo "migration_authorized=false"
echo "public_activation_authorized=false"
echo "funds_movement=false"

node tools/void-economic-epoch2-qbft-production-extra-data-preflight-v1.mjs \
  --binding "$binding" \
  --output "$validators"

test -s "$validators"
chmod 0444 "$validators"

docker pull "$BESU_IMAGE" >/dev/null
observed_digest="$(docker inspect --format='{{index .RepoDigests 0}}' "$BESU_IMAGE")"
test "$observed_digest" = "$BESU_IMAGE_CANONICAL"

docker run --rm \
  -v "$work:/work:ro" \
  "$BESU_IMAGE" \
  rlp encode \
  --from=/work/validators.json \
  --type=QBFT_EXTRA_DATA \
  > "$extra_data"

grep -Eq '^0x[0-9a-fA-F]+$' "$extra_data"
test "$(wc -l < "$extra_data")" -eq 1

node tools/void-economic-epoch2-qbft-production-extra-data-bind-v1.mjs \
  --binding "$binding" \
  --extra-data "$extra_data" \
  --besu-image-digest "$observed_digest" \
  --output-dir "$output_dir"

echo "besu_qbft_extra_data_generated=true"
echo "besu_qbft_extra_data_runtime_identity_verified=true"
echo "production_extra_data_built=true"
echo "production_validator_set_bound=false"
echo "validator_mutation=false"
echo "authoritative_chain2050_write=false"
echo "migration_authorized=false"
echo "public_activation_authorized=false"
echo "funds_movement=false"
echo "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_BIND_RUNTIME_V1_GREEN"
