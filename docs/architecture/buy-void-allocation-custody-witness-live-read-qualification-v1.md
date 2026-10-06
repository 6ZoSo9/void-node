# Buy VOID allocation custody witness live-read qualification v1

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1`
is a **pure packet classifier** for the next source-only #2452 boundary.

It binds four already-reviewed domains into one deterministic qualification:

1. one canonical V2 witness-installation evidence receipt plus its exact
   normalized V2 qualification object;
2. one canonical witness transport policy;
3. exact client-side `known_hosts` bytes for the reviewed ED25519 host key; and
4. one challenge-bound read request/response packet with explicit observation
   ordering and evidence-generation ordering.

It performs no filesystem access, network access, SSH, key access, witness
mutation, runtime integration, payment, transaction, activation, inventory,
treasury/liquidity or funds movement.

A successful result means only **the supplied packet is internally consistent
with the reviewed source contracts**. It is not proof that an SSH ceremony
actually happened.

## V2 installation receipt binding

The classifier accepts the exact
`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V2`
receipt shape and recomputes its `collector_receipt_sha256` over canonical
receipt-body bytes.

It requires the installation receipt to retain the source-only authority
boundary from the merged collector, including:

- V2 installation qualification observed;
- runtime-bundle qualification observed;
- the exact merged runtime-bundle manifest ID
  `voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7`;
- the exact merged runtime-bundle manifest SHA-256
  `sha256:2190e7ab944436200b03e46285fa5ba4cda1b90d915cfda05b320d1b1dc7ebe2`;
- merged runtime-bundle evidence collector observed;
- host key and authorized client key observed;
- effective sshd policy observed;
- continuity attestation observed;
- pre-exec runtime behavior observed; and
- all live-origin, external-transport/storage, runtime, custody, production and
  funds authority still false.

The classifier also requires
`installation_normalized_qualification`, the exact normalized object emitted
by the V2 installation qualifier. Its canonical SHA-256 must equal the
receipt's `normalized_qualification_sha256`, and the same digest must
reconstruct the receipt's `voidwiq2_<sha256>` installation qualification ID.

Only after that commitment is proven does the classifier compare the normalized
installation's `transport_policy_sha256`, `remote_user`,
`host_key_sha256`, `known_hosts_sha256`, and
`client_public_key_sha256` to the separately supplied canonical transport
policy. A self-consistent installation receipt for a different SSH policy
therefore HOLDS instead of being combined with the live-read packet.

The receipt's witness digest, event count and tip event SHA-256 are rebound to
the subsequently validated transport response.

This classifier does **not** rerun the host collector and therefore does not
promote a self-consistent receipt or normalized qualification into live-origin
evidence.

## Witness host identity

The installation receipt must expose a canonical host identity containing:

- `hostname`; and
- `machine_id_sha256`.

The witness-storage summary must also contain `witness_hostname`.

Both hostnames are compared case-insensitively to the canonical transport
`remote_host`. This prevents combining an installation receipt for one
witness host with client `known_hosts` material and a read packet for a
different host.

The machine-ID value is validated as a SHA-256 identifier but is not required
to equal the historical witness-tip machine ID because the merged V2
installation path explicitly supports reviewed machine-ID continuity.

## Client-side known-hosts qualification

`client_known_hosts_base64` must decode to one canonical OpenSSH line:

```text
<reviewed host> ssh-ed25519 <canonical base64 key blob>
```

The qualifier requires:

- exact SHA-256 of the complete known-hosts bytes;
- exact reviewed host name and port representation;
- exact `ssh-ed25519` algorithm;
- exactly one 32-byte ED25519 public key in the OpenSSH key blob; and
- exact SHA-256 of that OpenSSH public-key blob.

No wildcard, hashed host token, alternate algorithm, extra line, comment or
additional host entry is accepted by this V1 contract.

This closes only **client packet content qualification**.
`client_known_hosts_content_observed` in the earlier host collector remains
false because that collector did not read the client machine.

## Challenge/read packet

The qualifier rebuilds the canonical transport read request from:

- the reviewed transport policy; and
- the exact supplied challenge SHA-256.

The supplied request bytes must match that canonical request exactly.

The response is then verified by the merged
`validateBuyVoidAllocationCustodyWitnessTransportResponseV1(...)` contract.
The validated witness digest, event count and tip event SHA-256 must exactly
match the installation receipt's witness-storage summary.

The source contract therefore binds the same witness state across the
installation receipt and the read-response packet without performing SSH.

## Time and generation ordering

The packet includes:

- `challenge_issued_at_ms`;
- `response_observed_at_ms`;
- `prior_evidence_generation`; and
- `evidence_generation`.

The response observation must be no earlier than challenge issue and no more
than 38 seconds later, matching the reviewed 8-second connection + 30-second
operation envelope.

The evidence generation must equal exactly `prior + 1`.

These are **ordering constraints on supplied packet data only**. The contract
intentionally keeps:

- `trusted_verification_clock_proven=false`;
- `evidence_generation_monotonicity_proven=false`;
- `challenge_freshness_proven=false`; and
- `response_replay_resistance_proven=false`.

A later live ceremony must obtain time and generation from independently
reviewed durable authority rather than caller-selected integers.

## Network-context binding

The supplied client/server addresses must be valid IP addresses and must equal
the V2 installation receipt's reviewed sshd connection-context source/local
addresses. The transport port must also match.

This is still packet consistency only:
`live_sshd_connection_context_proven=false`.

The source contract does not authenticate those address observations or claim
they came from the live SSH connection.

## Qualification receipt

For identical accepted packet inputs, the classifier deterministically emits a
`voidwlrq1_<sha256>` qualification ID over a normalized object containing:

- installation collector receipt SHA-256 and qualification ID;
- exact normalized installation-qualification SHA-256;
- nested runtime-bundle collector receipt SHA-256;
- transport marker and policy SHA-256;
- remote user/host/port;
- installation and witness hostnames;
- known-hosts and host-key SHA-256;
- client public-key SHA-256;
- challenge and canonical request ID;
- supplied observation times and computed challenge age;
- prior/current evidence generations;
- observed client/server addresses; and
- witness SHA-256, event count and tip event SHA-256.

No mutable operation is performed.

## Authority boundary

Even an accepted packet reports:

- `live_evidence_origin_proven=false`;
- `trusted_verification_clock_proven=false`;
- `evidence_generation_monotonicity_proven=false`;
- `live_sshd_connection_context_proven=false`;
- `challenge_freshness_proven=false`;
- `response_replay_resistance_proven=false`;
- `external_transport_authenticated=false`;
- `external_witness_storage_proven=false`;
- `live_remote_read_performed=false`;
- `runtime_integration=false`;
- `protected_high_water_custody_proven=false`;
- `independent_custody_proven=false`;
- `production_gate_ready=false`; and
- `funds_movement=false`.

The qualifier performs no SSH and reads no credential or private key.

## Focused proof

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_qualification_v1.ts
node scripts/prove_void_buy_allocation_custody_witness_installation_evidence_v2.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_transport_v1.ts
git diff --check
```

The proof covers receipt digest/authority drift, normalized-installation
commitment mismatch, self-consistent installation/transport-policy mismatch,
installation/witness hostname drift, known-hosts host/key/digest drift,
challenge-age ordering, generation ordering, connection-context drift,
request-byte drift, response/challenge binding, deterministic reclassification
and all negative authority flags.

## Next gate

This source contract does not close #2452.

A later separately authorized live ceremony must produce and preserve:

1. exact current V2 installation evidence from the designated host;
2. exact reviewed client-side known-hosts bytes;
3. an independently generated unpredictable challenge;
4. one authenticated remote read over the reviewed forced-command transport;
5. trusted observation time;
6. a durable monotonic evidence-generation/replay record; and
7. evidence proving the live packet came from the authenticated designated
   witness rather than from synthetic or caller-supplied bytes.

Any live SSH, key use, installation, service/config mutation, witness write,
payment, transaction, activation, inventory or funds action remains a separate
operator authority gate.
