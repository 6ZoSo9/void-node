# Buy VOID fresh-candidate auto-claim V1

## Purpose

This lane consumes one exclusive alert emitted by the merged
observe-and-claim candidate watch, re-derives current readiness from canonical
server-controlled state, and delegates exactly one verified-payment claim to
the existing Buy VOID auto-claim worker.

It removes the manual handoff between candidate detection and the durable
fulfillment claim. It does not reserve inventory, access a wallet, sign,
broadcast, decrement inventory, close out a delivery, or move VOID.

## Safety boundary

- Exactly one alert per invocation.
- Exactly one currently eligible request is required.
- The current request ID, plan fingerprint, and all confirmations must match
  the alert.
- The alert filename is bound to its alert fingerprint.
- A server-controlled configuration file provides payment-observer and
  fulfillment policy.
- Apply requires `buyVoidApplyFreshCandidateAutoClaim`.
- The delegated existing worker receives its own exact
  `buyVoidAutoClaimPayment` confirmation.
- The only permitted economic mutation is the duplicate-safe fulfillment
  claim journal.
- The public request journal is not written.
- Existing execution, wallet, signer, inventory, and broadcast runtimes are
  not imported or enabled.

## Configuration contract

The runtime configuration is intentionally not committed and is disabled
until separately installed by the operator:

```json
{
  "schema": "void_buy_void_fresh_candidate_auto_claim_config_v1",
  "marker": "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIG_V1",
  "version": 1,
  "enabled": false,
  "root_dir": "/server/controlled/buy-void-root",
  "request_dir": "/server/controlled/public-buy-void-requests-v1",
  "worker_policy": {},
  "observer_policy": {},
  "verification_policy": {},
  "fulfillment_policy": {}
}
```

The production configuration must be assembled from the already deployed Buy
VOID payment watcher and sale policy. It must not contain private keys,
mnemonics, wallet credentials, or signed transactions.

## One-shot command

```bash
npx --no-install tsx \
  scripts/buy_void_fresh_candidate_auto_claim_v1.ts \
  --repo-root "$PWD" \
  --alert "$ALERT_FILE" \
  --config "$CONFIG_FILE" \
  --state-dir \
    "$HOME/.local/state/void-buy-void-fresh-candidate-auto-claim-v1"
```

The command above is a dry run. Apply additionally requires:

```bash
--apply \
--confirmation buyVoidApplyFreshCandidateAutoClaim
```

## Activation status

This source lane is not a live deployment. No systemd path unit, policy file,
or apply authority is installed by this change. Production activation remains
a separate exact-config deployment after merge and disabled-runtime
verification.
