(function(){
  const G=globalThis;
  const PAT=/saveblock\.finalize|saveBlockFinalV2b|SaveBlockFinalizeV2|FinalizeV2bAdapter|sbfinal_v2b/i;
  const si=G.setInterval?.bind(G), st=G.setTimeout?.bind(G);
  function bad(fn){ try{return typeof fn==="function" && PAT.test(Function.prototype.toString.call(fn));}catch{return false;} }
  function fake(){ return {unref(){},ref(){}}; }
  if(si && !G.__void_kill_final_si){ G.__void_kill_final_si=1; G.setInterval=(fn,ms,...a)=>bad(fn)?fake():si(fn,ms,...a); }
  if(st && !G.__void_kill_final_st){ G.__void_kill_final_st=1; G.setTimeout =(fn,ms,...a)=>bad(fn)?fake():st(fn,ms,...a); }
  try{ (console.error||(()=>{}))("[void-kill-finalize-loop] armed"); }catch(e){ process.stderr.write("[void-kill-finalize-loop] VOID_OPS_KILL_FINALIZE_LOOP_LOG_VISIBLE "+String(e&&e.message?e.message:e)+"\n"); }
})();
