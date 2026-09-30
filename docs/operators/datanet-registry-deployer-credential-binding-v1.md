# DataNet registry deployer credential identity binding v1

Marker: `VOID_DATANET_REGISTRY_DEPLOYER_CREDENTIAL_BINDING_V1`

Status: identity-only private credential binding. Signing remains HOLD.

## Purpose

Bind the dedicated offline DataNet registry deployer credential to the exact
unsigned registry-deployment candidate without creating or exposing a signer.

The canonical public deployment identity remains:

- role: `datanet_content_commitment_registry_deployer`;
- credential ID:
  `datanet-content-commitment-registry-deployer-wallet-v1`;
- deployer:
  `0x6c93ddfcc4116574fe66d63c1c67daedc0070dbb`;
- ceremony ID: `20260928T121413Z`; and
- public ceremony receipt SHA-256:
  `81a43d3c245b5badfa975c7ab998094359f62872600d533453df6cab8ed68cb3`.

The private key was generated offline on Nimo and is not represented by a
repository path.

## Operation-bound confirmation

The Nimo runner may read the credential only when supplied exactly:

`bindDatanetRegistryDeployerCredentialIdentityV1`

A general source-work authorization, merged PR, green CI run, or prior
transaction-construction confirmation does not satisfy this gate.

The confirmation is enforced twice by design:

- the Nimo runner rejects before loading evidence; and
- the exported credential-file observer itself rejects before inspecting the
  credential directory or opening the key file.

The production binding functions do not accept injectable candidate validators
or credential observers. Tests use the canonical merged unsigned-candidate
validator and test credential observation separately; callers cannot substitute
a fake observer to manufacture identity evidence.

The runner also requires host `Nimo`, clean `main`, and the exact unsigned
candidate plus all four candidate evidence artifacts.

## Public evidence before private access

Before opening the credential file, the runtime path validates:

1. the canonical deployer-selection artifact;
2. the unsigned transaction candidate;
3. deployment-input plan;
4. fresh fee/funding packet;
5. pre-sign revalidation receipt; and
6. transaction-construction admission.

Malformed or mismatched public evidence therefore fails before private-key
access.

## Credential path boundary

The credential directory is supplied explicitly by the operator at execution
time. It must be an absolute canonical private directory.

The tool appends only the fixed credential ID. The private path is never written
into the binding receipt or printed by the runner.

The credential file must be:

- opened with `O_NOFOLLOW`;
- a regular file;
- canonical and non-symlinked;
- one hard link only;
- owned by the current Nimo operator user;
- mode 0400 or 0600; and
- at most 128 bytes.

The containing directory must have no group/other permission bits.

## Private-key handling

The private key is read only to derive its public EOA address.

The tool:

- never emits raw private-key bytes;
- never emits a private-key digest;
- never exports a signer object;
- never constructs a wallet object;
- zeroes the credential byte buffer after derivation;
- releases the temporary private-key string reference; and
- does not sign any message or transaction.

JavaScript does not provide a formal memory-erasure guarantee for immutable
strings; therefore this contract claims no stronger memory-erasure property
than the explicit byte-buffer zeroing.

## Binding receipt

A green receipt is content-addressed and binds:

- Nimo;
- exact repository head;
- candidate ID;
- unsigned transaction hash;
- transaction fingerprint;
- deployer address/fingerprint;
- fixed credential ID;
- public ceremony lineage; and
- non-secret credential metadata: mode and size.

The receipt contains no private credential path.

Its validator rebuilds the binding against the exact unsigned candidate and its
upstream evidence. Rehashing an edited binding is not sufficient.

## Authority boundary

A green binding truthfully records that credential/private-key content was read
for identity derivation.

It simultaneously records:

- identity binding only;
- raw private-key output false;
- private-key digest output false;
- signer object exposed false;
- wallet access false;
- deployer funding false;
- transaction signing authorized false;
- transaction signing performed false;
- transaction submission false;
- transaction broadcast false;
- deployment false;
- Chain-2050 write false;
- funds movement false;
- migration authorization false; and
- public activation authorization false.

## Next gate

The binding is lineage evidence only.

Immediately before any signing decision, the system must:

1. rerun fresh read-only candidate/state revalidation;
2. rebind this same deployer credential identity on Nimo; and
3. require a separate exact single-transaction signing authorization.

This binding confirmation must never be reused as signing or broadcast
authorization.
