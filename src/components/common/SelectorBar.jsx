import React, { useRef } from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { LayoutDashboard, HelpCircle, Zap, Activity, Code2, Table } from "lucide-react"

export default function SelectorBar() {
  const { state, dispatch } = useExplorer()
  const { activeSection } = state
  const scrollContainerRef = useRef(null)

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, key: "1" },
    { id: "mechanics", label: "Protocol Mechanics", icon: HelpCircle, key: "2" },
    { id: "trilemma", label: "Trilemma Analysis", icon: Zap, key: "3" },
    { id: "simulations", label: "Live Simulations", icon: Activity, key: "4" },
    { id: "ecosystem", label: "Ecosystem & Languages", icon: Code2, key: "5" },
    { id: "matrix", label: "Interoperability Matrix", icon: Table, key: "6" },
  ]

  const handleNav = (sectionId) => {
    dispatch({ type: "SET_ACTIVE_SECTION", payload: sectionId })
  }

  // Keyboard navigation for active section selection
  const handleKeyDown = (e, index) => {
    let targetIdx = null
    if (e.key === "ArrowRight") {
      targetIdx = (index + 1) % navItems.length
    } else if (e.key === "ArrowLeft") {
      targetIdx = (index - 1 + navItems.length) % navItems.length
    }

    if (targetIdx !== null) {
      e.preventDefault()
      const nextBtn = scrollContainerRef.current.children[targetIdx]
      if (nextBtn) {
        nextBtn.focus()
        handleNav(navItems[targetIdx].id)
      }
    }
  }

  return (
    <div className="sticky top-0 z-40 mb-6 max-w-5xl mx-auto w-full">
      <div 
        ref={scrollContainerRef}
        role="tablist"
        aria-label="Explorer Workspace Tabs"
        className="flex items-center gap-1.5 p-1.5 bg-slate-950/80 backdrop-blur-xl border border-brand-border rounded-full overflow-x-auto justify-start md:justify-center shadow-lg scrollbar-none"
      >
        {navItems.map((item, index) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          
          let styleClass = "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          
          if (isActive) {
            styleClass = "border-indigo-500/35 bg-indigo-500/10 text-white shadow-lg dynamic-accent-shadow"
          }

          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              aria-controls="main-workspace-view"
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleNav(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wide cursor-pointer transition-all duration-300 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 ${styleClass}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              <kbd className="hidden sm:inline-block px-1 rounded bg-slate-950/80 text-[8px] text-slate-500 font-mono leading-none py-0.5">
                Alt+{item.key}
              </kbd>
            </button>
          )
        })}
      </div>
    </div>
  )
}
