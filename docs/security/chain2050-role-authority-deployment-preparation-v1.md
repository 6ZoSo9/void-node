# Chain-2050 role-authority deployment preparation v1

Marker:
`VOID_CHAIN2050_ROLE_AUTHORITY_DEPLOYMENT_PREPARATION_V1`

## Sovereign acceptance

The exact review packet:

`0f7bd135971b0f41d9ab203a579b6b382d4bbf734bc14f0a2cb0fd15030ab1df`

has been explicitly accepted for its exact compiled-bytecode identity.

The committed acceptance record is intentionally not a cryptographic signature.
It records the interactive Sovereign authorization and keeps all later
authority gates explicit.

Accepted creation bytecode SHA-256:

`c0844cd0718ed2dc345bbc01107b57dbb2c2129e325066bff399502031a14733`

Accepted expected deployed runtime SHA-256:

`b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d`

## Address selection boundary

No role-registry owner or deployer is selected by this PR.

The preparation primitive requires two explicit nonzero addresses and requires
owner/deployer separation.

By default it rejects reuse of every named Mainnet-0 address currently in the
collision census, including canonical contracts, treasury/admin roles,
fulfillment wallet, privileged/named EOAs, and the existing Buy VOID
fulfillment deployer.

Reusing any such role requires a separate explicit exception gate.

## Deployment-data construction

Given a collision-free explicit pair and exact accepted creation bytecode, the
primitive:

1. verifies creation-bytecode SHA-256;
2. ABI-encodes `constructor(address initialOwner)`;
3. appends the owner argument to the accepted creation bytecode;
4. computes deployment-data SHA-256 and Keccak-256;
5. derives the CREATE contract address from deployer + nonce; and
6. builds an unsigned EIP-1559/type-2 Chain-2050 deployment candidate.

The caller must explicitly provide nonce, gas limit and fee caps. They are not
invented by the tool.

## Authority boundary

Even a successful preparation reports:

- signing: false;
- transaction broadcast: false;
- deployment: false;
- Chain-2050 mutation: false;
- registry append: false;
- production activation: false;
- funds action: false.

This PR performs no RPC call and touches no credentials, private keys, wallets
or signers.

## Next gate

The next operationally useful step is to produce a fresh **owner/deployer
candidate pair** and review it against this collision contract.

After explicit selection, a separate read-only Chain-2050 observer must bind
the deployer's fresh pending nonce, gas estimate and fee policy before the
actual unsigned deployment transaction can be accepted.

Signing and broadcast remain later explicit Sovereign gates.
