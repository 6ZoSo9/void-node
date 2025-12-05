# Work Credits Relayer Spec (V1)

This document pins down the on-chain and off-chain protocol for WC-funded relayed calls.

Already implemented pieces:

- WorkCreditsQuoteLib – canonical WC→VOID quote math (Uniswap v2 style).
- WorkCreditsRelayerQuoteHelper – on-chain quote surface for voidNeeded → wcFee.
- WorkCreditsRelayerTypes – EIP-712 RelayedCall type + digest() helper.
- WorkCreditsRelayerV1 – meta-tx executor that:
  - Verifies EIP-712 signature.
  - Enforces per-user nonce and deadline.
  - Enforces wcFee <= maxWCFee.
  - Charges WC from user and executes the target call.

LLP (WC/VOID pool) and actual VOID swapping remain off-chain for now. The relayer node uses UptimeVaultLLP + QuoteLib/QuoteHelper; WorkCreditsRelayerV1 only sees WC fees and target calls.

---

## 1. On-chain types

### 1.1 RelayedCall struct

From WorkCreditsRelayerTypes:

    struct RelayedCall {
        address user;      // original user
        address to;        // target contract
        bytes   data;      // calldata for target
        uint256 value;     // native VOID value to forward (0 for now)
        uint256 nonce;     // per-user replay guard (from WorkCreditsRelayerV1.nonces)
        uint256 maxWCFee;  // user-approved max WC fee (quoted off-chain)
        uint256 deadline;  // unix timestamp after which this call is invalid
    }

### 1.2 EIP-712 domain

WorkCreditsRelayerTypes uses the standard EIP-712 domain pattern:

- name    = "VoidWorkCreditsRelayer"
- version = "1"
- chainId = current chain id (e.g. 2050 on VOID mainnet)
- verifyingContract = address of the deployed WorkCreditsRelayerV1

Digest is:

    bytes32 ds = WorkCreditsRelayerTypes.domainSeparator(chainId, verifyingContract);
    bytes32 hc = WorkCreditsRelayerTypes.hashRelayedCall(c);
    bytes32 digest = keccak256(abi.encodePacked("\x19\x01", ds, hc));

That digest is what the user signs.

---

## 2. JSON typed-data schema (for Obelisk / relayer clients)

Clients (wallet, relayer) should treat this as the canonical typed-data definition.

### 2.1 Types

Types section:

    "types": {
      "EIP712Domain": [
        { "name": "name",              "type": "string"  },
        { "name": "version",           "type": "string"  },
        { "name": "chainId",           "type": "uint256" },
        { "name": "verifyingContract", "type": "address" }
      ],
      "RelayedCall": [
        { "name": "user",     "type": "address" },
        { "name": "to",       "type": "address" },
        { "name": "data",     "type": "bytes"   },
        { "name": "value",    "type": "uint256" },
        { "name": "nonce",    "type": "uint256" },
        { "name": "maxWCFee", "type": "uint256" },
        { "name": "deadline", "type": "uint256" }
      ]
    }

Primary type:

    "primaryType": "RelayedCall"

Domain example (VOID mainnet, fill in real relayer address later):

    "domain": {
      "name": "VoidWorkCreditsRelayer",
      "version": "1",
      "chainId": 2050,
      "verifyingContract": "0xRelayerContractAddress"
    }

Message example:

    "message": {
      "user": "0xUserAddress",
      "to": "0xTargetContract",
      "data": "0xEncodedCalldata",
      "value": "0",
      "nonce": "0",
      "maxWCFee": "1000000000000000000000",
      "deadline": "1800000000"
    }

Obelisk should mirror this exactly when calling eth_signTypedData_v4 (or equivalent) on the user’s key.

---

## 3. WorkCreditsRelayerV1 behavior

Key rules enforced by the contract:

1. Non-zero value is currently rejected

    - c.value must be 0; otherwise NonZeroValueUnsupported is thrown.
    - VOID forwarding can be added in a future version if needed.

2. Deadline

    - If block.timestamp > c.deadline, revert with DeadlineExpired.

3. Nonce

    - Expected nonce: nonces[c.user] (public mapping).
    - If c.nonce != nonces[c.user], revert with NonceMismatch.
    - On success, nonces[c.user] is incremented by 1 before the external call.

4. Signature

    - Domain = "VoidWorkCreditsRelayer" / "1" / block.chainid / address(this).
    - Digest = WorkCreditsRelayerTypes.digest(chainId, address(this), c).
    - ecrecover(digest, v, r, s) must equal c.user, otherwise revert with InvalidSignature or InvalidSignatureS (high-s guard).

5. Fee bound

    - wcFee is provided by the relayer (off-chain quote).
    - Contract enforces wcFee <= c.maxWCFee or reverts with FeeTooHigh.

6. WC transfer

    - Uses wcToken.transferFrom(c.user, feeRecipient, wcFee).
    - If this returns false, revert with TargetCallFailed (generic error).

7. Target call

    - Executes (bool ok, ) = c.to.call(c.data).
    - If ok == false, revert with TargetCallFailed.

The relayer contract does not talk to LLP/UptimeVault directly. Swaps happen off-chain via a separate relayer service that knows how to:

- Call WorkCreditsRelayerQuoteHelper to price WC → VOID.
- Call UptimeVaultLLP to actually do the swap for itself.

---

## 4. Off-chain flow: Obelisk Wallet ↔ Relayer Service ↔ Chain

### 4.1 Inputs needed by Obelisk

For a given action (e.g. “Send 5 VOID with relayer” or “Collect 200 WC rewards using relayer”), Obelisk needs:

1. relayerAddress = deployed WorkCreditsRelayerV1 address.
2. userNonce = current nonces[user] from the contract.
3. Target:
   - to = address of target contract (VoidToken, WorkCreditsToken, WorkCreditsMinter, NFT marketplace, etc.).
   - data = ABI-encoded calldata for the action.
   - value = usually "0" for V1.
4. maxWCFee: UI-level “max fee in WC I’m willing to pay”.
5. deadline: e.g. current time + 10 minutes.

### 4.2 Obelisk signing flow

1. Query nonce:

       userNonce = relayer.nonces(user)

2. Build RelayedCall message:

       {
         "user": "0xUserAddress",
         "to": "0xTargetContract",
         "data": "0xEncodedCalldata",
         "value": "0",
         "nonce": "userNonce",
         "maxWCFee": "userChosenMaxWCFee",
         "deadline": "unixTimestamp"
       }

3. Create typed-data object using the types/domain above.

4. Ask user to sign with EIP-712 (eth_signTypedData_v4).

5. Send to relayer service:

       {
         "relayer": "0xRelayerContractAddress",
         "call": { ...RelayedCall fields... },
         "signature": "0xRRSV",
         "preferredGasLimit": "...",     // optional
         "preferredMaxFeePerGas": "...", // optional
         "metadata": { ... }             // optional
       }

### 4.3 Relayer service behavior

For each request:

1. Validate payload shape (addresses, deadlines, etc.).
2. Estimate gas for the inner action and/or executeRelayedCall.
3. Compute VOID needed for this request (gas * price + margin + buffer).
4. Quote required WC using LLP math:
   - Via WorkCreditsRelayerQuoteHelper.quoteForVoid(voidNeeded), or
   - Off-chain call to WorkCreditsQuoteLib with live reserves from UptimeVaultLLP.
5. If wcFee > c.maxWCFee:
   - Reject the request and optionally return a “re-quote needed” error.
6. Otherwise:
   - Build transaction: executeRelayedCall(c, sig, wcFee) on WorkCreditsRelayerV1.
   - Broadcast to chain with the relayer’s own VOID.
   - Track PnL against VOID/WC balances (operator detail).

Anyone can run a relayer that follows this logic; it is not protocol-locked to a single operator.

---

## 5. Obelisk Wallet UX contract with this spec

Obelisk should treat this spec as the source of truth for WC-funded relayed actions.

- Send VOID / Send WC with “Use relayer” enabled:
  - Build target calldata.
  - Construct RelayedCall.
  - Let the user set / confirm maxWCFee.
  - Sign typed data and hand off to relayer service.

- “Collect Work Credits”:
  - Target contract: WorkCreditsMinter or future aggregator.
  - Same pattern: derive calldata, build RelayedCall, sign, submit.

- NFTs (later):
  - Target contract = NFT marketplace or minting contract.
  - Same meta-tx pattern; wallet does not need LLP internals.

As long as Obelisk and the relayer use this exact struct + domain, WorkCreditsRelayerV1 can be upgraded or replaced via AdminGate without breaking the basic WC-funded meta-tx protocol.

