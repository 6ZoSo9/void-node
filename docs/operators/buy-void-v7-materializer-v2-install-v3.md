# Buy VOID V7 materializer V2 / installer V3 repair

Status: **source/CI-only repair; host apply remains separately authorized**.

Precision reproduced the accepted selector exactly at SHA-256
`048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232`,
26680 bytes, and reproduced the accepted native exactly at SHA-256
`8ce663ff7e3713fc6bf615dd743350be9e50dff729fdb3d609b065b158397851`,
21600 bytes.

The historical V1 materializer incorrectly reused the selector build contract
for the native: selector-only `-fno-ident`, `--build-id=none`, followed by
`strip --strip-all`. That produced deterministic but wrong native bytes:
SHA-256 `d7409280e5a1c1807d59487229f107ac9c51c579b855b6a0e6fe9a854ebb47a7c`,
18488 bytes.

V2 preserves V1 unchanged and separates the build contracts. Selector retains
the accepted flags plus strip. Native uses the accepted `-O2` contract with
no selector-only flags and no strip.

Installer V3 preserves V2 publication mechanics but binds repaired materializer
V2 blob `e31a97227abaa27b18fc1be321b83f35b707cb90`, predecessor installer V2 blob
`aae2d1a011053ea0665bf07972d9670cca73f6da`, and predecessor merge
`fa3cda59b8ea00f1bff9a936179ba0ef94d9d0de` / tree
`8cf585e4e32f085520b5f3536101e082f284f9e7`.

V3 uses a fresh plan namespace and explicit V3 confirmation token. Historical
V1 lock authority remains false. No protected installation, service/systemd
mutation, credential/key access, signing, transaction/RPC, presale/WC
activation or funds movement is authorized by this repair.

PROTECT THE CORE.
