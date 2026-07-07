import React, { useRef, useState, useEffect } from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData, CONSENSUS_FAMILIES } from "../../constants/consensusData"
import { Play, Pause, RotateCcw, ArrowRight, ArrowLeft, Terminal, Cpu, Sparkles, CheckCircle2, Award, Info, Shield, HelpCircle } from "lucide-react"

// Vector Canvas Draw Icons
const drawPickaxeIcon = (ctx, x, y) => {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - 9, y + 9)
  ctx.lineTo(x + 5, y - 5)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x + 3, y + 3, 11, -Math.PI / 2 - 0.4, 0.4)
  ctx.stroke()
}

const drawShieldIcon = (ctx, x, y) => {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y - 11)
  ctx.lineTo(x + 9, y - 7)
  ctx.lineTo(x + 9, y + 2)
  ctx.quadraticCurveTo(x + 9, y + 9, x, y + 13)
  ctx.quadraticCurveTo(x - 9, y + 9, x - 9, y + 2)
  ctx.lineTo(x - 9, y - 7)
  ctx.closePath()
  ctx.stroke()
}

const drawDatabaseIcon = (ctx, x, y) => {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)"
  ctx.lineWidth = 1.8
  for (let i = 0; i < 3; i++) {
    const cy = y - 7 + i * 7
    ctx.beginPath()
    ctx.ellipse(x, cy, 13, 3.5, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 13, cy)
    ctx.lineTo(x - 13, cy + 3.5)
    ctx.moveTo(x + 13, cy)
    ctx.lineTo(x + 13, cy + 3.5)
    ctx.stroke()
  }
}

const drawCrownIcon = (ctx, x, y) => {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - 10, y + 7)
  ctx.lineTo(x + 10, y + 7)
  ctx.lineTo(x + 8, y - 7)
  ctx.lineTo(x + 4, y + 1)
  ctx.lineTo(x, y - 8)
  ctx.lineTo(x - 4, y + 1)
  ctx.lineTo(x - 8, y - 7)
  ctx.closePath()
  ctx.stroke()
}

const drawClientIcon = (ctx, x, y) => {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.rect(x - 10, y - 8, 20, 13)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 5, y + 5)
  ctx.lineTo(x - 2, y + 8)
  ctx.lineTo(x + 2, y + 8)
  ctx.lineTo(x + 5, y + 5)
  ctx.stroke()
}

const drawClockIcon = (ctx, x, y) => {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, 10, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 7)
  ctx.moveTo(x, y)
  ctx.lineTo(x + 4, y + 1)
  ctx.stroke()
}

const drawVDFGear = (ctx, x, y, rotation) => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.strokeStyle = "rgba(245, 158, 11, 0.22)"
  ctx.lineWidth = 2.5

  ctx.beginPath()
  ctx.arc(0, 0, 52, 0, Math.PI * 2)
  ctx.stroke()

  const teethCount = 12
  for (let i = 0; i < teethCount; i++) {
    ctx.rotate((Math.PI * 2) / teethCount)
    ctx.beginPath()
    ctx.rect(-8, -60, 16, 12)
    ctx.stroke()
  }
  ctx.restore()
}

export default function SimulationEngine() {
  const { state, dispatch } = useExplorer()
  const { selectedAlgo, activeAttack, activeWorkflowStep, reducedMotion, isPlaying, speed, isAutoPlay, showCompletion } = state
  const algo = consensusData[selectedAlgo]
  const steps = algo.steps
  const activeStep = steps[activeWorkflowStep]

  // Interactive Inspector States
  const [selectedMinerId, setSelectedMinerId] = useState(null)
  const [inspectorStats, setInspectorStats] = useState(null)
  const [simStatus, setSimStatus] = useState("INITIALIZING")
  const [progress, setProgress] = useState(0)
  const [eduLogs, setEduLogs] = useState([])

  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const animRef = useRef(null)
  const simState = useRef({
    progress: 0,
    nodes: [],
    particles: [],
    frame: 0,
    blockHeight: 859320,
    waitFrames: 0,
    lastLoggedStep: -1,
  })

  // Watch for manual workflow step clicks
  useEffect(() => {
    const stepCount = steps.length
    const stepSize = 100 / stepCount
    const stepProg = activeWorkflowStep * stepSize
    simState.current.progress = stepProg
    simState.current.particles = []
    simState.current.waitFrames = 0
    updateSimulationPhase(stepProg)
  }, [activeWorkflowStep, selectedAlgo])

  // Reset simulation when selected algorithm changes
  useEffect(() => {
    handleReset()
  }, [selectedAlgo])

  // Monitor activeAttack triggers
  useEffect(() => {
    if (activeAttack) {
      simState.current.progress = 0
      simState.current.particles = []
      addEduLog("Attack Parameters Injected", `Beginning attack simulation sequence for: ${activeAttack.toUpperCase()}.`)
    } else {
      handleReset()
    }
  }, [activeAttack])

  // Periodic inspector stats bridge
  useEffect(() => {
    if (selectedMinerId) {
      const timer = setInterval(() => {
        const node = simState.current.nodes.find((n) => n.id === selectedMinerId)
        if (node) {
          setInspectorStats({ ...node })
        }
      }, 100)
      return () => clearInterval(timer)
    } else {
      setInspectorStats(null)
    }
  }, [selectedMinerId])

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
    setSelectedMinerId(null)

    simState.current.progress = 0
    simState.current.particles = []
    simState.current.frame = 0
    simState.current.lastLoggedStep = -1
    simState.current.waitFrames = 0

    setEduLogs([
      {
        step: "Initialization",
        time: new Date().toLocaleTimeString(),
        desc: `Loaded consensus simulation matrix for ${algo.name}. Rules loaded successfully.`,
      }
    ])
    initializeSimulationNodes()
  }

  const handlePrevStep = () => {
    dispatch({ type: "SET_PLAYING", payload: false })
    dispatch({ type: "SET_AUTO_PLAY", payload: false })
    const prevIdx = Math.max(0, activeWorkflowStep - 1)
    dispatch({ type: "SET_WORKFLOW_STEP", payload: prevIdx })

    const stepCount = steps.length
    const stepSize = 100 / stepCount
    simState.current.progress = prevIdx * stepSize
    simState.current.particles = []
    simState.current.waitFrames = 0
  }

  const handleNextStep = () => {
    dispatch({ type: "SET_AUTO_PLAY", payload: false })
    const nextIdx = Math.min(steps.length - 1, activeWorkflowStep + 1)

    const stepCount = steps.length
    const stepSize = 100 / stepCount
    simState.current.progress = nextIdx * stepSize
    simState.current.particles = []
    simState.current.waitFrames = 0

    dispatch({ type: "SET_WORKFLOW_STEP", payload: nextIdx })
    dispatch({ type: "SET_PLAYING", payload: true })
  }

  const handleSpeedChange = (s) => {
    dispatch({ type: "SET_SPEED", payload: s })
  }

  const addEduLog = (step, desc) => {
    const time = new Date().toLocaleTimeString()
    setEduLogs((prev) => [...prev, { step, time, desc }].slice(-6))
  }

  const addFinalLedgerEntry = () => {
    simState.current.blockHeight += 1
    addEduLog("Consensus Finalized", `Block #${simState.current.blockHeight} finalized and appended to the global blockchain explorer.`)

    const hex = "0123456789abcdef"
    const getRandomHex = (len) => {
      let res = ""
      for (let i = 0; i < len; i++) res += hex[Math.floor(Math.random() * 16)]
      return res
    }

    const activeAlgoName = algo.name
    const blockNum = simState.current.blockHeight
    const hash = `0x${selectedAlgo === "pos" ? "f68a" : selectedAlgo === "pbft" ? "a0b1" : "0000"}${getRandomHex(8)}...${getRandomHex(4)}`

    const winnerNode = simState.current.nodes.find(n => n.isWinner)
    const nodeLabel = winnerNode ? winnerNode.label : "VAL_01"

    dispatch({
      type: "ADD_LEDGER_ENTRY",
      payload: {
        timestamp: new Date().toLocaleTimeString(),
        consensusAlgorithm: activeAlgoName,
        hash,
        blockNumber: blockNum,
        validatorMiner: nodeLabel,
        confirmationStatus: "CONFIRMED",
        consensusTime: `${Math.floor(4200 / speed)}ms`,
        stateRoot: `0x${getRandomHex(6)}...${getRandomHex(4)}`,
        gasUsed: Math.floor(1300000 + Math.random() * 1700000),
        sizeBytes: Math.floor(42000 + Math.random() * 58000),
      }
    })
  }

  // Initialize node coordinate mapping dynamically based on 620px Canvas height
  const initializeSimulationNodes = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.width / (window.devicePixelRatio || 1)
    const h = canvas.height / (window.devicePixelRatio || 1)

    const cx = w / 2
    const cy = h / 2
    const radius = Math.min(w, h) * 0.38
    const nodes = []

    if (selectedAlgo === "pow") {
      const minerCount = 3
      for (let i = 0; i < minerCount; i++) {
        // Space out over h = 620px cleanly
        const my = 120 + i * 190
        nodes.push({
          id: `miner-${i + 1}`,
          x: w * 0.75,
          y: my,
          hashRate: i === 0 ? 84.6 : i === 1 ? 49.3 : 66.8,
          nonce: 200000,
          hashAttempts: 200000,
          currentHash: "000000000000...",
          status: "IDLE",
          isWinner: false,
          label: `MINER_0${i + 1}`,
        })
      }
      nodes.push({ id: "mempool", x: w * 0.25, y: cy, isMempool: true, label: "MEMPOOL" })
    }
    else if (selectedAlgo === "pos") {
      const valCount = 6
      const stakes = [32, 64, 96, 128, 48, 80]
      const totalStaked = stakes.reduce((a, b) => a + b, 0)
      for (let i = 0; i < valCount; i++) {
        const angle = (i / valCount) * Math.PI * 2
        nodes.push({
          id: `val-${i + 1}`,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          stake: stakes[i],
          selectionProb: Math.floor((stakes[i] / totalStaked) * 100),
          status: "IDLE",
          attestations: 15 + i * 5,
          rewards: 0.15 * i,
          isSlashed: false,
          isWinner: false,
          role: "STANDBY",
          label: `VAL_0${i + 1}`,
        })
      }
      nodes.push({ id: "stake-pool", x: cx, y: cy, isStakePool: true, label: "POOL" })
    }
    else if (selectedAlgo === "dpos") {
      const delegateCount = 5
      for (let i = 0; i < delegateCount; i++) {
        const angle = (i / delegateCount) * Math.PI * 2
        nodes.push({
          id: `delegate-${i + 1}`,
          x: cx + radius * 0.9 * Math.cos(angle),
          y: cy + radius * 0.9 * Math.sin(angle),
          votes: 18000 + i * 3600,
          round: 1,
          status: "STANDBY",
          rewards: 0.4 * i,
          isWinner: false,
          label: `DEL_0${i + 1}`,
        })
      }
      nodes.push({ id: "voter-1", x: w * 0.15, y: h * 0.25, isVoter: true, label: "VOTERS" })
      nodes.push({ id: "voter-2", x: w * 0.15, y: h * 0.75, isVoter: true, label: "VOTERS" })
    }
    else if (selectedAlgo === "poa") {
      const authCount = 4
      const corpNames = ["VeChain Lab", "DNV Group", "PwC Corp", "BMW Group"]
      for (let i = 0; i < authCount; i++) {
        const xPos = i < 2 ? w * 0.32 : w * 0.68
        const yPos = i % 2 === 0 ? h * 0.3 : h * 0.7
        nodes.push({
          id: `auth-${i + 1}`,
          x: xPos,
          y: yPos,
          identity: corpNames[i],
          status: "KYC_VERIFIED",
          signingStatus: "STANDBY",
          rotationIndex: i + 1,
          isWinner: false,
          isSlashed: false,
          label: `AUTH_0${i + 1}`,
        })
      }
    }
    else if (selectedAlgo === "pbft") {
      nodes.push({ id: "client", x: w * 0.15, y: cy, isClient: true, label: "CLIENT" })
      nodes.push({ id: "primary", x: cx, y: cy, isPrimary: true, status: "LEADER", prep: 0, commit: 0, isByzantine: false, label: "PRIMARY" })
      const replicaCount = 3
      for (let i = 0; i < replicaCount; i++) {
        const angle = -Math.PI / 4 + (i / replicaCount) * Math.PI * 1.2
        nodes.push({
          id: `replica-${i + 1}`,
          x: cx + radius * 0.9 * Math.cos(angle) + 40,
          y: cy + radius * 0.9 * Math.sin(angle),
          isReplica: true,
          status: "REPLICA",
          prep: 0,
          commit: 0,
          isByzantine: i === 1,
          label: `REP_0${i + 1}`,
        })
      }
    }
    else if (selectedAlgo === "poh") {
      nodes.push({ id: "poh-leader", x: cx - 40, y: cy, isPohLeader: true, hashCounter: 5000000, time: 0.0, label: "LEADER" })
      const valCount = 3
      for (let i = 0; i < valCount; i++) {
        const angle = (i / valCount) * Math.PI * 2
        nodes.push({
          id: `poh-val-${i + 1}`,
          x: cx + radius * Math.cos(angle) + 70,
          y: cy + radius * Math.sin(angle),
          isPohVal: true,
          status: "VERIFYING",
          label: `VAL_0${i + 1}`,
        })
      }
    }
    else if (selectedAlgo === "poet") {
      const valCount = 4
      for (let i = 0; i < valCount; i++) {
        const angle = (i / valCount) * Math.PI * 2
        nodes.push({
          id: `poet-val-${i + 1}`,
          x: cx + radius * 0.9 * Math.cos(angle),
          y: cy + radius * 0.9 * Math.sin(angle),
          teeTimer: 0,
          remaining: 0,
          status: "SLEEPING",
          label: `VAL_0${i + 1}`,
        })
      }
    }
    else if (selectedAlgo === "avalanche") {
      const nodeCount = 8
      for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * Math.PI * 2
        nodes.push({
          id: `av-node-${i + 1}`,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          preference: i < 4 ? "BLUE" : "PURPLE",
          confidence: 0,
          sample: 0,
          round: 1,
          label: `VAL_0${i + 1}`,
        })
      }
    }

    simState.current.nodes = nodes
  }

  // Central draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")

    const handleSimulationTick = () => {
      const stepCount = steps.length
      const stepSize = 100 / stepCount
      const startProg = activeWorkflowStep * stepSize
      const endProg = (activeWorkflowStep + 1) * stepSize

      const dpr = window.devicePixelRatio || 1
      const w = canvas.width / dpr
      const h = canvas.height / dpr

      if (!isPlaying || reducedMotion) {
        drawSimulation(ctx, w, h)
        animRef.current = requestAnimationFrame(handleSimulationTick)
        return
      }

      const stepIncrement = (100 / stepCount) * 0.007 * speed

      if (simState.current.progress < endProg) {
        simState.current.progress = Math.min(endProg, simState.current.progress + stepIncrement)
        setProgress(Math.floor(simState.current.progress))

        if (activeAttack) {
          setSimStatus(`ATTACK SIM: ${activeAttack.toUpperCase()}`)
        } else {
          updateSimulationPhase(simState.current.progress)
        }
      } else {
        if (isAutoPlay) {
          if (simState.current.waitFrames === 0) {
            simState.current.waitFrames = Math.floor(180 / speed)
            addEduLog("Step Complete", `Paused at Step ${activeWorkflowStep + 1} animation. Preparing to advance...`)
          }
          simState.current.waitFrames--
          if (simState.current.waitFrames <= 0) {
            simState.current.waitFrames = 0
            if (activeWorkflowStep === stepCount - 1) {
              dispatch({ type: "SET_SHOW_COMPLETION", payload: true })
              dispatch({ type: "SET_AUTO_PLAY", payload: false })
              dispatch({ type: "SET_PLAYING", payload: false })
              addFinalLedgerEntry()
            } else {
              simState.current.particles = []
              dispatch({ type: "SET_WORKFLOW_STEP", payload: activeWorkflowStep + 1 })
              dispatch({ type: "SET_PLAYING", payload: true })
            }
          }
        } else {
          dispatch({ type: "SET_PLAYING", payload: false })
          addEduLog("Simulation Paused", `Step ${activeWorkflowStep + 1} completed. Press Next Step to proceed.`)
          if (activeWorkflowStep === stepCount - 1) {
            dispatch({ type: "SET_SHOW_COMPLETION", payload: true })
            addFinalLedgerEntry()
          }
        }
      }

      drawSimulation(ctx, w, h)
      simState.current.frame++
      animRef.current = requestAnimationFrame(handleSimulationTick)
    }

    const rect = containerRef.current.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = 620 * dpr
    ctx.scale(dpr, dpr)

    initializeSimulationNodes()

    animRef.current = requestAnimationFrame(handleSimulationTick)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [selectedAlgo, activeAttack, isPlaying, speed, reducedMotion, isAutoPlay, activeWorkflowStep])

  // Evaluates which phase/step of the consensus is active based on progress percentages
  const updateSimulationPhase = (prog) => {
    const stepCount = steps.length
    const stepSize = 100 / stepCount
    let currentStepIdx = Math.floor(prog / stepSize)
    if (currentStepIdx > stepCount - 1) currentStepIdx = stepCount - 1

    const activeStep = steps[currentStepIdx]
    setSimStatus(activeStep.title.toUpperCase())

    // Step updates are handled explicitly by controls and timeline cards. No auto-dispatch here.

    if (simState.current.lastLoggedStep !== currentStepIdx) {
      simState.current.lastLoggedStep = currentStepIdx
      addEduLog(`Phase ${currentStepIdx + 1}`, activeStep.description)

      if (selectedAlgo === "pos") {
        if (currentStepIdx === 2) {
          const validators = simState.current.nodes.filter(n => !n.isStakePool)
          validators.forEach((v, idx) => {
            v.isWinner = idx === 2 // Winner is VAL_03
            v.status = idx === 2 ? "PROPOSER" : "COMMITTEE"
            v.role = idx === 2 ? "SLOT_LEADER" : "ATTESTER"
          })
        }
      }
    }
  }

  // Detect canvas clicks for protocol inspector selection
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clickedNode = simState.current.nodes.find((node) => {
      if (node.isMempool || node.isStakePool || node.isVoter) return false
      const dist = Math.hypot(node.x - x, node.y - y)
      // Radius of 38 pixels for larger classroom focus
      return dist <= 38
    })

    if (clickedNode) {
      setSelectedMinerId(clickedNode.id)
      addEduLog("Inspector Locked", `Console attached to node ${clickedNode.label} live telemetry stream.`)
    } else {
      setSelectedMinerId(null)
    }
  }

  // Draw operations on canvas based on active state
  const drawSimulation = (ctx, w, h) => {
    const { progress: currentProg, nodes, particles, frame } = simState.current

    if (activeAttack) {
      drawAttackSimulation(ctx, w, h, currentProg, frame, particles)
      return
    }

    ctx.clearRect(0, 0, w, h)

    // Cinematic grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)"
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < w; x += 55) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = 0; y < h; y += 55) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()

    if (selectedAlgo === "pow") {
      drawPoW(ctx, w, h, currentProg, frame, particles)
    }
    else if (selectedAlgo === "pos") {
      drawPoS(ctx, w, h, currentProg, frame, particles)
    }
    else if (selectedAlgo === "dpos") {
      drawDPoS(ctx, w, h, currentProg, frame, particles)
    }
    else if (selectedAlgo === "poa") {
      drawPoA(ctx, w, h, currentProg, frame, particles)
    }
    else if (selectedAlgo === "pbft") {
      drawPBFT(ctx, w, h, currentProg, frame, particles)
    }
    else if (selectedAlgo === "poh") {
      drawPoH(ctx, w, h, currentProg, frame, particles)
    }
    else if (selectedAlgo === "poet") {
      drawPoET(ctx, w, h, currentProg, frame, particles)
    }
    else if (selectedAlgo === "avalanche") {
      drawAvalanche(ctx, w, h, currentProg, frame, particles)
    }
  }

  // Draw PoW
  const drawPoW = (ctx, w, h, currentProg, frame, particles) => {
    const mempoolNode = simState.current.nodes.find(n => n.isMempool)
    const miners = simState.current.nodes.filter(n => !n.isMempool)

    // 1. Transaction Generation to Mempool
    if (currentProg < 10 && frame % 18 === 0 && isPlaying) {
      particles.push({ x: 30, y: h / 2, tx: mempoolNode.x, ty: mempoolNode.y, progress: 0, type: "tx", color: algo.color })
    }
    // 2. Gossip Broadcast
    if (currentProg >= 10 && currentProg < 20 && frame % 12 === 0 && isPlaying) {
      miners.forEach(miner => {
        particles.push({ x: mempoolNode.x, y: mempoolNode.y, tx: miner.x, ty: miner.y, progress: 0, type: "broadcast", color: algo.color })
      })
    }
    // 3. Mining Hashing Races with Hexadecimal Sparks
    if (currentProg >= 40 && currentProg < 50) {
      miners.forEach(miner => {
        miner.status = "HASHING"
        miner.nonce += Math.floor(Math.random() * 4500) * speed
        miner.hashAttempts = miner.nonce
        miner.currentHash = "0000" + Math.random().toString(16).substr(2, 12).toUpperCase()

        // Push floating mining sparks
        if (frame % 3 === 0 && isPlaying) {
          particles.push({
            x: miner.x + (Math.random() - 0.5) * 40,
            y: miner.y + (Math.random() - 0.5) * 40,
            tx: miner.x + (Math.random() - 0.5) * 90,
            ty: miner.y - 60 - Math.random() * 50,
            progress: 0,
            type: "mining-spark",
            text: Math.floor(Math.random() * 16).toString(16).toUpperCase() + Math.floor(Math.random() * 16).toString(16).toUpperCase(),
          })
        }
      })
    }
    // 4. Winner Solved Puzzle
    if (currentProg >= 50 && currentProg < 60) {
      miners.forEach((miner, idx) => {
        if (idx === 0) {
          miner.status = "SOLVED"
          miner.isWinner = true
          miner.currentHash = "000000000000000000078A9C"
        } else {
          miner.status = "IDLE"
          miner.isWinner = false
        }
      })
    }
    // 5. Broadcast block
    if (currentProg >= 60 && currentProg < 70 && frame % 15 === 0 && isPlaying) {
      const winner = miners.find(n => n.isWinner)
      if (winner) {
        miners.forEach(miner => {
          if (miner.id !== winner.id) {
            particles.push({ x: winner.x, y: winner.y, tx: miner.x, ty: miner.y, progress: 0, type: "block-prop", color: "#10b981" })
          }
        })
      }
    }

    updateParticles(ctx, particles)

    // Render Mempool stack
    if (mempoolNode) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)"
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"
      ctx.lineWidth = 2.0
      ctx.beginPath()
      ctx.arc(mempoolNode.x, mempoolNode.y, 38, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      drawDatabaseIcon(ctx, mempoolNode.x, mempoolNode.y)
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 10px Outfit"
      ctx.textAlign = "center"
      ctx.fillText(mempoolNode.label, mempoolNode.x, mempoolNode.y + 26)
    }

    // Render Miners
    miners.forEach((miner) => {
      const isSelected = selectedMinerId === miner.id
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)"

      // Orange glow for mining or solver
      if (miner.isWinner && currentProg >= 50) {
        ctx.shadowColor = "#f59e0b"
        ctx.shadowBlur = 25
      }
      ctx.strokeStyle = miner.isWinner && currentProg >= 50 ? "#f59e0b" : isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.15)"
      ctx.lineWidth = isSelected ? 3.5 : 2.0
      ctx.beginPath()
      ctx.arc(miner.x, miner.y, 36, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Reset shadows
      ctx.shadowBlur = 0

      // Render Miner Pickaxe
      drawPickaxeIcon(ctx, miner.x, miner.y - 6)

      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 9.5px Outfit"
      ctx.textAlign = "center"
      ctx.fillText(miner.label, miner.x, miner.y + 20)

      // State text below
      ctx.font = "bold 7px monospace"
      ctx.fillStyle = miner.status === "HASHING" ? "#f59e0b" : miner.status === "SOLVED" ? "#10b981" : "#64748b"
      ctx.fillText(miner.status, miner.x, miner.y + 29)

      if (miner.isWinner && currentProg >= 90) {
        ctx.fillStyle = "#10b981"
        ctx.font = "bold 11px monospace"
        ctx.fillText("+3.125 BTC", miner.x, miner.y - 48)
      }
    })
  }

  // Draw PoS
  const drawPoS = (ctx, w, h, currentProg, frame, particles) => {
    const poolNode = simState.current.nodes.find(n => n.isStakePool)
    const validators = simState.current.nodes.filter(n => !n.isStakePool)

    if (currentProg < 12.5 && frame % 22 === 0 && isPlaying) {
      validators.forEach(v => {
        particles.push({ x: v.x, y: v.y, tx: poolNode.x, ty: poolNode.y, progress: 0, type: "stake", color: "#8b5cf6" })
      })
    }
    // Validator lottery sweep dial
    if (currentProg >= 25 && currentProg < 37.5) {
      const rotatingAngle = (frame * 0.1) % (Math.PI * 2)
      ctx.strokeStyle = "rgba(139, 92, 246, 0.4)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(poolNode.x, poolNode.y)
      ctx.lineTo(poolNode.x + 130 * Math.cos(rotatingAngle), poolNode.y + 130 * Math.sin(rotatingAngle))
      ctx.stroke()
    }
    // Block Proposal
    if (currentProg >= 37.5 && currentProg < 50 && frame % 35 === 0 && isPlaying) {
      const proposer = validators.find(v => v.isWinner)
      if (proposer) {
        particles.push({ x: proposer.x, y: proposer.y, tx: poolNode.x, ty: poolNode.y, progress: 0, type: "proposed-block", color: "#8b5cf6" })
      }
    }
    // Attestations Voting
    if (currentProg >= 50 && currentProg < 62.5 && frame % 15 === 0 && isPlaying) {
      validators.forEach(v => {
        if (!v.isWinner) {
          particles.push({ x: v.x, y: v.y, tx: poolNode.x, ty: poolNode.y, progress: 0, type: "attestation", color: "#10b981" })
        }
      })
    }

    // Double-signing Slashing lightning bolt trigger
    if (activeAttack === "nothingAtStake" && currentProg >= 70) {
      const badVal = validators.find(n => n.id === "val-2")
      if (badVal) {
        badVal.isSlashed = true
        badVal.status = "SLASHED"
        badVal.role = "BANNED"
        badVal.stake = 16

        // Draw lightning bolt
        ctx.strokeStyle = "#f43f5e"
        ctx.lineWidth = 4.0
        ctx.shadowColor = "#f43f5e"
        ctx.shadowBlur = 20
        ctx.beginPath()
        ctx.moveTo(w / 2, 20)
        ctx.lineTo(w / 2 - 30, h * 0.25)
        ctx.lineTo(w / 2 + 15, h * 0.45)
        ctx.lineTo(badVal.x, badVal.y)
        ctx.stroke()
        ctx.shadowBlur = 0
      }
    }

    updateParticles(ctx, particles)

    if (poolNode) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)"
      ctx.strokeStyle = "rgba(139, 92, 246, 0.35)"
      ctx.lineWidth = 3.0
      ctx.beginPath()
      ctx.arc(poolNode.x, poolNode.y, 44, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      drawDatabaseIcon(ctx, poolNode.x, poolNode.y)
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 9.5px Outfit"
      ctx.textAlign = "center"
      ctx.fillText("STAKE POOL", poolNode.x, poolNode.y + 26)
    }

    validators.forEach((v) => {
      const isSelected = selectedMinerId === v.id
      ctx.fillStyle = v.isSlashed ? "rgba(244, 63, 94, 0.15)" : "rgba(15, 23, 42, 0.95)"

      if (v.isWinner && currentProg >= 37.5) {
        ctx.shadowColor = "#8b5cf6"
        ctx.shadowBlur = 20
      }
      ctx.strokeStyle = v.isSlashed ? "#f43f5e" : v.isWinner && currentProg >= 37.5 ? "#8b5cf6" : isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.15)"
      ctx.lineWidth = isSelected ? 3.5 : 2.0
      ctx.beginPath()
      ctx.arc(v.x, v.y, 34, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.shadowBlur = 0

      drawShieldIcon(ctx, v.x, v.y - 5)

      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 9.5px Outfit"
      ctx.textAlign = "center"
      ctx.fillText(v.label, v.x, v.y + 19)

      // State label
      ctx.font = "bold 7px monospace"
      ctx.fillStyle = v.isSlashed ? "#f43f5e" : v.isWinner ? "#8b5cf6" : "#64748b"
      ctx.fillText(v.isSlashed ? "SLASHED" : v.role, v.x, v.y + 27)

      if (v.isWinner && currentProg >= 85) {
        ctx.fillStyle = "#10b981"
        ctx.font = "bold 10px monospace"
        ctx.fillText("+0.05 ETH", v.x, v.y - 44)
      }
    })
  }

  // Draw DPoS
  const drawDPoS = (ctx, w, h, currentProg, frame, particles) => {
    const delegates = simState.current.nodes.filter(n => !n.isVoter)
    const voters = simState.current.nodes.filter(n => n.isVoter)
    const cx = w / 2
    const cy = h / 2

    if (currentProg < 20 && frame % 18 === 0 && isPlaying) {
      voters.forEach(v => {
        delegates.forEach(d => {
          particles.push({ x: v.x, y: v.y, tx: d.x, ty: d.y, progress: 0, type: "vote", color: "#8b5cf6" })
        })
      })
    }
    if (currentProg >= 40 && currentProg < 60 && frame % 30 === 0 && isPlaying) {
      const activeDel = delegates.find(d => d.isWinner)
      if (activeDel) {
        particles.push({ x: activeDel.x, y: activeDel.y, tx: cx, ty: cy, progress: 0, type: "dpos-block", color: "#8b5cf6" })
      }
    }

    updateParticles(ctx, particles)

    ctx.fillStyle = "rgba(15, 23, 42, 0.9)"
    ctx.strokeStyle = "rgba(139, 92, 246, 0.2)"
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(cx, cy, 38, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 9px Outfit"
    ctx.fillText("SCHEDULER", cx, cy + 3)

    delegates.forEach(d => {
      const isSelected = selectedMinerId === d.id
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)"
      ctx.strokeStyle = d.isWinner && currentProg >= 40 ? "#8b5cf6" : isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.15)"
      ctx.lineWidth = isSelected ? 3.5 : 2.0
      ctx.beginPath()
      ctx.arc(d.x, d.y, 34, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      drawCrownIcon(ctx, d.x, d.y - 5)

      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 9px Outfit"
      ctx.fillText(d.label, d.x, d.y + 19)

      ctx.font = "bold 6.5px monospace"
      ctx.fillStyle = d.isWinner ? "#8b5cf6" : "#64748b"
      ctx.fillText(d.isWinner ? "PRODUCING" : "STANDBY", d.x, d.y + 27)
    })

    voters.forEach(v => {
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)"
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
      ctx.beginPath()
      ctx.arc(v.x, v.y, 24, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = "#94a3b8"
      ctx.font = "bold 9px Outfit"
      ctx.fillText(v.label, v.x, v.y + 3)
    })
  }

  // Draw PoA
  const drawPoA = (ctx, w, h, currentProg, frame, particles) => {
    const authNodes = simState.current.nodes
    const cx = w / 2
    const cy = h / 2

    if (currentProg >= 20 && currentProg < 40 && frame % 25 === 0 && isPlaying) {
      authNodes.forEach(n => {
        particles.push({ x: cx, y: cy, tx: n.x, ty: n.y, progress: 0, type: "key-auth", color: "#10b981" })
      })
    }
    if (currentProg >= 40 && currentProg < 60 && frame % 25 === 0 && isPlaying) {
      const activeAuth = authNodes.find(n => n.isWinner)
      if (activeAuth) {
        particles.push({ x: activeAuth.x, y: activeAuth.y, tx: cx, ty: cy, progress: 0, type: "block-prop", color: "#10b981" })
      }
    }

    updateParticles(ctx, particles)

    ctx.fillStyle = "rgba(15, 23, 42, 0.95)"
    ctx.strokeStyle = "rgba(16, 185, 129, 0.25)"
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(cx, cy, 38, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 9px Outfit"
    ctx.fillText("CONSENSUS", cx, cy + 3)

    authNodes.forEach(n => {
      const isSelected = selectedMinerId === n.id
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)"
      ctx.strokeStyle = n.isWinner && currentProg >= 40 ? "#10b981" : isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.15)"
      ctx.lineWidth = isSelected ? 3.5 : 2.0
      ctx.beginPath()
      ctx.rect(n.x - 34, n.y - 34, 68, 68)
      ctx.fill()
      ctx.stroke()

      // Shield logo representing security ID checks
      drawShieldIcon(ctx, n.x, n.y - 6)

      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 9.5px Outfit"
      ctx.fillText(n.label, n.x, n.y + 19)

      ctx.font = "bold 7px monospace"
      ctx.fillStyle = "#10b981"
      ctx.fillText("KYC OK", n.x, n.y + 27)
    })
  }

  // Draw PBFT
  const drawPBFT = (ctx, w, h, currentProg, frame, particles) => {
    const client = simState.current.nodes.find(n => n.isClient)
    const primary = simState.current.nodes.find(n => n.isPrimary)
    const replicas = simState.current.nodes.filter(n => n.isReplica)

    if (currentProg < 20 && frame % 40 === 0 && isPlaying) {
      particles.push({ x: client.x, y: client.y, tx: primary.x, ty: primary.y, progress: 0, type: "client-req", color: "#06b6d4" })
    }
    if (currentProg >= 20 && currentProg < 40 && frame % 25 === 0 && isPlaying) {
      replicas.forEach(r => {
        particles.push({ x: primary.x, y: primary.y, tx: r.x, ty: r.y, progress: 0, type: "pre-prep", color: "#06b6d4" })
      })
    }
    // Prepare phase multicast bullets
    if (currentProg >= 40 && currentProg < 60 && frame % 22 === 0 && isPlaying) {
      replicas.forEach(sender => {
        replicas.forEach(receiver => {
          if (sender.id !== receiver.id) {
            particles.push({ x: sender.x, y: sender.y, tx: receiver.x, ty: receiver.y, progress: 0, type: "prepare", color: "#f59e0b" })
          }
        })
      })
    }
    // Commit phase multicast bullets
    if (currentProg >= 60 && currentProg < 80 && frame % 22 === 0 && isPlaying) {
      replicas.forEach(sender => {
        replicas.forEach(receiver => {
          if (sender.id !== receiver.id) {
            particles.push({ x: sender.x, y: sender.y, tx: receiver.x, ty: receiver.y, progress: 0, type: "commit", color: "#10b981" })
          }
        })
      })
    }

    updateParticles(ctx, particles)

    // Draw client
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)"
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"
    ctx.beginPath()
    ctx.arc(client.x, client.y, 34, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    drawClientIcon(ctx, client.x, client.y - 4)
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 9px Outfit"
    ctx.fillText(client.label, client.x, client.y + 20)

    // Leader
    const primarySelected = selectedMinerId === primary.id
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)"
    ctx.strokeStyle = primarySelected ? "#ffffff" : "rgba(6, 182, 212, 0.35)"
    ctx.lineWidth = primarySelected ? 3.5 : 2.0
    ctx.beginPath()
    ctx.arc(primary.x, primary.y, 36, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    drawCrownIcon(ctx, primary.x, primary.y - 5)
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 9.5px Outfit"
    ctx.fillText("PRIMARY", primary.x, primary.y + 20)

    // Replicas
    replicas.forEach(r => {
      const isSelected = selectedMinerId === r.id
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)"
      ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.15)"
      ctx.lineWidth = isSelected ? 3.5 : 2.0
      ctx.beginPath()
      ctx.arc(r.x, r.y, 34, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      drawShieldIcon(ctx, r.x, r.y - 5)
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 9.5px Outfit"
      ctx.fillText(r.label, r.x, r.y + 19)
    })
  }

  // Draw PoH
  const drawPoH = (ctx, w, h, currentProg, frame, particles) => {
    const leader = simState.current.nodes.find(n => n.isPohLeader)
    const validators = simState.current.nodes.filter(n => n.isPohVal)

    if (currentProg >= 0 && isPlaying) {
      leader.hashCounter += Math.floor(Math.random() * 4000) * speed
      leader.time = (frame * 0.3 * speed).toFixed(1)
    }
    if (currentProg >= 20 && currentProg < 40 && frame % 18 === 0 && isPlaying) {
      particles.push({ x: 30, y: h / 2, tx: leader.x, ty: leader.y, progress: 0, type: "tx", color: "#f59e0b" })
    }
    if (currentProg >= 60 && currentProg < 80 && frame % 12 === 0 && isPlaying) {
      validators.forEach(v => {
        particles.push({ x: leader.x, y: leader.y, tx: v.x, ty: v.y, progress: 0, type: "history-seq", color: "#10b981" })
      })
    }

    updateParticles(ctx, particles)

    // Render central spinning gear VDF clock
    const rotationSpeed = frame * 0.015 * speed
    drawVDFGear(ctx, leader.x, leader.y, rotationSpeed)

    const leaderSelected = selectedMinerId === leader.id
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)"
    ctx.strokeStyle = leaderSelected ? "#ffffff" : "rgba(245, 158, 11, 0.35)"
    ctx.lineWidth = leaderSelected ? 3.5 : 2.0
    ctx.beginPath()
    ctx.arc(leader.x, leader.y, 42, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    drawClockIcon(ctx, leader.x, leader.y - 7)
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 9.5px Outfit"
    ctx.fillText("VDF CLOCK", leader.x, leader.y + 19)

    validators.forEach(v => {
      const isSelected = selectedMinerId === v.id
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)"
      ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.15)"
      ctx.lineWidth = isSelected ? 3.5 : 2.0
      ctx.beginPath()
      ctx.arc(v.x, v.y, 34, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      drawShieldIcon(ctx, v.x, v.y - 5)
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 9.5px Outfit"
      ctx.fillText(v.label, v.x, v.y + 19)
    })
  }

  // Draw PoET
  const drawPoET = (ctx, w, h, currentProg, frame, particles) => {
    const validators = simState.current.nodes

    if (currentProg < 20) {
      validators.forEach((v, idx) => {
        v.status = "SLEEPING"
        if (v.teeTimer === 0) {
          v.teeTimer = 6 + idx * 8
          v.remaining = v.teeTimer
        }
      })
    }
    if (currentProg >= 20 && currentProg < 40 && isPlaying) {
      validators.forEach(v => {
        v.remaining = Math.max(0, v.teeTimer - (frame * 0.15 * speed))
      })
    }
    if (currentProg >= 40 && currentProg < 60) {
      validators.forEach((v, idx) => {
        if (idx === 0) {
          v.status = "ACTIVE"
          v.remaining = 0
        } else {
          v.status = "SLEEPING"
        }
      })
    }

    validators.forEach(v => {
      const isSelected = selectedMinerId === v.id
      ctx.fillStyle = v.status === "ACTIVE" ? "rgba(16, 185, 129, 0.1)" : "rgba(15, 23, 42, 0.9)"
      ctx.strokeStyle = v.status === "ACTIVE" ? "#10b981" : isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.15)"
      ctx.lineWidth = isSelected ? 3.5 : 2.0
      ctx.beginPath()
      ctx.arc(v.x, v.y, 34, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      drawClockIcon(ctx, v.x, v.y - 5)
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 9px Outfit"
      ctx.fillText(v.label, v.x, v.y + 19)

      ctx.fillStyle = v.status === "ACTIVE" ? "#10b981" : "#94a3b8"
      ctx.font = "bold 9px monospace"
      ctx.fillText(v.status === "ACTIVE" ? "WOKE" : `${v.remaining.toFixed(1)}s`, v.x, v.y - 42)
    })
  }

  // Draw Avalanche
  const drawAvalanche = (ctx, w, h, currentProg, frame, particles) => {
    const avNodes = simState.current.nodes

    if (currentProg >= 16 && currentProg < 32 && frame % 12 === 0 && isPlaying) {
      avNodes.forEach(node => {
        const n1 = avNodes[Math.floor(Math.random() * avNodes.length)]
        if (n1.id !== node.id) particles.push({ x: node.x, y: node.y, tx: n1.x, ty: n1.y, progress: 0, type: "query", color: node.preference === "BLUE" ? "#06b6d4" : "#8b5cf6" })
      })
    }
    if (currentProg >= 32 && currentProg < 64 && frame % 30 === 0 && isPlaying) {
      avNodes.forEach((n, idx) => {
        if (idx < 6) n.preference = "BLUE"
      })
    }
    if (currentProg >= 64 && currentProg < 80) {
      avNodes.forEach(n => {
        n.preference = "BLUE"
        n.confidence = 20
        n.round = Math.floor(frame * 0.1)
      })
    }

    updateParticles(ctx, particles)

    avNodes.forEach(n => {
      const isSelected = selectedMinerId === n.id
      ctx.fillStyle = n.preference === "BLUE" ? "rgba(6, 182, 212, 0.15)" : "rgba(139, 92, 246, 0.15)"
      ctx.strokeStyle = n.preference === "BLUE" ? "#06b6d4" : "#8b5cf6"
      ctx.lineWidth = isSelected ? 3.5 : 2.0
      ctx.beginPath()
      ctx.arc(n.x, n.y, 34, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      drawShieldIcon(ctx, n.x, n.y - 5)

      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 9px Outfit"
      ctx.fillText(n.label, n.x, n.y + 19)
    })
  }

  const updateParticles = (ctx, particles) => {
    particles.forEach((p, idx) => {
      p.progress += 0.055 * speed
      const px = p.x + (p.tx - p.x) * p.progress
      const py = p.y + (p.ty - p.y) * p.progress

      if (p.type === "mining-spark") {
        ctx.fillStyle = `rgba(245, 158, 11, ${1 - p.progress})`
        ctx.font = "bold 9.5px monospace"
        ctx.fillText(p.text, px, py)
      } else {
        ctx.fillStyle = p.color || "#10b981"
        ctx.beginPath()
        ctx.arc(px, py, 4.5, 0, Math.PI * 2)
        ctx.fill()
      }

      if (p.progress >= 1) particles.splice(idx, 1)
    })
  }

  const handleStartAutoReplay = () => {
    handleReset()
    dispatch({ type: "SET_AUTO_PLAY", payload: true })
  }

  const handleSelectOtherAlgo = () => {
    const sidebarElement = document.getElementById("main-sidebar-selection")
    if (sidebarElement) {
      sidebarElement.scrollIntoView({ behavior: "smooth" })
      sidebarElement.classList.add("ring-4", "ring-indigo-500/50")
      setTimeout(() => {
        sidebarElement.classList.remove("ring-4", "ring-indigo-500/50")
      }, 1500)
    }
  }

  return (
    <section
      ref={containerRef}
      className="glass-panel w-full flex flex-col gap-6 border border-brand-border/60 bg-slate-950/20 relative select-none"
      aria-labelledby="sim-engine-section-title"
    >
      {/* Celebration Modal Overlay */}
      {showCompletion && (
        <div className="absolute inset-0 bg-slate-950/98 z-50 rounded-2xl flex flex-col items-center justify-center p-8 text-center border border-indigo-500/40">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6">
            <Award className="w-10 h-10 text-emerald-450 animate-bounce" />
          </div>
          <h3 className="edu-heading-primary text-white tracking-tight">
            🎉 Consensus Successfully Achieved
          </h3>
          <p className="edu-body text-slate-350 max-w-xl mt-3">
            A new block has been signed and validated. Mining/staking rewards have been distributed, and transactions are permanently confirmed on the explorer ledger.
          </p>

          {/* Educational summary stats */}
          <div className="grid grid-cols-3 gap-6 w-full max-w-md border-y border-brand-border/30 py-4 my-6 text-center">
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Block Committed</span>
              <span className="text-white font-mono font-bold mt-1 text-sm">#{simState.current.blockHeight}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Consensus Time</span>
              <span className="text-indigo-400 font-mono font-bold mt-1 text-sm">{(4200 / speed).toFixed(0)} ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Confirmed Tx</span>
              <span className="text-emerald-450 font-mono font-bold mt-1 text-sm">2,500 Txs</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={handleReset}
              className="px-6 py-3.5 rounded-xl border border-brand-border bg-slate-900 text-white font-bold edu-button flex items-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              Restart Demonstration
            </button>
            <button
              onClick={handleStartAutoReplay}
              className="px-6 py-3.5 rounded-xl border border-transparent dynamic-accent-bg text-slate-950 font-bold edu-button flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Play className="w-5 h-5" />
              Replay Automatically
            </button>
            <button
              onClick={handleSelectOtherAlgo}
              className="px-6 py-3.5 rounded-xl border border-brand-border bg-slate-950 text-indigo-400 font-bold edu-button flex items-center gap-2 hover:text-white transition-colors cursor-pointer"
            >
              Choose Another Algorithm
            </button>
          </div>
        </div>
      )}

      {/* Title Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border/30 pb-3">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 dynamic-accent-text" />
          <h2 id="sim-engine-section-title" className="edu-heading-secondary text-white uppercase tracking-tight">
            Cinematic Simulation centerpiece
          </h2>
        </div>
        <span
          className="px-3.5 py-1.5 rounded-lg text-xs font-mono tracking-wider font-extrabold border bg-slate-950 uppercase"
          style={{ borderColor: algo.color, color: algo.color }}
        >
          {simStatus}
        </span>
      </div>

      {/* 620px Main Centerpiece Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">

        {/* Left Column: Cinematic Canvas (width xl:col-span-3, height 620px) */}
        <div className="xl:col-span-3 bg-slate-950/70 rounded-2xl border border-brand-border overflow-hidden relative flex flex-col h-[620px]">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-full block cursor-pointer"
            aria-label={`Interactive protocol simulation canvas drawing node interactions for ${algo.name}. Click node to inspect details.`}
          />

          {/* Floating Protocol Inspector Overlay HUD */}
          {selectedMinerId && inspectorStats && (
            <div className="absolute top-4 right-4 bg-slate-950/95 border-2 border-indigo-500/50 rounded-2xl p-5 w-72 shadow-[0_0_20px_rgba(99,102,241,0.25)] text-xs font-mono animate-fade-in z-20">
              <div className="flex justify-between items-center border-b border-indigo-500/30 pb-2 mb-3">
                <span className="text-white font-extrabold text-[12px] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  INSPECTOR HUD
                </span>
                <button
                  onClick={() => setSelectedMinerId(null)}
                  className="text-slate-500 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-2.5 text-slate-350 text-[10px]">
                <div className="flex justify-between">
                  <span>NODE LABEL:</span>
                  <span className="text-white font-bold">{inspectorStats.label}</span>
                </div>
                <div className="flex justify-between">
                  <span>STATE / STATUS:</span>
                  <span className="text-amber-450 uppercase">{inspectorStats.status || "IDLE"}</span>
                </div>

                {selectedAlgo === "pow" && (
                  <>
                    <div className="flex justify-between border-t border-brand-border/20 pt-2">
                      <span>HASHRATE:</span>
                      <span className="text-slate-200">{inspectorStats.hashRate} MH/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>NONCE:</span>
                      <span className="text-indigo-400 font-bold">{inspectorStats.nonce.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span> puzzles solved:</span>
                      <span className="text-slate-300">{inspectorStats.hashAttempts.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-brand-border/20 pt-2">
                      <span>CURRENT SEARCH HASH:</span>
                      <span className="text-emerald-400 font-mono text-[9px] break-all">{inspectorStats.currentHash}</span>
                    </div>
                  </>
                )}

                {selectedAlgo === "pos" && (
                  <>
                    <div className="flex justify-between border-t border-brand-border/20 pt-2">
                      <span>STAKED BALANCE:</span>
                      <span className="text-slate-200 font-bold">{inspectorStats.stake} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SELECTION WEIGHT:</span>
                      <span className="text-indigo-400 font-bold">{inspectorStats.selectionProb}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TOTAL ATTESTATIONS:</span>
                      <span className="text-slate-300">{inspectorStats.attestations} slots</span>
                    </div>
                    <div className="flex justify-between">
                      <span>REWARDS GAINED:</span>
                      <span className="text-emerald-450">+{inspectorStats.rewards.toFixed(2)} ETH</span>
                    </div>
                  </>
                )}

                {selectedAlgo === "dpos" && (
                  <>
                    <div className="flex justify-between border-t border-brand-border/20 pt-2">
                      <span>DELEGATION VOTES:</span>
                      <span className="text-indigo-455 font-bold">{inspectorStats.votes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BP SLOT REWARD:</span>
                      <span className="text-emerald-450">+{inspectorStats.rewards.toFixed(2)} EOS</span>
                    </div>
                  </>
                )}

                {selectedAlgo === "pbft" && (
                  <>
                    <div className="flex justify-between border-t border-brand-border/20 pt-2">
                      <span>BYZANTINE NODE?</span>
                      <span className={inspectorStats.isByzantine ? "text-rose-500 font-bold" : "text-emerald-450"}>
                        {inspectorStats.isByzantine ? "YES (FAULTY)" : "NO (HONEST)"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="absolute bottom-2 left-0 right-0 text-[10px] font-mono text-slate-500 text-center bg-slate-950/50 py-1">
            TIP: Click any participant node to inspect its internal memory live.
          </div>
        </div>

        {/* Right Column: Live Step Explanation Panel (width xl:col-span-2, height 620px) */}
        <div className="xl:col-span-2 p-6 rounded-2xl bg-slate-900/35 border border-brand-border/40 flex flex-col justify-between h-[620px]">

          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-brand-border/25 pb-2">
              <Info className="w-4 h-4 text-indigo-400" />
              Live Classroom Explanation
            </span>

            {/* Step name & description (26px & 20px readable sizes) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[26px] font-extrabold text-white tracking-tight uppercase leading-tight">
                {activeWorkflowStep + 1}. {activeStep.title}
              </span>
              <p className="text-xs text-slate-350 italic font-mono mt-0.5">
                Purpose: "{activeStep.purpose}"
              </p>
            </div>

            <div className="flex flex-col gap-4 mt-2 text-sm leading-relaxed text-slate-300 font-light max-h-[360px] overflow-y-auto pr-1">
              <div>
                <span className="block font-mono font-bold text-[9px] text-slate-500 uppercase">WHAT IS HAPPENING?</span>
                <p className="mt-0.5">{activeStep.description}</p>
              </div>

              <div>
                <span className="block font-mono font-bold text-[9px] text-slate-500 uppercase">WHY IS IT HAPPENING?</span>
                <p className="mt-0.5 text-xs text-slate-400 font-light">{activeStep.securityContribution}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-brand-border/10 pt-3 mt-1">
                <div>
                  <span className="block font-mono font-bold text-[9px] text-indigo-455 uppercase">WHO PARTICIPATES</span>
                  <p className="text-white font-semibold mt-0.5 text-xs">{activeStep.participants}</p>
                </div>
                <div>
                  <span className="block font-mono font-bold text-[9px] text-emerald-450 uppercase">SECURITY BENEFIT</span>
                  <p className="text-white font-semibold mt-0.5 text-xs">Integrity Protection</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-brand-border/10 pt-3">
                <div>
                  <span className="block font-mono font-bold text-[9px] text-slate-500 uppercase">INPUT STATE</span>
                  <p className="text-indigo-300 font-mono text-[9px] truncate mt-0.5" title={activeStep.inputs}>{activeStep.inputs}</p>
                </div>
                <div>
                  <span className="block font-mono font-bold text-[9px] text-slate-500 uppercase">OUTPUT STATE</span>
                  <p className="text-emerald-400 font-mono text-[9px] truncate mt-0.5" title={activeStep.outputs}>{activeStep.outputs}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Real-world block example aligned below */}
          <div className="p-4 rounded-xl bg-slate-950 border border-brand-border/50 text-xs">
            <span className="block font-mono font-bold text-[9px] text-indigo-400 uppercase tracking-wider mb-0.5">
              REAL-WORLD PROTOCOL MAPPING
            </span>
            <p className="text-slate-350 font-light italic leading-relaxed text-[11px]">
              "{activeStep.realWorldExample}"
            </p>
          </div>

        </div>

      </div>

      {/* Bottom Part: Step Controller Deck + Simulation logs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch border-t border-brand-border/20 pt-6">

        {/* Step controller deck (col-span-2) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
            STEP CONTROLLER TOOLBAR (MANUAL DEFAULT)
          </span>

          <div className="flex flex-col gap-4 p-4.5 rounded-2xl bg-slate-900/30 border border-brand-border/40">
            {/* Step progress meter */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>STEP PROGRESS</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-brand-border/20">
                <div
                  className="h-full rounded-full dynamic-accent-bg transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Controller Buttons Deck */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5">
                <button
                  disabled={activeWorkflowStep === 0}
                  onClick={handlePrevStep}
                  className="w-12 h-12 rounded-xl border border-brand-border bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="⏮ Previous Step"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handlePlayPause}
                  className="w-12 h-12 rounded-xl border border-brand-border bg-slate-950 flex items-center justify-center cursor-pointer transition-colors"
                  title={isPlaying ? "Pause Step" : "Play Step"}
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-amber-500" /> : <Play className="w-5 h-5 text-emerald-450" />}
                </button>
                <button
                  disabled={activeWorkflowStep === steps.length - 1}
                  onClick={handleNextStep}
                  className="w-12 h-12 rounded-xl border border-brand-border bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="▶ Next Step"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={handleReset}
                  className="w-12 h-12 rounded-xl border border-brand-border bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  title="↺ Restart"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>

              {/* Play Auto toggle */}
              <button
                onClick={handleAutoPlayToggle}
                className={`px-4 py-3 rounded-xl border font-bold text-xs cursor-pointer transition-all duration-200 ${isAutoPlay
                    ? "border-emerald-500 bg-emerald-950/20 text-emerald-450 shadow-[0_0_12px_rgba(16,185,129,0.15)] animate-pulse"
                    : "border-brand-border bg-slate-950 text-slate-450 hover:text-white"
                  }`}
              >
                {isAutoPlay ? "⏸ PAUSE AUTO" : "▶ PLAY AUTO"}
              </button>

              {/* Speed selectors */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-brand-border/40">
                {[1, 2, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors ${speed === s
                        ? "bg-indigo-500/10 border border-indigo-500/25 text-indigo-400"
                        : "text-slate-500 hover:text-slate-350 bg-transparent"
                      }`}
                  >
                    {s}X
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Simulation Log (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-slate-500" />
            CLASSROOM LESSON EVENTS LOG (PLAIN ENGLISH)
          </span>

          <div
            className="flex-grow bg-slate-950/80 rounded-2xl border border-brand-border/60 p-5 overflow-y-auto font-sans text-xs leading-relaxed flex flex-col gap-3.5 scrollbar-thin select-text h-[160px]"
          >
            {eduLogs.map((log, idx) => (
              <div key={idx} className="flex gap-3 border-b border-brand-border/10 pb-2.5 last:border-b-0 last:pb-0 animate-fade-in">
                <span className="text-slate-600 font-mono text-[10px] flex-shrink-0 mt-0.5">[{log.time}]</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-white font-bold text-[11px] uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-450" />
                    {log.step}
                  </span>
                  <span className="text-slate-350 font-light text-[11px]">
                    {log.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </section>
  )
}
