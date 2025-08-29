
// src/ui/AuroraBackground.jsx
import React from "react";
import "./aurora.css";

export default function AuroraBackground({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b1020] via-[#0f1830] to-[#0a0f1d]" />

      <div className="absolute -top-1/3 right-[-15%] h-[70vh] w-[70vh] -z-10 rounded-full blur-3xl">
        <div className="h-full w-full aurora-float-1 aurora-twinkle
                        bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.35),transparent_60%)]" />
      </div>

      <div className="absolute -top-1/4 left-[-15%] h-[80vh] w-[80vh] -z-10 rounded-full blur-3xl">
        <div className="h-full w-full aurora-float-2 aurora-twinkle
                        bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.30),transparent_60%)]" />
      </div>

      <div className="absolute bottom-[-35%] left-1/2 -translate-x-1/2 h-[95vh] w-[120vw] -z-10 rounded-full blur-3xl">
        <div className="h-full w-full aurora-float-3 aurora-twinkle
                        bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.35),transparent_60%)]" />
      </div>

      <div className="absolute inset-0 -z-10
                      bg-[radial-gradient(1000px_220px_at_50%_80%,rgba(255,255,255,0.12),transparent_60%)]" />

      <div className="relative">{children}</div>
    </div>
  );
}
