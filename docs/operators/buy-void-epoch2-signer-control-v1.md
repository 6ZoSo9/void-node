# Epoch-2 Buy VOID fulfiller control — offline public challenge V1

This source-only tool helps establish whether a signer controls the **immutable
Epoch-2 presale fulfiller address** `0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`,
bound to the selected RPC `http://127.0.0.1:18553/` and presale
`0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce`. It does **not** read
a signing key, touch a credential, submit a blockchain transaction, or enable
the presale. The July 24 historical Epoch-1 purchase proof is unchanged.

Run from an exact reviewed, stable commit of `6ZoSo9/void-node`:

```bash
node --import tsx scripts/void_buy_void_epoch2_signer_control_cli_v1.ts --issue
```

For a **single-command, no-file** challenge and verification workflow, use
`--interactive` instead:

```bash
node --import tsx scripts/void_buy_void_epoch2_signer_control_cli_v1.ts --interactive
```

It displays the same randomized five-minute public challenge, then waits for
the **public EIP-191 signature** obtained from an independently trusted signer.
Paste **only the public 65-byte EIP-191 signature** (`0x` plus 130
hex characters), never a private key, seed phrase or systemd credential. The
printed `signing_message_sha256` is a diagnostic digest and **is not the
signature**; do not paste it at the prompt. In interactive mode, copy the
byte-exact multiline text **between**
`EIP191_SIGNING_MESSAGE_BEGIN` and `EIP191_SIGNING_MESSAGE_END`; those
lines contain real newline bytes. Do not sign the JSON-escaped `\\n`
representation. Sign that exact multiline message with the wallet that controls
the immutable fulfiller.
The CLI validates the real immutable fulfiller address before the challenge
expires and prints only the decision and message digest. It neither
writes a challenge/receipt file nor persists the public signature. An incorrect
signature, expired challenge, or wrong wallet HOLDs; a correct signature still
does not authorize signing a live transaction or opening checkout.

The older `--issue` / `--verify` file-receipt workflow remains supported for
operators who prefer separate issue and verification steps.

The CLI prints one public EIP-191 signing message bound to a unique random
nonce, the checkout target, the local Git HEAD, and a five-minute expiry.
An authorized human may sign **the exact printed message**, using their
existing trusted/offline signer outside this tool. **Never** supply a private
key, seed phrase, signer credential, or password to this CLI or to chat.

To verify, create a local JSON file containing the printed `challenge`
object and the returned public `signature` field; run:

```bash
node --import tsx scripts/void_buy_void_epoch2_signer_control_cli_v1.ts --verify /path/to/public-offchain-signature-receipt.json
```

Verification requires the exact E2 signer, challenge source HEAD, selected
Chain 2050 RPC/contract/token, bounded issued/expiry times, and an EIP-191
signature over the byte-exact message. Signature/body defects fail closed.
The utility reports a message SHA-256 but never prints the supplied signature.

**Authority distinction:** Even a GREEN signature establishes *off-chain
control of the matching public address at one point in time*. It is **not**
evidence that a valid matching systemd credential is installed, that the
service can sign Epoch-2 EIP-1559 transactions, or that it may pay or broadcast.
The existing old-wallet credential/evidence ID is not repinned, reissued, or
reused. A separately reviewed current-generation credential binding and
controlled execution canary remain required. No customer should send USDC
on the strength of this proof. Presale and WC/VOID coupled activation are OFF.

Proof (synthetic known test key; never the immutable E2 private key):

```bash
node --import tsx scripts/prove_buy_void_epoch2_signer_control_v1.ts
```
