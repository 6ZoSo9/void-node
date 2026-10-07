import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_ROLLBACK_POLICY_RECEIPT_FILE_SHA256_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_ROLLBACK_POLICY_RECEIPT_SHA256_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackSecondControlCompositionV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_second_control_composition_v1.js";

const operatorReceipt = Buffer.from("eyJjb25zdW1lIjp7ImV2ZW50X2NvdW50IjoyLCJnZW5lcmF0aW9uIjoxLCJoaWdoX3dhdGVyX3NoYTI1NiI6InNoYTI1NjoyY2UzYzRmY2EwMmE1NTY3YTQxZDA0NjZkNDc3MjFhNDc1NjI1Mzk3OWUxODUyMTU1MGFiODNiOGU5OTI3OWI5Iiwiam91cm5hbF9zaGEyNTYiOiJzaGEyNTY6ZDk1ZmQ2YTVjZWM1NTUxM2E0YjYyNzFlZTVhZDg3YTk3ZDcyM2Y3N2JiZDY3ZmZhYWNkMTk0ZmMzNjc4MDk4OSIsInNlcXVlbmNlIjoyLCJ0ZXJtaW5hbF9yZXF1ZXN0X2lkIjoidm9pZHdyZXExX2QyOWNkMmU3NTYzMzE2NjZkYTYyNTEyYTFlY2Y3NGVhMjI1NTE3YjY2ZDg4MDlkNmE4MTQzOWNlYWI2NWYwYWEiLCJ0ZXJtaW5hbF9yZXNwb25zZV9zaGEyNTYiOiJzaGEyNTY6ZDU1MzFiOWZhNTYxNGM4ZjA4ZmQwOTgzODc4NTExY2E3YTg2MjZjMGZmZDc4ZmU5MjJkYzlmNzJiYTRmMmVjYSJ9LCJleHRlcm5hbF9yZXBsYXlfd2l0bmVzcyI6eyJldmVudF9jb3VudCI6MywidGlwX2V2ZW50X3NoYTI1NiI6InNoYTI1NjplNzIxNjAyMzNjZjY0YjQzZDlkOTVlZTBlMjA4YWNmNWE0OWNmOGZlMGRhNjdjZTAxYWE4Y2RkMDViOTY4MGVhIiwid2l0bmVzc19zaGEyNTYiOiJzaGEyNTY6YjFkNmNiN2Q1NWZiOTdiNDhhMzg4YjE5ZTIzMGVkMjcyYTY1NGY3YjkyNGVkNzg2YzA1MGQ4MDI4YzlmNzYxZSIsIndpdG5lc3NlZF9yZXBsYXlfc2VxdWVuY2UiOjJ9LCJmdW5kc19tb3ZlZCI6ZmFsc2UsImluZGVwZW5kZW50X2N1c3RvZHlfcHJvdmVuIjpmYWxzZSwiaXNzdWUiOnsiY2hhbGxlbmdlX2lkIjoidm9pZHdscmMxXzlhN2E2Mzk5MjA2NWY4NTE4OTIxNDRmYmVjMjc1ZmY4NGUyNTI4OWM1YmFhM2IxNTJjMjBhZjQwZDA1Y2Y0MTkiLCJjaGFsbGVuZ2Vfc2hhMjU2Ijoic2hhMjU2OjlhN2E2Mzk5MjA2NWY4NTE4OTIxNDRmYmVjMjc1ZmY4NGUyNTI4OWM1YmFhM2IxNTJjMjBhZjQwZDA1Y2Y0MTkiLCJldmVudF9jb3VudCI6MSwiZXhwaXJlc19hdF9tcyI6MTc5MTM5MDE3NTMwMiwiZ2VuZXJhdGlvbiI6MSwiaGlnaF93YXRlcl9zaGEyNTYiOiJzaGEyNTY6ZTE5MGJkNWQ3ZDIwZGExYTI4ZDNmYmQ2MDM5NDU2NTM0YmU5NTI3NWZiZWU2MzQ4NzI0NmM1ZjM0ZjAxZDNhYyIsImlzc3VlZF9hdF9tcyI6MTc5MTM5MDEzNzMwMiwiam91cm5hbF9zaGEyNTYiOiJzaGEyNTY6NTE2NWY2ZDExZmI3YjNlNDdjNTdmNzc1MGFhNzY3NGQ4NWU5NmQ1MTEzOGRhZmI5MWE5NjYzMTc2Yzg5NzJmMyIsInNlcXVlbmNlIjoxfSwibGl2ZV9yZWFkIjp7ImV2ZW50X2NvdW50IjoxLCJvYnNlcnZlZF9hdF9tcyI6MTc5MTM5MDEzODY3MCwicmVxdWVzdF9pZCI6InZvaWR3cmVxMV9kMjljZDJlNzU2MzMxNjY2ZGE2MjUxMmExZWNmNzRlYTIyNTUxN2I2NmQ4ODA5ZDZhODE0MzljZWFiNjVmMGFhIiwicmVzcG9uc2Vfc2hhMjU2Ijoic2hhMjU2OmQ1NTMxYjlmYTU2MTRjOGYwOGZkMDk4Mzg3ODUxMWNhN2E4NjI2YzBmZmQ3OGZlOTIyZGM5ZjcyYmE0ZjJlY2EiLCJzdGFydGVkX2F0X21zIjoxNzkxMzkwMTM4MjI3LCJ0aXBfZXZlbnRfc2hhMjU2Ijoic2hhMjU2OjIwOTJjOTJhYzMxMTdhZTRlYzFjZDRkNTU2MjdmZjllNDZlM2JkNGUzYjIwZDFiYmQ4NDhlMTE4OWQ1ZDQ2NTQiLCJ3aXRuZXNzX3NoYTI1NiI6InNoYTI1NjphNzNjOGM2NzRiZWE1ZWQ0NzM5MzhkZGJmNDI3NWE2NTEyNzJmZWZkNGU3NWQyMTJkM2QyYmI4YzhlNWNiZTFhIn0sIm1hcmtlciI6IlZPSURfUkVQTEFZX0xJVkVfQ1lDTEVfVjEiLCJvYnNlcnZlZF9hdXRoZW50aWNhdGVkX2dlbmVyaWNfc3NoX3JlYWQiOnRydWUsIm9ic2VydmVkX3JlcGxheV9leHRlcm5hbF9zZXF1ZW50aWFsX2N1c3RvZHkiOnRydWUsInByb2R1Y3Rpb25fZ2F0ZV9yZWFkeSI6ZmFsc2UsInByb3RlY3RlZF9oaWdoX3dhdGVyX2N1c3RvZHlfcHJvdmVuIjpmYWxzZSwicmVjZWlwdF9zaGEyNTYiOiJzaGEyNTY6ZmFjYWVlY2I3NWY2NmNmOWI5ZmRmNzFlY2E5NzdiNzE2M2JlNDM5ZmRjMDkxMzA5NWQ0OGJkYjllYWEyNGEwOCIsInJvbGxiYWNrX3Jlc2lzdGFuY2VfcHJvdmVuIjpmYWxzZSwic2NoZW1hIjoidm9pZF9yZXBsYXlfbGl2ZV9jeWNsZV9vcGVyYXRvcl9yZWNlaXB0X3YxIiwic291cmNlX2NvbW1pdCI6ImY0YzA5MDViMzg4OGJkMWRiNzJhZjQ1NWU5ODBhNmRmMjIzODBmYWMiLCJ0cmFuc2FjdGlvbiI6ZmFsc2UsInZlcnNpb24iOjEsIndhbGxldF9vcl9zaWduZXIiOmZhbHNlfQo=", "base64");
const journal = Buffer.from("eyJjaGFsbGVuZ2VfaWQiOiJ2b2lkd2xyYzFfOWE3YTYzOTkyMDY1Zjg1MTg5MjE0NGZiZWMyNzVmZjg0ZTI1Mjg5YzViYWEzYjE1MmMyMGFmNDBkMDVjZjQxOSIsImNoYWxsZW5nZV9zaGEyNTYiOiJzaGEyNTY6OWE3YTYzOTkyMDY1Zjg1MTg5MjE0NGZiZWMyNzVmZjg0ZTI1Mjg5YzViYWEzYjE1MmMyMGFmNDBkMDVjZjQxOSIsImVudHJvcHlfc2hhMjU2Ijoic2hhMjU2Ojg2YzEzOWViZjNhNjI2ZGE2YThiZTRhMThmOTdlYjAyYzNlZDI5OGZhNWFjNTliY2ZmMDBmYmE3ZWIwY2ZmNzUiLCJldmVudF9zaGEyNTYiOiJzaGEyNTY6NTRiYjZlOTJlMmI3N2UyMTBjNzlhNDIxOWRlMDM5NzVjMGIyZjNlMDQxZmM5NTk3NzNjZWY0OWI5ZjExZDRiYSIsImV4cGlyZXNfYXRfbXMiOjE3OTEzOTAxNzUzMDIsImdlbmVyYXRpb24iOjEsImlzc3VlZF9hdF9tcyI6MTc5MTM5MDEzNzMwMiwibWFya2VyIjoiVk9JRF9CVVlfVk9JRF9BTExPQ0FUSU9OX0NVU1RPRFlfV0lUTkVTU19MSVZFX1JFQURfUkVQTEFZX0VWRU5UX1YxIiwicHJldmlvdXNfZXZlbnRfc2hhMjU2IjpudWxsLCJyZXF1ZXN0X2lkIjpudWxsLCJyZXNwb25zZV9zaGEyNTYiOm51bGwsInNlcXVlbmNlIjoxLCJzdGF0ZSI6Imlzc3VlZCIsInRlcm1pbmFsX2F0X21zIjpudWxsLCJ2ZXJzaW9uIjoxfQp7ImNoYWxsZW5nZV9pZCI6InZvaWR3bHJjMV85YTdhNjM5OTIwNjVmODUxODkyMTQ0ZmJlYzI3NWZmODRlMjUyODljNWJhYTNiMTUyYzIwYWY0MGQwNWNmNDE5IiwiY2hhbGxlbmdlX3NoYTI1NiI6InNoYTI1Njo5YTdhNjM5OTIwNjVmODUxODkyMTQ0ZmJlYzI3NWZmODRlMjUyODljNWJhYTNiMTUyYzIwYWY0MGQwNWNmNDE5IiwiZW50cm9weV9zaGEyNTYiOiJzaGEyNTY6ODZjMTM5ZWJmM2E2MjZkYTZhOGJlNGExOGY5N2ViMDJjM2VkMjk4ZmE1YWM1OWJjZmYwMGZiYTdlYjBjZmY3NSIsImV2ZW50X3NoYTI1NiI6InNoYTI1Njo3ZTNlNzAwMDgxNWRkM2FiZDFlYjI1NGYwYjJlZTIwMDI4YzM5NjYxNWFmM2E2MDBmYTVhMDgxNjBhODYyYWE3IiwiZXhwaXJlc19hdF9tcyI6MTc5MTM5MDE3NTMwMiwiZ2VuZXJhdGlvbiI6MSwiaXNzdWVkX2F0X21zIjoxNzkxMzkwMTM3MzAyLCJtYXJrZXIiOiJWT0lEX0JVWV9WT0lEX0FMTE9DQVRJT05fQ1VTVE9EWV9XSVRORVNTX0xJVkVfUkVBRF9SRVBMQVlfRVZFTlRfVjEiLCJwcmV2aW91c19ldmVudF9zaGEyNTYiOiJzaGEyNTY6NTRiYjZlOTJlMmI3N2UyMTBjNzlhNDIxOWRlMDM5NzVjMGIyZjNlMDQxZmM5NTk3NzNjZWY0OWI5ZjExZDRiYSIsInJlcXVlc3RfaWQiOiJ2b2lkd3JlcTFfZDI5Y2QyZTc1NjMzMTY2NmRhNjI1MTJhMWVjZjc0ZWEyMjU1MTdiNjZkODgwOWQ2YTgxNDM5Y2VhYjY1ZjBhYSIsInJlc3BvbnNlX3NoYTI1NiI6InNoYTI1NjpkNTUzMWI5ZmE1NjE0YzhmMDhmZDA5ODM4Nzg1MTFjYTdhODYyNmMwZmZkNzhmZTkyMmRjOWY3MmJhNGYyZWNhIiwic2VxdWVuY2UiOjIsInN0YXRlIjoiY29uc3VtZWQiLCJ0ZXJtaW5hbF9hdF9tcyI6MTc5MTM5MDEzODg0NywidmVyc2lvbiI6MX0K", "base64");
const highWater = Buffer.from("eyJzY2hlbWEiOiJ2b2lkX2J1eV92b2lkX2FsbG9jYXRpb25fY3VzdG9keV93aXRuZXNzX2xpdmVfcmVhZF9yZXBsYXlfaGlnaF93YXRlcl92MSIsIm1hcmtlciI6IlZPSURfQlVZX1ZPSURfQUxMT0NBVElPTl9DVVNUT0RZX1dJVE5FU1NfTElWRV9SRUFEX1JFUExBWV9ISUdIX1dBVEVSX1YxIiwidmVyc2lvbiI6MSwic2VxdWVuY2UiOjIsImdlbmVyYXRpb24iOjEsImV2ZW50X2NvdW50IjoyLCJ0aXBfZXZlbnRfc2hhMjU2Ijoic2hhMjU2OjdlM2U3MDAwODE1ZGQzYWJkMWViMjU0ZjBiMmVlMjAwMjhjMzk2NjE1YWYzYTYwMGZhNWEwODE2MGE4NjJhYTciLCJqb3VybmFsX3NoYTI1NiI6InNoYTI1NjpkOTVmZDZhNWNlYzU1NTEzYTRiNjI3MWVlNWFkODdhOTdkNzIzZjc3YmJkNjdmZmFhY2QxOTRmYzM2NzgwOTg5Iiwiam91cm5hbF9ieXRlcyI6MTUyNywicGVuZGluZyI6ZmFsc2UsInBlbmRpbmdfY2hhbGxlbmdlX3NoYTI1NiI6bnVsbCwicGVuZGluZ19jaGFsbGVuZ2VfaWQiOm51bGwsInBlbmRpbmdfZXhwaXJlc19hdF9tcyI6bnVsbCwibGFzdF90ZXJtaW5hbF9zdGF0ZSI6ImNvbnN1bWVkIiwicmVhZHlfZm9yX2lzc3VlIjp0cnVlfQo=", "base64");
const externalWitness = Buffer.from("eyJldmVudF9jb3VudCI6MCwiZXZlbnRfc2hhMjU2Ijoic2hhMjU2OjRmMmM4NTBhNDE1OWUxNmUzZGRhMmU1NTdlZTNjNTJmNDZiZmJlMGZmMGFjNzhkOWI1YzgwYzY1YWIwODIyMWEiLCJnZW5lcmF0aW9uIjowLCJoaWdoX3dhdGVyX3NoYTI1NiI6InNoYTI1Njo5ZmJmZjg1ODIxOWM5MDM0N2I2NmQxMjdiNDVlZGI4NjkwNDRiMjEzMjA1MTA0MmM3Y2I3OGQ0YjZhYzIxNDgzIiwiam91cm5hbF9ieXRlcyI6MCwiam91cm5hbF9zaGEyNTYiOiJzaGEyNTY6ZTNiMGM0NDI5OGZjMWMxNDlhZmJmNGM4OTk2ZmI5MjQyN2FlNDFlNDY0OWI5MzRjYTQ5NTk5MWI3ODUyYjg1NSIsImxhc3RfdGVybWluYWxfc3RhdGUiOm51bGwsIm1hcmtlciI6IlZPSURfQlVZX1ZPSURfQUxMT0NBVElPTl9DVVNUT0RZX1dJVE5FU1NfTElWRV9SRUFEX1JFUExBWV9FWFRFUk5BTF9XSVRORVNTX0VWRU5UX1YxIiwicGVuZGluZyI6ZmFsc2UsInBlbmRpbmdfY2hhbGxlbmdlX2lkIjpudWxsLCJwZW5kaW5nX2NoYWxsZW5nZV9zaGEyNTYiOm51bGwsInBlbmRpbmdfZXhwaXJlc19hdF9tcyI6bnVsbCwicHJldmlvdXNfZXZlbnRfc2hhMjU2IjpudWxsLCJyZWFkeV9mb3JfaXNzdWUiOnRydWUsInJlcGxheV9zZXF1ZW5jZSI6MCwic2VxdWVuY2UiOjEsInNvdXJjZV9oaWdoX3dhdGVyX2Rpc2tfd3duIjoiZXVpLmU4MjM4ZmE2YmY1MzAwMDEwMDFiNDQ4YjQyZTY2YzM2Iiwic291cmNlX2hpZ2hfd2F0ZXJfcm9vdCI6Ii92YXIvbGliL3ZvaWQtYWxsb2NhdGlvbi1jdXN0b2R5LXYxL3dpdG5lc3MtbGl2ZS1yZWFkLXJlcGxheS12MSIsInNvdXJjZV9ob3N0bmFtZSI6Inpvc28tUHJlY2lzaW9uLVRvd2VyLTc4MTAiLCJzb3VyY2Vfam91cm5hbF9kaXNrX3d3biI6IjB4NTAwYTA3NTFlOWM3OTZkOCIsInNvdXJjZV9qb3VybmFsX3Jvb3QiOiIvdmFyL2xpYi92b2lkLWFsbG9jYXRpb24tbGVkZ2VyLXYxL3dpdG5lc3MtbGl2ZS1yZWFkLXJlcGxheS12MSIsInRpcF9ldmVudF9zaGEyNTYiOm51bGwsInZlcnNpb24iOjEsIndpdG5lc3NfaG9zdG5hbWUiOiJOaW1vIiwid2l0bmVzc19tYWNoaW5lX2lkX3NoYTI1NiI6InNoYTI1Njo0OGEzNTU0MTI2ZDYyMWQ2NDYwMzg1ZWJhY2YzZDQxYjQ1NDE1NzMzNzI3MWNiNzQwNWFmMDEyMTU4ZjIwM2Q0Iiwid2l0bmVzc19yb290X2Rpc2tfc2VyaWFsIjoiNTAwMjZCNzY4NzNCMjVBQiIsIndpdG5lc3Nfcm9vdF9kaXNrX3d3biI6ImV1aS4wMDAwMDAwMDAwMDAwMDAwMDAyNmI3Njg3M2IyNWFiNSJ9CnsiZXZlbnRfY291bnQiOjEsImV2ZW50X3NoYTI1NiI6InNoYTI1NjoxZTAwOTAwNTg0MjU1MzUxODFlY2U5YzY2YTcwZTdkZDNjZTAzZjZhMWVhZDVhMDBiNDIzMTNiNmExYzU4ODQyIiwiZ2VuZXJhdGlvbiI6MSwiaGlnaF93YXRlcl9zaGEyNTYiOiJzaGEyNTY6ZTE5MGJkNWQ3ZDIwZGExYTI4ZDNmYmQ2MDM5NDU2NTM0YmU5NTI3NWZiZWU2MzQ4NzI0NmM1ZjM0ZjAxZDNhYyIsImpvdXJuYWxfYnl0ZXMiOjY1Mywiam91cm5hbF9zaGEyNTYiOiJzaGEyNTY6NTE2NWY2ZDExZmI3YjNlNDdjNTdmNzc1MGFhNzY3NGQ4NWU5NmQ1MTEzOGRhZmI5MWE5NjYzMTc2Yzg5NzJmMyIsImxhc3RfdGVybWluYWxfc3RhdGUiOm51bGwsIm1hcmtlciI6IlZPSURfQlVZX1ZPSURfQUxMT0NBVElPTl9DVVNUT0RZX1dJVE5FU1NfTElWRV9SRUFEX1JFUExBWV9FWFRFUk5BTF9XSVRORVNTX0VWRU5UX1YxIiwicGVuZGluZyI6dHJ1ZSwicGVuZGluZ19jaGFsbGVuZ2VfaWQiOiJ2b2lkd2xyYzFfOWE3YTYzOTkyMDY1Zjg1MTg5MjE0NGZiZWMyNzVmZjg0ZTI1Mjg5YzViYWEzYjE1MmMyMGFmNDBkMDVjZjQxOSIsInBlbmRpbmdfY2hhbGxlbmdlX3NoYTI1NiI6InNoYTI1Njo5YTdhNjM5OTIwNjVmODUxODkyMTQ0ZmJlYzI3NWZmODRlMjUyODljNWJhYTNiMTUyYzIwYWY0MGQwNWNmNDE5IiwicGVuZGluZ19leHBpcmVzX2F0X21zIjoxNzkxMzkwMTc1MzAyLCJwcmV2aW91c19ldmVudF9zaGEyNTYiOiJzaGEyNTY6NGYyYzg1MGE0MTU5ZTE2ZTNkZGEyZTU1N2VlM2M1MmY0NmJmYmUwZmYwYWM3OGQ5YjVjODBjNjVhYjA4MjIxYSIsInJlYWR5X2Zvcl9pc3N1ZSI6ZmFsc2UsInJlcGxheV9zZXF1ZW5jZSI6MSwic2VxdWVuY2UiOjIsInNvdXJjZV9oaWdoX3dhdGVyX2Rpc2tfd3duIjoiZXVpLmU4MjM4ZmE2YmY1MzAwMDEwMDFiNDQ4YjQyZTY2YzM2Iiwic291cmNlX2hpZ2hfd2F0ZXJfcm9vdCI6Ii92YXIvbGliL3ZvaWQtYWxsb2NhdGlvbi1jdXN0b2R5LXYxL3dpdG5lc3MtbGl2ZS1yZWFkLXJlcGxheS12MSIsInNvdXJjZV9ob3N0bmFtZSI6Inpvc28tUHJlY2lzaW9uLVRvd2VyLTc4MTAiLCJzb3VyY2Vfam91cm5hbF9kaXNrX3d3biI6IjB4NTAwYTA3NTFlOWM3OTZkOCIsInNvdXJjZV9qb3VybmFsX3Jvb3QiOiIvdmFyL2xpYi92b2lkLWFsbG9jYXRpb24tbGVkZ2VyLXYxL3dpdG5lc3MtbGl2ZS1yZWFkLXJlcGxheS12MSIsInRpcF9ldmVudF9zaGEyNTYiOiJzaGEyNTY6NTRiYjZlOTJlMmI3N2UyMTBjNzlhNDIxOWRlMDM5NzVjMGIyZjNlMDQxZmM5NTk3NzNjZWY0OWI5ZjExZDRiYSIsInZlcnNpb24iOjEsIndpdG5lc3NfaG9zdG5hbWUiOiJOaW1vIiwid2l0bmVzc19tYWNoaW5lX2lkX3NoYTI1NiI6InNoYTI1Njo0OGEzNTU0MTI2ZDYyMWQ2NDYwMzg1ZWJhY2YzZDQxYjQ1NDE1NzMzNzI3MWNiNzQwNWFmMDEyMTU4ZjIwM2Q0Iiwid2l0bmVzc19yb290X2Rpc2tfc2VyaWFsIjoiNTAwMjZCNzY4NzNCMjVBQiIsIndpdG5lc3Nfcm9vdF9kaXNrX3d3biI6ImV1aS4wMDAwMDAwMDAwMDAwMDAwMDAyNmI3Njg3M2IyNWFiNSJ9CnsiZXZlbnRfY291bnQiOjIsImV2ZW50X3NoYTI1NiI6InNoYTI1NjplNzIxNjAyMzNjZjY0YjQzZDlkOTVlZTBlMjA4YWNmNWE0OWNmOGZlMGRhNjdjZTAxYWE4Y2RkMDViOTY4MGVhIiwiZ2VuZXJhdGlvbiI6MSwiaGlnaF93YXRlcl9zaGEyNTYiOiJzaGEyNTY6MmNlM2M0ZmNhMDJhNTU2N2E0MWQwNDY2ZDQ3NzIxYTQ3NTYyNTM5NzllMTg1MjE1NTBhYjgzYjhlOTkyNzliOSIsImpvdXJuYWxfYnl0ZXMiOjE1MjcsImpvdXJuYWxfc2hhMjU2Ijoic2hhMjU2OmQ5NWZkNmE1Y2VjNTU1MTNhNGI2MjcxZWU1YWQ4N2E5N2Q3MjNmNzdiYmQ2N2ZmYWFjZDE5NGZjMzY3ODA5ODkiLCJsYXN0X3Rlcm1pbmFsX3N0YXRlIjoiY29uc3VtZWQiLCJtYXJrZXIiOiJWT0lEX0JVWV9WT0lEX0FMTE9DQVRJT05fQ1VTVE9EWV9XSVRORVNTX0xJVkVfUkVBRF9SRVBMQVlfRVhURVJOQUxfV0lUTkVTU19FVkVOVF9WMSIsInBlbmRpbmciOmZhbHNlLCJwZW5kaW5nX2NoYWxsZW5nZV9pZCI6bnVsbCwicGVuZGluZ19jaGFsbGVuZ2Vfc2hhMjU2IjpudWxsLCJwZW5kaW5nX2V4cGlyZXNfYXRfbXMiOm51bGwsInByZXZpb3VzX2V2ZW50X3NoYTI1NiI6InNoYTI1NjoxZTAwOTAwNTg0MjU1MzUxODFlY2U5YzY2YTcwZTdkZDNjZTAzZjZhMWVhZDVhMDBiNDIzMTNiNmExYzU4ODQyIiwicmVhZHlfZm9yX2lzc3VlIjp0cnVlLCJyZXBsYXlfc2VxdWVuY2UiOjIsInNlcXVlbmNlIjozLCJzb3VyY2VfaGlnaF93YXRlcl9kaXNrX3d3biI6ImV1aS5lODIzOGZhNmJmNTMwMDAxMDAxYjQ0OGI0MmU2NmMzNiIsInNvdXJjZV9oaWdoX3dhdGVyX3Jvb3QiOiIvdmFyL2xpYi92b2lkLWFsbG9jYXRpb24tY3VzdG9keS12MS93aXRuZXNzLWxpdmUtcmVhZC1yZXBsYXktdjEiLCJzb3VyY2VfaG9zdG5hbWUiOiJ6b3NvLVByZWNpc2lvbi1Ub3dlci03ODEwIiwic291cmNlX2pvdXJuYWxfZGlza193d24iOiIweDUwMGEwNzUxZTljNzk2ZDgiLCJzb3VyY2Vfam91cm5hbF9yb290IjoiL3Zhci9saWIvdm9pZC1hbGxvY2F0aW9uLWxlZGdlci12MS93aXRuZXNzLWxpdmUtcmVhZC1yZXBsYXktdjEiLCJ0aXBfZXZlbnRfc2hhMjU2Ijoic2hhMjU2OjdlM2U3MDAwODE1ZGQzYWJkMWViMjU0ZjBiMmVlMjAwMjhjMzk2NjE1YWYzYTYwMGZhNWEwODE2MGE4NjJhYTciLCJ2ZXJzaW9uIjoxLCJ3aXRuZXNzX2hvc3RuYW1lIjoiTmltbyIsIndpdG5lc3NfbWFjaGluZV9pZF9zaGEyNTYiOiJzaGEyNTY6NDhhMzU1NDEyNmQ2MjFkNjQ2MDM4NWViYWNmM2Q0MWI0NTQxNTczMzcyNzFjYjc0MDVhZjAxMjE1OGYyMDNkNCIsIndpdG5lc3Nfcm9vdF9kaXNrX3NlcmlhbCI6IjUwMDI2Qjc2ODczQjI1QUIiLCJ3aXRuZXNzX3Jvb3RfZGlza193d24iOiJldWkuMDAwMDAwMDAwMDAwMDAwMDAwMjZiNzY4NzNiMjVhYjUifQo=", "base64");
const rollbackPolicyReceipt = Buffer.from("{\n  \"ok\": true,\n  \"status\": \"LIVE_ROLLBACK_POLICY_OBSERVED\",\n  \"marker\": \"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1\",\n  \"version\": 1,\n  \"receipt_sha256\": \"sha256:e59a2a9024025fe0ffea453008e373ea12642801dadef88d1b1156cbe5d1c8af\",\n  \"normalized\": {\n    \"schema\": \"void_buy_void_allocation_custody_witness_live_read_replay_rollback_policy_evidence_receipt_v1\",\n    \"marker\": \"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1\",\n    \"version\": 1,\n    \"parent_marker\": \"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1\",\n    \"policy_path\": \"/etc/void/buy-void-allocation-custody-witness-live-read-replay-rollback-controls-v1.json\",\n    \"policy_file_sha256\": \"sha256:01cd65ffbe549f3e6c03591d649c79edcc83934c31bccef8349621222d2fb05a\",\n    \"policy_file_uid\": 0,\n    \"policy_file_gid\": 0,\n    \"policy_file_mode\": 292,\n    \"policy_file_nlink\": 1,\n    \"installation_qualification_id\": \"voidwlrie1_8c96c8cfb5a86e52731d69d1a99a7ffe7297caa8f4214d9df98a534499aa8cfd\",\n    \"installation_high_water_sha256\": \"sha256:2ce3c4fca02a5567a41d0466d47721a4756253979e18521550ab83b8e99279b9\",\n    \"parent_policy_qualification_id\": \"voidwlrrq1_7b2d377dfc38cf00e329abcffec2801420d84a1f2bf1e15fbcac47df9e103f71\",\n    \"policy_fingerprint_sha256\": \"sha256:0a0d5392a0e9cdae22257cdf644c0958c3cfe18fdd0466c0f92b8044a6ebcdeb\",\n    \"policy_generation\": \"1\",\n    \"host_id\": \"zoso-Precision-Tower-7810\",\n    \"verification_now_ms\": 1791393507504\n  },\n  \"parent_qualification\": {\n    \"ok\": true,\n    \"status\": \"source_policy_qualified\",\n    \"marker\": \"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1\",\n    \"version\": 1,\n    \"qualification_id\": \"voidwlrrq1_7b2d377dfc38cf00e329abcffec2801420d84a1f2bf1e15fbcac47df9e103f71\",\n    \"installation_qualification_id\": \"voidwlrie1_8c96c8cfb5a86e52731d69d1a99a7ffe7297caa8f4214d9df98a534499aa8cfd\",\n    \"installation_high_water_sha256\": \"sha256:2ce3c4fca02a5567a41d0466d47721a4756253979e18521550ab83b8e99279b9\",\n    \"host_id\": \"zoso-Precision-Tower-7810\",\n    \"verification_now_ms\": 1791393507504,\n    \"policy_observed_at_ms\": 1791393507504,\n    \"policy_expires_at_ms\": 1791393627504,\n    \"policy_generation\": \"1\",\n    \"policy_fingerprint_sha256\": \"sha256:0a0d5392a0e9cdae22257cdf644c0958c3cfe18fdd0466c0f92b8044a6ebcdeb\",\n    \"rollback_independence_policy_qualified\": true,\n    \"installation_storage_rebound\": true,\n    \"bounded_policy_freshness_checked\": true,\n    \"verification_clock_authority_proven\": false,\n    \"policy_generation_monotonicity_proven\": false,\n    \"live_policy_observation_proven\": false,\n    \"live_rollback_test_performed\": false,\n    \"live_durable_storage_proven\": false,\n    \"rollback_resistance_proven\": false,\n    \"protected_high_water_custody_proven\": false,\n    \"independent_custody_proven\": false,\n    \"external_transport_authenticated\": false,\n    \"external_witness_storage_proven\": false,\n    \"live_remote_read_performed\": false,\n    \"runtime_integration\": false,\n    \"production_gate_ready\": false,\n    \"funds_movement\": false,\n    \"normalized_policy\": {\n      \"schema\": \"void_buy_void_allocation_custody_witness_live_read_replay_rollback_policy_v1\",\n      \"marker\": \"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_V1\",\n      \"version\": 1,\n      \"host_id\": \"zoso-Precision-Tower-7810\",\n      \"observed_at_ms\": 1791393507504,\n      \"expires_at_ms\": 1791393627504,\n      \"policy_generation\": \"1\",\n      \"journal\": {\n        \"role\": \"journal\",\n        \"disk_serial\": \"2530E9C796D8\",\n        \"disk_wwn\": \"0x500a0751e9c796d8\",\n        \"snapshot_enabled\": false,\n        \"snapshot_domain_id\": null,\n        \"backup_enabled\": false,\n        \"backup_domain_id\": null,\n        \"backup_target_id\": null,\n        \"restore_domain_id\": \"void.replay.journal.restore.v1\",\n        \"rollback_controller_id\": \"void.replay.journal.rollback.controller.v1\",\n        \"restore_credential_domain_id\": \"void.replay.journal.restore.credentials.v1\",\n        \"hostwide_snapshot_member\": false,\n        \"hostwide_backup_member\": false,\n        \"automatic_restore_allowed\": false,\n        \"restore_requires_manual_approval\": true,\n        \"restore_requires_separate_credential\": true,\n        \"restore_second_control_required\": false\n      },\n      \"high_water\": {\n        \"role\": \"high_water\",\n        \"disk_serial\": \"25278B802787\",\n        \"disk_wwn\": \"eui.e8238fa6bf530001001b448b42e66c36\",\n        \"snapshot_enabled\": false,\n        \"snapshot_domain_id\": null,\n        \"backup_enabled\": false,\n        \"backup_domain_id\": null,\n        \"backup_target_id\": null,\n        \"restore_domain_id\": \"void.replay.high-water.restore.v1\",\n        \"rollback_controller_id\": \"void.replay.high-water.rollback.controller.v1\",\n        \"restore_credential_domain_id\": \"void.replay.high-water.restore.credentials.v1\",\n        \"hostwide_snapshot_member\": false,\n        \"hostwide_backup_member\": false,\n        \"automatic_restore_allowed\": false,\n        \"restore_requires_manual_approval\": true,\n        \"restore_requires_separate_credential\": true,\n        \"restore_second_control_required\": true\n      },\n      \"hostwide_snapshot_can_revert_both\": false,\n      \"hostwide_backup_can_revert_both\": false,\n      \"hostwide_restore_can_revert_both\": false,\n      \"shared_rollback_controller\": false,\n      \"coordinated_rollback_without_second_control\": false\n    },\n    \"authority\": {\n      \"source_only_contract\": true,\n      \"installation_evidence_input_only\": true,\n      \"exact_live_storage_qualification_required\": true,\n      \"canonical_replay_writer_marker_bound\": true,\n      \"canonical_replay_high_water_marker_bound\": true,\n      \"physical_disk_identity_rebound\": true,\n      \"snapshot_domain_separation_required\": true,\n      \"backup_domain_separation_required\": true,\n      \"restore_domain_separation_required\": true,\n      \"rollback_controller_separation_required\": true,\n      \"restore_credential_domain_separation_required\": true,\n      \"hostwide_joint_rollback_forbidden\": true,\n      \"high_water_second_control_required\": true,\n      \"automatic_restore_forbidden\": true,\n      \"bounded_policy_freshness_checked\": true,\n      \"verification_clock_input_required\": true,\n      \"verification_clock_authority_proven\": false,\n      \"policy_generation_monotonicity_proven\": false,\n      \"live_policy_observation_proven\": false,\n      \"live_rollback_test_performed\": false,\n      \"live_durable_storage_proven\": false,\n      \"rollback_resistance_proven\": false,\n      \"protected_high_water_custody_proven\": false,\n      \"independent_custody_proven\": false,\n      \"live_evidence_origin_proven\": false,\n      \"external_transport_authenticated\": false,\n      \"external_witness_storage_proven\": false,\n      \"live_remote_read_performed\": false,\n      \"runtime_integration\": false,\n      \"production_gate_ready\": false,\n      \"filesystem_read\": false,\n      \"filesystem_write\": false,\n      \"mount_mutation\": false,\n      \"storage_bootstrap\": false,\n      \"backup_mutation\": false,\n      \"snapshot_mutation\": false,\n      \"service_mutation\": false,\n      \"payment_acceptance\": false,\n      \"wallet_or_signer_access\": false,\n      \"private_key_access\": false,\n      \"transaction_construction\": false,\n      \"transaction_signing\": false,\n      \"transaction_broadcast\": false,\n      \"chain2050_write\": false,\n      \"presale_activation\": false,\n      \"market_activation\": false,\n      \"funds_movement\": false\n    }\n  },\n  \"operation_performed\": false,\n  \"root_owned_policy_file_observed\": true,\n  \"rollback_independence_policy_qualified\": true,\n  \"installation_storage_rebound\": true,\n  \"bounded_policy_freshness_checked\": true,\n  \"policy_file_installation_proven\": true,\n  \"live_policy_observation_proven\": true,\n  \"verification_clock_authority_proven\": false,\n  \"policy_generation_monotonicity_proven\": false,\n  \"live_policy_enforcement_proven\": false,\n  \"live_rollback_test_performed\": false,\n  \"live_durable_storage_proven\": false,\n  \"rollback_resistance_proven\": false,\n  \"protected_high_water_custody_proven\": false,\n  \"independent_custody_proven\": false,\n  \"external_transport_authenticated\": false,\n  \"external_witness_storage_proven\": false,\n  \"live_remote_read_performed\": false,\n  \"runtime_integration\": false,\n  \"production_gate_ready\": false,\n  \"funds_movement\": false,\n  \"authority\": {\n    \"source_only_collector\": true,\n    \"designated_host_read_only_observation\": true,\n    \"fixed_root_owned_policy_path\": true,\n    \"root_owned_nonwritable_parent_chain_required\": true,\n    \"root_owned_read_only_policy_file_required\": true,\n    \"descriptor_bound_policy_read\": true,\n    \"canonical_policy_control_required\": true,\n    \"canonical_parent_rollback_classifier_required\": true,\n    \"live_replay_storage_reobservation_required\": true,\n    \"double_storage_census_required\": true,\n    \"policy_file_double_read_stability_required\": true,\n    \"terminal_storage_reobservation_required\": true,\n    \"terminal_policy_rebind_required\": true,\n    \"installation_storage_rebound\": false,\n    \"live_policy_observation_proven\": false,\n    \"policy_file_installation_proven\": false,\n    \"verification_clock_authority_proven\": false,\n    \"policy_generation_monotonicity_proven\": false,\n    \"live_policy_enforcement_proven\": false,\n    \"live_rollback_test_performed\": false,\n    \"live_durable_storage_proven\": false,\n    \"rollback_resistance_proven\": false,\n    \"protected_high_water_custody_proven\": false,\n    \"independent_custody_proven\": false,\n    \"external_transport_authenticated\": false,\n    \"external_witness_storage_proven\": false,\n    \"live_remote_read_performed\": false,\n    \"runtime_integration\": false,\n    \"production_gate_ready\": false,\n    \"filesystem_write\": false,\n    \"mount_mutation\": false,\n    \"storage_bootstrap\": false,\n    \"backup_mutation\": false,\n    \"snapshot_mutation\": false,\n    \"service_mutation\": false,\n    \"wallet_or_signer_access\": false,\n    \"private_key_access\": false,\n    \"transaction_construction\": false,\n    \"transaction_signing\": false,\n    \"transaction_broadcast\": false,\n    \"chain2050_write\": false,\n    \"presale_activation\": false,\n    \"market_activation\": false,\n    \"funds_movement\": false\n  }\n}\n", "utf8");

const green =
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackSecondControlCompositionV1({
    operator_receipt_json: operatorReceipt,
    current_journal_jsonl: journal,
    current_high_water_json: highWater,
    external_witness_jsonl: externalWitness,
    rollback_policy_receipt_json: rollbackPolicyReceipt,
  });

assert.equal(green.ok, true);
if (!green.ok) throw new Error("reviewed rollback second-control composition held");
assert.equal(green.status, "rollback_second_control_composed");
assert.match(green.qualification_id, /^voidwlrrsc1_[0-9a-f]{64}$/u);
assert.equal(green.reviewed_live_rollback_policy_receipt_bound, true);
assert.equal(green.reviewed_external_custody_qualification_bound, true);
assert.equal(green.same_replay_high_water_bound, true);
assert.equal(green.same_precision_storage_identity_bound, true);
assert.equal(green.rollback_independence_policy_qualified, true);
assert.equal(green.live_policy_observation_proven, true);
assert.equal(green.policy_file_installation_proven, true);
assert.equal(green.external_transport_authenticated, true);
assert.equal(green.external_witness_storage_proven, true);
assert.equal(green.live_remote_read_performed, true);
assert.equal(green.live_remote_append_performed, true);
assert.equal(green.external_second_control_domain_qualified, true);
assert.equal(green.external_second_control_policy_binding_proven, true);
assert.equal(green.post_cycle_live_policy_observation_bound, true);
assert.equal(
  green.normalized.rollback_policy_receipt_sha256,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_ROLLBACK_POLICY_RECEIPT_SHA256_V1,
);
assert.equal(
  green.normalized.rollback_policy_receipt_file_sha256,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_REVIEWED_ROLLBACK_POLICY_RECEIPT_FILE_SHA256_V1,
);
assert.equal(
  green.normalized.replay_high_water_sha256,
  "sha256:2ce3c4fca02a5567a41d0466d47721a4756253979e18521550ab83b8e99279b9",
);
assert.equal(green.normalized.replay_sequence, 2);
assert.equal(green.normalized.replay_event_count, 2);
assert.equal(green.normalized.external_witness_event_count, 3);
assert.equal(green.normalized.external_witnessed_replay_sequence, 2);
assert.equal(green.normalized.rollback_policy_generation, "1");
assert.equal(green.normalized.rollback_policy_observed_at_ms, 1791393507504);
assert.equal(green.normalized.rollback_policy_expires_at_ms, 1791393627504);
assert.equal(green.normalized.terminal_at_ms, 1791390138847);

for (const key of [
  "live_policy_enforcement_proven",
  "live_rollback_test_performed",
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "runtime_integration",
  "production_gate_ready",
  "funds_movement",
] as const) {
  assert.equal(green[key], false, key);
}

for (const key of [
  "rollback_independence_policy_qualified",
  "live_policy_observation_proven",
  "policy_file_installation_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "live_remote_append_performed",
  "external_second_control_domain_qualified",
  "external_second_control_policy_binding_proven",
  "post_cycle_live_policy_observation_bound",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

{
  const tampered = Buffer.from(rollbackPolicyReceipt);
  tampered[tampered.length - 3] ^= 1;
  const held =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackSecondControlCompositionV1({
      operator_receipt_json: operatorReceipt,
      current_journal_jsonl: journal,
      current_high_water_json: highWater,
      external_witness_jsonl: externalWitness,
      rollback_policy_receipt_json: tampered,
    });
  assert.equal(held.ok, false);
}

{
  const tampered = Buffer.from(externalWitness);
  tampered[tampered.length - 3] ^= 1;
  const held =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackSecondControlCompositionV1({
      operator_receipt_json: operatorReceipt,
      current_journal_jsonl: journal,
      current_high_water_json: highWater,
      external_witness_jsonl: tampered,
      rollback_policy_receipt_json: rollbackPolicyReceipt,
    });
  assert.equal(held.ok, false);
}

{
  const tampered = Buffer.from(journal);
  tampered[20] ^= 1;
  const held =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackSecondControlCompositionV1({
      operator_receipt_json: operatorReceipt,
      current_journal_jsonl: tampered,
      current_high_water_json: highWater,
      external_witness_jsonl: externalWitness,
      rollback_policy_receipt_json: rollbackPolicyReceipt,
    });
  assert.equal(held.ok, false);
}

{
  const tampered = Buffer.from(operatorReceipt);
  tampered[20] ^= 1;
  const held =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackSecondControlCompositionV1({
      operator_receipt_json: tampered,
      current_journal_jsonl: journal,
      current_high_water_json: highWater,
      external_witness_jsonl: externalWitness,
      rollback_policy_receipt_json: rollbackPolicyReceipt,
    });
  assert.equal(held.ok, false);
}

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_SECOND_CONTROL_COMPOSITION_V1_GREEN",
);
console.log("reviewed_live_rollback_policy_receipt_bound=true");
console.log("reviewed_external_custody_qualification_bound=true");
console.log("same_replay_high_water_bound=true");
console.log("same_precision_storage_identity_bound=true");
console.log("rollback_independence_policy_qualified=true");
console.log("live_policy_observation_proven=true");
console.log("policy_file_installation_proven=true");
console.log("external_transport_authenticated=true");
console.log("external_witness_storage_proven=true");
console.log("external_second_control_domain_qualified=true");
console.log("external_second_control_policy_binding_proven=true");
console.log("post_cycle_live_policy_observation_bound=true");
console.log("live_policy_enforcement_proven=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
