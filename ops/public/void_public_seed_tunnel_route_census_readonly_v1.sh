#!/usr/bin/env bash
# One bounded operator-invoked observation. No service, DNS, credential or ledger writes.
set -Eeuo pipefail
export LC_ALL=C
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH

MARKER=VOID_PUBLIC_SEED_TUNNEL_ROUTE_CENSUS_READONLY_V1
UNIT=void-public-seed-named-tunnel-v1.service
SEED_URL=https://seed.nullfeed.org/__void/ready.json
EARN_URL=https://seed.nullfeed.org/health

classify() {
  local route="$1" local_http="$2" public_http="$3" owner="$4" delta="$5"
  local public_exit="$6" stable="$7" local_exit="$8" ha_before="$9" ha_after="${10}"
  if [[ "$stable" != YES ]]; then
    printf '%s\n' CONNECTOR_CHANGED_HOLD
  elif [[ "$route" != EXPECTED_4111 ]]; then
    printf '%s\n' LOCAL_INGRESS_ROUTE_HOLD
  elif [[ "$local_http" != 200 || "$local_exit" != 0 ]]; then
    printf '%s\n' LOCAL_SEED_GATEWAY_HOLD
  elif [[ "$public_exit" != 0 ]]; then
    printf '%s\n' PUBLIC_PROBE_TRANSPORT_HOLD
  elif [[ "$public_http" == 200 ]]; then
    printf '%s\n' PUBLIC_HTTP_200_STILL_UNQUALIFIED
  elif [[ "$owner" == ACTIVE_TUNNEL_PROCESS && "$delta" == 0 ]]; then
    # A disconnected tunnel also has a flat request counter; do not infer
    # stale DNS/Alienware routing without any observed active edge connection.
    if [[ "$ha_before" =~ ^[1-9][0-9]*$ && "$ha_after" =~ ^[1-9][0-9]*$ ]]; then
      printf '%s\n' PUBLIC_REQUEST_NOT_COUNTED_HYPOTHESIS
    else
      printf '%s\n' TUNNEL_LIVE_CONNECTIONS_UNCONFIRMED_HOLD
    fi
  else
    printf '%s\n' PUBLIC_ROUTE_FAILURE_UNRESOLVED
  fi
}

if [[ "$#" -eq 1 && "$1" == --self-test ]]; then
  [[ "$(classify EXPECTED_4111 200 502 ACTIVE_TUNNEL_PROCESS 0 0 YES 0 4 4)" == PUBLIC_REQUEST_NOT_COUNTED_HYPOTHESIS ]]
  [[ "$(classify EXPECTED_4111 200 200 ACTIVE_TUNNEL_PROCESS 1 0 YES 0 4 4)" == PUBLIC_HTTP_200_STILL_UNQUALIFIED ]]
  [[ "$(classify OTHER 200 502 ACTIVE_TUNNEL_PROCESS 0 0 YES 0 4 4)" == LOCAL_INGRESS_ROUTE_HOLD ]]
  [[ "$(classify EXPECTED_4111 503 502 ACTIVE_TUNNEL_PROCESS 0 0 YES 0 4 4)" == LOCAL_SEED_GATEWAY_HOLD ]]
  [[ "$(classify EXPECTED_4111 200 502 ACTIVE_TUNNEL_PROCESS 1 0 YES 0 4 4)" == PUBLIC_ROUTE_FAILURE_UNRESOLVED ]]
  [[ "$(classify EXPECTED_4111 200 502 UNKNOWN UNKNOWN 0 YES 0 4 4)" == PUBLIC_ROUTE_FAILURE_UNRESOLVED ]]
  [[ "$(classify EXPECTED_4111 200 000 ACTIVE_TUNNEL_PROCESS 0 6 YES 0 4 4)" == PUBLIC_PROBE_TRANSPORT_HOLD ]]
  [[ "$(classify EXPECTED_4111 200 502 ACTIVE_TUNNEL_PROCESS 0 0 NO 0 4 4)" == CONNECTOR_CHANGED_HOLD ]]
  [[ "$(classify EXPECTED_4111 200 200 ACTIVE_TUNNEL_PROCESS 1 28 YES 0 4 4)" == PUBLIC_PROBE_TRANSPORT_HOLD ]]
  [[ "$(classify EXPECTED_4111 200 502 ACTIVE_TUNNEL_PROCESS 0 0 YES 0 0 0)" == TUNNEL_LIVE_CONNECTIONS_UNCONFIRMED_HOLD ]]
  [[ "$(classify EXPECTED_4111 200 502 ACTIVE_TUNNEL_PROCESS 0 0 YES 0 NA 4)" == TUNNEL_LIVE_CONNECTIONS_UNCONFIRMED_HOLD ]]
  [[ "$(classify EXPECTED_4111 200 502 ACTIVE_TUNNEL_PROCESS 0 0 YES 18 4 4)" == LOCAL_SEED_GATEWAY_HOLD ]]
  [[ "$(classify EXPECTED_4111 200 200 ACTIVE_TUNNEL_PROCESS 0 0 YES 28 4 4)" == LOCAL_SEED_GATEWAY_HOLD ]]
  printf '%s_SELF_TEST_GREEN\n' "$MARKER"
  printf 'live_network_access=false\nservice_mutation=false\n'
  exit 0
fi

if [[ "$#" -ne 1 || "$1" != --read-only ]]; then
  printf 'usage: bash ops/public/void_public_seed_tunnel_route_census_readonly_v1.sh --read-only\n' >&2
  exit 2
fi

printf '%s\n' "$MARKER"
printf '%s\n' \
  'read_only=true' 'service_mutation=false' 'configuration_mutation=false' \
  'dns_mutation=false' 'credential_file_direct_access=false' \
  'raw_process_arguments_printed=false' 'raw_http_bodies_printed=false' \
  'tunnel_identifier_printed=false' 'wallet_or_signer_access=false' \
  'chain_mutation=false' 'funds_movement=false' \
  'bootstrap_qualification_or_publication=false'

for tool in systemctl curl ss awk; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'diagnostic_hold=missing_%s\n' "$tool"
    exit 2
  fi
done

pid="$(systemctl --user show "$UNIT" -p MainPID --value 2>/dev/null || true)"
if [[ ! "$pid" =~ ^[1-9][0-9]{0,9}$ || ! -r "/proc/$pid/cmdline" ]]; then
  printf 'tunnel_mainpid=UNAVAILABLE\nclassification=PROCESS_EVIDENCE_HOLD\n'
  exit 2
fi

comm="$(cat "/proc/$pid/comm" 2>/dev/null || true)"
if [[ "$comm" != cloudflared || ! -x "/proc/$pid/exe" ]]; then
  printf 'tunnel_process_identity=HOLD\nclassification=PROCESS_EVIDENCE_HOLD\n'
  exit 2
fi

# Process argv and config path stay in memory; neither is printed. The already-
# running connector's executable selects the rule. The script never directly opens credential files.
mapfile -d '' -t argv < "/proc/$pid/cmdline"
config=''
for ((i=0; i+1<${#argv[@]}; i++)); do
  if [[ "${argv[i]}" == --config ]]; then
    if [[ -n "$config" ]]; then
      printf 'tunnel_config_binding=AMBIGUOUS\nclassification=PROCESS_EVIDENCE_HOLD\n'
      exit 2
    fi
    config="${argv[i+1]}"
  fi
done
if [[ "$config" != /* || ! -f "$config" || ! -r "$config" || -L "$config" ]]; then
  printf 'tunnel_config_binding=UNAVAILABLE\nclassification=PROCESS_EVIDENCE_HOLD\n'
  exit 2
fi
printf 'tunnel_process_identity=cloudflared\ntunnel_config_binding=PRESENT_NOT_PRINTED\n'

route() {
  local result service
  if ! result=$("/proc/$pid/exe" --config "$config" tunnel ingress rule "$1" 2>/dev/null); then
    printf '%s\n' CHECK_FAILED
    return
  fi
  service="$(printf '%s\n' "$result" | awk '/^[[:space:]]*service:[[:space:]]*/ {sub(/^[[:space:]]*service:[[:space:]]*/, ""); print}')"
  case "$service" in
    http://127.0.0.1:4111) printf '%s\n' EXPECTED_4111 ;;
    http://127.0.0.1:4122) printf '%s\n' EARN_4122 ;;
    http_status:404) printf '%s\n' REJECT_404 ;;
    *) printf '%s\n' OTHER_OR_AMBIGUOUS ;;
  esac
}

probe() {
  local code rc=0
  code="$(curl -q --noproxy '*' -sS -o /dev/null --connect-timeout 3 --max-time 8 -w '%{http_code}' "$1" 2>/dev/null)" || rc=$?
  [[ "$code" =~ ^[0-9]{3}$ ]] || code=000
  printf '%s %s\n' "$rc" "$code"
}

seed_route="$(route "$SEED_URL")"
earn_route="$(route "$EARN_URL")"
printf 'seed_ingress=%s\nearn_ingress=%s\n' "$seed_route" "$earn_route"

read -r local_seed_rc local_seed_http <<< "$(probe http://127.0.0.1:4111/__void/ready.json)"
read -r local_earn_rc local_earn_http <<< "$(probe http://127.0.0.1:4122/health)"
read -r public_earn_rc public_earn_http <<< "$(probe "$EARN_URL")"
read -r cf_edge_rc cf_edge_http <<< "$(probe https://seed.nullfeed.org/cdn-cgi/trace)"
printf 'local_seed_curl_exit=%s\nlocal_seed_http=%s\n' "$local_seed_rc" "$local_seed_http"
printf 'local_earn_curl_exit=%s\nlocal_earn_http=%s\n' "$local_earn_rc" "$local_earn_http"
printf 'public_earn_curl_exit=%s\npublic_earn_http=%s\n' "$public_earn_rc" "$public_earn_http"
printf 'cloudflare_edge_curl_exit=%s\ncloudflare_edge_http=%s\n' "$cf_edge_rc" "$cf_edge_http"

metrics_port=''
for port in 20241 20242 20243 20244 20245; do
  listener="$(ss -H -ltnp "sport = :$port" 2>/dev/null || true)"
  if [[ "$listener" == *"pid=$pid,"* ]]; then
    metrics_port="$port"
    break
  fi
done
owner=UNKNOWN
if [[ -n "$metrics_port" ]]; then owner=ACTIVE_TUNNEL_PROCESS; fi
printf 'metrics_listener=%s\n' "$owner"

snapshot() {
  local data
  if [[ -z "$metrics_port" ]]; then
    printf 'NA NA\n'
    return
  fi
  # A remote-supplied metrics body is bounded, and no raw contents are logged.
  if ! data="$(curl -q --noproxy '*' -fsS --connect-timeout 1 --max-time 3 --max-filesize 4194304 "http://127.0.0.1:$metrics_port/metrics" 2>/dev/null)"; then
    printf 'NA NA\n'
    return
  fi
  printf '%s\n' "$data" | awk '
    $1 ~ /^cloudflared_tunnel_ha_connections(\{|$)/ && $NF ~ /^[0-9]+$/ { ha += $NF; nh++ }
    $1 ~ /^cloudflared_tunnel_total_requests(\{|$)/ && $NF ~ /^[0-9]+$/ { requests += $NF; nr++ }
    END {
      if (nh && nr && ha >= 0 && requests >= 0 && ha < 9007199254740991 && requests < 9007199254740991)
        printf "%.0f %.0f\n", ha, requests
      else print "NA NA"
    }'
}

read -r ha_before requests_before <<< "$(snapshot)"
printf 'ha_connections_before=%s\n' "$ha_before"

# Exactly one public readiness request occurs between counter samples.
read -r public_seed_rc public_seed_http <<< "$(probe "$SEED_URL")"
printf 'public_seed_curl_exit=%s\npublic_seed_http=%s\n' "$public_seed_rc" "$public_seed_http"
sleep 1
read -r ha_after requests_after <<< "$(snapshot)"
printf 'ha_connections_after=%s\n' "$ha_after"

delta=UNKNOWN
if [[ "$requests_before" =~ ^[0-9]+$ && "$requests_after" =~ ^[0-9]+$ ]]; then
  if (( requests_after >= requests_before )); then
    delta="$((requests_after - requests_before))"
  else
    delta=COUNTER_RESET_OR_DECREASE
  fi
fi
printf 'tunnel_requests_delta=%s\n' "$delta"
# Ignore counter correlation if the managed connector changed during sampling.
# The old process's metrics cannot qualify a new service generation.
final_pid="$(systemctl --user show "$UNIT" -p MainPID --value 2>/dev/null || true)"
process_stable=NO
if [[ "$final_pid" == "$pid" ]] && [[ "$(cat "/proc/$pid/comm" 2>/dev/null || true)" == cloudflared ]]; then
  process_stable=YES
fi
printf 'process_generation_stable=%s\n' "$process_stable"
printf 'classification=%s\n' "$(classify "$seed_route" "$local_seed_http" "$public_seed_http" "$owner" "$delta" "$public_seed_rc" "$process_stable" "$local_seed_rc" "$ha_before" "$ha_after")"
printf '%s\n' \
  'one_request_counter_delta_not_conclusive=true' \
  'public_http_200_not_external_qualification=true' \
  'no_restarts_or_configuration_changes=true' \
  'next_gate=separate_external_three_sample_qualification_and_manifest_publication_review'
