# Security Policy

VOID Network is public-facing Mainnet-0 infrastructure.

## Reporting security issues

Do not open a public GitHub issue containing private keys, seed phrases, mnemonic phrases, passphrases, wallet files, keystore files, API tokens, RPC credentials, screenshots containing secret material, or exploit details that could put live users or funds at risk.

Use GitHub private vulnerability reporting or Security Advisories if available for this repository. If that is not available, contact the maintainer privately before sharing sensitive details.

## Public Mainnet-0 security posture

VOID Mainnet-0 is public-live, but dangerous actions remain guarded.

The following remain guarded and are not open public actions:

- public active validator admission
- operator validator admission mutation
- treasury spend
- Buy VOID fulfillment
- authority transfer
- user private-key generation
- collection of user secrets

Public validator registration remains candidate/waiting only for Mainnet-0.

## Secret handling rules

Never commit:

- .env files
- private keys
- seed phrases
- mnemonic phrases
- passphrases
- keystore JSON
- wallet files
- API tokens
- RPC credentials
- SSH private keys
- local runtime artifacts that contain operator secrets

Public docs may describe secret-safety rules, but must not include secret values.

## Test fixtures and devnet material

Some historical scripts and docs may contain public devnet/testnet addresses, public keys, or local Anvil/test fixture material. Public test fixtures must never be reused for real funds, real authority, or Mainnet-0 signing.

If a key, token, or credential was ever committed publicly and could control anything real, assume it is burned and rotate it.

## Maintainer response

Security reports should be triaged by severity:

1. Live private key, wallet, or token exposure
2. Spend, fulfillment, validator admission, or authority bypass
3. Remote execution or unauthorized mutation
4. Privacy leak or unsafe public endpoint
5. Documentation or public-safety ambiguity

For confirmed live credential exposure:

1. Revoke or rotate the credential.
2. Remove or disable the affected authority.
3. Preserve an incident record without publishing secret values.
4. Patch the repository and proof scripts.
5. Re-run public release hygiene, status smoke, and cross-box proofs.
