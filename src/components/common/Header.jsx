import React from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData } from "../../constants/consensusData"
import { Shield, Eye, EyeOff } from "lucide-react"

export default function Header() {
  const { state, dispatch } = useExplorer()
  const { selectedAlgo, reducedMotion, highContrast } = state
  const algo = consensusData[selectedAlgo]

  return (
    <header 
      role="banner"
      className="h-16 w-full border-b border-brand-border bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 z-50 select-none"
    >
      {/* Left: Branding & Logo */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-brand-border bg-slate-900 dynamic-accent-shadow">
          <Shield className="w-4 h-4 dynamic-accent-text" />
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300 uppercase">
            CONSENSUS LABS
          </span>
          <span className="text-[8px] font-mono text-slate-500 tracking-widest font-bold">
            PROTOCOL EXPLORER
          </span>
        </div>
      </div>

      {/* Center: Live active category stat overlay */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded bg-slate-900/50 border border-brand-border/40 text-[9px] font-mono">
        <span className="w-1.5 h-1.5 rounded-full pulse-glow" style={{ backgroundColor: algo?.color || "#f59e0b" }}></span>
        <span className="text-slate-400">ACTIVE:</span>
        <span className="text-white font-bold uppercase">{algo?.name || "POW"}</span>
      </div>

      {/* Right: Accessibility Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => dispatch({ type: "TOGGLE_REDUCED_MOTION" })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[9px] font-bold font-mono tracking-wider transition-all duration-200 ${
            reducedMotion
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
              : "border-brand-border text-slate-400 hover:text-white hover:border-brand-border-hover bg-slate-900/40"
          }`}
          aria-pressed={reducedMotion}
          title="Toggle animations to reduce screen movement"
        >
          {reducedMotion ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          <span className="hidden xs:inline">MOTION: {reducedMotion ? "OFF" : "ON"}</span>
        </button>

        <button
          onClick={() => dispatch({ type: "TOGGLE_HIGH_CONTRAST" })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[9px] font-bold font-mono tracking-wider transition-all duration-200 ${
            highContrast
              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20"
              : "border-brand-border text-slate-400 hover:text-white hover:border-brand-border-hover bg-slate-900/40"
          }`}
          aria-pressed={highContrast}
          title="Toggle high contrast outlines"
        >
          <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[7px] font-bold">
            C
          </span>
          <span className="hidden xs:inline">CONTRAST: {highContrast ? "HIGH" : "STD"}</span>
        </button>
      </div>
    </header>
  )
}
