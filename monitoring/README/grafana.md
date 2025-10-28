Import with:
curl -H "Authorization: Bearer $TOKEN" -fsS -X POST \
 http://127.0.0.1:3000/api/dashboards/db \
 -H 'Content-Type: application/json' \
 -d @monitoring/grafana/void-node.json
