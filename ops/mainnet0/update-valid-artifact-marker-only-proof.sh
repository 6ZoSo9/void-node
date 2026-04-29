#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
MAN="${MAN:-config/update-manifest.v0.json}"
SIGN_KEY="${SIGN_KEY:-.secrets/update-ed25519.v1.pem}"
SERVICE="${SERVICE:-void-node.service}"
OUT="${OUT:-/tmp/void-update-valid-artifact-marker-only-proof.$(date +%Y%m%d-%H%M%S)}"
ART_DIR="$OUT/artifact-src"
ART_TGZ="$OUT/void-update-marker-only-proof.tgz"

mkdir -p "$OUT" "$ART_DIR"

cleanup() {
  set +e
  if [ -f "$OUT/original-update-manifest.v0.json" ]; then
    cp -a "$OUT/original-update-manifest.v0.json" "$MAN"
  fi
  rm -f runtime/upgrade-staged.v1.json
  rm -f runtime/upgrade-apply-pending.v1.json
  rm -f runtime/upgrade-rollback-marker.v1.json
}
trap cleanup EXIT

json_get() {
  python3 - "$1" "$2" <<'PY'
import json, sys
p=sys.argv[1]
expr=sys.argv[2]
j=json.load(open(p))
print(eval(expr, {}, {"j": j}))
PY
}

main_pid() {
  systemctl --user show -p MainPID --value "$SERVICE" 2>/dev/null || echo ""
}

echo "=== valid signed artifact marker-only proof ==="
echo "base=$BASE"
echo "out=$OUT"

echo
echo "=== [1] preconditions ==="
test -f "$MAN"
test -f "$SIGN_KEY"
cp -a "$MAN" "$OUT/original-update-manifest.v0.json"

rm -f runtime/upgrade-staged.v1.json
rm -f runtime/upgrade-apply-pending.v1.json
rm -f runtime/upgrade-rollback-marker.v1.json

curl -fsS "$BASE/__void/ready.json" | tee "$OUT/ready.before.json"
echo
curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/status.before.json"
echo

PID_BEFORE="$(main_pid)"
echo "pid_before=${PID_BEFORE:-unknown}"

echo
echo "=== [2] create harmless tgz artifact ==="
cat > "$ART_DIR/README.txt" <<TXT
VOID update marker-only proof artifact.
This is not a runnable install package.
Created at $(date -Is).
TXT

tar -C "$ART_DIR" -czf "$ART_TGZ" README.txt
ART_SHA="$(sha256sum "$ART_TGZ" | awk '{print $1}')"
echo "artifact=$ART_TGZ"
echo "artifact_sha256=$ART_SHA"

echo
echo "=== [3] write/sign temporary manifest pointing at artifact ==="
python3 - "$MAN" "$ART_TGZ" "$ART_SHA" <<'PY'
import json, sys
from datetime import datetime, timezone

man, artifact_path, artifact_sha = sys.argv[1], sys.argv[2], sys.argv[3]
m = {
  "version": "999.0.2-marker-only-proof",
  "protocol_version": 1,
  "min_protocol_version": 1,
  "channel": "stable",
  "published_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "sha256": "",
  "notes": "Security update marker-only proof: signed artifact metadata should stage/apply marker files only.",
  "artifact_path": artifact_path,
  "artifact_sha256": artifact_sha,
  "signature": {
    "alg": "ed25519",
    "key_id": "dev-ed25519-local-v1",
    "sig": ""
  }
}
open(man, "w").write(json.dumps(m, indent=2) + "\n")
PY

ops/void-sign-update-manifest.sh "$MAN" "$SIGN_KEY" > "$OUT/sign.log"

echo
echo "=== [4] dry-run should be ready for downloaded apply ==="
curl -fsS "$BASE/upgrade/dry-run" | tee "$OUT/dry-run.signed-artifact.json"
echo

python3 - "$OUT/dry-run.signed-artifact.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("dry_run_only") is True, j
assert j.get("update_available") is True, j
assert j.get("signature_valid") is True, j
assert j.get("safe_to_apply") is True, j
assert j.get("reason") == "ready_for_downloaded_apply", j
a=j.get("artifact") or {}
assert a.get("exists") is True, j
assert a.get("sha256_matches") is True, j
print("[ok] signed artifact dry-run ready")
PY

echo
echo "=== [5] POST /upgrade/stage writes staged marker only ==="
curl -fsS -X POST "$BASE/upgrade/stage" | tee "$OUT/stage.json"
echo

python3 - "$OUT/stage.json" <<'PY'
import json, os, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("reason") == "staged", j
stage_file=j.get("stage_file")
assert stage_file and os.path.exists(stage_file), j
assert stage_file.endswith("runtime/upgrade-staged.v1.json"), j
print("[ok] staged marker written")
PY

test -f runtime/upgrade-staged.v1.json
test ! -f runtime/upgrade-apply-pending.v1.json

echo
echo "=== [6] POST /upgrade/apply writes pending/rollback markers only ==="
curl -fsS -X POST "$BASE/upgrade/apply" | tee "$OUT/apply.json"
echo

python3 - "$OUT/apply.json" <<'PY'
import json, os, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("reason") == "apply_pending_written", j
assert j.get("pending_file","").endswith("runtime/upgrade-apply-pending.v1.json"), j
assert j.get("rollback_file","").endswith("runtime/upgrade-rollback-marker.v1.json"), j
assert os.path.exists(j["pending_file"]), j
assert os.path.exists(j["rollback_file"]), j
p=j.get("pending") or {}
assert p.get("apply_mode") == "manual_pending_only", j
print("[ok] apply marker-only pending/rollback written")
PY

test -f runtime/upgrade-staged.v1.json
test -f runtime/upgrade-apply-pending.v1.json
test -f runtime/upgrade-rollback-marker.v1.json

echo
echo "=== [7] prove no restart happened and boot consumer is still disabled ==="
sleep 1
PID_AFTER="$(main_pid)"
echo "pid_after=${PID_AFTER:-unknown}"

if [ -n "$PID_BEFORE" ] && [ -n "$PID_AFTER" ] && [ "$PID_BEFORE" != "0" ] && [ "$PID_AFTER" != "0" ]; then
  test "$PID_BEFORE" = "$PID_AFTER"
  echo "[ok] service PID unchanged"
else
  echo "[warn] PID check unavailable; relying on ready/head checks"
fi

curl -fsS "$BASE/__void/ready.json" | tee "$OUT/ready.after-apply.json"
echo

if [ -f runtime/upgrade-boot-consumer-status.v1.json ]; then
  cat runtime/upgrade-boot-consumer-status.v1.json | tee "$OUT/boot-consumer-status.json"
  echo
  python3 - "$OUT/boot-consumer-status.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("enabled") is False, j
assert j.get("reason") == "boot_consumer_disabled", j
assert j.get("decision") == "skip_boot_consumer", j
print("[ok] boot consumer remains disabled")
PY
else
  echo "[warn] no boot consumer status file present"
fi

echo
echo "=== [8] cleanup active markers and restore manifest ==="
cleanup
trap - EXIT

test ! -f runtime/upgrade-staged.v1.json
test ! -f runtime/upgrade-apply-pending.v1.json
test ! -f runtime/upgrade-rollback-marker.v1.json

curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/status.restored.json"
echo

python3 - "$OUT/status.restored.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("signature_valid") is True, j
assert j.get("update_available") is False, j
assert j.get("installs_update") is False, j
print("[ok] restored normal safe update status")
PY

echo
echo "out=$OUT"
