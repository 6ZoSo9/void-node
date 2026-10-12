# VOID External Opportunity Across Scheduled Observer Runtime V1

## Status

Runtime V1 connects the merged deterministic Across scheduler to one
production read-only quote request, crash-consistent local state, a
sanitized append-only observation log, and disabled systemd deployment
templates.

This repository lane does not install or start the service or timer and
does not provision the real Across API key.

## Pinned prerequisites

The runtime depends on the sealed modules:

- `src/external_opportunity/across_quote_observer_v1.ts`
- `src/external_opportunity/across_swap_api_quote_ingestion_v1.ts`
- `src/external_opportunity/across_scheduled_observer_v1.ts`
- scheduled-observer merge commit:
  `d1eb95b37b111f409d87988b259a4f457cb19fd8`

The host-encrypted system credential transport was proven on Precision by:

- receipt SHA-256:
  `f25395f526df6863534af49c7e7b2e3a7b603a6043b50af2f3454a76e732ae97`
- report SHA-256:
  `dc70d673a3491abfd5a68aa92ecd92ab27aee1cd6c110129fb5cb0915e1d365b`
- selected strategy:
  `system_manager_host_encrypted_credential_user_process`

The probe established that a root-managed system unit running as `zoso`
can read the exact decrypted credential, cannot write it or its private
credential directory, and loses access when the transient unit is
collected.

## Runtime boundary

The runtime remains paper-only:

- endpoint: `GET https://app.across.to/api/swap/approval`;
- one authenticated GET per ready run;
- zero internal retries;
- minimum cadence: 900 seconds;
- maximum authenticated GETs per UTC day: 96;
- no approval or swap execution;
- no wallet or private-key access;
- `live_execution_authorized=false`.

A failed request still consumes the request slot that was reserved before
credential access. This prevents failures from bypassing the cadence or
daily cap.

## Crash-consistency sequence

A normal ready run follows this exact order:

1. acquire the single-instance lock;
2. recover a prior pending journal when present;
3. load and validate scheduler state;
4. create a deterministic scheduler plan;
5. atomically persist the reserved request slot;
6. read the systemd credential only after the plan is ready;
7. make exactly one authenticated GET with zero retry;
8. create a sanitized scheduler decision;
9. atomically persist the sanitized pending journal;
10. append the observation record idempotently and fsync it;
11. atomically persist final state;
12. remove and fsync the pending journal;
13. remove the single-instance lock.

Blocked plans perform no credential access and no network access.

## Pending-journal recovery

The pending journal contains only:

- deterministic decision status;
- UTC day and record SHA when recorded;
- sanitized append-only JSONL text when recorded;
- final scheduler state;
- explicit false retention, submission, and execution flags;
- its own canonical SHA-256.

It contains no API key, authorization header, raw response,
`approvalTxns`, `swapTx`, calldata, wallet, private key, or signature.

On restart, the runtime processes the pending journal before planning a
new request. It appends the record only when its record SHA is not already
present, atomically persists final state, and removes the journal. Pending
recovery never reads the credential or calls Across.

## State and record storage

The system service uses:

```text
/var/lib/void-external-opportunity-across-scheduled-observer-v1/
```

Systemd creates it through `StateDirectory=` as mode `0700` for `zoso`.
The runtime uses:

- `state-v1.json` — mode `0600`, atomic replacement;
- `pending-v1.json` — mode `0600`, atomic replacement;
- `runtime-v1.lock` — mode `0600`, exclusive creation;
- `records-v1/YYYY-MM-DD.jsonl` — mode `0600`, append-only per UTC day.

Atomic replacement writes a same-directory temporary file, fsyncs it,
renames it, then fsyncs the parent directory. JSONL append fsyncs both the
record file and its directory.

Every filesystem boundary rejects symlinks. The per-day JSONL file is
bounded before duplicate scanning.

## Credential transport

The disabled system service template uses:

```ini
LoadCredentialEncrypted=void-across-api-key:/etc/credstore.encrypted/void-across-api-key
```

The future encrypted blob must be:

- encrypted with the host credential key;
- owned by `root:root`;
- mode `0600`;
- stored at
  `/etc/credstore.encrypted/void-across-api-key`.

The plaintext API key is read only from
`$CREDENTIALS_DIRECTORY/void-across-api-key` after a ready request slot is
persisted. It is never accepted through argv, a regular environment
variable, an `EnvironmentFile=`, a repository file, a receipt, or a log.

The host key currently resides on unencrypted media. This protects normal
runtime and user-space disclosure but does not protect against offline
disk compromise.

## Public configuration

The service template contains only public route and policy configuration:

- 100 native USDC;
- Arbitrum chain `42161` to Base chain `8453`;
- Arbitrum native USDC:
  `0xaf88d065e77c8cc2239327c5edb3a432268e5831`;
- Base native USDC:
  `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`;
- integrator ID `0x022d`;
- depositor and fee recipient:
  `0x0d66fCDf95d38f7Db6B4206BF183f34cD816C2AA`;
- app fee `0.01`;
- paper capital and risk policy.

These values do not authorize a transaction.

## Systemd templates

The repository includes disabled templates:

- `void-external-opportunity-across-scheduled-observer-v1.service`;
- `void-external-opportunity-across-scheduled-observer-v1.timer`.

The service runs as `zoso`, has no Linux capabilities, uses strict
filesystem and kernel hardening, and writes only through its systemd state
directory.

The timer specifies:

- `OnBootSec=5min`;
- `OnUnitActiveSec=15min`;
- `AccuracySec=30s`;
- `RandomizedDelaySec=30s`;
- `Persistent=true`.

Committing these files does not install, enable, or start either unit.

## Funding boundary

Read-only observation requires no ETH or USDC. The operator's proposed
50 USD budget remains unspent and unauthorized.

Funding, approvals, swaps, fee collection, transaction construction,
signing, and submission require a separate bounded execution gate after
stable paper-observation evidence exists.

## Proof

Run:

```bash
npx tsx scripts/prove_external_opportunity_across_scheduled_observer_runtime_v1.ts
npm run build
```

The proof uses only an injected fixture transport. It verifies:

- request reservation before credential and network access;
- pending journal before record append;
- record append before final state;
- pending recovery without another GET;
- idempotent duplicate append handling;
- no retry after a failed request;
- no credential or network access for cadence and cap blocks;
- 96-request daily cap;
- sanitized retained state, journal, and JSONL;
- single-instance and no-symlink filesystem surfaces;
- encrypted system credential service template;
- disabled 15-minute timer template;
- no transaction surface;
- full TypeScript build.

## Next gate

After Runtime V1 is merged, a separate deployment builder may:

1. create an immutable production runtime bundle;
2. install the service and timer in a disabled state;
3. verify unit hardening and exact paths;
4. prompt locally for the real API key;
5. encrypt it directly to the root-owned credential store without
   retaining plaintext;
6. run one manual scheduled-service canary;
7. inspect the sanitized state and record receipts;
8. enable the timer only after that canary is exact green.

No step in this repository lane performs that deployment.
