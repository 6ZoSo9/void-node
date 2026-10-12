# DataNet Operator Local Publish Pack v1 (Mainnet-0)

<!-- MARKER: VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_DOC_V1 -->

This document defines the first operator-terminal DataNet publish pack.

The pack lets an operator hash a local file or folder and generate a public-safe dataset manifest.

This is not a public upload endpoint.

This is not a ledger write.

This is not a Work Credit award.

## Operator command

```bash
ops/mainnet0/datanet-operator-local-publish-v1.sh \
  --dataset-id zoso-test-dataset-v1 \
  --source ./some-folder
Manifest guarantees

The generated public manifest includes:

dataset ID
object count
file-relative object paths
object byte sizes
object SHA-256 hashes
content root SHA-256
manifest SHA-256 output from the script
safety flags

The generated public manifest does not include:

absolute source path
operator home path
local storage root
shell command
private keys
secrets
tokens
Safety
terminal_only=true
public_post_upload=false
public_mutation=false
source_path_disclosed=false
local_storage_root_disclosed=false
ledger_write=false
wc_credit_award=false

PROTECT THE CORE.
