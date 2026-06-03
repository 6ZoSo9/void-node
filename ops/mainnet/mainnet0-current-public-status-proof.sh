#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="docs/public/mainnet0-current-public-status.md"
LIVE_CLOSEOUT="docs/public/mainnet0-public-live-closeout.md"
LIVE_ANNOUNCEMENT="docs/public/mainnet0-public-live-announcement.md"
INDEX="docs/public/README.md"
WHITEPAPER="docs/public/void-network-whitepaper.md"
QUICK="docs/public/quick-start.md"
WSL2="docs/public/windows-wsl2-quick-start.md"
SUPPORT="docs/public/support-runbook.md"
START="docs/public/start-here.md"
STACK_PROOF="ops/mainnet/mainnet0-public-docs-stack-proof.sh"
DEVREF="docs/public/developer-reference.md"
SURFACE_PROOF="ops/mainnet/mainnet0-public-surface-proof.sh"
BUNDLE="docs/public/mainnet0-public-release-bundle-closeout.md"
HYGIENE="ops/mainnet/mainnet0-public-release-hygiene.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 current public status proof ==="

echo
echo "=== [1] required files ==="
for f in "$DOC" "$INDEX" "$WHITEPAPER" "$QUICK" "$WSL2" "$SUPPORT" "$START" "$STACK_PROOF" "$DEVREF" "$SURFACE_PROOF" "$BUNDLE" "$HYGIENE" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] current public status identity ==="
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q '^current_public_release_checkpoint: 2865819a / ckpt-public-release-bundle-whitepaper-green-20260524-103149$' "$DOC"
grep -q '^whitepaper_checkpoint: 9067695b / ckpt-mainnet0-whitepaper-v1-green-20260524-102511$' "$DOC"
grep -q '^public_release_hygiene_checkpoint: 9b904aa1 / ckpt-public-release-hygiene-public-live-green-20260524-090437$' "$DOC"
grep -q '^quick_start_checkpoint: 0635c606 / ckpt-mainnet0-quick-start-green-20260524-111319$' "$DOC"
grep -q '^windows_wsl2_quick_start_checkpoint: 3e2fb76c / ckpt-mainnet0-windows-wsl2-quick-start-green-20260524-112502$' "$DOC"
grep -q '^support_runbook_checkpoint: 85be902f / ckpt-mainnet0-support-runbook-green-20260524-123228$' "$DOC"
grep -q '^participant_first_user_clarity_checkpoint: 9b118fec / ckpt-participant-first-user-clarity-green-20260601-111631$' "$DOC"
grep -q '^public_run_node_support_checkpoint: a40e147b / ckpt-public-run-node-support-proof-green-20260601-113719$' "$DOC"
grep -q '^start_here_checkpoint: a149f3c4 / ckpt-mainnet0-start-here-green-20260524-163001$' "$DOC"
grep -q '^public_docs_stack_checkpoint: 9e1cd6d3 / ckpt-public-docs-stack-network-troubleshooting-green-20260602-071543$' "$DOC"
grep -q '^developer_reference_checkpoint: 3a28fce3 / ckpt-mainnet0-developer-reference-green-20260525-022240$' "$DOC"
grep -q '^public_surface_checkpoint: 83cb22f9 / ckpt-mainnet0-public-surface-green-20260525-085128$' "$DOC"
grep -q 'VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.' "$DOC"
grep -q 'make mainnet0-public-docs-stack-proof' "$DOC"
echo "[ok] public status identity/checkpoints present"

echo
echo "=== [3] public docs bundle listed ==="
grep -q 'docs/public/start-here.md' "$DOC"
grep -q 'docs/public/void-network-whitepaper.md' "$DOC"
grep -q 'docs/public/mainnet0-public-release-bundle-closeout.md' "$DOC"
grep -q 'docs/public/mainnet0-current-public-status.md' "$DOC"
grep -q 'mainnet0-current-public-status.md' "$INDEX"
grep -q '^status: public_mainnet0_live$' "$WHITEPAPER"
grep -q '^status: public_mainnet0_live$' "$QUICK"
grep -q '^status: public_mainnet0_live$' "$WSL2"
grep -q '^status: public_mainnet0_live$' "$SUPPORT"
grep -q '^status: public_mainnet0_live$' "$START"
grep -q '^status: public_mainnet0_live$' "$DEVREF"
grep -q '^status: public_release_bundle_cross_box_green$' "$BUNDLE"
grep -q '^status: public_live_release_hygiene_green$' "$HYGIENE"
echo "[ok] public docs bundle agrees"

echo
echo "=== [4] live and guarded scopes ==="
grep -q 'VOID Mainnet-0 public status is live.' "$DOC"
grep -q 'Whitepaper v1 is available.' "$DOC"
grep -q 'Start-here public landing overview is available.' "$DOC"
grep -q 'Public docs stack composite proof is available.' "$DOC"
grep -q 'Developer reference is available.' "$DOC"
grep -q '^mainnet0-public-surface-proof:' Makefile
grep -q '/__void/participant/stake/next-onboard' "$DOC"
grep -q '/__void/status' "$DOC"
grep -q '/__void/runtime/validator-truth/status' "$DOC"
grep -q '/__void/ready.json' "$DOC"
grep -q '/participant' "$DOC"
grep -q 'Public served surface proof is available.' "$DOC"
grep -q 'make mainnet0-public-surface-proof' "$DOC"
grep -q 'Linux quick-start is available.' "$DOC"
grep -q 'Windows WSL2 quick-start is available.' "$DOC"
grep -q 'Public support runbook is available.' "$DOC"
grep -q 'Public active validator admission remains disabled.' "$DOC"
grep -q 'Public validator registration remains candidate/waiting only.' "$DOC"
grep -q 'Vault126 onboarding has not been executed.' "$DOC"
grep -q 'Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.' "$DOC"
grep -q 'Future treasury spend remains separately guarded.' "$DOC"
grep -q 'vault126 / epoch128 / expectedValidatorCount=127' "$DOC"
echo "[ok] live scope and guardrails present"

echo
echo "=== [5] status file agreement ==="
grep -q '^status: public_mainnet0_live$' "$STATUS"
grep -q '^mainnet0-public-docs-stack-proof:' Makefile
grep -q 'This public launch state does not authorize public active validator admission' "$STATUS"
echo "[ok] status file agrees"

echo
echo "=== [6] dependent proofs ==="
make mainnet0-whitepaper-proof
make mainnet0-public-release-bundle-closeout-proof
make mainnet0-status-smoke

echo
echo "=== [7] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-current-public-status-ready.json
echo
python3 - /tmp/void-current-public-status-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [8] no obvious secret material in current public status doc ==="
python3 - "$DOC" <<'PY'
from pathlib import Path
import re
import sys

text = Path(sys.argv[1]).read_text()
patterns = {
    "pem_private_key_block": r"BEGIN [A-Z ]*PRIVATE KEY",
    "private_key_assignment": r"(?i)\bprivate[_-]?key\s*[:=]\s*[^\s]+",
    "mnemonic_assignment": r"(?i)\bmnemonic\s*[:=]\s*[^\n]+",
    "seed_phrase_assignment": r"(?i)\bseed[_ -]?phrase\s*[:=]\s*[^\n]+",
    "passphrase_assignment": r"(?i)\bpassphrase\s*[:=]\s*[^\n]+",
    "json_keystore_crypto": r'"crypto"\s*:\s*\{',
}
hits = []
for name, pat in patterns.items():
    for m in re.finditer(pat, text):
        line = text.count("\n", 0, m.start()) + 1
        hits.append((line, name))
if hits:
    print(hits)
    raise SystemExit(1)
print("[ok] no obvious secret-like assignments, PEM private keys, or keystore blocks found")
PY

echo
echo "=== [9] summary ==="
python3 - <<'PY'
print({
  "current_public_status": "green",
  "launch_state": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "whitepaper": "included",
  "public_release_bundle": "cross_box_green",
  "public_active_validator_admission": "disabled",
  "vault126_onboarding_executed": False,
  "future_treasury_spend": "separately_guarded"
})
PY


echo
echo "=== [buy/stake public clarity pointer refresh] ==="
grep -q '^buy_void_ux_txref_clarity_checkpoint: 67f3f3d8 / ckpt-buy-void-ux-txref-clarity-green-20260601-142627$' "$DOC"
grep -q '^stake_public_preview_clarity_checkpoint: 5171df05 / ckpt-stake-public-preview-clarity-green-20260601-193825$' "$DOC"
grep -q 'Latest Buy VOID and Stake public clarity refresh' "$DOC"
grep -q 'ckpt-buy-void-ux-txref-clarity-green-20260601-142627' "$DOC"
grep -q 'ckpt-stake-public-preview-clarity-green-20260601-193825' "$DOC"
grep -q 'no automatic delivery' "$DOC"
grep -q 'preview-only, candidate/waiting-only' "$DOC"
echo "[ok] Buy VOID and Stake public clarity pointers present"


echo
echo "=== [public site bundle auto-materialization pointer] ==="
grep -q '^public_site_bundle_auto_materialize_checkpoint: cea7726a / ckpt-public-site-bundle-auto-materialize-green-20260601-204502$' "$DOC"
grep -q 'Latest DataNet site bundle auto-materialization refresh' "$DOC"
grep -q 'ckpt-public-site-bundle-auto-materialize-green-20260601-204502' "$DOC"
grep -q 'seeded, peer-readable, and auto-materializing' "$DOC"
grep -q 'datanet_live_v1_peer_materialized' "$DOC"
echo "[ok] public site bundle auto-materialization pointer present"


echo
echo "=== [public node network troubleshooting pointer] ==="
grep -q '^public_node_network_troubleshooting_checkpoint: b51a615c / ckpt-public-node-network-troubleshooting-green-20260602-023325$' "$DOC"
grep -q 'Latest public node network troubleshooting refresh' "$DOC"
grep -q 'ckpt-public-node-network-troubleshooting-green-20260602-023325' "$DOC"
grep -q 'local VOID node remains ready while the host machine loses internet access' "$DOC"
grep -q 'does not mutate chain state' "$DOC"
echo "[ok] public node network troubleshooting pointer present"


echo
echo "=== [public docs stack pointer refresh] ==="
grep -q '^public_docs_stack_checkpoint: 9e1cd6d3 / ckpt-public-docs-stack-network-troubleshooting-green-20260602-071543$' "$DOC"
grep -q 'Latest public docs stack refresh' "$DOC"
grep -q 'ckpt-public-docs-stack-network-troubleshooting-green-20260602-071543' "$DOC"
grep -q 'public node network troubleshooting runbook' "$DOC"
grep -q 'does not mutate chain state' "$DOC"
echo "[ok] public docs stack pointer present"


echo
echo "=== [current public status docs stack proof repair pointer] ==="
grep -q '^current_public_status_docs_stack_proof_repair_checkpoint: ba8ecb44 / ckpt-current-public-status-docs-stack-proof-repair-green-20260602-081224$' "$DOC"
grep -q 'Latest current public status proof repair' "$DOC"
grep -q 'ckpt-current-public-status-docs-stack-proof-repair-green-20260602-081224' "$DOC"
grep -q 'validate the public docs stack pointer refresh' "$DOC"
grep -q 'does not mutate chain state' "$DOC"
echo "[ok] current public status docs stack proof repair pointer present"


echo
echo "=== [public FAQ network troubleshooting pointer] ==="
grep -q '^public_faq_network_troubleshooting_checkpoint: 567d7a8b / ckpt-public-faq-network-troubleshooting-green-20260602-105407$' "$DOC"
grep -q '^wc_to_void_test_swap_explainer_checkpoint: 14a0c81a / ckpt-wc-to-void-test-swap-explainer-green-20260602-213920$' "$DOC"
grep -q '^wc_to_void_copy_compact_checkpoint: 87f050a1 / ckpt-wc-to-void-copy-compact-green-20260603-023554$' "$DOC"
grep -q 'Latest public FAQ network troubleshooting refresh' "$DOC"
grep -q 'ckpt-public-faq-network-troubleshooting-green-20260602-105407' "$DOC"
grep -q 'local VOID node still returns `ready:true`' "$DOC"
grep -q 'docs/public/node-network-troubleshooting.md' "$DOC"
grep -q 'does not mutate chain state' "$DOC"
echo "[ok] public FAQ network troubleshooting pointer present"

echo
echo "=== [WC->VOID test-swap explainer pointer] ==="
grep -q '^wc_to_void_test_swap_explainer_checkpoint: 14a0c81a / ckpt-wc-to-void-test-swap-explainer-green-20260602-213920$' "$DOC"
grep -q 'Latest WC→VOID test-swap explainer refresh' "$DOC"
grep -q 'ckpt-wc-to-void-test-swap-explainer-green-20260602-213920' "$DOC"
grep -q 'temporary local-devnet wallet only' "$DOC"
grep -q 'explicit native-wallet unlock/sign confirmation' "$DOC"
grep -q 'make participant-wc-to-void-temp-wallet-execution-proof' "$DOC"
grep -q "does not mutate chain state" "$DOC"
grep -q "the user's real wallet" "$DOC"
grep -q 'WC→VOID real wallet execution remains explicit unlock/sign only' "$DOC"
echo "[ok] WC->VOID test-swap explainer pointer present"

echo
echo "=== [WC->VOID compact-copy pointer] ==="
grep -q '^wc_to_void_copy_compact_checkpoint: 87f050a1 / ckpt-wc-to-void-copy-compact-green-20260603-023554$' "$DOC"
grep -q 'Latest WC→VOID compact-copy refresh' "$DOC"
grep -q 'ckpt-wc-to-void-copy-compact-green-20260603-023554' "$DOC"
grep -q 'shortens the visible Trade/WC→VOID state text' "$DOC"
grep -q 'WC→VOID swaps are wallet-signed' "$DOC"
grep -q 'test proof uses a temporary local-devnet wallet only' "$DOC"
grep -q 'real wallet execution requires explicit unlock/sign confirmation' "$DOC"
grep -q 'make public-first60-user-journey-proof' "$DOC"
grep -q 'does not mutate chain state' "$DOC"
grep -q "the user's real wallet" "$DOC"
grep -q 'WC→VOID visible trade copy is compact' "$DOC"
echo "[ok] WC->VOID compact-copy pointer present"

echo
echo "=== [github branch cleanup pointer] ==="
grep -q 'github_branch_cleanup_checkpoint: f0366cfd / ckpt-github-branch-cleanup-proof-fixed-green-20260603-073931' "$DOC"
grep -q 'remote_non_main_branch_count: 0' "$DOC"
grep -q 'archive_branch_tag_count: 13' "$DOC"
grep -q 'archive_branch_tag_prefix: archive/branch-cleanup-20260603-071740/\*' "$DOC"
grep -q 'superseded_branch_cleanup_tag: ckpt-github-branch-cleanup-proof-green-20260603-072540' "$DOC"
echo "[ok] GitHub branch cleanup pointer present"

echo "[ok] Mainnet-0 current public status proof passed"


grep -q 'public_live_closeout_checkpoint: 4180224d / ckpt-mainnet0-public-live-closeout-green-20260525-110841' "$DOC"
grep -q 'docs/public/mainnet0-public-live-closeout.md' "$DOC"
grep -q 'make mainnet0-public-live-closeout-proof' "$DOC"
grep -q 'Public live closeout proof is available.' "$DOC"
test -f "$LIVE_CLOSEOUT"
grep -q '^status: public_mainnet0_live$' "$LIVE_CLOSEOUT"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$LIVE_CLOSEOUT"



grep -q 'public_live_announcement_checkpoint: 33c10bd6 / ckpt-mainnet0-public-live-announcement-green-20260525-211809' "$DOC"
grep -q 'docs/public/mainnet0-public-live-announcement.md' "$DOC"
grep -q 'make mainnet0-public-live-announcement-proof' "$DOC"
grep -q 'Public live announcement proof is available.' "$DOC"
test -f "$LIVE_ANNOUNCEMENT"
grep -q '^status: public_mainnet0_live$' "$LIVE_ANNOUNCEMENT"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$LIVE_ANNOUNCEMENT"
grep -q 'current_public_status_checkpoint: e5f6a8a4 / ckpt-current-public-status-public-live-closeout-green-20260525-130102' "$LIVE_ANNOUNCEMENT"
grep -q 'public_live_closeout_checkpoint: 4180224d / ckpt-mainnet0-public-live-closeout-green-20260525-110841' "$LIVE_ANNOUNCEMENT"
grep -q 'Public active validator admission, treasury spend, Buy VOID fulfillment, and authority transfer remain guarded.' "$LIVE_ANNOUNCEMENT"

