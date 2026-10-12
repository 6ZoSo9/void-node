#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
test ! -e "$HERE/intentionally-absent-command.json"
test ! -e "$HERE/intentionally-absent-trusted-context.json"
NODE="$(command -v node || true)"
test -n "$NODE" && test -x "$NODE" || {
  printf 'HOLD: Node.js 22 executable is unavailable
' >&2
  exit 1
}
NODE_MAJOR="$("$NODE" -p 'process.versions.node.split(".")[0]')"
test "$NODE_MAJOR" = "22" || {
  printf 'HOLD: Node.js 22 is required; found major %s
' "$NODE_MAJOR" >&2
  exit 1
}
exec "$NODE"   "$HERE/dist/scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.js"   execute   "$HERE/disabled-config.json"   "$HERE/intentionally-absent-command.json"   "$HERE/intentionally-absent-trusted-context.json"
