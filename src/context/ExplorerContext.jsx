import React, { createContext, useContext, useReducer, useEffect } from "react"
import { consensusData } from "../constants/consensusData"

const ExplorerContext = createContext()

const initialState = {
  selectedAlgo: "pow",
  compareAlgo: null, // Consensus ID to compare in Radar Chart
  activeAttack: null, // Active attack simulator ID
  activeWorkflowStep: 0, // Current active step of the active algorithm workflow
  activeSection: "dashboard", // Default to main control room overview
  isPlaying: false, // Default to false (manual step-by-step by default)
  isAutoPlay: false, // Auto play transitions state
  showCompletion: false, // Completed consensus banner state
  speed: 1, // Shared simulation speed state
  matrixInspect: {
    chainA: null,
    chainB: null,
  },
  reducedMotion: false,
  highContrast: false,
  ledger: [], // Global Immutable Ledger
  autoScroll: true, // Toggle for automatic list scrolling
}

// Helper to update CSS Custom Properties dynamically based on selected algorithm family
const updateAccentCSS = (algoId) => {
  const algo = consensusData[algoId]
  if (algo) {
    document.documentElement.style.setProperty("--accent-color", algo.color)
    document.documentElement.style.setProperty("--accent-glow", algo.glow)
  }
}

function explorerReducer(state, action) {
  switch (action.type) {
    case "SET_PLAYING":
      return {
        ...state,
        isPlaying: action.payload,
      }
    case "SET_AUTO_PLAY":
      return {
        ...state,
        isAutoPlay: action.payload,
        isPlaying: action.payload, // Auto Play also starts/pauses play
      }
    case "SET_SHOW_COMPLETION":
      return {
        ...state,
        showCompletion: action.payload,
      }
    case "SET_SPEED":
      return {
        ...state,
        speed: action.payload,
      }
    case "SET_WORKFLOW_STEP":
      return {
        ...state,
        activeWorkflowStep: action.payload,
        showCompletion: false, // Hide completion if manually skipping steps
      }
    case "SET_COMPARE_ALGORITHM":
      return {
        ...state,
        compareAlgo: action.payload === state.selectedAlgo ? null : action.payload,
      }
    case "TRIGGER_ATTACK":
      return {
        ...state,
        activeAttack: action.payload === state.activeAttack ? null : action.payload,
      }
    case "ADD_LEDGER_ENTRY":
      return {
        ...state,
        ledger: [...state.ledger, action.payload],
      }
    case "CLEAR_LEDGER":
      return {
        ...state,
        ledger: [],
      }
    case "TOGGLE_AUTO_SCROLL":
      return {
        ...state,
        autoScroll: !state.autoScroll,
      }
    case "SET_ACTIVE_SECTION":
      return {
        ...state,
        activeSection: action.payload,
      }
    case "SELECT_ALGORITHM":
      updateAccentCSS(action.payload)
      return {
        ...state,
        selectedAlgo: action.payload,
        activeAttack: null, // Clear active attack when changing algorithms
        activeWorkflowStep: 0, // Reset to first step
        isPlaying: false, // Default paused
        isAutoPlay: false, // Default manual
        showCompletion: false,
      }
    case "INSPECT_MATRIX_CELL":
      return {
        ...state,
        matrixInspect: {
          chainA: action.payload.chainA,
          chainB: action.payload.chainB,
        },
      }
    case "TOGGLE_REDUCED_MOTION":
      return {
        ...state,
        reducedMotion: !state.reducedMotion,
      }
    case "TOGGLE_HIGH_CONTRAST":
      return {
        ...state,
        highContrast: !state.highContrast,
      }
    default:
      return state;
  }
}

export function ExplorerProvider({ children }) {
  const [state, dispatch] = useReducer(explorerReducer, initialState)

  // Initialize CSS variables on startup
  useEffect(() => {
    updateAccentCSS(state.selectedAlgo)

    // Detect browser prefers-reduced-motion setting
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mediaQuery.matches) {
      dispatch({ type: "TOGGLE_REDUCED_MOTION" })
    }

    const handler = (e) => {
      if (e.matches !== state.reducedMotion) {
        dispatch({ type: "TOGGLE_REDUCED_MOTION" })
      }
    }
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return (
    <ExplorerContext.Provider value={{ state, dispatch }}>
      {children}
    </ExplorerContext.Provider>
  )
}

export function useExplorer() {
  const context = useContext(ExplorerContext)
  if (!context) {
    throw new Error("useExplorer must be used within an ExplorerProvider")
  }
  return context
}
