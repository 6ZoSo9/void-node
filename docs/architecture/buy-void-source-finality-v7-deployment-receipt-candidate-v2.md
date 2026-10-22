# V7 deployment-receipt candidate V2

## Purpose

Derive the exact deployment-receipt bytes for the canonical V5 protected
source generation without installing them.

Target protected source:

- commit `be2fbe41aaba291d3f874b9de52bcb87336307f5`;
- tree `749877d2320ecee9d659720b32e4726a0c42d697`;
- parent `79081038cf4f03c2971bdcb32c54daf6a87fbabf`.

Accepted V5 enforcement evidence:

- candidate blob `46e3774ca442cf593d25b6062ab5538d5ac43611`;
- lock blob `bc1b2f4095315861db7a257d4cc3c80a9f112530`;
- candidate enforcement set
  `e72f512b0006eef7cec7325f39c56823eb3c878d7f8452a08c717478b7c8ac45`;
- current protected inventory
  `7f9bf2134ba33ddf52d6a2b9cf6fa1ba4b8ad437d71f2a5c2b1814f25f98d74f`.

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
