# V7 deployment-receipt candidate V2

## Purpose

Derive the exact deployment-receipt bytes for the canonical V5 protected
source generation without installing them.

Target protected source:

- commit `3dc143bb16d7c1d1d5e0f674881cf12621818661`;
- tree `21e7fae2d3dfeb6a918c11799ae6644c6ca70a64`;
- parent `b9d8ad7aec19592b104d47da4a496710d4fde8db`.

Accepted V5 enforcement evidence:

- candidate blob `ef9d39fb22f7d4225f6f8abe6bb84c1f11acb8bc`;
- lock blob `3c341f2de794f0922d5d1af2d1574cee6450c0d5`;
- candidate enforcement set
  `ea6f7203779174302bd8f01219055dd5a126c8475e18dcb301e60e9a2481acbc`;
- current protected inventory
  `8fed6dc4bf5707123e720737fa5757ab3b62f2bf8cefa993eb56d43ff346198f`.

The candidate proof imports the checked-in production
`buildBuyVoidSourceFinalityV7DeploymentReceiptV1` and
`inspectAcceptedEnforcementLockV1` functions. It does not invoke
`installRootCustodiedReceiptV1`.

It also reuses the production classifier and requires the derived in-memory
receipt to classify:

```text
status=deployment_generation_verified
source_generation_verified=true
deployed_artifact_generation_verified=true
```

The reviewed source-file set remains 10 files at
`18d63ea70fc3a7a4d0ce3d427205717e2c72c40eb145fe677eb4ab6e869acb24`.

## Hosted identity

CI derives the exact receipt twice on Node 22, 24 and 26. Each lane requires
same-lane byte equality and uploads one JSON artifact. A separate Node 24 job
requires all three artifacts to be byte-identical and independently rederives
the receipt once more.

The resulting bytes are candidate/staging evidence only. They do not authorize
writing the fixed production path
`/var/lib/void-source-finality-v7/deployment-receipt.json`.

### Truth boundary

The pure in-memory classifier result describes how these **candidate bytes
would classify** if paired with the declared source identity. It is not an
observation of the installed protected source, installed receipt, running
process, or production gate. Hosted proof output therefore reports
`actual_installed_deployment_generation_verified=false`.

This proof is scoped to an exact **clean hosted checkout**. It pins committed
Git identities and rejects a dirty checkout, but it is not a hostile-worktree-
independent privileged/offline source authenticator. Any later root/offline
consumer must independently authenticate/materialize the reviewed source
closure before executing it.

## Preconditions for later use

A future V5 receipt-stage gate may bind these bytes only after:

1. Draft #3704 exact-head V5 lock CI is terminal GREEN;
2. the V5 full-history source candidate is independently qualified;
3. the future root-custodied stage builder revalidates exact source/lock
   identities;
4. the paired source+receipt exchange plan in #3706 is separately implemented,
   reviewed and authorized.

## Authority

```text
receipt_install_called=false
filesystem_mutation=false
protected_filesystem_mutation=false
service_mutation=false
systemd_mutation=false
provider_rpc_contact=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

PROTECT THE CORE.

## Current accepted-V5 receipt identity — October 23, 2026

Current source head `3dc143bb16d7c1d1d5e0f674881cf12621818661`, tree `21e7fae2d3dfeb6a918c11799ae6644c6ca70a64`, accepted lock blob `3c341f2de794f0922d5d1af2d1574cee6450c0d5`, candidate blob `ef9d39fb22f7d4225f6f8abe6bb84c1f11acb8bc`, and hardened production receipt builder `f2d5288d6c1b639df6d9dcb1c174046ec9287f3b` deterministically yield:

- accepted lock SHA-256 `b043f8a4bb45fe1619fdf6ba393cd7d9e40b23461e625bfac9e8c6e12cd4d28c`;
- accepted lock ID `voidbenfl1_91f58f23fd9452a23491801d227c654971ab9d0f5149ccc65dec5363a18472ac`;
- receipt ID `voidbsfdep1_351215ea3296d4935a4ae845d8f975166a8da20723ce9a56f94d9f4c21f25244`;
- receipt SHA-256 `2990e9bdef4793cc02f1dc0d502c1854f321f40202774e1e94939be9248efba6`;
- receipt bytes `1136`.

The reviewed 10-file source aggregate remains `18d63ea70fc3a7a4d0ce3d427205717e2c72c40eb145fe677eb4ab6e869acb24`. These are in-memory staging-candidate bytes only; actual installed deployment generation remains unverified and no receipt write authority is granted.
