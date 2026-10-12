# DataNet Published Object Fetch Route v1 (Mainnet-0)

<!-- MARKER: VOID_DATANET_PUBLISHED_OBJECT_FETCH_DOC_V1 -->

This document defines the public object fetch route for operator-published DataNet objects.

Route:

```txt
GET /public-node/datanet/published/:dataset_id/object/:sha256
Behavior

The route accepts a safe dataset_id and a lowercase 64-character SHA-256 hash.

The dataset is selected through the published dataset registry. The object is selected from that dataset's public-safe manifest object list. The route then serves the bytes for the matching content-addressed object and verifies the SHA-256 before returning it.

Safety
dataset_selected_through_registry=true
object_selected_from_manifest=true
object_sha256_verified=true
raw_request_dataset_id_used_to_build_filesystem_path=false
raw_request_sha256_used_to_build_filesystem_path=false
absolute_source_path_disclosed=false
operator_home_path_disclosed=false
local_storage_root_disclosed=false
public_mutation=false
ledger_write=false
wc_credit_award=false

The route returns bytes, not local paths.

PROTECT THE CORE.
