import React, { useState, useEffect } from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData } from "../../constants/consensusData"
import { Cpu, Wifi, Activity } from "lucide-react"

export default function BottomStrip() {
  const { state } = useExplorer()
  const { selectedAlgo, reducedMotion } = state
  const [metrics, setMetrics] = useState({
    gasPrice: 12,
    netLoad: 43.1,
    nodesCount: 1420,
    latency: 180,
  })

  // Simulated live telemetry loop
  useEffect(() => {
    if (reducedMotion) return

    const timer = setInterval(() => {
      setMetrics((prev) => {
        const gasDiff = (Math.random() - 0.5) * 2
        const loadDiff = (Math.random() - 0.5) * 4
        const latencyDiff = (Math.random() - 0.5) * 15

        return {
          gasPrice: Math.max(5, Math.floor(prev.gasPrice + gasDiff)),
          netLoad: Math.max(10, Math.min(100, parseFloat((prev.netLoad + loadDiff).toFixed(1)))),
          nodesCount: prev.nodesCount + (Math.random() > 0.5 ? 1 : -1),
          latency: Math.max(20, Math.floor(prev.latency + latencyDiff)),
        }
      })
    }, 3000)

    return () => clearInterval(timer)
  }, [reducedMotion])

  const algo = consensusData[selectedAlgo]

  return (
    <footer 
      role="contentinfo"
      className="h-8 w-full bg-slate-950 border-t border-brand-border/60 fixed bottom-0 left-0 z-50 flex items-center justify-between px-4 font-mono text-[9px] text-slate-500 select-none"
    >
      {/* Network Latency & Nodes connection count */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-emerald-500" />
          <span>CONNECTED NODES: <span className="text-white font-bold">{metrics.nodesCount}</span></span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-indigo-400" />
          <span>LATENCY: <span className="text-white font-bold">{metrics.latency}ms</span></span>
        </div>
      </div>

      {/* Center panel - active algorithm status indicator */}
      <div className="hidden md:flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full pulse-glow" style={{ backgroundColor: algo?.color || "#f59e0b" }}></span>
        <span>ACTIVE SHARD PARADIGM: <span className="text-slate-300 font-bold uppercase">{algo?.name || "POW"}</span></span>
      </div>

      {/* Network Gas & CPU Load metrics */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-slate-400" />
          <span>NETWORK LOAD: <span className="text-white font-bold">{metrics.netLoad}%</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-amber-500">G</span>
          <span>GAS: <span className="text-white font-bold">{metrics.gasPrice} Gwei</span></span>
        </div>
      </div>
    </footer>
  )
}
