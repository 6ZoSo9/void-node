# Buy VOID V7 privileged launcher package-runtime lock V1

## Outcome

Lock the exact Linux-x64 privileged-launcher package candidate derived
byte-identically on Node 22, 24 and 26 by #2952.

Accepted candidate wire identity:

- 4,705 bytes;
- SHA-256 `35b50f34dc2a13b2e91163c540a7bfe84aec1eb4e37787e54a63e4fba66be00e`;
- Git blob SHA-1 `a5a5c2499f7a591df599f1a0af931c461ba447b3`.

The accepted enforcement package identity remains the reviewed audited
`ethers + express` profile. The additional privileged TSX runtime is exactly:

- `tsx@4.23.15`;
- `esbuild@0.28.2`;
- `@esbuild/linux-x64@0.28.2`;
- runtime ID
  `voidtsxpr1_0f2bf2dba60718942e7db9b83779a2aeb2e9db32e74610a96a8ec978ad35e4d4`;
- aggregate
  `e16cca109419b3ce7b39970458fd76ba53bdc6399641911dd2016886c624a8ca`;
- 3 packages / 40 files / 11,972,707 bytes.

The lock proof reruns the exact frozen #2952 candidate derivation, requires its
wire SHA-256/Git-blob/byte length, validates the accepted enforcement profile
cross-binding and exact TSX identity, then requires the committed lock manifest.

## Promotion boundary

This lock accepts package-runtime identity only:

```text
privileged_launcher_package_runtime_identity_accepted=true
privileged_launcher_package_runtime_verified=true
protected_source_install_authorized=false
privileged_receipt_execution_authorized=false
runtime_service_mutation=false
credential_access=false
wallet_or_signer_access=false
rpc_call=false
transaction_broadcast=false
public_presale_activation=false
funds_movement=false
```

It does not make #2951's protected-launcher CI positive. That predecessor
currently fails closed because its disposable protected fixture omits
`runtime/canonical-producer-source-custody-v1.cjs`. A separate child must
carry this package lock into the protected launcher and repair that fixture
without weakening source custody.

No protected tree is installed on Precision and no privileged receipt tool is
executed.

**PROTECT THE CORE.**
