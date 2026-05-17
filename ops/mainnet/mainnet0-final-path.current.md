# VOID Mainnet-0 Final Path

status: active
launch_state: not_go_for_public_mainnet0
updated_at: 2026-05-17
operator_label: zoso

## Current green checkpoint

- checkpoint: ckpt-vault125-epoch127-runtime-truth-green-20260517-032808
- commit: 37756189
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

### 3. UI/product polish is still needed

The participant app is functional but still needs final public-facing polish.

Definition of done:
- Home/start flow is clear.
- Wallet/account setup is easy.
- Buy VOID flow has clear supported-chain warnings.
- Stake/validator copy clearly explains candidate vs active validator.
- Advanced/operator controls are hidden from normal users.

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

### 6. Final public release hygiene

Before launch, the public export/release tree must be clean.

Definition of done:
- Secrets are not committed.
- Public release export passes.
- Gitleaks/security checks pass.
- README/runbook is clear enough for early users.

## Next recommended execution order

1. Keep this final-path doc current.
2. Run a light status proof.
3. Do UI/product polish.
4. Harden Buy VOID user flow.
5. Run public release scrub.
6. Run final prelaunch safety proof.
7. Run final go/no-go bundle.
8. Only then consider Mainnet-0 launch approval.

## Hard rule

Ready signals are not launch approval.

Mainnet-0 remains not-go until the final go/no-go bundle is intentionally run and passes.
