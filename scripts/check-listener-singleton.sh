#!/usr/bin/env bash
set -euo pipefail

# Count only tracked TS/JS under src/, exclude parked snapshots
mapfile -t FILES < <(git ls-files 'src/**/*.ts' 'src/**/*.js' | grep -v '^src/.park/')
# Anchor to the real banner line, not arbitrary mentions
ACTIVE=$(grep -E -h '^[[:space:]]*\(function[[:space:]]+ListenerCeilingGuardV1\(' "${FILES[@]}" | wc -l | tr -d '[:space:]')

if [[ "${ACTIVE}" != "1" ]]; then
  echo "FAIL: expected 1 active ListenerCeilingGuard banner, found ${ACTIVE}" >&2
  # helpful context
  grep -n -R --include='*.ts' --exclude-dir='.git' --exclude='src/.park/*' 'ListenerCeilingGuardV1' src || true
  exit 1
fi
echo "OK: ListenerCeilingGuard singleton verified"
