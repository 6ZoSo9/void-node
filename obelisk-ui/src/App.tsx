import React from "react";
import { WorkCreditsDashboard } from "./workcredits/WorkCreditsDashboard";

function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem 1.5rem",
        background:
          "radial-gradient(circle at top, #15151f 0, #050509 45%, #000 100%)"
      }}
    >
      <WorkCreditsDashboard />
    </div>
  );
}

export default App;
