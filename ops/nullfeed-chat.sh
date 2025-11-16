#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 '#channel' [lines]"
  exit 1
fi

CHAN="$1"
LINES="${2:-20}"

# Move to repo root
cd "$(dirname "$0")/.." || exit 1

if [ ! -x ./ops/nullfeed-post.sh ]; then
  echo "[ERR] ./ops/nullfeed-post.sh not found or not executable"
  exit 1
fi

if [ ! -x ./ops/nullfeed-tail.sh ]; then
  echo "[ERR] ./ops/nullfeed-tail.sh not found or not executable"
  exit 1
fi

echo "[chat] channel=$CHAN lines=$LINES"
echo "[chat] commands: /quit to exit"
echo

# Background printer: redraw every 2s
(
  while true; do
    clear
    echo "=== NullFeed :: $CHAN (last $LINES) ==="
    echo
    ./ops/nullfeed-tail.sh "$CHAN" "$LINES" || echo "[no messages yet]"
    sleep 2
  done
) &
PRINTER_PID=$!

cleanup() {
  kill "$PRINTER_PID" 2>/dev/null || true
  wait "$PRINTER_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# Input loop
while true; do
  printf '> ' >&2
  if ! IFS= read -r line; then
    break
  fi

  # Skip empty
  if [ -z "$line" ]; then
    continue
  fi

  # Commands
  case "$line" in
    /quit|/exit)
      echo "[chat] exiting..."
      break
      ;;
  esac

  # Normal message → post to channel
  ./ops/nullfeed-post.sh "$CHAN" "$line" || echo "[ERR] post failed"
done

cleanup
