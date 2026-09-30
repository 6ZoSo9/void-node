# VOID public bootstrap manifest publication and rollback packet v1

Status: source-only review packet. This lane does not replace `public/bootstrap/v1.json`, publish a stable seed, open a pull request, deploy a service, change DNS or TLS, or activate authority.

The packet supports both the initial `hold_no_stable_seed` → `stable_https_seed` transition and subsequent `stable_https_seed` → `stable_https_seed` renewal. The live qualification workflow emits four qualification files:

```text
qualification.json
public-bootstrap-v1.json
source.txt
SHA256SUMS
```

Those files previously still required a manual copy into the repository. This packet closes that gap without creating an automatic publication path.

## Boundaries

Packet generation requires:

- one completely clean exact repository checkout;
- an exact 40-character source SHA;
- the exact tracked Git blob SHA for `public/bootstrap/v1.json`;
- the current predecessor to be a content-addressed `hold_no_stable_seed` or `stable_https_seed` manifest whose exact Git blob is bound into the packet;
- a qualification artifact stored outside the repository;
- exact SHA-256 verification of all artifact files;
- `source.txt` bound to the exact repository source SHA;
- a fresh valid qualification receipt;
- the candidate manifest to be byte-for-byte exact builder output for that receipt; and
- a packet output directory outside the repository.

Packet generation rejects ignored in-repository artifact paths, stale or tampered receipts, resealed unknown candidate fields, a changed predecessor blob, a dirty checkout, a source mismatch, and an existing output directory.

## Build

After downloading the green live-qualification artifact to a directory outside the repository:

```bash
SOURCE_SHA="$(git rev-parse HEAD)"
PREDECESSOR_BLOB="$(git rev-parse HEAD:public/bootstrap/v1.json)"
ARTIFACT="$HOME/Downloads/void-public-seed-live-qualification-v1"
PACKET="$HOME/Downloads/void-public-bootstrap-manifest-publication-packet-v1-$SOURCE_SHA"

node scripts/build_void_public_bootstrap_manifest_publication_packet_v1.mjs \
  --artifact "$ARTIFACT" \
  --repo-root "$PWD" \
  --expected-source-sha "$SOURCE_SHA" \
  --expected-predecessor-blob "$PREDECESSOR_BLOB" \
  --output "$PACKET"
```

Verify independently:

```bash
node scripts/verify_void_public_bootstrap_manifest_publication_packet_v1.mjs \
  --packet "$PACKET" \
  --repo-root "$PWD" \
  --expected-source-sha "$SOURCE_SHA" \
  --expected-predecessor-blob "$PREDECESSOR_BLOB"
```

Both commands are read-only with respect to the repository. They do not invoke GitHub, copy a file into the checkout, or start a service.

For stable-seed renewal, the predecessor may already be expired. Expiry does not erase its role as the exact tracked source precondition; the new candidate must still be freshly qualified and unexpired at publication time.

## Packet contents

```text
packet.json
SHA256SUMS
REVIEW.txt
candidate/public/bootstrap/v1.json
rollback/public/bootstrap/v1.json
evidence/qualification.json
evidence/public-bootstrap-v1.json
evidence/source.txt
evidence/SHA256SUMS
```

`packet.json` is content-addressed with a `voidpbp1_` identifier. It binds:

- the exact source commit;
- the exact predecessor Git blob, SHA-256, and manifest ID;
- the qualification ID and artifact hashes;
- the exact candidate manifest ID and endpoint;
- the only allowed destination, `public/bootstrap/v1.json`;
- the deterministic rollback-hold manifest; and
- false values for publication and every private or economic authority flag.

## Publication review gate

Publication remains a bounded, inspectable source change:

1. Start a new branch from the packet's exact `source_sha`.
2. Confirm `HEAD:public/bootstrap/v1.json` equals the packet's predecessor Git blob.
3. Re-run the packet verifier immediately before publication. It rejects a stale
   qualification receipt and an expired candidate manifest using the canonical
   current-time freshness rules.
4. Replace `public/bootstrap/v1.json` with `candidate/public/bootstrap/v1.json`.
5. When v2 static mirrors are enabled, add the exact same candidate bytes at
   `public/void/bootstrap/v2/manifests/<candidate_manifest_id>.json`.
6. Never overwrite or delete an existing content-addressed v2 manifest or record.
7. Require no unrelated metadata or formatting changes.
8. Rerun the resolver, client, v2-static, repository, and outside-machine gates.
9. Merge or publish only under separate explicit authorization.

The publication packet authorizes the candidate alias bytes. The derived v2
mirror path is deterministic from the candidate's existing `manifest_id` and
must be byte-for-byte identical to the candidate. The packet does not create a
new v2 record or authorize any release-root signature.

## Rollback review gate

The rollback file is a content-addressed `hold_no_stable_seed` manifest with zero sync or onion endpoints and every authority flag false.

Rollback is valid only when the currently published manifest ID equals the packet's candidate manifest ID. Rollback replaces only the mutable alias:

```text
public/bootstrap/v1.json
```

Any content-addressed v2 manifest created during publication remains immutable
historical evidence and is not deleted during rollback.

After rollback, the resolver must report hold state and must not claim public synchronization. Service shutdown, tunnel changes, DNS changes, and incident response remain separate operational actions.

For a stable → stable renewal, this rollback is deliberately conservative: it moves the mutable alias to HOLD rather than silently restoring the prior stable seed. Restoring an older stable manifest is a separate reviewed source decision.

## Proof coverage

The focused proof exercises:

- exact artifact checksum binding;
- exact source binding;
- predecessor Git-blob binding for both HOLD and stable predecessors;
- byte-exact candidate preservation;
- deterministic rollback generation;
- candidate and rollback preconditions;
- checksum-tamper rejection;
- resealed unknown-field rejection;
- source mismatch rejection;
- in-repository output rejection;
- predecessor mismatch rejection;
- packet tamper rejection;
- verifier rejection of qualification receipts older than the canonical two-hour window;
- verifier rejection of expired candidate manifests;
- Node.js 22, 24, and 26 syntax; and
- zero publication, deployment, wallet, signer, validator, Work Credit, or money authority.

Expected marker:

```text
VOID_PUBLIC_BOOTSTRAP_MANIFEST_PUBLICATION_PACKET_V1_PROOF_GREEN
artifact_checksums_bound=true
qualification_source_bound=true
predecessor_git_blob_bound=true
candidate_byte_exact=true
candidate_destination_count=1
rollback_hold_deterministic=true
stable_predecessor_renewal_packet=true
verifier_receipt_freshness_enforced=true
verifier_candidate_expiry_enforced=true
publication_authorized=false
repository_mutated=false
services_changed=false
wallet_signer_validator_wc_money_authority=0
```
