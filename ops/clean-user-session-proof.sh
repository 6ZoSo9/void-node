#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"

XR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
BUS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=${XR}/bus}"

if [ ! -d "$XR" ]; then
  echo "FAIL: XDG_RUNTIME_DIR missing: $XR"
  exit 1
fi

if [ ! -S "${XR}/bus" ]; then
  echo "FAIL: user DBus socket missing: ${XR}/bus"
  exit 1
fi

env -i \
  HOME="$HOME" \
  USER="${USER:-$(id -un)}" \
  LOGNAME="${LOGNAME:-$(id -un)}" \
  SHELL="${SHELL:-/bin/bash}" \
  PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  XDG_RUNTIME_DIR="$XR" \
  DBUS_SESSION_BUS_ADDRESS="$BUS" \
  bash --noprofile --norc -lc '
    set -euo pipefail
    set +H
    set +o histexpand
    cd "'"$ROOT"'"
    ./ops/install-all.sh
  '
