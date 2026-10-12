# Public Node DataNet Read-Only Challenge Route v1

Marker: VOID_DATANET_CHALLENGE_DOC_V1

Route:

       GET /public-node/datanet/challenge/:dataset_id

Primary success fixture:

       demo003-folder-fixture-v1

Missing fixture:

       void-missing-dataset-fixture-v1

Proof:

       ops/mainnet0/public-node-datanet-challenge-v1-proof.sh

Expected proof marker:

       VOID_DATANET_CHALLENGE_V1_GREEN

Policy:

       public_read_only=true
       bounded_read=true
       path_from_dataset_id=false
       filesystem_path_built_from_dataset_id=false
       mutation=false
       live_runtime_write=false
       ledger_write=false
       wc_credit_award=false
       money_movement=false
       wallet_send=false
       validator_mutation=false

Meaning:

       This route returns a challenge packet for a whitelisted DataNet/local-data dataset.
       It does not turn dataset_id into a filesystem path.
       It references existing public manifest/file routes and gives clients a stable SHA-256 challenge packet.
       It does not promote local evidence into network truth and does not award Work Credits.

## Public-node UI card <!-- VOID_DATANET_CHALLENGE_UI_DOC_V1 -->

The public node page surfaces the DataNet Challenge v1 route as a visible read-only card.

Card marker:

       VOID_DATANET_CHALLENGE_UI_V1

Card id:

       publicNodeDatanetChallengeCard

Primary link:

       /public-node/datanet/challenge/demo003-folder-fixture-v1

Safety flags:

       public_read_only=true
       path_from_dataset_id=false
       filesystem_path_built_from_dataset_id=false
       mutation=false
       ledger_write=false
       wc_credit_award=false

## Tester copy pack <!-- VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_DOC_V1 -->

The public node exposes a copy/paste tester pack for the DataNet Challenge route.

Route:

       /public-node/datanet/challenge-tester-copy-pack-v1.json

Marker:

       VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_V1

Expected smoke marker:

       VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_SMOKE_V1_GREEN

Policy:

       public_routes_only=true
       public_read_only=true
       bounded_read=true
       path_from_dataset_id=false
       filesystem_path_built_from_dataset_id=false
       mutation=false
       live_runtime_write=false
       ledger_write=false
       wc_credit_award=false
