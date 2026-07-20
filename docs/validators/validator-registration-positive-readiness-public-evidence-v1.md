# Validator registration positive-readiness public evidence v1

`VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_V1`

## Status

This artifact records a bounded validator-registration milestone for VOID mainnet-0:

- the read-only status surface proved that the account, signer binding, wallet authority and deterministic submit payload could all become ready together;
- the live execution kill switch remained off;
- the live submit route still refused to sign or broadcast;
- the double-submit guard created no reservation;
- the temporary proof-wallet cleanup wrapper failed after the core proof;
- the production wallet store was subsequently restored and independently closed out exact green;
- no validator registration, admission or active-set mutation occurred.

This is evidence of **positive readiness without live execution**. It is not evidence that public validator registration is enabled.

## Authoritative provenance

| Evidence | SHA-256 |
|---|---|
| Positive-readiness core canary receipt | `ff4bd98d306af268d1d42817489d2f071a9ddc428c73afe50ebada4f47b181c2` |
| Production wallet recovery v11 receipt | `7ade6714c8559642ea4fad8e24c5253871dfd11daa868645751b827f9d58cebe` |
| Final recovery closeout receipt | `af4a2e3e99a401a5616feab5e2d09169319e9ec3592024d72caeb712a7d51c21` |
| Annotated checkpoint-tag receipt | `6242e5ecf3cfc829962e20778383622455ebee6a83dd65fce8fbf59af821cad3` |

Checkpoint tag:

```text
ckpt-validator-positive-readiness-wallet-recovery-v11-final-closeout-exact-green-20260720T070906Z
```

The checkpoint targets exact deployed runtime commit:

```text
8b961e919148e4035d03e32e20b12685df119beb
```

It deliberately does not claim that the newer remote `main` observed during the seal was deployed.

## What the core proof established

The positive-readiness proof requires both the environment gate and the explicit query opt-in for status-proof mode. In that read-only context, `ready_for_proof_submit` becomes true only when all of the following are true:

1. an account is present;
2. the status gate is enabled;
3. the selected signer derives to the same account;
4. participant-wallet authority is ready;
5. the deterministic payload stub is ready;
6. the stub returns HTTP 501 with a registry and submit-intent identifier.

The status route is observational. It does not reserve a submit intent and does not enable the live submit route.

During the core proof:

- proof-mode status reached positive readiness;
- payload readiness returned the expected HTTP 501 stub response;
- `submit-live` remained HTTP 501 and kill-switched;
- the response stated that no mutation or transaction send was allowed;
- the double-submit guard remained at zero reservations.

## Cleanup failure and recovery

The first isolated-wallet canary completed the core readiness proof, but its outer wrapper lost cleanup state through a shell pipeline subshell. That left the isolated one-record proof wallet store selected.

The recovery lane then:

- stopped Precision at an exclusive mutation boundary;
- quarantined the isolated proof store;
- promoted all 44 production wallet records from the untouched production backup;
- restarted Precision with live validator execution still off;
- verified that the proof account and unlock state were absent;
- removed the quarantine, recovery manifest and private canary directory;
- preserved the four-entry journal byte-for-byte;
- verified Precision, Nimo and Alienware in their protected roles.

The recovery and closeout receipts are part of this evidence contract, not optional context.

## Final bounded claims

The generated evidence JSON may claim only:

- positive-readiness core proof green;
- proof status mode was read-only;
- live submit stayed kill-switched;
- no double-submit reservation was created;
- wrapper cleanup failed and was recovered;
- the original 44-record production wallet store was restored exactly;
- the proof wallet and temporary recovery artifacts were removed;
- validator live execution, signer selection and status-proof mode ended off;
- the submit-intent journal remained unchanged;
- no signing, broadcast, validator registration, validator admission or active-set mutation occurred;
- the annotated runtime checkpoint tag was pushed and verified.

It may not claim:

- public validator registration is enabled;
- a validator was registered by the positive-readiness proof;
- an account entered the waiting or active set through this proof;
- live transaction execution was exercised by this evidence pack;
- remote `main` was deployed by the recovery checkpoint;
- the public validator program is open without a separate launch decision.

## Generate deterministic public JSON

The generator reads four exact sealed receipts and emits only a fixed public schema. It never copies arbitrary log text, filesystem paths, proof addresses or secret material.

```bash
python3 \
  ops/mainnet0/validator-registration-positive-readiness-public-evidence-v1.py \
  --positive-readiness-receipt /path/to/positive-readiness-receipt.txt \
  --recovery-receipt /path/to/recovery-v11-receipt.txt \
  --closeout-receipt /path/to/final-closeout-receipt.txt \
  --checkpoint-receipt /path/to/checkpoint-tag-receipt.txt \
  --out /tmp/validator-positive-readiness-public-evidence-v1.json
```

Contract-only inspection:

```bash
python3 \
  ops/mainnet0/validator-registration-positive-readiness-public-evidence-v1.py \
  --describe-contract
```

Internal deterministic self-test:

```bash
python3 \
  ops/mainnet0/validator-registration-positive-readiness-public-evidence-v1.py \
  --self-test
```

## Safety boundary

The generator has no network client, shell execution, RPC call, wallet access, signer access, service control or Git mutation capability. An output path must be explicitly selected. Output is written atomically and is derived from fixed booleans and hashes only.

`PROTECT THE CORE`
