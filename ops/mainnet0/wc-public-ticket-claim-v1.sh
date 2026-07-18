#!/usr/bin/env bash
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

set -u

MARKER="VOID_WC_PUBLIC_TICKET_CLAIM_CLI_V1"
CLAIM_MARKER="VOID_WC_PUBLIC_TICKET_CLAIM_V1"
PILOT_MARKER="VOID_WC_PUBLIC_EARNING_PILOT_V1"
STATUS_ROUTE="/wc/public-earning-pilot-v1/status"
SIGN_ROUTE="/wc/public-earning-pilot-v1/sign-claim?dry=0&confirm=wcPublicTicketClaimSign"
CLAIM_ROUTE="/wc/public-earning-pilot-v1/claim-ticket"
PARTICIPANT_CLI_ROUTE="/download/wc-public-earning-participant-v1.sh"

usage() {
  cat <<'USAGE'
Usage:
  wc-public-ticket-claim-v1.sh \
    <account> <trusted-coordinator-base> <trusted-coordinator-node-id>

The command asks the local executor node to sign one public ticket claim,
submits that signed claim through the trusted public HTTPS gateway, stores the
single-use ticket in a mode-600 file, downloads the existing participant CLI,
and runs the exact ticket-bound 3 WC earning flow.

The coordinator chooses the dataset, expected input hash, task, award, expiry,
and capability. The participant cannot choose the award or substitute work.
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

fetch_json() {
  URL="$1"
  OUT="$2"
  curl -fsS --connect-timeout 8 --max-time 20 \
    -H 'accept: application/json' \
    "$URL" >"$OUT" 2>/dev/null
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

ACCOUNT="$1"
COORDINATOR_BASE_RAW="$2"
TRUSTED_COORDINATOR_NODE_ID="$(
  printf '%s' "$3" |
  tr '[:upper:]' '[:lower:]'
)"

case "$ACCOUNT" in
  *[!A-Za-z0-9._:-]*|'') fail "account contains unsupported characters" ;;
esac
test "${#ACCOUNT}" -le 128 || fail "account is too long"

case "$TRUSTED_COORDINATOR_NODE_ID" in
  *[!0-9a-f]*|'') fail "trusted coordinator node ID must be 32 lowercase hex characters" ;;
esac
test "${#TRUSTED_COORDINATOR_NODE_ID}" -eq 32 || \
  fail "trusted coordinator node ID must be 32 lowercase hex characters"

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
STATE_DIR="${VOID_WC_PUBLIC_CLAIM_STATE_DIR:-$HOME/.local/state/void/wc-public-ticket-claim-v1}"
BIN_DIR="$STATE_DIR/bin"
INCOMING_DIR="$STATE_DIR/incoming"

mkdir -p "$STATE_DIR" "$BIN_DIR" "$INCOMING_DIR" || \
  fail "cannot create private claim state directories"
chmod 700 "$STATE_DIR" "$BIN_DIR" "$INCOMING_DIR" || \
  fail "cannot secure private claim state directories"

STAMP="$(date +%Y%m%dT%H%M%S%N%z)-$$"
TMP_DIR="$(mktemp -d "$STATE_DIR/.claim-$STAMP-XXXXXX")" || \
  fail "cannot create private claim working directory"
chmod 700 "$TMP_DIR"

LOCAL_HEALTH_FILE="$TMP_DIR/local-health.json"
LOCAL_STATUS_FILE="$TMP_DIR/local-status.json"
COORD_HEALTH_FILE="$TMP_DIR/coordinator-health.json"
COORD_STATUS_FILE="$TMP_DIR/coordinator-status.json"
SIGNED_FILE="$TMP_DIR/signed.json"
REQUEST_FILE="$TMP_DIR/request.json"
CLAIM_RESPONSE_FILE="$TMP_DIR/claim-response.json"
HTTP_CODE_FILE="$TMP_DIR/http-code.txt"
PARTICIPANT_CLI="$BIN_DIR/wc-public-earning-participant-v1.sh"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

fetch_json "$LOCAL_BASE/health" "$LOCAL_HEALTH_FILE" || \
  fail "local VOID health unavailable"
fetch_json \
  "$LOCAL_BASE$STATUS_ROUTE?account=$(printf '%s' "$ACCOUNT" | jq -sRr @uri)" \
  "$LOCAL_STATUS_FILE" || \
  fail "local executor status unavailable"
fetch_json "$COORDINATOR_BASE/health" "$COORD_HEALTH_FILE" || \
  fail "trusted coordinator health unavailable"
fetch_json \
  "$COORDINATOR_BASE$STATUS_ROUTE?account=$(printf '%s' "$ACCOUNT" | jq -sRr @uri)" \
  "$COORD_STATUS_FILE" || \
  fail "trusted coordinator public-claim status unavailable"

LOCAL_NODE_ID="$(jq -r '.nodeId // empty' "$LOCAL_HEALTH_FILE" | tr '[:upper:]' '[:lower:]')"
case "$LOCAL_NODE_ID" in
  *[!0-9a-f]*|'') fail "local node identity unavailable" ;;
esac
test "${#LOCAL_NODE_ID}" -eq 32 || fail "local node identity is invalid"

jq -e \
  '.ok == true and
   .marker == "VOID_WC_PUBLIC_EARNING_PILOT_V1" and
   .coordinator_enabled == false and
   .executor_enabled == true and
   .fixed_award_wc == 3' \
  "$LOCAL_STATUS_FILE" >/dev/null 2>&1 || \
  fail "local executor lane is not ready"

jq -e --arg node "$TRUSTED_COORDINATOR_NODE_ID" \
  '.ok == true and .nodeId == $node' \
  "$COORD_HEALTH_FILE" >/dev/null 2>&1 || \
  fail "trusted coordinator node identity mismatch"

jq -e \
  --arg claim_marker "$CLAIM_MARKER" \
  '.ok == true and
   .marker == "VOID_WC_PUBLIC_EARNING_PILOT_V1" and
   .coordinator_enabled == true and
   .executor_enabled == false and
   .fixed_award_wc == 3 and
   .public_claim.marker == $claim_marker and
   .public_claim.enabled == true and
   .public_claim.available == true and
   .public_claim.server_selected_work == true and
   .public_claim.proof_of_executor_key_possession_required == true and
   .public_claim.transport_mode == "outbound_bundle" and
   .public_claim.fixed_award_wc == 3 and
   .public_claim.participant_selected_dataset == false and
   .public_claim.participant_selected_input_hash == false and
   .public_claim.participant_selected_award == false and
   .public_claim.money_movement == false' \
  "$COORD_STATUS_FILE" >/dev/null 2>&1 || \
  fail "trusted coordinator public ticket claim is not available"

SIGN_HTTP_CODE="$(
  curl -sS --connect-timeout 8 --max-time 20 \
    -o "$SIGNED_FILE" \
    -w '%{http_code}' \
    -X POST \
    "$LOCAL_BASE$SIGN_ROUTE" \
    -H 'content-type: application/json' \
    --data-binary "$(
      jq -cn --arg account "$ACCOUNT" '{account:$account}'
    )" \
    2>/dev/null || true
)"
chmod 600 "$SIGNED_FILE" 2>/dev/null || true

test "$SIGN_HTTP_CODE" = "200" || \
  fail "local claim signing returned HTTP $SIGN_HTTP_CODE"

jq -e \
  --arg marker "$CLAIM_MARKER" \
  --arg account "$ACCOUNT" \
  --arg executor "$LOCAL_NODE_ID" \
  '.ok == true and
   .marker == $marker and
   .local_node_id == $executor and
   .claim.domain == "void:mainnet-0:wc-public-ticket-claim-v1" and
   .claim.marker == $marker and
   .claim.version == 1 and
   .claim.account == $account and
   .claim.executor_node_id == $executor and
   (.claim.executor_pubkey | type == "string" and
     contains("BEGIN PUBLIC KEY") and contains("END PUBLIC KEY")) and
   (.claim.claim_nonce | type == "string" and test("^[0-9a-f]{32}$")) and
   (.claim.claim_ts_ms | type == "number" and . > 0) and
   .signature.alg == "ed25519" and
   .signature.key_id == $executor and
   (.signature.sig | type == "string" and test("^[0-9a-f]{128}$")) and
   .ticket_issued == false and
   .wc_written == false and
   .money_movement == false' \
  "$SIGNED_FILE" >/dev/null 2>&1 || \
  fail "local signed claim response validation failed"

jq -c '{claim,signature}' "$SIGNED_FILE" >"$REQUEST_FILE" || \
  fail "cannot build public claim request"
chmod 600 "$REQUEST_FILE"

CLAIM_HTTP_CODE="$(
  curl -sS --connect-timeout 8 --max-time 35 \
    -o "$CLAIM_RESPONSE_FILE" \
    -w '%{http_code}' \
    -X POST \
    "$COORDINATOR_BASE$CLAIM_ROUTE" \
    -H 'content-type: application/json' \
    --data-binary @"$REQUEST_FILE" \
    2>/dev/null || true
)"
chmod 600 "$CLAIM_RESPONSE_FILE" 2>/dev/null || true
printf '%s\n' "$CLAIM_HTTP_CODE" >"$HTTP_CODE_FILE"

test "$CLAIM_HTTP_CODE" = "201" || \
  fail "public ticket claim returned HTTP $CLAIM_HTTP_CODE"

jq -e \
  --arg marker "$CLAIM_MARKER" \
  --arg account "$ACCOUNT" \
  --arg executor "$LOCAL_NODE_ID" \
  '.ok == true and
   .marker == $marker and
   .claim_request_verified == true and
   .executor_key_possession_verified == true and
   .server_selected_work == true and
   (.claim_id | type == "string" and test("^[0-9a-f]{64}$")) and
   (.capability_token | type == "string" and
     test("^wcep1\\.[0-9a-f]{32}\\.[A-Za-z0-9_-]{43}$")) and
   .capability_token_returned_once == true and
   .ticket.marker == "VOID_WC_PUBLIC_EARNING_PILOT_V1" and
   .ticket.version == 1 and
   .ticket.account == $account and
   .ticket.executor_node_id == $executor and
   .ticket.executor_http_base == "" and
   .ticket.transport_mode == "outbound_bundle" and
   .ticket.task_class == "datanet_fetch_verify" and
   .ticket.fixed_award_wc == 3 and
   .ticket.status == "issued" and
   .ticket.issuance_source == "public_claim" and
   .ticket.public_claim_id == .claim_id and
   (.ticket.ticket_id | type == "string" and test("^[0-9a-f]{32}$")) and
   (.ticket.dataset_id | type == "string" and length > 0 and length <= 160) and
   (.ticket.expected_input_hash | type == "string" and test("^[0-9a-f]{64}$")) and
   (.ticket.token_sha256 | type == "string" and test("^[0-9a-f]{64}$")) and
   (.ticket.expires_at_ms | type == "number") and
   .fixed_award_wc == 3 and
   .participant_selected_dataset == false and
   .participant_selected_input_hash == false and
   .participant_selected_award == false and
   .generic_job_submit == false and
   .wallet_send == false and
   .wc_to_void == false and
   .buy_void_fulfillment == false and
   .money_movement == false' \
  "$CLAIM_RESPONSE_FILE" >/dev/null 2>&1 || \
  fail "public ticket claim response validation failed"

TOKEN="$(jq -r '.capability_token' "$CLAIM_RESPONSE_FILE")"
TOKEN_SHA_NOW="$(printf '%s' "$TOKEN" | sha256sum | awk '{print $1}')"
TOKEN_SHA_STORED="$(jq -r '.ticket.token_sha256' "$CLAIM_RESPONSE_FILE")"
test "$TOKEN_SHA_NOW" = "$TOKEN_SHA_STORED" || \
  fail "claimed capability token SHA mismatch"

TICKET_ID="$(jq -r '.ticket.ticket_id' "$CLAIM_RESPONSE_FILE")"
EXPIRES_AT_MS="$(jq -r '.ticket.expires_at_ms' "$CLAIM_RESPONSE_FILE")"
NOW_MS="$(date +%s%3N)"
test "$EXPIRES_AT_MS" -gt "$NOW_MS" || fail "claimed ticket is already expired"

TICKET_FILE="$INCOMING_DIR/void-wc-public-claim-ticket-$TICKET_ID.json"
jq -n \
  --slurpfile response "$CLAIM_RESPONSE_FILE" \
  --arg coordinator_base "$COORDINATOR_BASE" \
  --arg coordinator_node_id "$TRUSTED_COORDINATOR_NODE_ID" \
  '{
    ticket:$response[0].ticket,
    capability_token:$response[0].capability_token,
    capability_token_returned_once:true,
    coordinator_base:$coordinator_base,
    coordinator_node_id:$coordinator_node_id
  }' >"$TICKET_FILE" || \
  fail "cannot write claimed capability ticket"
chmod 600 "$TICKET_FILE"

unset TOKEN

curl -fsS --connect-timeout 8 --max-time 25 \
  "$COORDINATOR_BASE$PARTICIPANT_CLI_ROUTE" \
  -o "$PARTICIPANT_CLI" 2>/dev/null || \
  fail "participant CLI download failed; claimed ticket retained"

chmod 700 "$PARTICIPANT_CLI"
bash -n "$PARTICIPANT_CLI" || \
  fail "downloaded participant CLI syntax invalid; claimed ticket retained"
grep -Fq "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1" "$PARTICIPANT_CLI" || \
  fail "downloaded participant CLI marker missing; claimed ticket retained"

bash \
  "$PARTICIPANT_CLI" \
  "$TICKET_FILE" \
  "$COORDINATOR_BASE" \
  "$TRUSTED_COORDINATOR_NODE_ID"
PARTICIPANT_RC="$?"

test "$PARTICIPANT_RC" -eq 0 || \
  fail "participant earning CLI failed; claimed ticket retained"
test ! -e "$TICKET_FILE" || \
  fail "participant earning succeeded but claimed ticket remains"

echo "account=$ACCOUNT"
echo "executor_node_id=$LOCAL_NODE_ID"
echo "claim_ticket_id=$TICKET_ID"
echo "ticket_deleted=1"
echo "fixed_award_wc=3"
echo "participant_selected_award=false"
echo "money_movement=false"
echo "VOID_WC_PUBLIC_TICKET_CLAIM_CLI_V1_EARNED_3_WC_EXACT_GREEN"
