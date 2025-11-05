export default function boostProposer(_app){
  const TICK=300;
  function ready(){
    const p = (globalThis.__void_proposer||null);
    if (!p){ return setTimeout(ready, TICK); }
    // If proposer is enabled and hasn't ticked yet, seed a first value
    if (p.enabled && (typeof p.lastNumber!=="number" || p.lastNumber < 0)){
      p.lastNumber = 0;
      globalThis.__void_last_head_number = 0;
      // nudge again shortly to ensure exporters see >0 soon after boot
      setTimeout(()=>{ p.lastNumber = 1; globalThis.__void_last_head_number = 1; }, 200);
    }
  }
  ready();
}
