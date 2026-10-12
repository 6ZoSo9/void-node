### Checklist
- [ ] No surgical deletions of core/running code.
- [ ] `src/index.ts` edits are **additive-only** and keep the app hook:
      `(globalThis as any).__void_http_app = app` immediately after `const app = express();`
- [ ] `tools/check_index_size.sh` passes locally.
- [ ] SEALS_V3 blocks appear **exactly once** each.
