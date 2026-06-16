# DataNet Published Dataset Read Route v1 (Mainnet-0)

<!-- MARKER: VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_DOC_V1 -->

This document defines the public read route for opening one operator-published DataNet manifest.

Route:

```txt
GET /public-node/datanet/published/:dataset_id/manifest-v1.json
Behavior

The route accepts a safe dataset_id, checks the published dataset registry, and returns the public-safe manifest metadata and object list for that dataset.

The route must not use the raw request dataset_id to build an arbitrary filesystem path. The dataset is selected through the registry first, then resolved under the fixed operator-published root.

Returned public data

The route may expose:

dataset ID
manifest marker
manifest SHA-256
source type
hash algorithm
object count
total bytes
content root SHA-256
relative object paths
object byte sizes
object SHA-256 hashes
content-addressed object names

The route must not expose:

absolute source path
operator home path
local storage root
shell commands
private keys
secrets
tokens
Safety
public_read_only=true
public_mutation=false
public_post_upload=false
public_shell_execution=false
dataset_selected_through_registry=true
raw_request_dataset_id_used_to_build_filesystem_path=false
absolute_source_path_disclosed=false
operator_home_path_disclosed=false
local_storage_root_disclosed=false
ledger_write=false
wc_credit_award=false

PROTECT THE CORE.
