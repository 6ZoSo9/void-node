# Buy VOID V7 protected substrate source proposal V3

V3 hardens the V2 installed-qualification contract before any repository or host mutation.

The V1 candidate lock, materializer and fail-closed installer remain byte-for-byte preserved. V2's canonical source-custody and active-release byte-identity checks remain.

V3 additionally requires both the active protected release and the proposed V7 protected source root to prove exact commit/tree, symbolic `main`, and a clean worktree under a non-writing Git observation profile. Optional locks and lazy fetch are disabled; fsmonitor, untracked-cache and submodule recursion are disabled by command-local policy.

Candidate lock `voidv7substratelock1_6014a83805170202a6117b6004b94e1daddb2dd9123c17802002e72c8002a649` still keeps `protected_substrate_install_authorized=false`. No receipt publication, provider RPC, credential/key access, signing, transaction, presale/WC activation, or funds movement is authorized.
