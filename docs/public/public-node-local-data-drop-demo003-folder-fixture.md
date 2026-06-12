# Public Node Local Data Drop Demo 003 Folder Fixture

Marker: VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_DOC_V1

Status: fixture/proof lane.

Demo 003 starts the folder-style local data-drop path. Instead of a single object, it creates a small multi-file folder fixture with a manifest, per-file hashes, a checksum file, and a tarball.

Command:

       ops/mainnet0/public-node-local-data-drop-demo003-folder-fixture.sh

Proof:

       ops/mainnet0/public-node-local-data-drop-demo003-folder-fixture-proof.sh

Expected fixture marker:

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_V1_GREEN

Expected proof marker:

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_PROOF_V1_GREEN

Fixture contents:

       files/README.txt
       files/index.html
       files/metadata.json
       manifest.json
       sha256sums.txt
       demo003-folder-fixture.tar.gz

Trust boundary:

       offline_verified=true
       network_fetch=false
       network_fetch_during_import=false
       trusted_as_network_truth=false

Safety boundary:

       public_routes_only=true
       read_only=true
       mutation=false
       money_movement=false
       wallet_send=false
       validator_mutation=false

Meaning: Demo 003 prepares the multi-file/folder payload model before public serving. The fixture proves the folder can be packaged, hashed, checksummed, and verified without changing node runtime behavior or promoting local evidence into network truth.
