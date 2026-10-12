# Buy VOID latest request state v1

Buy VOID request history is append-only. Binding a payment transaction hash
adds a newer record for the same `request_id`; it does not replace the original
quote record.

The shared request reader previously iterated the journal oldest-first and
performed first-seen deduplication. Every downstream consumer therefore
received the original `awaiting_payment_tx_hash` record instead of the newer
`payment_submitted_pending_manual_review` record.

This lane fixes the shared reader centrally:

1. read the append-only journal;
2. scan records newest-first;
3. keep the first occurrence of each request ID in that reversed scan;
4. preserve the existing request ordering after deduplication.

The operator reader, queue, payment verifier, operator mark route, and
transaction-hash binding module all receive the newest state through the same
shared reader. The cross-request duplicate transaction-hash guard still scans
the returned current state for every request.

This lane does not verify payment, reserve allocation, enable fulfillment,
restart the node, sign a transaction, transfer USDC, or deliver VOID.
