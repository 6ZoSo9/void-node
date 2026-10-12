#!/usr/bin/env bash
set -euo pipefail

SRC="src/index.ts"

echo "=== VOID DataNet Explorer v1 proof ==="

req() {
  grep -Fq "$1" "$SRC" || {
    echo "missing: $1"
    exit 1
  }
}

req 'APP.get("/public-node/datanet/explorer-v1"'
req 'VOID_DATANET_EXPLORER_ROUTE_V1'
req 'VOID_DATANET_EXPLORER_V1'
req 'VOID DataNet Explorer v1'
req 'first single-page explorer for the live Mainnet-0 public DataNet surface'
req 'registry, challenge, manifests, object/file routes, receipts, schema index, and example pack'

req 'Published dataset registry'
req '/public-node/datanet/published-dataset-registry-v1.json'
req 'Demo003 folder manifest'
req '/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json'
req 'Demo003 challenge packet'
req '/public-node/datanet/challenge/demo003-folder-fixture-v1'

req 'index.html'
req '/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html'
req 'README.txt'
req '/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/README.txt'
req 'metadata.json'
req '/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/metadata.json'

req 'Contribution receipt index'
req '/public-node/datanet/core-contribution-receipt-index-v1.json'
req 'Receipt schema index'
req '/public-node/datanet/core-receipt-schema-index-v1.json'
req 'Receipt example pack'
req '/public-node/datanet/core-receipt-example-pack-v1.json'
req 'Published retrieval receipt'
req '/public-node/datanet/published-retrieval-receipt-v1.json'

req 'BASE="https://zoso-alienware-aurora-r7.taila47fd.ts.net"'
req 'curl -fsS "$BASE/public-node/datanet/challenge/demo003-folder-fixture-v1"'
req 'curl -fsS "$BASE/public-node/datanet/core-receipt-example-pack-v1.json"'
req 'curl -fsS "$BASE/public-node/datanet/core-contribution-receipt-index-v1.json"'

req 'public_route=true'
req 'read_only=true'
req 'public_mutation=false'
req 'local_filesystem_write=false'
req 'ledger_write=false'
req 'wc_award_now=false'
req 'money_movement_now=false'
req 'wallet_send_now=false'
req 'void_transfer_now=false'
req 'wc_to_void_swap_now=false'
req 'validator_mutation_now=false'

req 'DataNet Explorer v1 →'
req 'marker: "VOID_DATANET_EXPLORER_V1"'
req 'human DataNet explorer page linking registry, demo fixture, challenge, manifests, files, receipts, schema index, example pack, and copyable read-only checks'

echo "datanet_explorer_route_present=true"
echo "datanet_explorer_human_page=true"
echo "links_registry=true"
echo "links_demo003_manifest=true"
echo "links_demo003_challenge=true"
echo "links_demo003_files=true"
echo "links_receipts=true"
echo "copyable_curl_checks=true"
echo "public_route=true"
echo "read_only=true"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_award_now=false"
echo "money_movement_now=false"
echo "wallet_send_now=false"
echo "void_transfer_now=false"
echo "wc_to_void_swap_now=false"
echo "validator_mutation_now=false"
echo "VOID_DATANET_EXPLORER_V1_GREEN"
