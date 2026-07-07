import React, { useRef, useState } from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData } from "../../constants/consensusData"

export default function Sidebar() {
  const { state, dispatch } = useExplorer()
  const { selectedAlgo } = state
  const sidebarRef = useRef(null)

  const algoKeys = Object.keys(consensusData)

  const handleSelect = (algoId) => {
    dispatch({ type: "SELECT_ALGORITHM", payload: algoId })
  }

  // Keyboard Arrow Key Focus Traversal & Selection
  const handleKeyDown = (e, index) => {
    let targetIdx = null
    const max = algoKeys.length - 1

    if (e.key === "ArrowDown") {
      targetIdx = index === max ? 0 : index + 1
      e.preventDefault()
    } else if (e.key === "ArrowUp") {
      targetIdx = index === 0 ? max : index - 1
      e.preventDefault()
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleSelect(algoKeys[index])
      return
    }

    if (targetIdx !== null) {
      const nextCard = sidebarRef.current.children[targetIdx + 1] // Index + 1 due to header offset
      if (nextCard) {
        nextCard.focus()
        // Auto select on arrow movement for instant dashboard update
        handleSelect(algoKeys[targetIdx])
      }
    }
  }

  return (
    <nav 
      ref={sidebarRef}
      aria-label="Algorithm Selection Drawer" 
      className="w-64 border-r border-brand-border bg-slate-950/70 backdrop-blur-md flex flex-col h-full flex-shrink-0"
    >
      {/* Title / Section header */}
      <div className="p-4 border-b border-brand-border/40 flex-shrink-0">
        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
          CONSENSUS PROTOCOLS ({algoKeys.length})
        </span>
      </div>

      {/* List of focusable algorithm selector cards */}
      <div className="flex-grow p-3 flex flex-col gap-3 overflow-y-auto scrollbar-thin">
        {algoKeys.map((key, index) => {
          const algo = consensusData[key]
          const isSelected = selectedAlgo === key

          let borderClass = "border-brand-border/40 bg-slate-900/10 hover:border-brand-border hover:bg-slate-900/30"
          let textClass = "text-slate-400"
          let badgeClass = "bg-slate-950 text-slate-500 border-brand-border"
          
          if (isSelected) {
            textClass = "text-white"
            
            // Map family borders dynamically
            if (algo.family === "nakamoto") {
              borderClass = "border-amber-500/50 bg-amber-500/5"
              badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20"
            } else if (algo.family === "stake") {
              borderClass = "border-violet-500/50 bg-violet-500/5"
              badgeClass = "bg-violet-500/10 text-violet-400 border-violet-500/20"
            } else if (algo.family === "byzantine") {
              borderClass = "border-cyan-500/50 bg-cyan-500/5"
              badgeClass = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
            } else if (algo.family === "authority") {
              borderClass = "border-emerald-500/50 bg-emerald-500/5"
              badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            } else if (algo.family === "tee") {
              borderClass = "border-emerald-400/50 bg-emerald-400/5"
              badgeClass = "bg-emerald-400/10 text-emerald-350 border-emerald-400/20"
            } else if (algo.family === "avalanche") {
              borderClass = "border-rose-500/50 bg-rose-500/5"
              badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }
          }

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-selected={isSelected}
              onClick={() => handleSelect(key)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`p-3.5 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${borderClass}`}
              style={{
                boxShadow: isSelected ? `0 0 14px ${algo.glow}` : "none"
              }}
            >
              {/* Header: Name & Year */}
              <div className="flex justify-between items-start gap-1">
                <h3 className={`text-xs font-bold leading-tight uppercase tracking-wide ${isSelected ? "text-white" : "text-slate-300"}`}>
                  {algo.name}
                </h3>
                <span className="text-[8px] font-mono text-slate-500 font-bold bg-slate-950 px-1 py-0.5 rounded border border-brand-border/40">
                  {algo.yearIntroduced}
                </span>
              </div>

              {/* Mechanism Summary */}
              <p className="text-[10px] text-slate-400 leading-relaxed font-light line-clamp-2">
                {algo.mechanismSummary}
              </p>

              {/* Footer metadata grid */}
              <div className="grid grid-cols-2 gap-1 border-t border-brand-border/20 pt-2 mt-1 text-[8px] font-mono text-slate-500">
                <div className="flex flex-col">
                  <span>CHAIN</span>
                  <span className="text-slate-300 font-bold uppercase truncate">{algo.primaryBlockchain}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span>PARADIGM</span>
                  <span className={`px-1 rounded border text-[7px] font-extrabold uppercase ${badgeClass}`}>
                    {algo.family}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Static Footer Telemetry signature */}
      <div className="p-3 border-t border-brand-border/40 bg-slate-950/40 text-[9px] font-mono text-slate-500 flex flex-col gap-1.5 flex-shrink-0">
        <div className="flex justify-between items-center">
          <span>COORDINATOR:</span>
          <span className="text-slate-350 font-bold uppercase">STITCH-NET</span>
        </div>
      </div>
    </nav>
  )
}
