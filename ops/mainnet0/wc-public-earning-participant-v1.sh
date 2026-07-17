#!/usr/bin/env bash
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

set -u

MARKER="VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1"
PILOT_MARKER="VOID_WC_PUBLIC_EARNING_PILOT_V1"
EXECUTE_ROUTE="/wc/public-earning-pilot-v1/execute-local?dry=0&confirm=wcPublicEarningPilotExecuteLocal"
STATUS_ROUTE="/wc/public-earning-pilot-v1/status"

usage() {
  cat <<'USAGE'
Usage:
  ops/mainnet0/wc-public-earning-participant-v1.sh \
    <ticket-file.json> <trusted-coordinator-base> <trusted-coordinator-node-id>

Example:
  ops/mainnet0/wc-public-earning-participant-v1.sh \
    ~/Downloads/void-wc-ticket.json \
    https://public-void-gateway.example \
    9d89483769e469e0473b489dc50dba96

The command validates the ticket, local executor identity, trusted coordinator
identity, and pre-execution balance. It then asks the local VOID node to perform
one ticket-bound job and verifies the exact 3 WC canonical delta. Outbound-bundle
tickets require no inbound participant port or coordinator callback.

The capability token is never printed. The ticket file is deleted only after
an exact-green completion. A mode-600 sanitized receipt is retained.
USAGE
}

fail() {
  MESSAGE="$1"
  echo "$MARKER HOLD: $MESSAGE" >&2
  exit 1
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

json_get() {
  FILE="$1"
  FILTER="$2"
  jq -r "$FILTER" "$FILE" 2>/dev/null
}

fetch_json() {
  URL="$1"
  OUT="$2"
  curl -fsS --max-time 12 -H 'accept: application/json' "$URL" >"$OUT" 2>/dev/null
}

if test "${1:-}" = "--help" || test "${1:-}" = "-h"
then
  usage
  exit 0
fi

if test "$#" -ne 3
then
  usage >&2
  exit 2
fi

for CMD in bash curl jq python3 sha256sum stat mktemp date chmod rm mkdir awk grep tr
 do
  need_command "$CMD"
 done

TICKET_FILE="$1"
COORDINATOR_BASE_RAW="$2"
TRUSTED_COORDINATOR_NODE_ID="$(printf '%s' "$3" | tr '[:upper:]' '[:lower:]')"

case "$TRUSTED_COORDINATOR_NODE_ID" in
  *[!0-9a-f]*|'') fail "trusted coordinator node ID must be 32 lowercase hex characters" ;;
esac

test "${#TRUSTED_COORDINATOR_NODE_ID}" -eq 32 || \
  fail "trusted coordinator node ID must be 32 lowercase hex characters"

test -f "$TICKET_FILE" || fail "ticket file not found: $TICKET_FILE"
chmod 600 "$TICKET_FILE" || fail "cannot secure ticket file"

COORDINATOR_BASE="$(
  python3 - "$COORDINATOR_BASE_RAW" <<'PY'
from ipaddress import ip_address, ip_network
from urllib.parse import urlsplit
import sys

raw = sys.argv[1].strip()
try:
    parsed = urlsplit(raw)
except Exception:
    raise SystemExit(1)

if parsed.scheme not in {"http", "https"}:
    raise SystemExit(1)
if not parsed.netloc or parsed.username or parsed.password:
    raise SystemExit(1)
if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
    raise SystemExit(1)

host = parsed.hostname or ""
if parsed.scheme == "http":
    allowed = host == "localhost"
    try:
        address = ip_address(host)
        allowed = (
            allowed
            or address.is_loopback
            or address in ip_network("100.64.0.0/10")
            or address in ip_network("fd7a:115c:a1e0::/48")
        )
    except ValueError:
        pass
    if not allowed:
        raise SystemExit(1)

print(f"{parsed.scheme}://{parsed.netloc}")
PY
)" || fail "invalid trusted coordinator base; use HTTPS or loopback/Tailscale HTTP"

PORT="${VOID_WC_PARTICIPANT_HTTP_PORT:-${HTTP_PORT:-${VOID_HTTP_PORT:-4100}}}"
case "$PORT" in
  *[!0-9]*|'') fail "invalid participant HTTP port" ;;
esac

LOCAL_BASE="http://127.0.0.1:$PORT"
STATE_DIR="${VOID_WC_PARTICIPANT_STATE_DIR:-$HOME/.local/state/void/wc-public-earning-participant-v1}"
mkdir -p "$STATE_DIR" || fail "cannot create participant state directory"
chmod 700 "$STATE_DIR" || fail "cannot secure participant state directory"

STAMP="$(date +%Y%m%dT%H%M%S%N%z)-$$"
TMP_DIR="$(mktemp -d "$STATE_DIR/.run-$STAMP-XXXXXX")" || fail "cannot create private working directory"
chmod 700 "$TMP_DIR"

REQUEST_FILE="$TMP_DIR/request.json"
LOCAL_HEALTH_FILE="$TMP_DIR/local-health.json"
LOCAL_STATUS_FILE="$TMP_DIR/local-status.json"
COORD_HEALTH_FILE="$TMP_DIR/coordinator-health.json"
COORD_STATUS_FILE="$TMP_DIR/coordinator-status.json"
BALANCE_BEFORE_FILE="$TMP_DIR/balance-before.json"
BALANCE_AFTER_FILE="$TMP_DIR/balance-after.json"
RESPONSE_FILE="$STATE_DIR/private-response-$STAMP.json"
RECEIPT_FILE="$STATE_DIR/participant-receipt-$STAMP.json"
HTTP_CODE_FILE="$TMP_DIR/http-code.txt"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

response_contains_ticket_token() {
  python3 - "$TICKET_FILE" "$RESPONSE_FILE" <<'PY'
import json
import sys
from pathlib import Path

ticket_path = Path(sys.argv[1])
response_path = Path(sys.argv[2])

if not ticket_path.is_file() or not response_path.is_file():
    raise SystemExit(1)

try:
    root = json.loads(ticket_path.read_text())
except Exception:
    raise SystemExit(1)

token = root.get("capability_token") if isinstance(root, dict) else None
if not isinstance(token, str) or not token:
    raise SystemExit(1)

response = response_path.read_text(errors="replace")
raise SystemExit(0 if token in response else 1)
PY
}

TOKEN="$(json_get "$TICKET_FILE" '.capability_token // empty')"
test -n "$TOKEN" || fail "ticket file has no capability token"

TICKET_JSON="$(
  jq -c '
    if (.ticket | type) == "object" then
      .ticket
    else
      del(
        .capability_token,
        .capability_token_returned_once,
        .coordinator_base,
        .coordinator_node_id
      )
    end
  ' "$TICKET_FILE" 2>/dev/null
)" || fail "ticket file is not valid JSON"

printf '%s\n' "$TICKET_JSON" | jq -e 'type == "object"' >/dev/null 2>&1 || \
  fail "ticket object is missing"

TICKET_ID="$(printf '%s' "$TICKET_JSON" | jq -r '.ticket_id // empty')"
ACCOUNT="$(printf '%s' "$TICKET_JSON" | jq -r '.account // empty')"
EXECUTOR_NODE_ID="$(printf '%s' "$TICKET_JSON" | jq -r '.executor_node_id // empty' | tr '[:upper:]' '[:lower:]')"
DATASET_ID="$(printf '%s' "$TICKET_JSON" | jq -r '.dataset_id // empty')"
EXPECTED_INPUT_HASH="$(printf '%s' "$TICKET_JSON" | jq -r '.expected_input_hash // empty' | tr '[:upper:]' '[:lower:]')"
TOKEN_SHA_STORED="$(printf '%s' "$TICKET_JSON" | jq -r '.token_sha256 // empty' | tr '[:upper:]' '[:lower:]')"
TRANSPORT_MODE="$(
  printf '%s' "$TICKET_JSON" |
  jq -r '
    .transport_mode //
    (if ((.executor_http_base // "") | length) > 0
     then "inbound_fetch"
     else "outbound_bundle"
     end)
  '
)"
EXPIRES_AT_MS="$(printf '%s' "$TICKET_JSON" | jq -r '.expires_at_ms // 0')"

printf '%s' "$TICKET_JSON" | jq -e \
  --arg marker "$PILOT_MARKER" \
  --arg transport "$TRANSPORT_MODE" \
  '.marker == $marker and
   .version == 1 and
   .task_class == "datanet_fetch_verify" and
   .fixed_award_wc == 3 and
   .status == "issued" and
   ($transport == "inbound_fetch" or $transport == "outbound_bundle") and
   (
     ($transport == "inbound_fetch" and
      (.executor_http_base | type == "string" and length > 0)) or
     ($transport == "outbound_bundle" and
      ((.executor_http_base // "") == ""))
   ) and
   (.ticket_id | type == "string" and test("^[0-9a-f]{32}$")) and
   (.account | type == "string" and test("^[A-Za-z0-9._:-]{1,128}$")) and
   (.executor_node_id | type == "string" and test("^[0-9a-f]{32}$")) and
   (.dataset_id | type == "string" and length > 0 and length <= 160) and
   (.expected_input_hash | type == "string" and test("^[0-9a-f]{64}$")) and
   (.token_sha256 | type == "string" and test("^[0-9a-f]{64}$")) and
   (.expires_at_ms | type == "number")' \
  >/dev/null 2>&1 || fail "ticket contract validation failed"

TOKEN_SHA_NOW="$(printf '%s' "$TOKEN" | sha256sum | awk '{print $1}')"
test "$TOKEN_SHA_NOW" = "$TOKEN_SHA_STORED" || fail "capability token SHA mismatch"

NOW_MS="$(date +%s%3N)"
test "$EXPIRES_AT_MS" -gt "$NOW_MS" || fail "ticket is expired"

fetch_json "$LOCAL_BASE/health" "$LOCAL_HEALTH_FILE" || fail "local VOID health unavailable"
fetch_json "$LOCAL_BASE$STATUS_ROUTE?account=$(printf '%s' "$ACCOUNT" | jq -sRr @uri)" "$LOCAL_STATUS_FILE" || \
  fail "local pilot status unavailable"
fetch_json "$COORDINATOR_BASE/health" "$COORD_HEALTH_FILE" || fail "trusted coordinator health unavailable"
fetch_json "$COORDINATOR_BASE$STATUS_ROUTE?account=$(printf '%s' "$ACCOUNT" | jq -sRr @uri)" "$COORD_STATUS_FILE" || \
  fail "trusted coordinator pilot status unavailable"
fetch_json "$COORDINATOR_BASE/wc/redeemable?account=$(printf '%s' "$ACCOUNT" | jq -sRr @uri)" "$BALANCE_BEFORE_FILE" || \
  fail "pre-execution coordinator balance unavailable"

jq -e --arg node "$EXECUTOR_NODE_ID" \
  '.ok == true and .nodeId == $node' \
  "$LOCAL_HEALTH_FILE" >/dev/null 2>&1 || fail "local node does not match ticket executor identity"

jq -e \
  '.ok == true and
   .marker == "VOID_WC_PUBLIC_EARNING_PILOT_V1" and
   .coordinator_enabled == false and
   .executor_enabled == true and
   .fixed_award_wc == 3' \
  "$LOCAL_STATUS_FILE" >/dev/null 2>&1 || fail "local executor lane is not ready"

jq -e --arg node "$TRUSTED_COORDINATOR_NODE_ID" \
  '.ok == true and .nodeId == $node' \
  "$COORD_HEALTH_FILE" >/dev/null 2>&1 || fail "trusted coordinator node identity mismatch"

jq -e \
  '.ok == true and
   .marker == "VOID_WC_PUBLIC_EARNING_PILOT_V1" and
   .coordinator_enabled == true and
   .executor_enabled == false and
   .fixed_award_wc == 3 and
   (.caps.account_total // 0) >= 1' \
  "$COORD_STATUS_FILE" >/dev/null 2>&1 || fail "trusted coordinator ticket is not active"

jq -e --arg account "$ACCOUNT" \
  '.ok == true and
   .account == $account and
   (.redeemable | type == "number" and floor == . and . >= 0)' \
  "$BALANCE_BEFORE_FILE" >/dev/null 2>&1 || fail "pre-execution coordinator balance is invalid"

BALANCE_BEFORE="$(jq -r '.redeemable' "$BALANCE_BEFORE_FILE")"

python3 - "$TICKET_FILE" "$REQUEST_FILE" "$COORDINATOR_BASE" <<'PY' || \
  fail "cannot build private execution request"
import json
import sys
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2])
coordinator_base = sys.argv[3]

root = json.loads(source.read_text())
if not isinstance(root, dict):
    raise SystemExit(1)

token = root.get("capability_token")
if not isinstance(token, str) or not token:
    raise SystemExit(1)

wrapped = root.get("ticket")
if isinstance(wrapped, dict):
    ticket = wrapped
else:
    omitted = {
        "capability_token",
        "capability_token_returned_once",
        "coordinator_base",
        "coordinator_node_id",
    }
    ticket = {key: value for key, value in root.items() if key not in omitted}

target.write_text(
    json.dumps(
        {
            "ticket": ticket,
            "capability_token": token,
            "coordinator_base": coordinator_base,
        },
        separators=(",", ":"),
    )
    + "\n"
)
PY
chmod 600 "$REQUEST_FILE"
unset TOKEN

HTTP_CODE="$(
  curl -sS --max-time 150 \
    -o "$RESPONSE_FILE" \
    -w '%{http_code}' \
    -X POST \
    "$LOCAL_BASE$EXECUTE_ROUTE" \
    -H 'content-type: application/json' \
    --data-binary @"$REQUEST_FILE" \
    2>/dev/null || true
)"
chmod 600 "$RESPONSE_FILE" 2>/dev/null || true
printf '%s\n' "$HTTP_CODE" >"$HTTP_CODE_FILE"

if test "$HTTP_CODE" != "200"
then
  rm -f "$RESPONSE_FILE"
  fail "local execution returned HTTP $HTTP_CODE; ticket retained and private error response removed"
fi

if response_contains_ticket_token
then
  rm -f "$RESPONSE_FILE"
  fail "response unexpectedly contained the capability token; reflected response removed"
fi

jq -e \
  --arg marker "$PILOT_MARKER" \
  --arg ticket "$TICKET_ID" \
  --arg account "$ACCOUNT" \
  --arg executor "$EXECUTOR_NODE_ID" \
  --arg dataset "$DATASET_ID" \
  --arg transport "$TRANSPORT_MODE" \
  --argjson before "$BALANCE_BEFORE" \
  '.ok == true and
   .marker == $marker and
   .remote_executor == true and
   .local_node_id == $executor and
   (.transport_mode // "inbound_fetch") == $transport and
   ((if has("coordinator_inbound_fetch") then .coordinator_inbound_fetch else true end) == ($transport == "inbound_fetch")) and
   (.participant_outbound_bundle // false) == ($transport == "outbound_bundle") and
   .ticket_id == $ticket and
   .dataset_id == $dataset and
   .coordinator.ok == true and
   .coordinator.marker == $marker and
   .coordinator.remote_executor == true and
   .coordinator.executor_node_id == $executor and
   (.coordinator.transport_mode // "inbound_fetch") == $transport and
   ((if ((.coordinator | type) == "object" and (.coordinator | has("coordinator_inbound_fetch"))) then .coordinator.coordinator_inbound_fetch else true end) == ($transport == "inbound_fetch")) and
   (.coordinator.participant_outbound_bundle // false) == ($transport == "outbound_bundle") and
   .coordinator.ticket_id == $ticket and
   .coordinator.account == $account and
   .coordinator.dataset_id == $dataset and
   .coordinator.signature_verified == true and
   .coordinator.remote_health_verified == true and
   .coordinator.remote_job_verified == true and
   .coordinator.remote_receipt_verified == true and
   .coordinator.capability_consumed == true and
   .coordinator.wc.before == $before and
   .coordinator.wc.delta == 3 and
   .coordinator.wc.fixed_award_wc == 3 and
   .coordinator.wc.after == ($before + 3) and
   .coordinator.acceptance.credited == true and
   .coordinator.acceptance.duplicate == false and
   .coordinator.completed_ticket_status == "completed" and
   .coordinator.money_movement == false and
   .participant_selected_award == false and
   .automatic_background_loop == false and
   .money_movement == false' \
  "$RESPONSE_FILE" >/dev/null 2>&1 || {
    fail "execution response verification failed; ticket retained"
  }

fetch_json "$COORDINATOR_BASE/wc/redeemable?account=$(printf '%s' "$ACCOUNT" | jq -sRr @uri)" "$BALANCE_AFTER_FILE" || {
  fail "post-execution coordinator balance unavailable; ticket retained"
}

jq -e --arg account "$ACCOUNT" \
  '.ok == true and
   .account == $account and
   (.redeemable | type == "number" and floor == . and . >= 0)' \
  "$BALANCE_AFTER_FILE" >/dev/null 2>&1 || {
    fail "post-execution coordinator balance is invalid; ticket retained"
  }

BALANCE_AFTER="$(jq -r '.redeemable' "$BALANCE_AFTER_FILE")"
test "$BALANCE_AFTER" -eq $((BALANCE_BEFORE + 3)) || {
  fail "canonical redeemable balance did not increase by exactly 3 WC; ticket retained"
}

JOB_ID="$(jq -r '.job_id // empty' "$RESPONSE_FILE")"
RECEIPT_ID="$(jq -r '.receipt_id // empty' "$RESPONSE_FILE")"

jq -n \
  --arg marker "$MARKER" \
  --arg timestamp "$(date --iso-8601=seconds)" \
  --arg account "$ACCOUNT" \
  --arg ticket_id "$TICKET_ID" \
  --arg executor_node_id "$EXECUTOR_NODE_ID" \
  --arg coordinator_node_id "$TRUSTED_COORDINATOR_NODE_ID" \
  --arg coordinator_base "$COORDINATOR_BASE" \
  --arg transport_mode "$TRANSPORT_MODE" \
  --arg dataset_id "$DATASET_ID" \
  --arg expected_input_hash "$EXPECTED_INPUT_HASH" \
  --arg job_id "$JOB_ID" \
  --arg receipt_id "$RECEIPT_ID" \
  --arg token_sha256 "$TOKEN_SHA_NOW" \
  --argjson balance_before "$BALANCE_BEFORE" \
  --argjson balance_after "$BALANCE_AFTER" \
  '{
    marker:$marker,
    timestamp:$timestamp,
    account:$account,
    ticket_id:$ticket_id,
    executor_node_id:$executor_node_id,
    coordinator_node_id:$coordinator_node_id,
    coordinator_base:$coordinator_base,
    transport_mode:$transport_mode,
    coordinator_inbound_fetch:($transport_mode == "inbound_fetch"),
    participant_outbound_bundle:($transport_mode == "outbound_bundle"),
    inbound_executor_reachability_required:($transport_mode == "inbound_fetch"),
    dataset_id:$dataset_id,
    expected_input_hash:$expected_input_hash,
    job_id:$job_id,
    receipt_id:$receipt_id,
    token_sha256:$token_sha256,
    wc:{before:$balance_before,after:$balance_after,delta:3,fixed_award_wc:3},
    remote_executor:true,
    signature_verified:true,
    remote_health_verified:true,
    remote_job_verified:true,
    remote_receipt_verified:true,
    capability_consumed:true,
    money_movement:false
  }' >"$RECEIPT_FILE" || {
    fail "cannot write sanitized participant receipt; ticket retained"
  }
chmod 600 "$RECEIPT_FILE"

rm -f "$TICKET_FILE" || fail "execution succeeded but consumed ticket file could not be deleted"

test ! -e "$TICKET_FILE" || fail "execution succeeded but consumed ticket file still exists"

printf 'account=%s\n' "$ACCOUNT"
printf 'ticket_id=%s\n' "$TICKET_ID"
printf 'job_id=%s\n' "$JOB_ID"
printf 'receipt_id=%s\n' "$RECEIPT_ID"
printf 'transport_mode=%s\n' "$TRANSPORT_MODE"
printf 'inbound_executor_reachability_required=%s\n' "$([ "$TRANSPORT_MODE" = "inbound_fetch" ] && echo true || echo false)"
printf 'wc_before=%s\n' "$BALANCE_BEFORE"
printf 'wc_after=%s\n' "$BALANCE_AFTER"
printf 'wc_delta=3\n'
printf 'ticket_deleted=1\n'
printf 'receipt=%s\n' "$RECEIPT_FILE"
printf 'private_response=%s\n' "$RESPONSE_FILE"
echo "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1_EARNED_3_WC_EXACT_GREEN"
