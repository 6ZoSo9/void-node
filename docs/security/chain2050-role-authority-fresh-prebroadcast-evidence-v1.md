# Chain-2050 role-authority fresh pre-broadcast evidence v1

## Outcome

Precision revalidated the exact signed role-authority deployment transaction
against live Chain-2050 state at block `37378`.

The observation remained GREEN:

- chain ID `2050`;
- latest nonce `0`;
- pending nonce `0`;
- no pending deployer transaction;
- deployer balance `7208943000000000 wei`;
- predicted registry address vacant;
- deployment gas estimate `2002484`;
- signed gas limit `2402981`;
- base fee `7 wei/gas`;
- priority observation `1000000000 wei/gas`;
- `2 × base + priority = 1000000014 wei/gas`, below the signed max fee;
- exact signed transaction not visible by hash;
- no receipt exists for the exact signed transaction.

Exact signed transaction hash:

`0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4`

Exact local signed-file SHA-256:

`96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d`

The executed Precision verifier SHA-256 was:

`9e7181cedf74e290767ab0c77413bc91bfd16b8990e770a99928838a8b6011a4`

## Authority boundary

The observation was read-only.

No filesystem write, private-key access, wallet/signer access, signing,
transaction broadcast, deployment, Chain-2050 mutation, funds action, or
automatic retry occurred.

The repository representation does not contain raw signed transaction bytes.

Its deterministic observation ID is:

`voidcrapb1_fb84f2385f9f80c8cf2b5ff9aae2adea835e72c663228b5ddebca4f8ad3f91e2`

Decision remains:

`HOLD_PENDING_EXPLICIT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION`.
