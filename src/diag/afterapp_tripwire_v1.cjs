"use strict";
/*
  afterapp_tripwire_v1.cjs
  Purpose: satisfy afterapp-guard + provide a safe marker hook.
  Must be readable; should not throw; should be side-effect minimal.
*/
(function install(){
  const G = globalThis;
  if (G.__void_afterapp_tripwire_v1) return;
  G.__void_afterapp_tripwire_v1 = true;
  try { /* noop */ } catch {}
})();
