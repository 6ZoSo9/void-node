# Buy VOID allocation custody witness live-read replay executor v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_V1`
is the bounded live executor that closes one durable witness-read ceremony.

It composes the already-reviewed replay storage evidence, replay writer,
transport, live-read qualifier, and replay/live-read composition contracts. It
does not append to the Nimo witness and does not authorize payment, wallet,
signing, transaction, Chain-2050, presale, market, inventory, treasury, or
funds actions.

## Preconditions

The executor requires:

- preprovisioned replay journal and high-water roots;
- a live GREEN replay-storage installation evidence census;
- a V2 witness-installation **package** produced by the canonical installation
  evidence collector from the same double census as its receipt;
- the canonical SSH transport policy;
- the reviewed client private key file;
- the exact client `known_hosts` file committed by the transport policy; and
- the expected replay-storage hostname.

All file paths are absolute and fixed by the operator config. The executor does
not choose an alternate witness path or remote command.

## Ceremony

A successful real run performs exactly this sequence:

1. descriptor-read and verify the witness-installation package;
2. classify the canonical transport policy;
3. bind the exact known-hosts bytes and client public key identity;
4. run a fresh live replay-storage census;
5. generate 32 bytes from the local OS CSPRNG and commit only its SHA-256;
6. capture issue time and durably persist one replay `issued` transition;
7. build the canonical transport READ request for that exact challenge;
8. derive the live client/remote IPv4 context;
9. execute exactly one forced-command SSH READ with:
   - no SSH config file;
   - batch mode;
   - identities-only;
   - strict host-key checking;
   - explicit known-hosts file;
   - no global known-hosts fallback;
   - no forwarding/local command/TTY/password/keyboard-interactive path;
   - ED25519 host and client key algorithms;
10. require exit status 0 and empty SSH stderr;
11. validate the exact response through the canonical transport validator;
12. run the canonical live-read packet qualifier;
13. durably persist one replay `consumed` terminal transition whose request ID
    and response SHA-256 match the exact network packet;
14. run the canonical replay/live-read composition classifier; and
15. emit one content-addressed ceremony receipt.

No remote append request is constructed or authorized.

## Failure closure

Once an `issued` transition has been durably persisted, any later failure
before durable consume must attempt one canonical `abandoned` terminal
transition.

This includes transport failure, response validation failure, time-window
failure, live-read qualification failure, and consume failure.

A failure result explicitly reports whether issue, consume, abandonment, SSH
execution, and live remote read were performed. It never claims
`operation_performed=false` after a durable issue.

If abandonment itself fails, the executor returns a compounded HOLD reason so
operators know a pending challenge may require recovery.

## Live authority

The source contract itself only states capabilities.

A successful **default/non-injected** execution may report:

- `live_remote_read_performed=true`;
- `live_evidence_origin_proven=true`; and
- `external_transport_authenticated=true`;

because that process actually executed the pinned-key SSH read and bound the
result through durable replay composition.

Test-injected execution can never set those live flags.

Even a successful real receipt keeps all of the following false:

- `external_witness_storage_proven`;
- `live_sshd_connection_context_proven`;
- `trusted_verification_clock_proven`;
- `challenge_unpredictability_proven`;
- `response_replay_resistance_proven`;
- `live_durable_storage_proven`;
- `rollback_resistance_proven`;
- `protected_high_water_custody_proven`;
- `independent_custody_proven`;
- `runtime_integration`;
- `production_gate_ready`; and
- `funds_movement`.

Distinct disks and a successful remote read are not enough to invent
host/snapshot rollback independence.

## Configuration

The executor accepts one exact JSON object through
`VOID_BUY_VOID_WITNESS_LIVE_READ_REPLAY_EXECUTOR_CONFIG_JSON`:

```json
{
  "schema": "void_buy_void_allocation_custody_witness_live_read_replay_executor_config_v1",
  "marker": "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_CONFIG_V1",
  "version": 1,
  "replay_journal_root": "/absolute/journal-root",
  "replay_high_water_root": "/absolute/high-water-root",
  "expected_replay_hostname": "HOST",
  "witness_installation_package_path": "/absolute/installation-package.json",
  "transport_policy_path": "/absolute/transport-policy.json",
  "client_private_key_path": "/absolute/id_ed25519",
  "client_known_hosts_path": "/absolute/known_hosts"
}
```

The challenge TTL is fixed by source at 30 seconds. It is not caller-selectable.

## Focused proof

```bash
npm run typecheck
npm run build
node --check tools/void-buy-allocation-custody-witness-live-read-replay-executor-v1.mjs
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_executor_v1.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_composition_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_transport_v1.ts
node scripts/prove_void_buy_allocation_custody_witness_installation_evidence_v2.mjs
git diff --check
```

The focused executor proof performs no network access. It injects a canonical
fake transport endpoint while using real temporary replay writer roots.

It proves:

- durable issue followed by durable consume on success;
- transport failure followed by durable abandonment;
- no pending replay challenge after either tested path;
- test transport cannot promote live/authentication flags;
- no witness append builder is referenced; and
- all economic/funds authorities remain false.

## Next gate

After the executor source is merged, one explicit operator ceremony may produce
the first content-addressed live executor receipt.

That live receipt is still not production activation. A later custody gate must
address coordinated rollback/snapshot independence before
`protected_high_water_custody_proven`,
`independent_custody_proven`, or `production_gate_ready` can become true.
