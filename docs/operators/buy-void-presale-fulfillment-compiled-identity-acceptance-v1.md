# Buy VOID presale fulfillment compiled identity acceptance v1

Marker: `VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILED_IDENTITY_ACCEPTANCE_V1`

Status: reviewed compiler identity acceptance only.

This gate accepts one exact compiler artifact for
`BuyVoidPresaleFulfillmentV1` and still performs no Chain-2050 observation,
deployment, funding, runtime enablement, signing, broadcast, service action, or
public activation.

## Exact artifact

The accepted file is:

```text
ops/mainnet0/buy-void-presale-fulfillment-compiled-identity-v1.json
```

Its exact raw-file binding is:

```text
identity_id=voidbvpfci1_62d981d2478fe8e8c58740bd65a104f9950e722cf43405d45f4789076be37566
identity_json_sha256=695f5c4bd8b3561b0d43ba6f246b636b906bcbe11a81038fdf76ad8d52b8c330
identity_json_bytes=27270
source_commit=b65dd27070cbd2894a2378dc4e044a32210064c1
source_ref=main
```

The verifier first checks raw bytes and SHA-256 before JSON parsing.

## Embedded bytecode is independently recomputed

The acceptance verifier does not trust the JSON's declared bytecode hashes.

It decodes the embedded creation bytecode and runtime-template bytecode and
recomputes:

- byte count;
- SHA-256; and
- Ethereum Keccak-256.

The required values are:

```text
creation_bytecode_bytes=5681
creation_bytecode_sha256=ef0b7cfbe195b2196860715a8ce1d9bec6d65d8ca234cd7502c2cffd6ee0fab2
creation_bytecode_keccak256=0x14f68a6c6a69d87105129ae1901f8aa3d103518828a7795f08bf5b00d4b188c3

runtime_template_bytes=4237
runtime_template_sha256=bf349d39ade578ab06ba44881b3ddc43e88c752eefc75291f9196e883c435885
runtime_template_keccak256=0xfe85fd25582fd367a4be4ea8a7b25d7d17cebc7763800ceeae88e6071bd6686e
```

## Immutable layout

The accepted layout SHA-256 is:

```text
8562e3098ac4cd88d3685e0880761866a9d8d18891a33a196a4846091a80ae6b
```

Exact runtime patch locations:

```text
token:
  1292:32
  2833:32
  2871:32

fulfiller:
  543:32
  2795:32

predecessor:
  1795:32
  1855:32
  2046:32
  2109:32
  2169:32
  2568:32
  2632:32
```

The next Chain-2050 attestation must reconstruct deployed runtime by patching
these exact compiler-derived locations with the observed immutable constructor
bindings.

## Compiler-source binding

The accepted identity must still report:

```text
solc=0.8.24+commit.e11b9ed9
evm_version=paris
optimizer_enabled=false
optimizer_runs=200
via_ir=false
```

It must remain bound to the exact reviewed source bytes:

```text
contract_source_sha256=2d72ed1997e043cd370132a75a66b8df96c654c9c0c9dfafb9cbdc2fb12abdb8
standard_json_input_canonical_sha256=f413f3a6ef968f4992fcc9f8ea5cc6225fab039a0aef05fc7d13a5149b2ea3e9
```

## Acceptance boundary

A GREEN result means only:

```text
compiled_identity_accepted=true
deployment_attested=false
predecessor_lineage_attested=false
inventory_funding_verified=false
runtime_activation_authorized=false
public_activation_authorized=false
```

The accepted compiler identity is a prerequisite for deployment attestation. It
is not permission to deploy.

## Next gate

The next gate is a read-only exact Chain-2050 deployment and predecessor-lineage
attestation.

That gate must prove the observed contract is the reviewed compiler identity
with the exact VOID token, fulfiller wallet, predecessor lineage, runtime code,
presale cap, and fulfillment-history state.

Inventory funding and activation remain later, separately authorized gates.
