# Validator registration positive-readiness public release v1

`VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_RELEASE_V1`

## Public artifact

Canonical JSON:

```text
/public-node/validators/validator-registration-positive-readiness-public-evidence-v1.json
```

Repository path:

```text
public/public-node/validators/validator-registration-positive-readiness-public-evidence-v1.json
```

This release publishes the sealed validator-registration positive-readiness evidence in a deterministic, redacted, machine-readable form.

## What the artifact proves

- the core positive-readiness proof reached all read-only readiness gates;
- proof status mode did not enable live execution;
- `submit-live` remained kill-switched and sent no transaction;
- the double-submit guard created no reservation;
- the outer cleanup wrapper failed and the failure was recovered;
- the untouched 44-record production wallet store was restored exactly;
- the proof wallet and temporary recovery artifacts were removed;
- validator live execution, signer selection and proof status mode ended off;
- the submit-intent journal remained unchanged by recovery;
- no signing, broadcast, validator registration, admission or active-set mutation occurred;
- PR #642 was squash-merged and checkpointed.

## What the artifact does not claim

- public validator registration is enabled;
- this proof registered a validator;
- this proof moved an account into the waiting or active validator set;
- live transaction execution was exercised by this public release;
- the evidence checkpoint deployed a newer runtime;
- the public validator program is open without a separate launch decision.

## Provenance

Checkpoint tag:

```text
ckpt-validator-positive-readiness-public-evidence-v1-post-merge-exact-green-20260720T153049Z
```

Checkpoint target:

```text
ba47e31a393f32ed80bad80b013277e9d5010624
```

Evidence receipts are represented publicly by SHA-256 only:

| Evidence | SHA-256 |
|---|---|
| Positive-readiness core canary | `ff4bd98d306af268d1d42817489d2f071a9ddc428c73afe50ebada4f47b181c2` |
| Wallet recovery v11 | `7ade6714c8559642ea4fad8e24c5253871dfd11daa868645751b827f9d58cebe` |
| Final recovery closeout | `af4a2e3e99a401a5616feab5e2d09169319e9ec3592024d72caeb712a7d51c21` |
| Runtime checkpoint tag seal | `6242e5ecf3cfc829962e20778383622455ebee6a83dd65fce8fbf59af821cad3` |

The JSON contains no local receipt paths, proof account, private key, passphrase, wallet path or arbitrary receipt text.

## Verification

```bash
python3 -m json.tool   public/public-node/validators/validator-registration-positive-readiness-public-evidence-v1.json

"$HOME/dev/void-node/node_modules/.bin/tsx"   scripts/prove_validator_registration_positive_readiness_public_release_v1.ts
```

Expected marker:

```text
VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_RELEASE_V1_GREEN
```

`PROTECT THE CORE`
