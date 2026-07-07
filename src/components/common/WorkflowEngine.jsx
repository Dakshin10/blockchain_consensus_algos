import React, { useEffect, useRef } from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData } from "../../constants/consensusData"
import { 
  Key, Radio, Database, Layers, Cpu, Award, CheckCircle2, Coins, Zap, 
  ArrowLeft, ArrowRight, Play, Pause, RotateCcw, ChevronRight
} from "lucide-react"

const getStepIcon = (title) => {
  const t = title.toLowerCase()
  if (t.includes("transaction") || t.includes("create") || t.includes("request")) return Key
  if (t.includes("broadcast") || t.includes("gossip") || t.includes("propagate") || t.includes("relay")) return Radio
  if (t.includes("mempool") || t.includes("collect") || t.includes("queue")) return Database
  if (t.includes("candidate") || t.includes("block") || t.includes("assemble") || t.includes("propose")) return Layers
  if (t.includes("mining") || t.includes("hash") || t.includes("solve") || t.includes("timer") || t.includes("clock") || t.includes("sleep")) return Cpu
  if (t.includes("winner") || t.includes("solved") || t.includes("leader") || t.includes("selection") || t.includes("woke") || t.includes("found")) return Award
  if (t.includes("verify") || t.includes("audit") || t.includes("vote") || t.includes("attest") || t.includes("confirm") || t.includes("check")) return CheckCircle2
  if (t.includes("reward") || t.includes("payout") || t.includes("incentive") || t.includes("distributed")) return Coins
  return Zap
}

export default function WorkflowEngine() {
  const { state, dispatch } = useExplorer()
  const { selectedAlgo, activeWorkflowStep, isPlaying, isAutoPlay, speed } = state
  const algo = consensusData[selectedAlgo]
  const steps = algo.steps

  const activeIdx = activeWorkflowStep
  const scrollContainerRef = useRef(null)

  // Auto-scroll timeline to keep active step centered
  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      const activeCard = container.children[activeIdx * 2] // Account for arrow dividers in children list
      if (activeCard) {
        const containerWidth = container.offsetWidth
        const cardOffset = activeCard.offsetLeft
        const cardWidth = activeCard.offsetWidth
        container.scrollTo({
          left: cardOffset - containerWidth / 2 + cardWidth / 2,
          behavior: "smooth",
        })
      }
    }
  }, [activeIdx])

  const handleStepSelect = (idx) => {
    dispatch({ type: "SET_WORKFLOW_STEP", payload: idx })
    dispatch({ type: "SET_PLAYING", payload: false })
    dispatch({ type: "SET_AUTO_PLAY", payload: false })
  }

  const handlePrevStep = () => {
    dispatch({ type: "SET_PLAYING", payload: false })
    dispatch({ type: "SET_AUTO_PLAY", payload: false })
    const prevIdx = Math.max(0, activeIdx - 1)
    dispatch({ type: "SET_WORKFLOW_STEP", payload: prevIdx })
  }

  const handleNextStep = () => {
    dispatch({ type: "SET_AUTO_PLAY", payload: false })
    const nextIdx = Math.min(steps.length - 1, activeIdx + 1)
    dispatch({ type: "SET_WORKFLOW_STEP", payload: nextIdx })
    dispatch({ type: "SET_PLAYING", payload: true }) // Auto-play this next step's animation
  }

  const handlePlayPause = () => {
    dispatch({ type: "SET_PLAYING", payload: !isPlaying })
    dispatch({ type: "SET_AUTO_PLAY", payload: false })
  }

  const handleAutoPlayToggle = () => {
    dispatch({ type: "SET_AUTO_PLAY", payload: !isAutoPlay })
  }

  const handleReset = () => {
    dispatch({ type: "SET_PLAYING", payload: false })
    dispatch({ type: "SET_AUTO_PLAY", payload: false })
    dispatch({ type: "SET_SHOW_COMPLETION", payload: false })
    dispatch({ type: "SET_WORKFLOW_STEP", payload: 0 })
  }

  const unicodeNumbers = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫"]

  return (
    <div className="flex flex-col gap-6 w-full" role="region" aria-label="Process Flowchart timeline">
      
      {/* 1. Horizontal Flowchart Diagram */}
      <div 
        ref={scrollContainerRef}
        className="flex items-center gap-0 overflow-x-auto pb-4 pt-2 px-2 scrollbar-thin scroll-smooth select-none w-full border-b border-brand-border/20"
      >
        {steps.map((step, idx) => {
          const isCompleted = idx < activeIdx
          const isActive = idx === activeIdx
          const isUpcoming = idx > activeIdx
          
          const IconComponent = getStepIcon(step.title)
          const numChar = unicodeNumbers[idx] || `${idx + 1}`

          let nodeClass = ""
          let iconClass = ""

          if (isActive) {
            nodeClass = "border-amber-500 bg-amber-950/20 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-105 animate-pulse-gentle z-10"
            iconClass = "text-amber-500"
          } else if (isCompleted) {
            nodeClass = "border-emerald-500 bg-emerald-950/10 text-emerald-400 opacity-90"
            iconClass = "text-emerald-450"
          } else {
            nodeClass = "border-brand-border/40 bg-slate-900/15 text-slate-500 opacity-50"
            iconClass = "text-slate-600"
          }

          return (
            <React.Fragment key={idx}>
              {/* Process Step Node */}
              <button
                onClick={() => handleStepSelect(idx)}
                className={`flex-shrink-0 w-60 p-4 rounded-xl border-2 text-left cursor-pointer transition-all duration-300 flex flex-col gap-1.5 focus:outline-none ${nodeClass}`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-mono font-bold tracking-wider text-slate-400">
                    STEP {numChar}
                  </span>
                  <IconComponent className={`w-5 h-5 ${iconClass}`} />
                </div>
                <span className="text-[14px] font-bold uppercase tracking-tight truncate w-full">
                  {step.title}
                </span>
                <p className="text-[10px] font-light leading-relaxed text-slate-400 line-clamp-1">
                  {step.description}
                </p>
              </button>

              {/* Connecting Execution Arrow Divider */}
              {idx < steps.length - 1 && (
                <div className="flex-shrink-0 flex items-center justify-center px-3" aria-hidden="true">
                  <div className={`h-1.5 w-10 relative rounded-full transition-all duration-500 ${
                    idx < activeIdx 
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" 
                      : idx === activeIdx && isPlaying
                      ? "bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                      : "bg-slate-800"
                  }`}>
                    {/* Arrow head pointer */}
                    <div className={`absolute -right-2 -top-1.5 border-t-6 border-b-6 border-l-8 border-transparent transition-all duration-500 ${
                      idx < activeIdx 
                        ? "border-l-emerald-500" 
                        : idx === activeIdx && isPlaying
                        ? "border-l-amber-500" 
                        : "border-l-slate-800"
                    }`} />
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* 2. Step Controller Toolbar (Directly beneath the workflow flowchart) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/10 border border-brand-border/40 p-4 rounded-2xl w-full">
        
        {/* Step display counter */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-400 uppercase">
            Active Consensus Step
          </span>
          <span className="text-[16px] font-extrabold text-white uppercase tracking-tight">
            Step {activeIdx + 1} / {steps.length}: {steps[activeIdx].title}
          </span>
        </div>

        {/* Action Controls Deck */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={activeIdx === 0}
            onClick={handlePrevStep}
            className="px-4 py-2.5 rounded-xl border border-brand-border bg-slate-950 text-slate-350 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Step
          </button>

          <button
            onClick={handlePlayPause}
            className="px-5 py-2.5 rounded-xl border border-brand-border bg-slate-950 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 text-amber-500 animate-pulse" />
                Pause Action
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-450" />
                Play Step
              </>
            )}
          </button>

          <button
            disabled={activeIdx === steps.length - 1}
            onClick={handleNextStep}
            className="px-4 py-2.5 rounded-xl border border-transparent dynamic-accent-bg text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next Step
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="w-10 h-10 rounded-xl border border-brand-border bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Auto Play Selector */}
        <button
          onClick={handleAutoPlayToggle}
          className={`px-4 py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-all duration-200 ${
            isAutoPlay 
              ? "border-emerald-500 bg-emerald-950/20 text-emerald-450 shadow-[0_0_12px_rgba(16,185,129,0.15)] animate-pulse" 
              : "border-brand-border bg-slate-950 text-slate-400 hover:text-white"
          }`}
        >
          {isAutoPlay ? "⏸ PAUSE AUTO PLAY" : "▶ PLAY AUTO PLAY"}
        </button>

      </div>
    </div>
  )
}
