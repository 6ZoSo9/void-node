#!/usr/bin/env bash
set -euo pipefail
# VOID_PUBLIC_FRONTDOOR_CUTOVER_V1 compatibility entrypoint.
# The combined installer and automatic service rollback are retired.
# V2 requires an exact prepared content-CAS confirmation and never changes services.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
if [[ "$#" == 0 ]]; then
  set -- --status
fi
exec python3 "$SCRIPT_DIR/void_public_frontdoor_cutover_v2.py" "$@"
