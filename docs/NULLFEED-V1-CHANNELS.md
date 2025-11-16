NULLFEED v1 – Channels & Messages (Short Spec)

NullFeed v1 is an IRC/Discord-style chat layer on VOID (chainId 2050).

- Users connect with wallets (MetaMask or Obelisk Wallet).
- Messages are jobs in JobQueue.
- AI work, moderation, and summaries are receipts in ReceiptRegistry.
- Channels are namespaced app IDs derived from the string NULLFEED_V1.

1) Channels → appId

- Namespace string: NULLFEED_V1
- Channel names must:
  - start with #
  - use lowercase a-z, digits 0-9, underscore, or dash
  - have no spaces (trimmed, lowercase)
- Preimage: "NULLFEED_V1:" + channelName
  example: "NULLFEED_V1:#general"
- appId = keccak256(preimage)
- #general uses appId = keccak256("NULLFEED_V1:#general") and is the default channel.

2) Messages as jobs

- We do NOT store raw text on-chain.
- JobQueue stores:
  - app (bytes32) = channel appId
  - payloadHash (bytes32) = hash of a small descriptor string
- Suggested payload preimage:
  "nf:v1;channel:<channelName>;kind:<kind>;body_hash:<bodyHashHex>"
- bodyHash is keccak256 of the message body bytes or JSON.
- Example kinds: text, image, gif, embed.
- postJob(app, payloadHash) creates a message in a channel.

3) AI receipts

- AI processing and moderation for messages are stored as receipts.
- recordReceipt(jobId, agentId, modelId, datasetId, resultHash, proofHash, metadataURI, status)
- getReceipt(receiptId) returns jobId, agentId, modelId, datasetId, submitter, resultHash, proofHash, metadataURI, status, createdAt.
- In NullFeed:
  - jobId = the JobQueue message
  - agentId = entry in AgentRegistry
  - modelId = entry in ModelRegistry
  - datasetId = entry in DatasetRegistry
  - metadataURI can look like: void:nullfeed/#general/demo-gm-v2

4) Registries

- AgentRegistry: registerAgent(metadataURI) → agentId, getAgent(agentId) returns address, owner, metadataURI, active, trusted, timestamps.
- ModelRegistry: registerModel(modelKey, versionHash, metadataURI) → modelId.
- DatasetRegistry: registerDataset(datasetKey, contentHash, metadataURI) → datasetId.

5) Identity and media

- Identity is wallet address (msg.sender), via MetaMask or Obelisk.
- Profile pictures and bios are stored off-chain (Obelisk manifests etc.).
- Images and gifs are referenced by URI in the message body; the chain only sees payloadHash.

This file is the short canonical spec for NullFeed v1 channels and messages on VOID devnet (chainId 2050).
