import React, { useState, useEffect, useRef } from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { Database, Trash2, Download, Search, CheckCircle, ChevronDown, ChevronUp, FileText, ChevronLeft, ChevronRight, Pin } from "lucide-react"

export default function RightLedgerPanel({ isExpanded, setIsExpanded }) {
  const { state, dispatch } = useExplorer()
  const { ledger, autoScroll } = state

  // Search & Filter state variables
  const [searchQuery, setSearchQuery] = useState("")
  const [filterAlgo, setFilterAlgo] = useState("all")
  
  // Track expanded blocks heights by block number
  const [expandedBlocks, setExpandedBlocks] = useState({})
  
  // Persistent click-lock state for the utility panel
  const [isLocked, setIsLocked] = useState(false)

  const listTopRef = useRef(null)

  // Auto scroll to top of ledger list when new block is added
  useEffect(() => {
    if (autoScroll && listTopRef.current && isExpanded) {
      listTopRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [ledger.length, autoScroll, isExpanded])

  const toggleExpandBlock = (blockNum) => {
    setExpandedBlocks((prev) => ({
      ...prev,
      [blockNum]: !prev[blockNum],
    }))
  }

  const handleClear = (e) => {
    e.stopPropagation()
    if (window.confirm("Are you sure you want to clear the global ledger history?")) {
      dispatch({ type: "CLEAR_LEDGER" })
    }
  }

  const handleExport = (e) => {
    e.stopPropagation()
    if (ledger.length === 0) {
      alert("Ledger is empty. Run simulations to generate blocks first.")
      return
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ledger, null, 2))
    const downloadAnchor = document.createElement("a")
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `consensus_ledger_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // Hover triggers
  const handleMouseEnter = () => {
    setIsExpanded(true)
  }

  const handleMouseLeave = () => {
    if (!isLocked) {
      setIsExpanded(false)
    }
  }

  const handleLockToggle = (e) => {
    e.stopPropagation()
    const nextLocked = !isLocked
    setIsLocked(nextLocked)
    setIsExpanded(nextLocked)
  }

  // Filter & Search evaluation
  const filteredLedger = ledger.filter((entry) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = 
      entry.hash.toLowerCase().includes(query) ||
      entry.blockNumber.toString().includes(query) ||
      entry.validatorMiner.toLowerCase().includes(query)
    
    const matchesFilter = 
      filterAlgo === "all" || 
      entry.consensusAlgorithm.toLowerCase().includes(filterAlgo.toLowerCase())

    return matchesSearch && matchesFilter
  })

  // List newest first (reverse order)
  const displayEntries = [...filteredLedger].reverse()

  const getFadingOpacity = (idx) => {
    if (idx === 0) return "opacity-100"
    if (idx === 1) return "opacity-90"
    if (idx === 2) return "opacity-80"
    if (idx === 3) return "opacity-70"
    if (idx === 4) return "opacity-55"
    if (idx === 5) return "opacity-40"
    return "opacity-25"
  }

  const uniqueAlgos = Array.from(new Set(ledger.map((e) => e.consensusAlgorithm)))

  // COLLAPSED COMPONENT STATE (48px width layout)
  if (!isExpanded) {
    return (
      <aside 
        aria-label="Immutable Ledger Panel Explorer Collapsed" 
        className="flex flex-col items-center py-4 bg-slate-950/80 border-l border-brand-border/40 h-full w-12 cursor-pointer hover:bg-slate-900/60 select-none utility-panel-transition relative"
        onMouseEnter={handleMouseEnter}
        onClick={handleLockToggle}
      >
        <Database className="w-5 h-5 text-indigo-400 animate-pulse mb-6" />
        
        {/* Total block count displayed vertically */}
        <div className="flex-grow flex items-center justify-center">
          <div 
            className="rotate-90 text-[10px] font-mono font-bold tracking-widest text-slate-400 whitespace-nowrap transform origin-center translate-y-3"
            style={{ textOrientation: "mixed" }}
          >
            HEIGHT: {ledger.length}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="mt-auto flex flex-col items-center gap-5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
          <ChevronLeft className="w-4 h-4 text-slate-500 hover:text-slate-200" />
        </div>
      </aside>
    )
  }

  // EXPANDED COMPONENT STATE
  return (
    <aside 
      aria-label="Immutable Ledger Panel Explorer Expanded" 
      className="flex flex-col h-full bg-slate-950/90 backdrop-blur-md overflow-hidden select-none border-l border-brand-border/40 utility-panel-transition w-80 lg:w-[340px]"
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. Header Toolbar */}
      <div className="p-4 border-b border-brand-border/40 flex flex-col gap-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300 uppercase">
              IMMUTABLE LEDGER CORE
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleLockToggle}
              className={`p-1 px-1.5 rounded border transition-colors cursor-pointer ${
                isLocked 
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-400" 
                  : "border-brand-border bg-slate-900 text-slate-400 hover:text-white"
              }`}
              title={isLocked ? "Unlock Sidebar Panel" : "Lock Panel Open"}
            >
              <Pin className="w-3 h-3" />
            </button>
            <button
              onClick={handleExport}
              className="p-1 px-1.5 rounded border border-brand-border bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Export Ledger (JSON)"
            >
              <Download className="w-3 h-3" />
            </button>
            <button
              onClick={handleClear}
              className="p-1 px-1.5 rounded border border-rose-500/20 bg-slate-900 text-rose-500/80 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
              title="Clear Ledger"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={handleLockToggle}
              className="p-1 px-1.5 rounded border border-brand-border bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Collapse Panel"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Telemetry quick summary */}
        <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 border-t border-brand-border/20 pt-2">
          <span>SYNC STATE: <span className="text-emerald-400 font-bold">LIVE</span></span>
          <span>INDEXED BLOCKS: <span className="text-white font-bold">{ledger.length}</span></span>
        </div>
      </div>

      {/* 2. Search & Filter Input Boxes */}
      <div className="px-4 py-2 border-b border-brand-border/30 flex flex-col gap-2 bg-slate-950/30 flex-shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-3 h-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search block, hash, node..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-brand-border/70 rounded text-[10px] font-mono text-slate-300 focus:outline-none focus:border-indigo-500 placeholder-slate-650"
          />
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] font-mono text-slate-500 uppercase">FILTER ALGO:</span>
          <select
            value={filterAlgo}
            onChange={(e) => setFilterAlgo(e.target.value)}
            className="bg-slate-950 border border-brand-border/70 rounded text-[9px] font-mono text-slate-400 focus:outline-none focus:border-indigo-500 p-1 px-1.5 cursor-pointer max-w-[140px]"
          >
            <option value="all">ALL PROTOCOLS</option>
            {uniqueAlgos.map((algoName) => (
              <option key={algoName} value={algoName}>{algoName.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Scrolling Ledger Viewport */}
      <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin select-text">
        <div ref={listTopRef} />

        {displayEntries.map((entry, idx) => {
          const isBlockExpanded = !!expandedBlocks[entry.blockNumber]
          const fadeClass = getFadingOpacity(idx)

          return (
            <div 
              key={entry.blockNumber}
              onClick={() => toggleExpandBlock(entry.blockNumber)}
              className={`p-3 bg-slate-900/35 border border-brand-border/50 hover:border-brand-border rounded-xl flex flex-col gap-2 font-mono text-[9px] transition-all duration-300 cursor-pointer select-none ${fadeClass}`}
            >
              <div className="flex justify-between items-center text-slate-300 border-b border-brand-border/20 pb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  BLOCK #{entry.blockNumber}
                </span>
                <span className="text-[8px] text-slate-500">{entry.timestamp}</span>
              </div>

              <div className="grid grid-cols-3 gap-y-1 text-slate-400">
                <span className="col-span-1">HASH:</span>
                <span className="col-span-2 text-right text-slate-200 font-bold truncate">{entry.hash}</span>
                
                <span className="col-span-1">CON:</span>
                <span className="col-span-2 text-right text-indigo-400 font-bold truncate uppercase">{entry.consensusAlgorithm}</span>
                
                <span className="col-span-1">{entry.stake ? "STAKE:" : "VALIDATOR:"}</span>
                <span className="col-span-2 text-right text-slate-350 truncate">
                  {entry.stake ? `${entry.validatorMiner} (${entry.stake})` : entry.validatorMiner}
                </span>
              </div>

              {isBlockExpanded && (
                <div className="border-t border-brand-border/20 pt-2 mt-1 flex flex-col gap-1.5 text-slate-450 animate-fade-in text-[8px]">
                  <div className="flex justify-between">
                    <span>STATE ROOT:</span>
                    <span className="text-slate-350">{entry.stateRoot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GAS CONSUMED:</span>
                    <span className="text-slate-350">{entry.gasUsed.toLocaleString()} Gas</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BLOCK SIZE:</span>
                    <span className="text-slate-350">{entry.sizeBytes.toLocaleString()} Bytes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CONSENSUS DURATION:</span>
                    <span className="text-emerald-400 font-bold">{entry.consensusTime}</span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5 pt-1 border-t border-brand-border/10">
                    <span>STATUS:</span>
                    <span className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-extrabold border border-emerald-500/20 text-[7px] leading-none uppercase">
                      {entry.confirmationStatus}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-center text-slate-600 mt-1 border-t border-brand-border/10 pt-1">
                {isBlockExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
            </div>
          )
        })}

        {ledger.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
            <FileText className="w-8 h-8 text-slate-650 animate-pulse" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono font-bold text-slate-400">LEDGER EMPTY</span>
              <p className="text-[9px] font-mono text-slate-500 leading-relaxed max-w-[160px]">
                Run Canvas simulations to append confirmed block headers in real time.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Telemetry Footer bar */}
      <div className="p-3 border-t border-brand-border/40 bg-slate-950/40 text-[9px] font-mono text-slate-500 flex flex-col gap-1.5 flex-shrink-0">
        <div className="flex justify-between items-center">
          <span>AUTO SCROLL:</span>
          <button
            onClick={() => dispatch({ type: "TOGGLE_AUTO_SCROLL" })}
            className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-colors ${
              autoScroll 
                ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400" 
                : "bg-slate-900 border border-brand-border text-slate-550"
            }`}
          >
            {autoScroll ? "ENABLED" : "DISABLED"}
          </button>
        </div>
      </div>
    </aside>
  )
}
