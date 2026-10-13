# Buy VOID Epoch-2 public signer-control evidence V1

This source-only lane accepts one public EIP-191 proof that the operator signer
controlled the immutable Epoch-2 fulfiller address at the challenge time.

Accepted public fulfiller:

\`0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a\`

The evidence was produced from canonical source
\`5bc76c0c1410f8db2f3e759a94a2a3184ab800de\`, tree
\`118fa8680937d88db1e8a83a393408123e01f03c\`.

## Evidence

The checked-in record contains only public material:

- the domain-separated \`OFFCHAIN_PROOF_OF_CONTROL_ONLY\` challenge;
- the public 65-byte EIP-191 signature;
- source/bundle/receipt/verification hashes;
- interpretation flags that keep all runtime and financial authority false.

Reviewed identifiers:

- uploaded public bundle SHA-256:
  \`666e392f30afb2f7aec885dc6d7350596ccda5415132436d478de695a90995d5\`
- public receipt SHA-256:
  \`b38f6f44a7d92e06dea2b7a6b7571cb2dd9b049fc2952eefc7b9af7f837f93b3\`
- verification transcript SHA-256:
  \`866ea9e7cde4b6b44b035f8013dd256ae5416f70aee3126671561e05763efe06\`
- signing-message SHA-256:
  \`0492a0ae6b2a3fcbd18c907dc2a847b7f16be07ac49840a420182342b4017dad\`
- canonical evidence ID:
  \`a0228229b4432e54c02f970a5047fc1a16c703e2072057f245624e0d2c3b3d57\`

The repository verifier reconstructs the exact signing message, recovers the
signer with EIP-191 verification, requires the immutable fulfiller, checks the
original public-receipt hash, and binds the reviewed signer-control source blob
at the accepted source generation.

No private key, seed phrase, keystore, password, flash backup, or systemd
credential is checked into this repository.

## Dormant candidate V2

V2 preserves V1 byte-for-byte and carries the same disabled runtime
configuration. It changes only the reviewed signer evidence state:

- \`signer_offchain_control_proven=true\`;
- a content-addressed public signer-control evidence ID is bound;
- the completed
  \`prove_launch_operator_signer_controls_exact_immutable_epoch2_fulfiller\`
  gate is removed.

Five gates remain explicit:

1. independently attest systemd credential identity and active signing
   capability;
2. bind accepted signer evidence to the current runtime source generation;
3. qualify the live zero-fee or nonzero-fee envelope and exact chain receipt;
4. complete the current Chain-2050 one-payment/one-fulfillment canary;
5. coupled presale and WC/VOID Sovereign activation.

## Authority boundary

This evidence proves only point-in-time off-chain control of the public
fulfiller address. It does not prove an installed credential, current runtime
source binding, live payment-signing authority, transaction authority, public
presale activation, WC/VOID activation, or funds movement.

V1 remains historical and unchanged. V2 is candidate-only and is not an
install/deploy instruction.
