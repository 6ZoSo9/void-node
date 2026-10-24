# Buy VOID V7 create-only closed-tree acceptance V1

Status: **source-review acceptance only**. This record does not authorize host installation, root execution, protected filesystem mutation, launcher installation, or V5 apply.

Acceptance ID:

`voidv7closedtreeaccept1_19ac8c5b09377162ff42048535352a15b5dc75020701c9402c1ebc6ba73fc4b3`.

## Reviewed inputs

This acceptance binds the landed plan and bootstrap source generation on
`1d8c8804d75fa12e1fa9fcfffe7bc93940fbd56c`:

- persistent seal plan ID
  `voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc`;
- plan Git blob `9dde5523dca6ab240626430ce1c2b82f1cfe7f20`;
- closed-tree bootstrap source blob
  `2a8397c85d698d168f2257ec801557281b73c04d`;
- bootstrap proof blob
  `2bec40bb30b26f229e5a9a290ce262cd40e344c5`.

The reviewed bootstrap remains production-disabled and has no accepted production payload manifest.

## Accepted source work

The distinct review gate required by the persistent-seal plan is satisfied only for source implementation/review. It authorizes two follow-on source lanes:

1. a new launcher generation that preserves V2's static first-instruction boundary and exact V5 operation binding while consuming the reviewed `CREATE_ONLY_CLOSED_TREE_V1` receipt/seal contract;
2. a bootstrap manifest-lock candidate that binds the complete trusted payload and exact source generation.

The launcher must verify the closed-tree installation receipt and rebind every privileged file it consumes to the receipt's inode/hash/mode/link-count record before Python execution. Static Python and stdlib content hashes remain policy-bound. The launcher must not claim resistance to arbitrary malicious root mutation after installation.

## Still forbidden

This acceptance deliberately keeps all production authority false:

- no production payload manifest is accepted;
- the bootstrap candidate is not accepted for host execution;
- no launcher generation is host-accepted;
- no root execution;
- no protected filesystem mutation;
- no launcher installation;
- no protected V5 apply;
- no service/systemd mutation;
- no credentials, private keys, signing, transactions, payment acceptance,
  presale/WC activation, treasury/liquidity action, or funds movement.

Any future production manifest acceptance, bootstrap installation, launcher installation, launcher-mediated plan, V5 apply, or installed qualification remains a separate gate.

PROTECT THE CORE.
