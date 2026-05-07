#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

PROM="${PROM:-http://127.0.0.1:9090}"

ART="ops/mainnet/mainnet0-validator-live-admission-readiness.current.json"
LIVE="ops/mainnet/void-mainnet.live.json"
STATUS="ops/mainnet/validator-status.current.yaml"
INV="ops/mainnet/mainnet0-validator-candidate-inventory.current.txt"
KEYS="ops/mainnet/validator-admission-public-keys.zoso.md"

echo "=== Mainnet-0 validator live-admission readiness proof ==="

echo
echo "=== [1] required files ==="
test -f "$ART"
test -f "$LIVE"
test -f "$STATUS"
test -f "$INV"
test -f "$KEYS"
echo "[ok] required files exist"

echo
echo "=== [2] artifact is readiness-only and non-mutating ==="
python3 - "$ART" "$LIVE" "$STATUS" "$INV" "$KEYS" <<'PY'
import json, re, sys
from pathlib import Path

art_path, live_path, status_path, inv_path, keys_path = map(Path, sys.argv[1:])

art = json.loads(art_path.read_text())
live = json.loads(live_path.read_text())
status = status_path.read_text()
inv = inv_path.read_text()
keys = keys_path.read_text()

assert art.get("ok") is True, art
assert art.get("kind") == "mainnet0_validator_live_admission_readiness_artifact", art
assert art.get("status") == "readiness_only_not_live_admitted", art
assert art.get("launch_state") == "not_go_for_public_mainnet0", art
assert art.get("mutation_allowed") is False, art

cand = art.get("candidate") or {}
assert cand.get("validator_id") == "candidate-validator-01", cand
assert cand.get("current_status") == "candidate_not_active", cand
assert cand.get("validator_status_file_state") == "plan_only_candidate_declared", cand
assert cand.get("public_registration_state") == "waiting", cand
assert cand.get("public_registration_mutates_active_set") is False, cand

pub = art.get("public_values") or {}
assert re.fullmatch(r"0x[a-fA-F0-9]{40}", str(pub.get("reward_address") or "")), pub
assert re.fullmatch(r"0x[a-fA-F0-9]{64}", str(pub.get("consensus_key") or "")), pub

expected = art.get("current_live_json_expected") or {}
assert expected.get("mode") == "plan_only", expected
assert expected.get("status") == "plan_only_not_live", expected
assert expected.get("candidate_status") == "candidate_not_active", expected

assert live.get("mode") == "plan_only", live
assert live.get("status") == "plan_only_not_live", live
validators = live.get("validators") or []
assert validators and validators[0].get("status") == "candidate_not_active", validators

assert "status: plan_only_candidate_declared" in status, status
assert "not active or live admitted" in status, status

next_ref = art.get("operator_next_onboard_reference") or {}
assert next_ref.get("selected_candidate_name") == "vault124", next_ref
assert next_ref.get("target_epoch") == "126", next_ref
assert next_ref.get("expected_validator_count") == "125", next_ref
assert next_ref.get("live_admission_allowed") == "false", next_ref
assert next_ref.get("live_admission_executed") == "false", next_ref

policy = art.get("locked_policy") or {}
assert policy.get("public_candidate_minimum_stake_void") == 10000, policy
assert policy.get("active_validator_cap") == 256, policy
assert policy.get("activation_churn_limit_per_epoch") == 4, policy
assert policy.get("public_registration_directly_mutates_active_set") is False, policy
assert policy.get("active_admission_requires_guarded_operator_epoch_step") is True, policy
assert policy.get("money_step_remains_last") is True, policy

required = set(art.get("required_before_mutation") or [])
for item in [
    "mainnet0-validator-admission-blocker-proof",
    "mainnet0-validator-live-admission-dryrun-proof",
    "mainnet0-status-proof",
    "mainnet0-crossbox-status-smoke",
    "explicit operator confirmation",
    "no private keys committed",
]:
    assert item in required, (item, required)

non_goals = " ".join(art.get("non_goals") or [])
assert "does not activate validator" in non_goals, non_goals
assert "does not mutate live validator state" in non_goals, non_goals
assert "does not approve public Mainnet-0 launch" in non_goals, non_goals
assert "does not clear Buy VOID blocker" in non_goals, non_goals

lower = art_path.read_text().lower()
secret_words = [
    "private_key",
    "privatekey",
    "mnemonic",
    "seed phrase",
    "keystore",
    "passphrase",
    "password",
    "secret",
]
bad = [w for w in secret_words if w in lower]
assert not bad, bad

assert "reward_address" in keys, keys
assert "consensus_key" in keys, keys

print("[ok] readiness artifact is complete, non-mutating, policy-aligned, and secret-free")
PY

echo
echo "=== [3] blocker/dry-run/status proofs still pass ==="
make mainnet0-validator-admission-blocker-proof
make mainnet0-validator-live-admission-dryrun-proof

echo
echo "=== [3b] status proof or non-Prometheus smoke ==="
if curl -fsS --max-time 2 "$PROM/-/ready" >/dev/null 2>&1; then
  echo "[ok] Prometheus reachable; running full mainnet0-status-proof"
  make mainnet0-status-proof
else
  echo "[warn] Prometheus not reachable at $PROM; running mainnet0-status-smoke"
  make mainnet0-status-smoke
fi

echo
echo "=== [4] summary ==="
python3 - <<'PY'
print({
  "validator_live_admission_readiness": "green",
  "mutation_allowed": False,
  "launch_state": "not_go_for_public_mainnet0",
  "candidate": "candidate-validator-01",
  "next_operator_candidate": "vault124",
  "target_epoch": 126,
  "expected_validator_count": 125,
  "live_admission_executed": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 validator live-admission readiness proof passed"
