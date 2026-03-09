# VOID mainnet offline fill flow

1. Copy `ops/mainnet/void-mainnet-roles-mapping.template.txt` to encrypted removable storage.
2. Fill it there with fresh mainnet ceremony values only.
3. Bring the filled mapping back only long enough to generate:
   - `config/void-mainnet-bootstrap-mainnet.live.json`
4. Run:
   - `ops/mainnet/void-mainnet-config-lint.sh`
   - `ops/mainnet/void-mainnet-preflight.sh <mapping> <live-json>`
5. Do not commit the filled mapping.
6. Do not commit the filled live json.
7. Remove temporary local copies after verification.
