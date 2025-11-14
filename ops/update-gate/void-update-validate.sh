#!/usr/bin/env bash
set -euo pipefail

file="${1:-}"

if [[ -z "$file" ]]; then
  echo "Usage: $0 manifest.json" >&2
  exit 1
fi

if [[ ! -f "$file" ]]; then
  echo "[ERR] file not found: $file" >&2
  exit 1
fi

if ! jq empty "$file" >/dev/null 2>&1; then
  echo "[ERR] invalid JSON: $file" >&2
  exit 1
fi

require_string() {
  local path="$1"
  local label="$2"
  if ! jq -e "$path | type == \"string\"" "$file" >/dev/null 2>&1; then
    echo "[ERR] missing/non-string field: $label" >&2
    exit 1
  fi
}

require_number() {
  local path="$1"
  local label="$2"
  if ! jq -e "$path | type == \"number\"" "$file" >/dev/null 2>&1; then
    echo "[ERR] missing/non-number field: $label" >&2
    exit 1
  fi
}

require_boolean() {
  local path="$1"
  local label="$2"
  if ! jq -e "$path | type == \"boolean\"" "$file" >/dev/null 2>&1; then
    echo "[ERR] missing/non-boolean field: $label" >&2
    exit 1
  fi
}

# Required string fields
require_string '.app' '.app'
require_string '.network' '.network'
require_string '.version' '.version'
require_string '.rolloutStartTime' '.rolloutStartTime'
require_string '.deadline' '.deadline'
require_string '.binaryUrl' '.binaryUrl'
require_string '.binarySha256' '.binarySha256'
require_string '.notesHash' '.notesHash'

# Required number fields
require_number '.chainId' '.chainId'
require_number '.protocolVersion' '.protocolVersion'
require_number '.minProtocolCompatible' '.minProtocolCompatible'
require_number '.activationHeight' '.activationHeight'

# Required boolean field
require_boolean '.emergency' '.emergency'

echo "[OK] manifest structurally valid: $file"
