#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "\${BASH_SOURCE[0]}" != "\$0" ]]; then
  echo "run this evidence collector with bash; do not source it" >&2
  return 2
fi

MARKER="VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_RUN_V1"
ROOT="\${VOID_NODE_ROOT:-\$HOME/dev/void-node}"
EXPECTED_HOST="zoso-Precision-Tower-7810"
UNIT_NAME="void-economic-epoch2-public-submission-gateway-v1.service"
UNIT_PATH="\$HOME/.config/systemd/user/\$UNIT_NAME"
STATE_DIR="\$HOME/.local/state/void-economic-epoch2-public-submission-gateway-v1"
REPLAY_ROOT="\$STATE_DIR/replay-v1"
STATUS_PATH="\$STATE_DIR/status-v1.json"
OUTPUT="\${1:?usage: \$0 OUTPUT_JSON}"

echo "\$MARKER"

test "\$(hostname)" = "\$EXPECTED_HOST"
test -d "\$ROOT/.git"
cd "\$ROOT"
test "\$(git branch --show-current)" = "main"
test -z "\$(git status --porcelain=v1 --untracked-files=all)"
test ! -e "\$OUTPUT"

systemctl --user is-active --quiet "\$UNIT_NAME"
main_pid="\$(systemctl --user show "\$UNIT_NAME" -p MainPID --value)"
fragment="\$(systemctl --user show "\$UNIT_NAME" -p FragmentPath --value)"
case "\$main_pid" in
  ''|*[!0-9]*) echo "invalid MainPID" >&2; exit 2 ;;
esac
test "\$main_pid" -gt 1
test "\$fragment" = "\$UNIT_PATH"
test -f "\$UNIT_PATH"
test ! -L "\$UNIT_PATH"

for required in \
  "Environment=VOID_EPOCH2_REPLAY_ROOT=\$REPLAY_ROOT" \
  "Environment=VOID_EPOCH2_STATUS_PATH=\$STATUS_PATH" \
  "NoNewPrivileges=true" \
  "ProtectSystem=strict" \
  "ProtectHome=read-only" \
  "ReadWritePaths=\$STATE_DIR" \
  "RestrictAddressFamilies=AF_UNIX" \
  "UMask=0077"
do
  grep -Fx "\$required" "\$UNIT_PATH" >/dev/null
done

test -d "\$REPLAY_ROOT"
test ! -L "\$REPLAY_ROOT"
test "\$(readlink -f "\$REPLAY_ROOT")" = "\$REPLAY_ROOT"
root_mode="\$(stat -Lc '%a' "\$REPLAY_ROOT")"
root_uid="\$(stat -Lc '%u' "\$REPLAY_ROOT")"
root_gid="\$(stat -Lc '%g' "\$REPLAY_ROOT")"
root_dev="\$(stat -Lc '%d' "\$REPLAY_ROOT")"
root_ino="\$(stat -Lc '%i' "\$REPLAY_ROOT")"
operator_uid="\$(id -u)"
test "\$root_mode" = "700"
test "\$root_uid" = "\$operator_uid"

test -f "\$STATUS_PATH"
test ! -L "\$STATUS_PATH"
status_mode="\$(stat -Lc '%a' "\$STATUS_PATH")"
test "\$status_mode" = "600"

node_exec="\$(readlink -f "/proc/\$main_pid/exe")"
test -x "\$node_exec"
service_uid="\$(awk '/^Uid:/{print \$2}' "/proc/\$main_pid/status")"
test "\$service_uid" = "\$operator_uid"

unit_sha="\$(sha256sum "\$UNIT_PATH" | awk '{print \$1}')"
status_sha="\$(sha256sum "\$STATUS_PATH" | awk '{print \$1}')"

work="\$(mktemp -d "\${TMPDIR:-/tmp}/void-e2-gateway-replay-runtime.XXXXXX")"
chmod 0700 "\$work"
cleanup() {
  rm -rf "\$work"
}
trap cleanup EXIT INT TERM

HOSTNAME_NOW="\$(hostname)" \
SERVICE_IDENTITY="\$UNIT_NAME" \
SERVICE_MAIN_PID="\$main_pid" \
SERVICE_UID="\$service_uid" \
OPERATOR_UID="\$operator_uid" \
NODE_EXEC="\$node_exec" \
UNIT_PATH_NOW="\$UNIT_PATH" \
UNIT_SHA="\$unit_sha" \
STATUS_PATH_NOW="\$STATUS_PATH" \
STATUS_SHA="\$status_sha" \
REPLAY_ROOT_NOW="\$REPLAY_ROOT" \
ROOT_DEV="\$root_dev" \
ROOT_INO="\$root_ino" \
ROOT_UID="\$root_uid" \
ROOT_GID="\$root_gid" \
ROOT_MODE="\$root_mode" \
node --input-type=module <<'NODE' >"\$work/runtime-facts.json"
import fs from "node:fs";
import { Wallet } from "ethers";
import {
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
  buildVoidEconomicEpoch2SignedSubmissionIntentV1,
  voidEconomicEpoch2SignedSubmissionTypedDataV1,
} from "./tools/void-economic-epoch2-signed-submission-intent-v1.mjs";
import {
  VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
} from "./tools/void-economic-epoch2-public-submission-gateway-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
  createVoidEconomicEpoch2ProductionGatewayReplayBindingV1,
} from "./tools/void-economic-epoch2-production-gateway-replay-binding-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
} from "./tools/void-economic-epoch2-durable-replay-store-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1,
} from "./tools/void-economic-epoch2-production-gateway-replay-binding-runtime-evidence-v1.mjs";

const env=process.env;
const status=JSON.parse(fs.readFileSync(env.STATUS_PATH_NOW,"utf8"));
const servicePid=Number(env.SERVICE_MAIN_PID);
const uid=Number(env.OPERATOR_UID);

if(
  status?.marker!==VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1 ||
  status?.status!=="INACTIVE_PRODUCTION_GATEWAY_REPLAY_BINDING_READY" ||
  status?.service_identity!==env.SERVICE_IDENTITY ||
  status?.hostname!==env.HOSTNAME_NOW ||
  status?.pid!==servicePid ||
  status?.uid!==uid ||
  status?.replay_root!==env.REPLAY_ROOT_NOW ||
  status?.replay_root_realpath!==env.REPLAY_ROOT_NOW ||
  status?.gateway_binding_marker!==
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1 ||
  status?.durable_replay_store_marker!==
    VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1 ||
  status?.runtime_route_active!==false ||
  status?.public_submission_open!==false ||
  status?.authoritative_chain2050_write!==false ||
  status?.funds_movement!==false
){
  throw new Error("inactive_gateway_runtime_status_invalid");
}

const target="0x470075b85352eb86f7d089fb9ba88945f12aad94";
const wallet=Wallet.createRandom();
const signer=wallet.address.toLowerCase();
const now=BigInt(Math.floor(Date.now()/1000));
const calldata="0x";
const intent=buildVoidEconomicEpoch2SignedSubmissionIntentV1({
  signer,
  nonce:"0",
  issuedAtUnix:String(now-1n),
  expiresAtUnix:String(now+120n),
  target,
  gasLimit:"100000",
  calldata,
});
const typed=voidEconomicEpoch2SignedSubmissionTypedDataV1(intent);
const signature=await wallet.signTypedData(
  typed.domain,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
  typed.value,
);

const makeClock=()=>{
  let monotonic=0;
  return {
    nowUnix(){ return String(now); },
    monotonicNowMs(){ monotonic+=1; return monotonic; },
  };
};

const first=createVoidEconomicEpoch2ProductionGatewayReplayBindingV1({
  replayRoot:env.REPLAY_ROOT_NOW,
});
const admitted=await first.admit({
  intent,
  calldata,
  signature,
  trustedClock:makeClock(),
  replayConsumeTimeoutMs:1000,
  allowedTargets:[target],
});
if(
  admitted?.ok!==true ||
  admitted?.atomic_replay_digest_consumed!==true ||
  admitted?.runtime_route_active!==false ||
  admitted?.public_submission_open!==false ||
  admitted?.transaction_submission!==false ||
  admitted?.transaction_broadcast!==false ||
  admitted?.authoritative_chain2050_write!==false
){
  throw new Error("runtime_canary_fresh_admission_invalid");
}

const digest=String(admitted.typed_data_digest||"");
if(!/^0x[0-9a-f]{64}$/.test(digest)){
  throw new Error("runtime_canary_digest_invalid");
}

let replayRejected=false;
try{
  const reopened=createVoidEconomicEpoch2ProductionGatewayReplayBindingV1({
    replayRoot:env.REPLAY_ROOT_NOW,
  });
  await reopened.admit({
    intent,
    calldata,
    signature,
    trustedClock:makeClock(),
    replayConsumeTimeoutMs:1000,
    allowedTargets:[target],
  });
}catch(error){
  if(
    error instanceof VoidEconomicEpoch2PublicSubmissionGatewayHoldV1 &&
    error.reason==="intent_replay_detected_at_atomic_consume"
  ){
    replayRejected=true;
  }else{
    throw error;
  }
}
if(!replayRejected) throw new Error("runtime_canary_replay_not_rejected");

const facts={
  marker:"VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_FACTS_V1",
  version:1,
  hostname:env.HOSTNAME_NOW,
  service_identity:env.SERVICE_IDENTITY,
  service_active:true,
  service_main_pid:servicePid,
  service_uid:Number(env.SERVICE_UID),
  operator_uid:uid,
  node_exec_path:env.NODE_EXEC,
  unit_file_path:env.UNIT_PATH_NOW,
  unit_file_sha256:env.UNIT_SHA,
  status_file_path:env.STATUS_PATH_NOW,
  status_file_sha256:env.STATUS_SHA,
  runtime_marker:status.marker,
  gateway_binding_marker:status.gateway_binding_marker,
  durable_replay_store_marker:status.durable_replay_store_marker,
  replay_root:env.REPLAY_ROOT_NOW,
  replay_root_realpath:status.replay_root_realpath,
  replay_root_dev:env.ROOT_DEV,
  replay_root_ino:env.ROOT_INO,
  replay_root_uid:Number(env.ROOT_UID),
  replay_root_gid:Number(env.ROOT_GID),
  replay_root_mode:env.ROOT_MODE,
  same_uid_production_trust_proven:true,
  production_replay_root_selected:true,
  production_service_identity_bound:true,
  unit_af_unix_only:true,
  unit_no_new_privileges:true,
  unit_protect_system_strict:true,
  unit_protect_home_read_only:true,
  unit_umask_0077:true,
  runtime_route_active:false,
  public_submission_open:false,
  canary_digest:digest,
  canary_fresh_consumed:true,
  canary_replay_rejected_after_reopen:true,
  bounded_canary_replay_store_mutation:true,
  production_store_mutation_scope:"single_synthetic_digest_marker",
  ephemeral_test_signer_used:true,
  ephemeral_signer_private_key_persisted:false,
  operator_wallet_access:false,
  rpc_call:false,
  transaction_construction:false,
  transaction_signing:false,
  transaction_submission:false,
  transaction_broadcast:false,
  authoritative_chain2050_write:false,
  credential_content_access:false,
  validator_mutation:false,
  token_movement:false,
  funds_movement:false,
  migration_authorized:false,
  public_activation_authorized:false,
};
process.stdout.write(JSON.stringify(facts,null,2)+"\\n");
NODE

observed_at="\$(date -u +%Y-%m-%dT%H:%M:%SZ)"
valid_until="\$(date -u -d "\$observed_at + 1 hour" +%Y-%m-%dT%H:%M:%SZ)"

node tools/void-economic-epoch2-production-gateway-replay-binding-runtime-evidence-v1.mjs \
  --facts "\$work/runtime-facts.json" \
  --observed-at-utc "\$observed_at" \
  --valid-until-utc "\$valid_until" \
  --output "\$OUTPUT"

test -s "\$OUTPUT"
test -z "\$(git status --porcelain=v1 --untracked-files=all)"

echo "\${MARKER}_GREEN"
echo "hostname=\$(hostname)"
echo "service_identity=\$UNIT_NAME"
echo "replay_root=\$REPLAY_ROOT"
echo "bounded_canary_replay_store_mutation=true"
echo "production_store_mutation_scope=single_synthetic_digest_marker"
echo "runtime_route_active=false"
echo "public_submission_open=false"
echo "authoritative_chain2050_write=false"
echo "funds_movement=false"
echo "evidence_output=\$OUTPUT"
