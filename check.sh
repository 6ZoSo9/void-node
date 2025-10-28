#!/usr/bin/env bash
set -e
echo "4315 health:"; curl -sS "http://127.0.0.1:4315/api/health" | jq .
echo "4100 health:"; curl -sS "http://127.0.0.1:4100/health" | jq .
echo "4315 0..10 :" ; curl -sS "http://127.0.0.1:4315/blocks/range?from=0&to=10" | jq length
echo "4100 0..10 :" ; curl -sS "http://127.0.0.1:4100/blocks/range?from=0&to=10" | jq length
