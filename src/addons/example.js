export default function(app){
  app.get("/__void/metrics/safeboot.prom", (_req, res)=>{
    res.type("text/plain; version=0.0.4");
    res.send("void_safeboot_up 1\n");
  });
}
