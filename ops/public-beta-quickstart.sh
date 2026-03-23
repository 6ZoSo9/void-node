#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

say(){ printf '%s\n' "$*"; }

say "=== public beta: install-devbox ==="
if ! ./ops/install-devbox-ubuntu.sh; then
  echo
  say "FAIL public-beta-quickstart: install-devbox failed"
  say "NEXT: inspect the output above, then run ./ops/install-path-status.sh"
  exit 1
fi

echo
say "=== public beta: user units ==="
if ! ./ops/install-user-units.sh; then
  echo
  say "FAIL public-beta-quickstart: install-user-units failed"
  say "NEXT: inspect the output above, then run ./ops/install-path-status.sh"
  exit 1
fi

echo
say "=== public beta: first-run smoke ==="
if ! ./ops/first-run-smoke.sh; then
  echo
  say "FAIL public-beta-quickstart: first-run-smoke failed"
  say "NEXT: run ./ops/install-path-status.sh"
  exit 1
fi

echo
say "=== public beta: preflight ==="
if ! make public-beta-preflight; then
  echo
  say "FAIL public-beta-quickstart: public-beta-preflight failed"
  say "NEXT: run make wc-wallet-proof"
  say "NEXT: run ./ops/install-path-status.sh"
  exit 1
fi

echo
say "=== public beta: demo proof ==="
if ! ./ops/demo-video-proof.sh; then
  echo
  say "FAIL public-beta-quickstart: demo-video-proof failed"
  say "NEXT: run make public-beta-preflight"
  say "NEXT: run ./ops/install-path-status.sh"
  say "NEXT: run ./ops/demo-smoke-follower.sh"
  exit 1
fi

echo
say "=== public beta: final ==="
say "PASS public-beta-quickstart"
say "node: install/startup path OK"
say "proof: public-beta-preflight OK"
say "proof: demo-video-proof OK"
say "next: use ./ops/install-path-status.sh for live status"
