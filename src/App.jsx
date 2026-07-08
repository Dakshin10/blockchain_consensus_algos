import React, { useState, useEffect } from "react"
import { ExplorerProvider, useExplorer } from "./context/ExplorerContext"
import Header from "./components/common/Header"
import Sidebar from "./components/layout/Sidebar"
import RightLedgerPanel from "./components/layout/RightLedgerPanel"
import BottomStrip from "./components/layout/BottomStrip"

// Narrative Storyboard Components
import ProtocolMechanics from "./components/panels/ProtocolMechanics"
import TrilemmaScorecard from "./components/panels/TrilemmaScorecard"
import ImplementationGrid from "./components/panels/ImplementationGrid"
import CompatibilityMatrix from "./components/panels/CompatibilityMatrix"
import SimulationEngine from "./components/canvas/SimulationEngine"
import GlobalBackground3D from "./components/canvas/GlobalBackground3D"

function AppContent() {
  const { state, dispatch } = useExplorer()
  const { selectedAlgo, highContrast } = state
  
  // Collapsible panels open states
  const [ledgerExpanded, setLedgerExpanded] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  // Alt + Number Keyboard Navigation Shortcuts to jump directly to scroll anchors
  useEffect(() => {
    const handleShortcut = (e) => {
      if (e.altKey) {
        const sectionsMap = {
          "1": "edu-narrative-intro",
          "2": "edu-narrative-simulation",
          "3": "edu-narrative-trilemma",
          "4": "edu-narrative-ecosystem",
          "5": "edu-narrative-compatibility"
        }
        const targetId = sectionsMap[e.key]
        if (targetId) {
          e.preventDefault()
          const element = document.getElementById(targetId)
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }
      }
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  return (
    <div 
      className={`min-h-screen bg-brand-dark text-slate-100 flex flex-col overflow-hidden font-sans select-none ${
        highContrast ? "contrast-125 saturate-150" : ""
      }`}
    >
      {/* 3D Interactive background */}
      <GlobalBackground3D />

      {/* 1. Anchored Fixed Top Header */}
      <div className="h-16 w-full flex-shrink-0 z-30">
        <Header />
      </div>

      {/* 2. Main Body layout: Sidebar + Workspace + Collapsible Ledger */}
      <div className="flex-grow flex w-full overflow-hidden relative" style={{ height: "calc(100vh - 64px)" }}>
        
        {/* Left selection navigation */}
        <div 
          className="h-full flex-shrink-0 utility-panel-transition border-r border-brand-border/40 z-10"
          style={{ width: sidebarExpanded ? "260px" : "48px" }}
        >
          <Sidebar isExpanded={sidebarExpanded} setIsExpanded={setSidebarExpanded} />
        </div>

        {/* Middle Unified Learning Area */}
        <main 
          id="main-workspace-view"
          role="main"
          className="flex-grow h-full overflow-y-auto p-8 scrollbar-thin bg-brand-dark/15 flex flex-col gap-14"
          style={{ width: `calc(100% - ${sidebarExpanded ? "260px" : "48px"} - ${ledgerExpanded ? "340px" : "48px"})` }}
        >
          
          {/* Section 1: Intro, Problem & Interactive Workflow Journey */}
          <div id="edu-narrative-intro" className="animate-fade-in">
            <ProtocolMechanics />
          </div>

          {/* Section 2: Live Protocol Simulation visualizer & Inspector */}
          <div id="edu-narrative-simulation" className="animate-fade-in">
            <SimulationEngine />
          </div>

          {/* Section 3: Blockchain Trilemma progress meters & Performance snapshot */}
          <div id="edu-narrative-trilemma" className="animate-fade-in">
            <TrilemmaScorecard />
          </div>


          {/* Section 5: Real Blockchains mapping, Compiler pipeline, & L1 vs L2 charts */}
          <div id="edu-narrative-ecosystem" className="animate-fade-in">
            <ImplementationGrid />
          </div>

          {/* Section 6: Interoperability Matrix comparisons */}
          <div id="edu-narrative-compatibility" className="animate-fade-in">
            <CompatibilityMatrix />
          </div>

        </main>

        {/* Collapsible Utility Ledger panel (5% default collapsing width, slides to 340px) */}
        <div 
          className="h-full flex-shrink-0 utility-panel-transition z-20"
          style={{ width: ledgerExpanded ? "340px" : "48px" }}
        >
          <RightLedgerPanel isExpanded={ledgerExpanded} setIsExpanded={setLedgerExpanded} />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ExplorerProvider>
      <AppContent />
    </ExplorerProvider>
  )
}
