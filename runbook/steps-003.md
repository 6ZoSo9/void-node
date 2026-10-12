# STEP-003: Disaster recovery
1. Run `/maintenance/auto-repair` (local only by default).
2. Rebuild tx index: `POST /index/rebuild` then `POST /index/build`.
3. Check `/index/stats` and `/receipts/stats` for inconsistencies.
4. Use `/blocks/import` from a healthy peer if you need to backfill.
