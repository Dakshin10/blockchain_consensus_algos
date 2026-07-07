import React, { useState, useRef } from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { MATRIX_CHAINS, getCompatibility, consensusData } from "../../constants/consensusData"
import { Table, HelpCircle, ArrowRight, Layers, Cpu, Zap, Shield, Code2, Hammer } from "lucide-react"

export default function CompatibilityMatrix() {
  const { state, dispatch } = useExplorer()
  const { matrixInspect } = state

  // Coordinates for crosshair highlighting
  const [focusCoord, setFocusCoord] = useState({ r: 0, c: 0 })
  const [hoverCoord, setHoverCoord] = useState({ r: null, c: null })
  
  // Custom absolute hover tooltip coordinates
  const [hoverTooltip, setHoverTooltip] = useState({
    show: false,
    x: 0,
    y: 0,
    chainA: null,
    chainB: null,
  })
  
  const cellsRef = useRef([])
  const containerRef = useRef(null)

  const setCellRef = (el, r, c) => {
    if (!cellsRef.current[r]) {
      cellsRef.current[r] = []
    }
    cellsRef.current[r][c] = el
  }

  // Handle click to inspect cell and update global context state
  const handleInspect = (chainA, chainB) => {
    dispatch({
      type: "INSPECT_MATRIX_CELL",
      payload: { chainA, chainB },
    })
  }

  // Handle keydown for accessibility grid coordinates travel
  const handleKeyDown = (e, r, c) => {
    let nr = r
    let nc = c
    const max = MATRIX_CHAINS.length - 1

    switch (e.key) {
      case "ArrowUp":
        nr = Math.max(0, r - 1)
        e.preventDefault()
        break
      case "ArrowDown":
        nr = Math.min(max, r + 1)
        e.preventDefault()
        break
      case "ArrowLeft":
        nc = Math.max(0, c - 1)
        e.preventDefault()
        break
      case "ArrowRight":
        nc = Math.min(max, c + 1)
        e.preventDefault()
        break
      case "Enter":
      case " ":
        e.preventDefault()
        handleInspect(MATRIX_CHAINS[r], MATRIX_CHAINS[c])
        return
      default:
        return
    }

    setFocusCoord({ r: nr, c: nc })
    const targetEl = cellsRef.current[nr]?.[nc]
    if (targetEl) {
      targetEl.focus()
      handleInspect(MATRIX_CHAINS[nr], MATRIX_CHAINS[nc])
    }
  }

  // Mouse hover event triggers
  const handleCellMouseEnter = (e, rowChain, colChain, rIdx, cIdx) => {
    setHoverCoord({ r: rIdx, c: cIdx })
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const rect = e.currentTarget.getBoundingClientRect()
      
      setHoverTooltip({
        show: true,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 8,
        chainA: rowChain,
        chainB: colChain,
      })
    }
  }

  const handleCellMouseLeave = () => {
    setHoverCoord({ r: null, c: null })
    setHoverTooltip(prev => ({ ...prev, show: false }))
  }

  // Default to BTC vs ETH inspection if empty
  const activeChainA = matrixInspect.chainA || MATRIX_CHAINS[0]
  const activeChainB = matrixInspect.chainB || MATRIX_CHAINS[3]
  
  const activeCompat = getCompatibility(activeChainA, activeChainB)

  // Fetch target chain details from the single source of truth consensusData
  const getChainDetails = (chain) => {
    const algo = consensusData[chain.algo]
    if (!algo) return {}
    const detail = algo.realBlockchains?.find((c) => c.name.toLowerCase().includes(chain.name.toLowerCase())) || {}
    return {
      consensusName: algo.name,
      tps: algo.performance.tps,
      blockTime: algo.performance.blockTime,
      attackResistance: algo.attackResistance,
      languages: detail.smartContractLanguages?.join(", ") || "None",
      execution: detail.executionEnvironment || "Standard Interpreter",
      vm: detail.virtualMachine || "Standard CPU Engine",
      layer: detail.layerClassification || "Layer 1 base node",
    }
  }

  const detailsA = getChainDetails(activeChainA)
  const detailsB = getChainDetails(activeChainB)

  return (
    <section 
      ref={containerRef}
      className="glass-panel relative w-full flex flex-col gap-6" 
      aria-labelledby="matrix-section-title"
    >
      <h2 id="matrix-section-title" className="panel-title text-white font-bold text-lg flex items-center gap-2 pb-3 border-b border-brand-border/40">
        <Table className="w-5 h-5 dynamic-accent-text" />
        Cross-Chain Compatibility Matrix
      </h2>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* Left: Scrollable matrix chart grid */}
        <div className="lg:col-span-3 overflow-x-auto bg-slate-950/30 rounded-xl border border-brand-border p-4 relative">
          <table 
            role="grid"
            aria-label="Cross-Chain Consensus Compatibility Grid"
            className="w-full border-collapse"
            style={{ minWidth: "520px" }}
          >
            <thead>
              <tr role="row">
                <th role="presentation" className="w-10 h-10 text-[9px] text-slate-500 font-mono">
                  CHAINS
                </th>
                {MATRIX_CHAINS.map((chain) => (
                  <th
                    key={`col-${chain.symbol}`}
                    role="columnheader"
                    scope="col"
                    className="w-9 h-9 text-[8px] font-mono font-bold text-slate-400 text-center uppercase pb-2"
                  >
                    <div className="transform -rotate-45 origin-bottom-left translate-x-2 pb-0.5">
                      {chain.symbol}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {MATRIX_CHAINS.map((rowChain, rIdx) => (
                <tr key={`row-${rowChain.symbol}`} role="row">
                  <th
                    role="rowheader"
                    scope="row"
                    className="w-10 text-left font-mono text-[9px] font-bold text-slate-400 pr-1.5 uppercase"
                  >
                    {rowChain.symbol}
                  </th>

                  {MATRIX_CHAINS.map((colChain, cIdx) => {
                    const compat = getCompatibility(rowChain, colChain)
                    const isInspected = activeChainA.symbol === rowChain.symbol && activeChainB.symbol === colChain.symbol
                    const isFocused = focusCoord.r === rIdx && focusCoord.c === cIdx
                    const isCrosshairHighlighted = hoverCoord.r === rIdx || hoverCoord.c === cIdx

                    let cellClass = "bg-slate-900/40 border-slate-950 text-slate-600"
                    let style = {}

                    if (compat.status === "high") {
                      cellClass = "border-emerald-500/20"
                      const algo = consensusData[rowChain.algo]
                      style = { 
                        backgroundColor: algo ? `${algo.color}25` : "rgba(16, 185, 129, 0.25)",
                        borderColor: algo ? algo.color : "#10b981"
                      }
                    } else if (compat.status === "medium") {
                      const algo = consensusData[rowChain.algo]
                      cellClass = "border-dashed"
                      style = { 
                        backgroundColor: algo ? `${algo.color}10` : "rgba(255,255,255,0.05)",
                        borderColor: algo ? `${algo.color}60` : "rgba(255,255,255,0.2)"
                      }
                    } else {
                      cellClass = "border-brand-border/60 hover:bg-slate-800/40 bg-slate-950/20 text-slate-500"
                    }

                    if (isInspected) {
                      cellClass += " ring-2 ring-white z-10 scale-[1.08]"
                    } else if (isCrosshairHighlighted) {
                      cellClass += " filter brightness-125 bg-slate-800/50"
                    }

                    return (
                      <td
                        key={`cell-${rowChain.symbol}-${colChain.symbol}`}
                        ref={(el) => setCellRef(el, rIdx, cIdx)}
                        role="gridcell"
                        tabIndex={isFocused ? 0 : -1}
                        aria-selected={isInspected}
                        onClick={() => handleInspect(rowChain, colChain)}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                        onMouseEnter={(e) => handleCellMouseEnter(e, rowChain, colChain, rIdx, cIdx)}
                        onMouseLeave={handleCellMouseLeave}
                        className={`w-9 h-9 border rounded cursor-pointer text-center text-[8px] font-mono transition-all duration-200 select-none ${cellClass}`}
                        style={style}
                      >
                        {compat.status === "high" ? "F" : compat.status === "medium" ? "M" : "X"}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Split Comparison Mode dashboard */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-slate-950/40 border border-brand-border rounded-xl p-4 flex flex-col gap-4 min-h-[380px]">
            <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Split Protocol Comparator
            </div>

            {/* Compared Entities Identity */}
            <div className="flex items-center justify-between gap-2 py-2 border-b border-brand-border/20">
              <div className="flex flex-col text-left max-w-[40%]">
                <span className="text-sm font-extrabold text-white truncate">{activeChainA.name}</span>
                <span className="text-[8px] font-mono text-slate-500 font-bold">CHAIN A ({activeChainA.symbol})</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <div className="flex flex-col text-right max-w-[40%]">
                <span className="text-sm font-extrabold text-white truncate">{activeChainB.name}</span>
                <span className="text-[8px] font-mono text-slate-500 font-bold">CHAIN B ({activeChainB.symbol})</span>
              </div>
            </div>

            {/* Split comparative table grids */}
            <div className="flex flex-col gap-3 font-mono text-[9px] leading-relaxed">
              
              {/* Consensus */}
              <div className="flex flex-col border-b border-brand-border/10 pb-1.5">
                <span className="text-slate-500 text-[8px] uppercase font-bold flex items-center gap-1">
                  <Hammer className="w-3.5 h-3.5 text-indigo-400" />
                  CONSENSUS RULESET
                </span>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-200 font-bold max-w-[45%] truncate">{detailsA.consensusName}</span>
                  <span className="text-slate-200 font-bold max-w-[45%] truncate text-right">{detailsB.consensusName}</span>
                </div>
              </div>

              {/* Performance */}
              <div className="flex flex-col border-b border-brand-border/10 pb-1.5">
                <span className="text-slate-500 text-[8px] uppercase font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  PERFORMANCE SNAPSHOT
                </span>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-200 max-w-[45%] truncate">{detailsA.tps} ({detailsA.blockTime})</span>
                  <span className="text-slate-200 max-w-[45%] truncate text-right">{detailsB.tps} ({detailsB.blockTime})</span>
                </div>
              </div>

              {/* Security */}
              <div className="flex flex-col border-b border-brand-border/10 pb-1.5">
                <span className="text-slate-500 text-[8px] uppercase font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  SECURITY THRESHOLD
                </span>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-200 max-w-[45%] truncate" title={detailsA.attackResistance}>{detailsA.attackResistance}</span>
                  <span className="text-slate-200 max-w-[45%] truncate text-right" title={detailsB.attackResistance}>{detailsB.attackResistance}</span>
                </div>
              </div>

              {/* Languages */}
              <div className="flex flex-col border-b border-brand-border/10 pb-1.5">
                <span className="text-slate-500 text-[8px] uppercase font-bold flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                  COMPILER LANGUAGES
                </span>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-200 max-w-[45%] truncate" title={detailsA.languages}>{detailsA.languages}</span>
                  <span className="text-slate-200 max-w-[45%] truncate text-right" title={detailsB.languages}>{detailsB.languages}</span>
                </div>
              </div>

              {/* Execution / VM */}
              <div className="flex flex-col border-b border-brand-border/10 pb-1.5">
                <span className="text-slate-500 text-[8px] uppercase font-bold flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  EXECUTION MACHINE / VM
                </span>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-200 max-w-[45%] truncate" title={detailsA.vm}>{detailsA.vm}</span>
                  <span className="text-slate-200 max-w-[45%] truncate text-right" title={detailsB.vm}>{detailsB.vm}</span>
                </div>
              </div>

              {/* Layer classification */}
              <div className="flex flex-col pb-1">
                <span className="text-slate-500 text-[8px] uppercase font-bold flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  LAYER CLASSIFICATION
                </span>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-200 max-w-[45%] truncate" title={detailsA.layer}>{detailsA.layer}</span>
                  <span className="text-slate-200 max-w-[45%] truncate text-right" title={detailsB.layer}>{detailsB.layer}</span>
                </div>
              </div>

            </div>

            {/* Interoperability evaluation logs */}
            <div className="p-2.5 rounded bg-slate-900/40 border border-brand-border/30 text-[9px] font-sans text-slate-350 leading-relaxed mt-auto">
              <div className="font-bold font-mono text-[8px] text-indigo-400 uppercase mb-1">
                BRIDGING COMPATIBILITY: {activeCompat.label}
              </div>
              {activeCompat.description}
            </div>

          </div>
        </div>

      </div>

      {/* Floating Hover Tooltip explanation */}
      {hoverTooltip.show && hoverTooltip.chainA && (
        <div 
          className="absolute z-50 p-3 bg-slate-950/95 border border-brand-border rounded-xl shadow-2xl max-w-[210px] text-[8px] font-mono leading-relaxed transform -translate-x-1/2 -translate-y-full text-slate-300 pointer-events-none select-none animate-fade-in"
          style={{ left: hoverTooltip.x, top: hoverTooltip.y }}
        >
          <div className="font-bold text-white border-b border-brand-border/30 pb-1 mb-1">
            {hoverTooltip.chainA.symbol} ↔ {hoverTooltip.chainB.symbol} COMPATIBILITY
          </div>
          <div className="text-indigo-400 font-bold uppercase mb-0.5">
            {getCompatibility(hoverTooltip.chainA, hoverTooltip.chainB).label}
          </div>
          <p className="text-slate-450 leading-normal text-[7.5px]">
            {getCompatibility(hoverTooltip.chainA, hoverTooltip.chainB).description}
          </p>
        </div>
      )}
    </section>
  )
}
