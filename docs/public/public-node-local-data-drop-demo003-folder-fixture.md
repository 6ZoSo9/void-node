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


## Demo 003 folder intake <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_DOC_V1 -->

Demo 003 folder intake verifies a folder fixture offline and imports it into operator-local runtime evidence:

       DATA_DIR=.runtime/mainnet0 \
         ops/mainnet0/public-node-local-data-drop-demo003-folder-intake.sh

Status check:

       DATA_DIR=.runtime/mainnet0 \
         ops/mainnet0/public-node-local-data-drop-demo003-folder-intake-status.sh

Expected markers:

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED
       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=true

Preserved trust flags:

       offline_verified=true
       network_fetch_during_import=false
       trusted_as_network_truth=false

Policy: this is still operator-local evidence. It proves a verified folder payload can enter local runtime storage without becoming automatic network truth.


## Demo 003 public folder serving <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_PUBLIC_FOLDER_SERVING_DOC_V1 -->

Demo 003 folder evidence can be served through read-only public routes after operator-local intake:

       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json
       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html
       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/README.txt
       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/metadata.json

Proof:

       DATA_DIR=data_a \
         ops/mainnet0/public-node-local-data-drop-demo003-public-folder-serving-proof.sh

Expected marker:

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_PUBLIC_FOLDER_SERVING_PROOF_V1_GREEN

Policy: public folder serving is read-only. The folder was operator-imported, offline verified, and still carries trusted_as_network_truth=false.


## Demo 003 public-node card <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_CARD_DOC_V1 -->

The public node page now surfaces Demo 003 as a visible verified folder card.

Card marker:

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_CARD_V1

Card links:

       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json
       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html
       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/README.txt
       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/metadata.json

Proof:

       ops/mainnet0/public-node-local-data-drop-demo003-folder-card-proof.sh

Expected marker:

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_CARD_PROOF_V1_GREEN


## Demo 003 outside tester smoke coverage <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_OUTSIDE_TESTER_SMOKE_DOC_V1 -->

The outside tester smoke path now checks the Demo 003 verified folder card and folder routes.

Public smoke surface:

       /public-node/outside-tester-smoke.json

Standalone script:

       /public-node/standalone-outside-tester-smoke.sh

Demo 003 routes checked by the outside tester script:

       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json
       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html
       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/README.txt
       /public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/metadata.json

Expected proof marker:

       VOID_PUBLIC_NODE_DEMO003_OUTSIDE_TESTER_SMOKE_PROOF_V1_GREEN


## Demo 003 tester-share and tester-bundle visibility <!-- VOID_PUBLIC_NODE_DEMO003_TESTER_SHARE_BUNDLE_DOC_V1 -->

The outside tester human page and tester bundle now surface Demo 003 verified folder/site routes directly.

Marker:

       VOID_PUBLIC_NODE_DEMO003_TESTER_SHARE_BUNDLE_V1

Visible surfaces:

       /public-node/tester-share
       /public-node/tester-bundle.json
       /public-node/share-link.json
       /public-node/external-tester-copy-pack.json
       /public-node/first-tester-request-copy-pack.json

The standalone smoke script remains the executable tester path and still emits:

       VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN
