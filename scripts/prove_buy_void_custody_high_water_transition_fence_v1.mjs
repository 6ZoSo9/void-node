#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_POLICY_V1,
  buildBuyVoidCustodyHighWaterTransitionFenceV1,
  classifyBuyVoidCustodyHighWaterTransitionFenceSlotV1,
  classifyBuyVoidCustodyHighWaterTransitionRecoveryV1,
  parseBuyVoidCustodyHighWaterTransitionFenceV1,
} from "../src/economic/buy_void_custody_high_water_transition_fence_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE=
  "src/economic/buy_void_custody_high_water_transition_fence_v1.mjs";
const EXPECTED_SOURCE_BLOB=
  "97ef9de26f5b51ce935dc4f94a454b05af3c153b";
const PARENT_LOCK_BLOB=
  "90543eccebad8efe1d5299a318d1d894dba9cd00";

function blob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function shaId(ch){return "sha256:"+ch.repeat(64);}
function gen(ch){return "0x"+ch.repeat(64);}
function highWater({
  sequence,
  source=shaId("a"),
  generation=gen("b"),
  tip=shaId(String(sequence%10)),
  prefix=shaId("c"),
}){
  return Buffer.from(JSON.stringify({
    marker:"VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_V2",
    version:2,
    source_composition_id:source,
    sequence,
    generation,
    state:"active",
    tip_sha256:tip,
    journal_prefix_sha256:prefix,
  },null,2)+"\n","utf8");
}

const sourceBytes=fs.readFileSync(path.join(ROOT,SOURCE));
assert.equal(blob(sourceBytes),EXPECTED_SOURCE_BLOB);
const source=sourceBytes.toString("utf8");
assert.equal(source.includes('from "node:fs"'),false);
assert.equal(source.includes("unlink"),false);
assert.equal(source.includes("rmdir"),false);
assert.equal(source.includes("rename"),false);
assert.equal(source.includes("mkdir"),false);
assert.ok(source.includes("fence_record_deletion_allowed: false"));
assert.ok(source.includes("transition_slot_keyed_by_prior_high_water: true"));
assert.equal(source.includes("String(highWater."),false,
  "high-water authority strings must not be coerced");
assert.equal(source.includes("String(record."),false,
  "fence authority strings must not be coerced");

const parentLock=fs.readFileSync(path.join(
  ROOT,"src/economic/buy_void_custody_high_water_exclusive_lock_v1.mjs"));
assert.equal(blob(parentLock),PARENT_LOCK_BLOB,
  "reviewed removable-lock parent drift");

const policy=
  VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_POLICY_V1;
assert.equal(policy.source_only_planner,true);
assert.equal(policy.create_only_fence_required,true);
assert.equal(policy.fence_record_deletion_allowed,false);
assert.equal(policy.stale_fence_automatic_takeover,false);
assert.equal(policy.transition_slot_keyed_by_prior_high_water,true);
assert.equal(policy.bootstrap_slot_global_across_source_compositions,true);
assert.equal(policy.competing_successor_same_prior_must_conflict,true);
assert.equal(policy.exact_next_high_water_bytes_stored,true);
assert.equal(policy.recovery_from_prior_or_exact_next_only,true);
assert.equal(policy.removable_lock_required,false);
assert.equal(policy.lock_release_fsync_dependency,false);
assert.equal(policy.filesystem_write_implemented,false);
assert.equal(policy.service_mounted,false);
assert.equal(policy.custody_reserve_method_enabled,false);
assert.equal(policy.custody_recover_method_enabled,false);
assert.equal(policy.production_allocation_mutation_ready,false);
assert.equal(policy.funds_movement,false);

const h1=highWater({sequence:1,generation:gen("1"),tip:shaId("1")});
const h2=highWater({sequence:3,generation:gen("2"),tip:shaId("2"),prefix:shaId("d")});
const h3=highWater({sequence:5,generation:gen("3"),tip:shaId("3"),prefix:shaId("e")});
const h2Conflict=highWater({
  sequence:3,generation:gen("9"),tip:shaId("9"),prefix:shaId("f"),
});

const transition12=buildBuyVoidCustodyHighWaterTransitionFenceV1({
  prior_high_water_bytes:h1,
  next_high_water_bytes:h2,
});
assert.equal(transition12.status,"transition");
assert.equal(transition12.transition_required,true);
assert.match(transition12.transition_slot_id,/^voidchwf1_[0-9a-f]{64}$/u);
assert.match(transition12.record_sha256,/^sha256:[0-9a-f]{64}$/u);
assert.ok(Buffer.isBuffer(transition12.record_bytes));
assert.ok(Buffer.isBuffer(transition12.next_high_water_bytes));
assert.ok(transition12.next_high_water_bytes.equals(h2));

const parsed12=parseBuyVoidCustodyHighWaterTransitionFenceV1(
  transition12.record_bytes,
);
assert.equal(
  parsed12.record.transition_slot_id,
  transition12.transition_slot_id,
);
assert.match(
  parsed12.record.prior_high_water_sha256,
  /^sha256:[0-9a-f]{64}$/u,
);
assert.equal(
  Object.prototype.hasOwnProperty.call(parsed12.record,"prior_sequence"),
  false,
);
assert.equal(parsed12.record.next_sequence,3);
assert.ok(parsed12.next_high_water_bytes.equals(h2));

const absent=classifyBuyVoidCustodyHighWaterTransitionFenceSlotV1({
  expected_record_bytes:transition12.record_bytes,
  observed_record_bytes:null,
});
assert.equal(absent.ready,false);
assert.equal(absent.status,"create_required");
assert.equal(absent.reason,"transition_fence_record_absent");
assert.equal(absent.fence_record_deletion_allowed,false);
assert.ok(absent.create_only_record_bytes.equals(transition12.record_bytes));

const existing=classifyBuyVoidCustodyHighWaterTransitionFenceSlotV1({
  expected_record_bytes:transition12.record_bytes,
  observed_record_bytes:Buffer.from(transition12.record_bytes),
});
assert.equal(existing.ready,true);
assert.equal(existing.status,"exists_same_transition");
assert.equal(existing.fence_record_deletion_allowed,false);

// Different successors from the SAME prior high-water intentionally derive
// the same permanent slot. The first create-only record wins forever.
const transition13=buildBuyVoidCustodyHighWaterTransitionFenceV1({
  prior_high_water_bytes:h1,
  next_high_water_bytes:h3,
});
assert.equal(
  transition13.transition_slot_id,
  transition12.transition_slot_id,
  "same prior must map every competing successor to one slot",
);
assert.notEqual(
  transition13.record_sha256,
  transition12.record_sha256,
  "different successor must not alias exact record bytes",
);
assert.throws(
  ()=>classifyBuyVoidCustodyHighWaterTransitionFenceSlotV1({
    expected_record_bytes:transition13.record_bytes,
    observed_record_bytes:transition12.record_bytes,
  }),
  /custody_hw_transition_fence_competing_successor_same_prior/u,
);

// Crash before high-water mutation: durable create-only fence tells recovery
// exactly which next bytes are still allowed.
const resume=classifyBuyVoidCustodyHighWaterTransitionRecoveryV1({
  fence_record_bytes:transition12.record_bytes,
  observed_current_high_water_bytes:h1,
});
assert.equal(resume.ready,true);
assert.equal(resume.status,"resume_required");
assert.equal(resume.transition_fence_must_remain,true);
assert.ok(resume.next_high_water_bytes.equals(h2));

// Crash after rename/fsync (or retry after acknowledged commit): same permanent
// fence resolves idempotently to committed.
const committed=classifyBuyVoidCustodyHighWaterTransitionRecoveryV1({
  fence_record_bytes:transition12.record_bytes,
  observed_current_high_water_bytes:h2,
});
assert.equal(committed.ready,true);
assert.equal(committed.status,"committed");
assert.equal(committed.transition_fence_must_remain,true);
assert.ok(committed.next_high_water_bytes.equals(h2));

// Any unrelated current bytes are neither safe resume nor safe completion.
assert.throws(
  ()=>classifyBuyVoidCustodyHighWaterTransitionRecoveryV1({
    fence_record_bytes:transition12.record_bytes,
    observed_current_high_water_bytes:h3,
  }),
  /custody_hw_transition_fence_current_not_prior_or_next/u,
);

// Bootstrap has its own stable source-composition slot and can recover from
// absent current high-water without inventing a removable lock lifecycle.
const bootstrap=buildBuyVoidCustodyHighWaterTransitionFenceV1({
  prior_high_water_bytes:null,
  next_high_water_bytes:h1,
});
assert.equal(bootstrap.status,"transition");
const bootstrapParsed=parseBuyVoidCustodyHighWaterTransitionFenceV1(
  bootstrap.record_bytes,
);
assert.equal(bootstrapParsed.record.prior_high_water_sha256,null);
assert.equal(
  Object.prototype.hasOwnProperty.call(bootstrapParsed.record,"prior_sequence"),
  false,
);
const bootstrapResume=classifyBuyVoidCustodyHighWaterTransitionRecoveryV1({
  fence_record_bytes:bootstrap.record_bytes,
  observed_current_high_water_bytes:null,
});
assert.equal(bootstrapResume.status,"resume_required");
const bootstrapCommitted=classifyBuyVoidCustodyHighWaterTransitionRecoveryV1({
  fence_record_bytes:bootstrap.record_bytes,
  observed_current_high_water_bytes:h1,
});
assert.equal(bootstrapCommitted.status,"committed");

// Bootstrap has no prior bytes to bind source composition. Different proposed
// source generations must therefore collide on the same permanent first slot.
const otherSourceBootstrap=buildBuyVoidCustodyHighWaterTransitionFenceV1({
  prior_high_water_bytes:null,
  next_high_water_bytes:highWater({
    sequence:1,
    source:shaId("f"),
    generation:gen("8"),
    tip:shaId("8"),
    prefix:shaId("8"),
  }),
});
assert.equal(
  otherSourceBootstrap.transition_slot_id,
  bootstrap.transition_slot_id,
  "bootstrap namespace must be singular across source compositions",
);
assert.notEqual(
  otherSourceBootstrap.record_sha256,
  bootstrap.record_sha256,
  "different bootstrap successor bytes must remain distinguishable",
);
assert.throws(
  ()=>classifyBuyVoidCustodyHighWaterTransitionFenceSlotV1({
    expected_record_bytes:otherSourceBootstrap.record_bytes,
    observed_record_bytes:bootstrap.record_bytes,
  }),
  /custody_hw_transition_fence_competing_successor_same_prior/u,
);

// Exact same state is a no-op and requires no transition fence.
const unchanged=buildBuyVoidCustodyHighWaterTransitionFenceV1({
  prior_high_water_bytes:h2,
  next_high_water_bytes:Buffer.from(h2),
});
assert.equal(unchanged.status,"unchanged");
assert.equal(unchanged.transition_required,false);
assert.equal(unchanged.transition_slot_id,null);
assert.equal(unchanged.record_bytes,null);

// Monotonic/source constraints are fail-closed before a record exists.
assert.throws(
  ()=>buildBuyVoidCustodyHighWaterTransitionFenceV1({
    prior_high_water_bytes:h2,next_high_water_bytes:h1,
  }),
  /custody_hw_transition_fence_rollback_forbidden/u,
);
assert.throws(
  ()=>buildBuyVoidCustodyHighWaterTransitionFenceV1({
    prior_high_water_bytes:h2,next_high_water_bytes:h2Conflict,
  }),
  /custody_hw_transition_fence_same_sequence_conflict/u,
);
assert.throws(
  ()=>buildBuyVoidCustodyHighWaterTransitionFenceV1({
    prior_high_water_bytes:h2,
    next_high_water_bytes:highWater({
      sequence:5,source:shaId("f"),generation:gen("4"),tip:shaId("4"),
    }),
  }),
  /custody_hw_transition_fence_source_composition_changed/u,
);

// Authority-bearing JSON strings must be actual primitive strings. A
// single-element array must never stringify into a valid digest/generation.
for(const key of [
  "source_composition_id",
  "generation",
  "tip_sha256",
  "journal_prefix_sha256",
]) {
  const value=JSON.parse(h1.toString("utf8"));
  value[key]=[value[key]];
  const malformed=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  assert.throws(
    ()=>buildBuyVoidCustodyHighWaterTransitionFenceV1({
      prior_high_water_bytes:null,
      next_high_water_bytes:malformed,
    }),
    /custody_hw_transition_fence_next_high_water_semantics_invalid/u,
    "array-wrapped high-water authority accepted: "+key,
  );
}

for(const key of [
  "transition_slot_id",
  "source_composition_id",
  "prior_high_water_sha256",
  "next_high_water_sha256",
  "next_generation",
  "next_tip_sha256",
  "next_journal_prefix_sha256",
]) {
  const value=JSON.parse(transition12.record_bytes.toString("utf8"));
  value[key]=[value[key]];
  const malformed=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  assert.throws(
    ()=>parseBuyVoidCustodyHighWaterTransitionFenceV1(malformed),
    /custody_hw_transition_fence_record_semantics_invalid/u,
    "array-wrapped fence authority accepted: "+key,
  );
}

// Prior authority is represented by the exact prior digest only. Redundant
// prior metadata is outside the closed record schema and must be rejected.
{
  const value=JSON.parse(transition12.record_bytes.toString("utf8"));
  value.prior_sequence=1;
  const tampered=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  assert.throws(
    ()=>parseBuyVoidCustodyHighWaterTransitionFenceV1(tampered),
    /custody_hw_transition_fence_record_shape_invalid/u,
  );
}

// Tampering or noncanonical record bytes never become recovery authority.
{
  const value=JSON.parse(transition12.record_bytes.toString("utf8"));
  value.next_high_water_sha256=shaId("0");
  const tampered=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  assert.throws(
    ()=>parseBuyVoidCustodyHighWaterTransitionFenceV1(tampered),
    /custody_hw_transition_fence_record_next_bytes_invalid/u,
  );
}
{
  const value=JSON.parse(transition12.record_bytes.toString("utf8"));
  value.transition_slot_id="voidchwf1_"+"0".repeat(64);
  const tampered=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  assert.throws(
    ()=>parseBuyVoidCustodyHighWaterTransitionFenceV1(tampered),
    /custody_hw_transition_fence_record_slot_invalid/u,
  );
}
{
  const noncanonical=Buffer.from(
    transition12.record_bytes.toString("utf8").replace(
      '"version": 1,','"version":1,'
    ),
    "utf8",
  );
  assert.throws(
    ()=>parseBuyVoidCustodyHighWaterTransitionFenceV1(noncanonical),
    /custody_hw_transition_fence_record_noncanonical/u,
  );
}

console.log("VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_V1_GREEN");
console.log("source_git_blob="+EXPECTED_SOURCE_BLOB);
console.log("reviewed_removable_lock_parent_blob="+PARENT_LOCK_BLOB);
console.log("same_prior_competing_successors_share_one_slot=true");
console.log("prior_authority_bound_by_exact_digest_only=true");
console.log("prior_lineage_metadata_not_duplicated=true");
console.log("different_successor_existing_slot_conflicts=true");
console.log("create_only_record_never_deleted=true");
console.log("crash_before_high_water_write_resumes_exact_transition=true");
console.log("exact_next_high_water_replay_is_committed=true");
console.log("unexpected_current_high_water_holds=true");
console.log("bootstrap_transition_recoverable=true");
console.log("bootstrap_slot_global_across_source_compositions=true");
console.log("same_state_noop_requires_no_fence=true");
console.log("rollback_same_sequence_conflict_cross_source_hold=true");
console.log("tampered_or_noncanonical_fence_record_rejected=true");
console.log("array_wrapped_authority_strings_rejected=true");
console.log("removable_lock_required=false");
console.log("lock_release_fsync_dependency=false");
console.log("filesystem_write_implemented=false");
console.log("custody_reserve_method_enabled=false");
console.log("custody_recover_method_enabled=false");
console.log("production_allocation_mutation_ready=false");
console.log("funds_moved=false");
