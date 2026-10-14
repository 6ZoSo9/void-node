# Buy VOID V2 selector ELF candidate

This lane derives a reproducible installed-binary candidate for the accepted
V2 native pidfd selector source from #2966.

Three independent Ubuntu 24.04 jobs compile the exact tracked C source with a
closed deterministic flag set, remove compiler-ident and ELF build-id metadata,
strip the result, execute the binary's self-test, and emit the exact binary
SHA-256/byte count plus compiler/strip executable SHA-256 values.

The cross-job gate requires all three ELF files and metadata receipts to be
byte-identical.

This is evidence only. Even GREEN remains:

- install_authorized=false
- receipt_publication=false
- production_source_finality_authority_ready=false
- public_presale_activation=false
- funds_movement=false

A separate accepted lock must bind the exact emitted ELF before the protected
V2 collector may execute an installed selector.
