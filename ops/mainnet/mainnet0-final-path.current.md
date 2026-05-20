# VOID Mainnet-0 Final Path

status: active
launch_state: not_go_for_public_mainnet0
updated_at: 2026-05-17
operator_label: zoso

## Current green checkpoint

- checkpoint: ckpt-launch-approval-plan-baseline-refresh-green-20260520-151603
- commit: f2509c67
- Precision: ready=true, gap=0, txroot_live=1
- Alienware: ready=true, gap=0, txroot_live=1
- Cross-box status smoke: green
- Validator runtime truth: epoch127
- Validator count: 126
- Total power: 126000000000000000000000
- Epoch127 published: true
- Epoch127 publishedMatch: true
- Next operator selector: vault126 / epoch128 / expectedValidatorCount=127
- Public validator admission: still blocked
- Mainnet-0 public launch: still not approved

## What is already green

1. Precision and Alienware are synced to the same checkpoint.
2. Validator runtime truth recovered through epoch127.
3. Local 8545 recovery lane was repaired after vault125 admission.
4. Status smoke passes on both boxes.
5. Buy VOID Base watcher config is present.
6. Mainnet-0 remains fail-closed / not-go.
7. Dangerous live validator env is not set.
8. Public validator registration remains candidate/waiting only.
9. Participant public clarity rollup is cross-box green.
10. Home / Start Here clarity is rendered.
11. Buy VOID public safety clarity is rendered.
12. Stake/Register active-admission clarity is rendered.
13. Wallet backup/self-custody clarity is rendered.
14. Public release sanitization is cross-box green.
15. Sanitized public release export is gitleaks-clean with findings=0.

## Remaining launch blockers

### 1. Public launch approval is still blocked

Mainnet-0 must remain not_go_for_public_mainnet0 until the final go/no-go bundle is intentionally run and passes.

Definition of done:
- mainnet0-status-proof passes.
- mainnet0-prelaunch-safety-proof passes.
- mainnet0-crossbox-status-smoke passes.
- go/no-go wrapper exits GO only after blockers are intentionally cleared.

### 2. Public validator admission path is not launched

Operator/bootstrap validator admission is green through epoch127, but public validator promotion/admission remains blocked.

Definition of done:
- Public candidate/waiting path is clearly separated from active validator admission.
- Any public active admission path has a guarded owner/operator transition.
- Runtime truth, status docs, and UI copy agree.
- No public registration endpoint directly mutates the active validator set.

### 3. UI/product polish baseline is green, but final visual polish remains

The core public-safety copy is now proof-backed across Home, Buy VOID, Stake/Register, and Wallet backup. Remaining UI work is visual/tidiness polish, not basic launch-safety clarity.

Definition of done:
- Home/start flow remains clear.
- Wallet/account setup remains easy.
- Buy VOID flow keeps supported-chain warnings visible.
- Stake/validator copy continues to explain candidate vs active validator.
- Advanced/operator controls remain hidden from normal users.
- Final visual layout pass does not weaken any public clarity marker.

### 4. Buy VOID hardening remains

Buy VOID has been proven, but product hardening is still needed before public launch.

Definition of done:
- Supported chains/assets are clear.
- Blind deposits remain unsupported.
- Custodial/exchange sends remain warned against.
- Payment confirmation and VOID fulfillment remain separate auditable transitions.
- Operator fulfillment proof remains explicit.

### 5. Release/update path must stay green

Update safety is Mainnet-0 critical.

Definition of done:
- Update safety exporter is green.
- Critical update notification path is documented.
- Node restart/recovery behavior is tested.
- Rollback path is preserved.

### 6. Final public release hygiene baseline is green

The public export/release sanitization gate is now cross-box green. The sanitized public release tree passes gitleaks with findings=0. This must remain green through launch.

Definition of done:
- Secrets are not committed.
- Public release export passes.
- Gitleaks/security checks pass with findings=0.
- README/runbook is clear enough for early users.
- Final launch candidate reruns the sanitization gate after the last code change.

## Next recommended execution order

1. Keep this final-path doc current.
2. Keep public clarity rollup green.
3. Keep public release sanitization green.
4. Harden remaining Buy VOID fulfillment/operator flow.
5. Run update-safety and prelaunch safety proofs.
6. Run final go/no-go bundle.
7. Only then consider Mainnet-0 launch approval.

## Hard rule

Ready signals are not launch approval.

Mainnet-0 remains not-go until the final go/no-go bundle is intentionally run and passes.
