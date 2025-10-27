.PHONY: status heads metrics verify repair_dry repair maintenance \
        helper_start helper_stop follow_once follow_helper propose_once propose_loop

# --- Quick views ---
status:
	@echo "helper health:"; curl -fsS -4 "http://127.0.0.1:4315/api/health" | jq .
	@echo "main   health:"; curl -fsS -4 "http://127.0.0.1:4100/health"       | jq .
	@echo "helper 0..10 :" ; curl -fsS -4 "http://127.0.0.1:4315/blocks/range?from=0&to=10" | jq length
	@echo "main   0..10 :" ; curl -fsS -4 "http://127.0.0.1:4100/blocks/range?from=0&to=10" | jq length

heads:
	@echo "helper:"; curl -fsS -4 "http://127.0.0.1:4315/head"         | jq .
	@echo "main  :" ; curl -fsS -4 "http://127.0.0.1:4100/blocks/head" | jq .

metrics:
	@curl -fsS -4 "http://127.0.0.1:4100/metrics" | sed -n '1,40p'

# --- Maintenance (verify / repair) ---
verify:
	@curl -fsS -4 "http://127.0.0.1:4100/maintenance/verify" \
	| jq '{ok,code,timedOut,summary}'

repair_dry:
	@curl -fsS -4 -X POST "http://127.0.0.1:4100/maintenance/auto-repair?dryRun=1" \
	| jq '{ok,code,timedOut,repair:{stdout,stderr},verify:{ok: .verify.ok, summary: .verify.summary}}'

repair:
	@curl -fsS -4 -X POST "http://127.0.0.1:4100/maintenance/auto-repair" \
	| jq '{ok,code,timedOut,repair:{stdout,stderr},verify:{ok: .verify.ok, summary: .verify.summary}}'

maintenance: verify repair_dry repair status

# --- Helper lifecycle (reads SegStore directly) ---
helper_start:
	@mkdir -p logs
	@fuser -k 4315/tcp 2>/dev/null || true
	@nohup env DATA_DIR=data_a HELPER_PORT=4315 npx tsx src/http/api_autoboot.ts \
	   > logs/helper_4315.log 2>&1 & \
	&& sleep 1 \
	&& curl -fsS -4 "http://127.0.0.1:4315/api/health" | jq .

helper_stop:
	@fuser -k 4315/tcp 2>/dev/null || true

# --- Sync from helper -> main ---
follow_once:
	@curl -fsS -4 -X POST \
	   "http://127.0.0.1:4100/follower/once?peer=http://127.0.0.1:4315" | jq .

follow_helper:
	@curl -fsS -4 -X POST \
	   "http://127.0.0.1:4100/follower/start?peer=http://127.0.0.1:4315&intervalMs=2000" | jq .

# --- Proposer controls ---
propose_once:
	@curl -fsS -4 -X POST "http://127.0.0.1:4100/blocks/once" | jq .

propose_loop:
	@curl -fsS -4 -X POST "http://127.0.0.1:4100/blocks/start?intervalMs=2000" | jq .

# --- STEP-001 additions ---

  # Additive Makefile targets; append to your Makefile
  .PHONY: metrics-check peers-check follower-check

  metrics-check:
	curl -fsS http://127.0.0.1:4100/metrics | head -n 5 && echo OK || true

  peers-check:
	curl -fsS http://127.0.0.1:4100/p2p/peers | jq . || true

  follower-check:
	curl -fsS http://127.0.0.1:4101/p2p/peers | jq . || true
