import React, { useRef, useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData, CONSENSUS_FAMILIES } from "../../constants/consensusData"
import { Play, Pause, RotateCcw, ArrowRight, ArrowLeft, Terminal, Cpu, Sparkles, CheckCircle2, Award, Info, Shield, Maximize2, Minimize2 } from "lucide-react"
import * as THREE from "three"

// Safe recursive 3D object disposal helper
const dispose3DObject = (obj, scene) => {
  if (!obj) return
  if (scene) scene.remove(obj)
  if (obj.isGroup || obj.type === "Group") {
    const kids = [...obj.children]
    kids.forEach(child => {
      dispose3DObject(child, scene)
    })
  } else {
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose())
      } else {
        obj.material.dispose()
      }
    }
  }
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [simStatus, setSimStatus] = useState("INITIALIZING")
  const [progress, setProgress] = useState(0)
  const [eduLogs, setEduLogs] = useState([])

  // Lock body scrolling when visualizer is in fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isFullscreen])

  // Three.js References
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  // Drag interaction states for user look-around
  const isDragging = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })
  const userRot = useRef({ x: 0, y: 0.5 }) // Polar angles: longitude, latitude
  const isUserInteracting = useRef(false)
  const interactionTimeout = useRef(null)

  // Simulation State Ref
  const simState = useRef({
    progress: 0,
    nodes: [],
    frame: 0,
    blockHeight: 859320,
    waitFrames: 0,
    lastLoggedStep: -1,
  })

  // Three.js instances ref
  const threeScene = useRef(null)
  const threeCamera = useRef(null)
  const threeRenderer = useRef(null)
  const threeNodes = useRef({}) // Map: nodeId -> { mesh, shell, type }
  const threeParticles = useRef([]) // Array of particle objects
  const blockchainGroup = useRef(null) // Group for finalized blocks
  const lightningMesh = useRef(null) // Lightning bolt line
  const rippleMesh = useRef(null) // Expanding finalized wave
  const rippleScale = useRef(1.0)
  const animatingBlock = useRef(null) // Sliding block data
  const cameraLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const activeTxPacket = useRef(null) // Transaction packet group

  // Local React state copies of nodes to render projected HTML label elements
  const [simNodes, setSimNodes] = useState([])
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [explanationExpanded, setExplanationExpanded] = useState(true)

  // Initialize node coordinate mapping dynamically in 3D
  const get3DNodeDefinitions = () => {
    const nodes = []
    
    if (selectedAlgo === "pow") {
      nodes.push({ id: "mempool", label: "MEMPOOL", type: "mempool", x: -4.0, y: 0.2, z: 0, status: "IDLE" })
      const hashRates = [84.6, 49.3, 66.8]
      for (let i = 0; i < 3; i++) {
        nodes.push({
          id: `miner-${i + 1}`,
          label: `MINER_0${i + 1}`,
          type: "miner",
          x: 3.5,
          y: 1.5 - i * 1.5,
          z: 1.8 - i * 1.8,
          hashRate: hashRates[i],
          nonce: 200000,
          hashAttempts: 200000,
          currentHash: "000000000000...",
          status: "IDLE",
          isWinner: false,
        })
      }
    } else if (selectedAlgo === "pos") {
      nodes.push({ id: "stake-pool", label: "POOL", type: "pool", x: 0, y: 0.5, z: 0, status: "ACTIVE" })
      const stakes = [32, 64, 96, 128, 48, 80]
      const totalStaked = stakes.reduce((a, b) => a + b, 0)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        nodes.push({
          id: `val-${i + 1}`,
          label: `VAL_0${i + 1}`,
          type: "validator",
          x: 3.5 * Math.cos(angle),
          y: 0.2,
          z: 3.5 * Math.sin(angle),
          stake: stakes[i],
          selectionProb: Math.floor((stakes[i] / totalStaked) * 100),
          status: "IDLE",
          attestations: 15 + i * 5,
          rewards: 0.15 * i,
          isSlashed: false,
          isWinner: false,
          role: "STANDBY",
        })
      }
    } else if (selectedAlgo === "dpos") {
      nodes.push({ id: "voter-1", label: "VOTERS", type: "voter", x: -4.5, y: 0.8, z: -1.5, status: "VOTING" })
      nodes.push({ id: "voter-2", label: "VOTERS", type: "voter", x: -4.5, y: 0.8, z: 1.5, status: "VOTING" })
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2
        nodes.push({
          id: `delegate-${i + 1}`,
          label: `DEL_0${i + 1}`,
          type: "delegate",
          x: 3.5 * Math.cos(angle) + 1.0,
          y: 0.2,
          z: 3.5 * Math.sin(angle),
          votes: 18000 + i * 3600,
          round: 1,
          status: "STANDBY",
          rewards: 0.4 * i,
          isWinner: false,
          role: "STANDBY",
        })
      }
    } else if (selectedAlgo === "poa") {
      nodes.push({ id: "consensus-center", label: "CONSENSUS", type: "pool", x: 0, y: 0.5, z: 0, status: "ACTIVE" })
      const corpNames = ["VeChain Lab", "DNV Group", "PwC Corp", "BMW Group"]
      for (let i = 0; i < 4; i++) {
        const xPos = i < 2 ? -3.2 : 3.2
        const zPos = i % 2 === 0 ? -1.8 : 1.8
        nodes.push({
          id: `auth-${i + 1}`,
          label: `AUTH_0${i + 1}`,
          type: "authority",
          x: xPos,
          y: 0.2,
          z: zPos,
          identity: corpNames[i],
          status: "KYC_OK",
          signingStatus: "STANDBY",
          isWinner: false,
          isSlashed: false,
        })
      }
    } else if (selectedAlgo === "pbft") {
      nodes.push({ id: "client", label: "CLIENT", type: "client", x: -4.5, y: 0, z: 0, status: "IDLE" })
      nodes.push({ id: "primary", label: "PRIMARY", type: "primary", x: -1.0, y: 0.2, z: 0, status: "LEADER", isWinner: false })
      for (let i = 0; i < 3; i++) {
        const angle = -Math.PI / 4 + (i / 3) * Math.PI * 1.2
        nodes.push({
          id: `replica-${i + 1}`,
          label: `REP_0${i + 1}`,
          type: "replica",
          x: 2.2 * Math.cos(angle) + 1.5,
          y: 0.2,
          z: 2.2 * Math.sin(angle),
          status: "REPLICA",
          isByzantine: i === 1,
          isWinner: false,
        })
      }
    } else if (selectedAlgo === "poh") {
      nodes.push({ id: "poh-leader", label: "LEADER", type: "poh-leader", x: -2.5, y: 0.2, z: 0, hashCounter: 5000000, time: 0.0, status: "TICKING" })
      for (let i = 0; i < 3; i++) {
        nodes.push({
          id: `poh-val-${i + 1}`,
          label: `VAL_0${i + 1}`,
          type: "validator",
          x: 2.5,
          y: 1.2 - i * 1.2,
          z: 1.5 - i * 1.5,
          status: "VERIFYING",
        })
      }
    } else if (selectedAlgo === "poet") {
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2
        nodes.push({
          id: `poet-val-${i + 1}`,
          label: `VAL_0${i + 1}`,
          type: "tee-validator",
          x: 3.2 * Math.cos(angle),
          y: 0.2,
          z: 3.2 * Math.sin(angle),
          teeTimer: 0,
          remaining: 0,
          status: "SLEEPING",
        })
      }
    } else if (selectedAlgo === "avalanche") {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        nodes.push({
          id: `av-node-${i + 1}`,
          label: `VAL_0${i + 1}`,
          type: "av-validator",
          x: 3.5 * Math.cos(angle),
          y: 0.2,
          z: 3.5 * Math.sin(angle),
          preference: i < 4 ? "BLUE" : "PURPLE",
          confidence: 0,
          sample: 0,
          round: 1,
        })
      }
    }
    return nodes
  }

  // Handle Play/Pause
  const handlePlayPause = () => {
    dispatch({ type: "SET_PLAYING", payload: !isPlaying })
    dispatch({ type: "SET_AUTO_PLAY", payload: false })
  }

  // Handle auto transitions
  const handleAutoPlayToggle = () => {
    dispatch({ type: "SET_AUTO_PLAY", payload: !isAutoPlay })
  }

  // Reset simulation and clear 3D components
  const handleReset = () => {
    dispatch({ type: "SET_PLAYING", payload: false })
    dispatch({ type: "SET_AUTO_PLAY", payload: false })
    dispatch({ type: "SET_SHOW_COMPLETION", payload: false })
    dispatch({ type: "SET_WORKFLOW_STEP", payload: 0 })
    setSelectedMinerId(null)

    simState.current.progress = 0
    simState.current.frame = 0
    simState.current.lastLoggedStep = -1
    simState.current.waitFrames = 0

    setEduLogs([
      {
        step: "Initialization",
        time: "T+0.0s",
        desc: `Loaded 3D consensus engine matrix for ${algo.name}. GPU buffers verified.`,
      }
    ])

    // Reset Three.js particles
    if (threeScene.current) {
      threeParticles.current.forEach(p => {
        threeScene.current.remove(p.mesh)
        p.mesh.geometry.dispose()
        p.mesh.material.dispose()
      })
      threeParticles.current = []

      if (lightningMesh.current) {
        threeScene.current.remove(lightningMesh.current)
        lightningMesh.current.geometry.dispose()
        lightningMesh.current.material.dispose()
        lightningMesh.current = null
      }

      if (rippleMesh.current) {
        threeScene.current.remove(rippleMesh.current)
        rippleMesh.current.geometry.dispose()
        rippleMesh.current.material.dispose()
        rippleMesh.current = null
      }

      if (animatingBlock.current) {
        threeScene.current.remove(animatingBlock.current.mesh)
        animatingBlock.current.mesh.geometry.dispose()
        animatingBlock.current.mesh.material.dispose()
        animatingBlock.current = null
      }
    }

    rebuild3DScene()
  }

  const handlePrevStep = () => {
    dispatch({ type: "SET_PLAYING", payload: false })
    dispatch({ type: "SET_AUTO_PLAY", payload: false })
    const prevIdx = Math.max(0, activeWorkflowStep - 1)
    dispatch({ type: "SET_WORKFLOW_STEP", payload: prevIdx })

    const stepCount = steps.length
    const stepSize = 100 / stepCount
    simState.current.progress = prevIdx * stepSize
    simState.current.waitFrames = 0
    clearTransient3DEffects()
  }

  const handleNextStep = () => {
    dispatch({ type: "SET_AUTO_PLAY", payload: false })
    const nextIdx = Math.min(steps.length - 1, activeWorkflowStep + 1)

    const stepCount = steps.length
    const stepSize = 100 / stepCount
    simState.current.progress = nextIdx * stepSize
    simState.current.waitFrames = 0
    clearTransient3DEffects()

    dispatch({ type: "SET_WORKFLOW_STEP", payload: nextIdx })
    dispatch({ type: "SET_PLAYING", payload: true })
  }

  const handleSpeedChange = (s) => {
    dispatch({ type: "SET_SPEED", payload: s })
  }

  const addEduLog = (step, desc) => {
    const tSec = (simState.current.progress * 0.12).toFixed(1)
    const logTime = `T+${tSec}s`
    setEduLogs((prev) => [...prev, { step, time: logTime, desc }].slice(-6))
  }

  const clearTransient3DEffects = () => {
    if (threeScene.current) {
      threeParticles.current.forEach(p => {
        threeScene.current.remove(p.mesh)
        p.mesh.geometry.dispose()
        p.mesh.material.dispose()
      })
      threeParticles.current = []

      if (lightningMesh.current) {
        threeScene.current.remove(lightningMesh.current)
        lightningMesh.current.geometry.dispose()
        lightningMesh.current.material.dispose()
        lightningMesh.current = null
      }

      if (activeTxPacket.current) {
        dispose3DObject(activeTxPacket.current, threeScene.current)
        activeTxPacket.current = null
      }

      simState.current.goldPulseFired = false
      simState.current.blockPulseFired = false
    }
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

  // Watch for manual workflow step clicks
  useEffect(() => {
    const stepCount = steps.length
    const stepSize = 100 / stepCount
    const stepProg = activeWorkflowStep * stepSize
    simState.current.progress = stepProg
    simState.current.waitFrames = 0
    clearTransient3DEffects()
    updateSimulationPhase(stepProg)
  }, [activeWorkflowStep, selectedAlgo])

  // Reset simulation when algorithm changes
  useEffect(() => {
    handleReset()
  }, [selectedAlgo])

  // Monitor activeAttack triggers
  useEffect(() => {
    if (activeAttack) {
      simState.current.progress = 0
      clearTransient3DEffects()
      addEduLog("Attack Parameters Injected", `Beginning attack simulation sequence for: ${activeAttack.toUpperCase()}.`)
    } else {
      handleReset()
    }
  }, [activeAttack])

  // Get active occlusion panel width in fullscreen overlay
  const getPanelOverlayWidth = () => {
    if (!explanationExpanded) return 0
    if (!isFullscreen) return 0
    return 384 // 360px panel width + 24px padding (right-6)
  }

  // Handle camera offset recalculation on overlay toggles
  useEffect(() => {
    if (threeRenderer.current && canvasRef.current) {
      const canvas = canvasRef.current
      const w = canvas.parentElement.clientWidth
      const h = canvas.parentElement.clientHeight
      
      threeRenderer.current.setSize(w, h)
      
      const panelWidth = getPanelOverlayWidth()
      const visibleWidth = w - panelWidth
      
      if (threeCamera.current) {
        threeCamera.current.aspect = w / h
        if (panelWidth > 0 && visibleWidth > 0) {
          threeCamera.current.setViewOffset(w, h, 0, 0, visibleWidth, h)
        } else {
          threeCamera.current.clearViewOffset()
        }
        threeCamera.current.updateProjectionMatrix()
      }
    }
  }, [explanationExpanded, isFullscreen])

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

  // Spawn a 3D glowing particle shooting along a bezier curve
  const spawn3DParticle = (startPos, endPos, colorHex, type) => {
    if (!threeScene.current) return

    let mesh
    if (type === "block-prop" || type === "proposed-block" || type === "dpos-block") {
      const blockGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22)
      const blockMat = new THREE.MeshStandardMaterial({
        color: colorHex || 0x3b7dd8,
        emissive: colorHex || 0x3b7dd8,
        emissiveIntensity: 0.5,
      })
      mesh = new THREE.Mesh(blockGeo, blockMat)
    } else {
      const particleGeo = new THREE.SphereGeometry(0.12, 8, 8)
      const particleMat = new THREE.MeshBasicMaterial({
        color: colorHex || 0x10b981,
        transparent: true,
        opacity: 0.9,
      })
      mesh = new THREE.Mesh(particleGeo, particleMat)
    }
    mesh.position.copy(startPos)
    threeScene.current.add(mesh)

    // Midpoint calculations for arched path
    const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5)
    midPoint.y += 1.8 // Elevate arc

    threeParticles.current.push({
      mesh,
      startPos: startPos.clone(),
      endPos: endPos.clone(),
      midPoint,
      progress: 0,
      speed: 0.03 * speed,
      type,
    })
  }

  // Spawn small hashing sparks
  const spawnHashingSpark = (position) => {
    if (!threeScene.current) return

    const sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06)
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.9,
    })
    const mesh = new THREE.Mesh(sparkGeo, sparkMat)
    mesh.position.copy(position)
    
    // Add random jitter
    mesh.position.x += (Math.random() - 0.5) * 0.4
    mesh.position.y += (Math.random() - 0.5) * 0.4
    mesh.position.z += (Math.random() - 0.5) * 0.4

    threeScene.current.add(mesh)

    threeParticles.current.push({
      mesh,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.03, 0.04 + Math.random() * 0.04, (Math.random() - 0.5) * 0.03),
      life: 1.0,
      decay: 0.02 * speed,
      type: "spark",
    })
  }

  // Re-creates node meshes in Three.js when algorithm changes
  const rebuild3DScene = () => {
    const scene = threeScene.current
    if (!scene) return

    // Clear old node meshes
    Object.values(threeNodes.current).forEach(obj => {
      if (obj.mesh) dispose3DObject(obj.mesh, scene)
      if (obj.shell) dispose3DObject(obj.shell, scene)
    })
    threeNodes.current = {}

    // Set new algorithm theme color
    const colorHex = parseInt(algo.color.replace("#", "0x"))

    // Generate node definitions
    const newNodes = get3DNodeDefinitions()
    simState.current.nodes = newNodes
    setSimNodes(newNodes)

    // Build 3D models for each node
    newNodes.forEach(node => {
      const nodePos = new THREE.Vector3(node.x, node.y, node.z)

      let meshGeo, meshMat, shellGeo, shellMat
      let mesh, shell = null

      if (node.type === "client") {
        // Desktop / Client Terminal Monitor Model
        const group = new THREE.Group()

        // Stand base
        const baseGeo = new THREE.BoxGeometry(0.5, 0.08, 0.4)
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
        const base = new THREE.Mesh(baseGeo, baseMat)
        base.position.y = -0.38
        group.add(base)

        // Monitor Neck
        const neckGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.24)
        const neck = new THREE.Mesh(neckGeo, baseMat)
        neck.position.y = -0.26
        group.add(neck)

        // Monitor Frame
        const monitorGeo = new THREE.BoxGeometry(0.9, 0.6, 0.08)
        const monitor = new THREE.Mesh(monitorGeo, baseMat)
        group.add(monitor)

        // Glowing Monitor Screen (Active client blue)
        const screenGeo = new THREE.BoxGeometry(0.82, 0.52, 0.02)
        const screenMat = new THREE.MeshStandardMaterial({
          color: 0x3b7dd8,
          emissive: 0x3b7dd8,
          emissiveIntensity: 0.45,
        })
        const screen = new THREE.Mesh(screenGeo, screenMat)
        screen.position.z = 0.04
        group.add(screen)

        mesh = group
        mesh.position.copy(nodePos)
        scene.add(mesh)

      } else if (node.type === "mempool") {
        // Stack of 3 cylinders representing database transactions
        const group = new THREE.Group()
        for (let i = 0; i < 3; i++) {
          const cyGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.16, 24)
          const cyMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.4,
            metalness: 0.8,
            emissive: 0xe8823c, // Amber
            emissiveIntensity: 0.15,
          })
          const cylinder = new THREE.Mesh(cyGeo, cyMat)
          cylinder.position.y = i * 0.22 - 0.22
          group.add(cylinder)
        }
        mesh = group
        mesh.position.copy(nodePos)
        scene.add(mesh)

        // Simple outer rotating ring
        shellGeo = new THREE.RingGeometry(0.75, 0.8, 32)
        shellMat = new THREE.MeshBasicMaterial({ color: 0xe8823c, side: THREE.DoubleSide, transparent: true, opacity: 0.2 })
        shell = new THREE.Mesh(shellGeo, shellMat)
        shell.rotation.x = Math.PI / 2
        shell.position.copy(nodePos)
        scene.add(shell)

      } else if (node.type === "pool") {
        // Floating Torus Knot representing dynamic staking/consortium pool
        meshGeo = new THREE.TorusKnotGeometry(0.48, 0.14, 64, 8)
        meshMat = new THREE.MeshStandardMaterial({
          color: 0x3b7dd8,
          roughness: 0.2,
          metalness: 0.9,
          emissive: 0x3b7dd8,
          emissiveIntensity: 0.2,
        })
        mesh = new THREE.Mesh(meshGeo, meshMat)
        mesh.position.copy(nodePos)
        scene.add(mesh)

      } else if (node.type === "poh-leader") {
        // Rotating Clock Cylinder with radial ticks
        const group = new THREE.Group()
        meshGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.25, 32)
        meshMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.3,
          metalness: 0.7,
          emissive: 0x3b7dd8,
          emissiveIntensity: 0.3,
        })
        const centerCyl = new THREE.Mesh(meshGeo, meshMat)
        centerCyl.rotation.x = Math.PI / 2
        group.add(centerCyl)

        // Radial ticks representing chronological time slots
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2
          const tickGeo = new THREE.BoxGeometry(0.08, 0.2, 0.08)
          const tickMat = new THREE.MeshBasicMaterial({ color: 0x3b7dd8 })
          const tick = new THREE.Mesh(tickGeo, tickMat)
          tick.position.set(0.68 * Math.cos(angle), 0.68 * Math.sin(angle), 0)
          tick.rotation.z = angle + Math.PI / 2
          group.add(tick)
        }

        mesh = group
        mesh.position.copy(nodePos)
        scene.add(mesh)

      } else if (node.type === "miner") {
        // Server Rack Cabinet Model
        const group = new THREE.Group()
        
        // 1. Main cabinet box (dark grey metallic)
        const cabinetGeo = new THREE.BoxGeometry(0.7, 1.1, 0.7)
        const cabinetMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.3,
          metalness: 0.8,
        })
        const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat)
        group.add(cabinet)

        // 2. Front door grid / blades (slightly darker inset panels)
        const rackSlots = []
        for (let i = 0; i < 3; i++) {
          const bladeGeo = new THREE.BoxGeometry(0.62, 0.22, 0.05)
          const bladeMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.5,
            metalness: 0.9,
          })
          const blade = new THREE.Mesh(bladeGeo, bladeMat)
          blade.position.set(0, 0.32 - i * 0.32, 0.33)
          group.add(blade)

          // Add 2 glowing blinking LED lights on each blade
          const leds = []
          for (let j = 0; j < 2; j++) {
            const ledGeo = new THREE.SphereGeometry(0.032, 8, 8)
            const ledMat = new THREE.MeshBasicMaterial({
              color: j === 0 ? 0x10b981 : 0xef4444, // green / red
              transparent: true,
              opacity: 0.9,
            })
            const led = new THREE.Mesh(ledGeo, ledMat)
            led.position.set(-0.18 + j * 0.12, 0.32 - i * 0.32, 0.36)
            group.add(led)
            leds.push(led)
          }
          rackSlots.push(leds)
        }

        mesh = group
        mesh.position.copy(nodePos)
        scene.add(mesh)
        mesh.userData = { nodeId: node.id, leds: rackSlots }

      } else {
        // Standard validator or generic participant node
        meshGeo = new THREE.SphereGeometry(0.5, 32, 32)
        meshMat = new THREE.MeshStandardMaterial({
          color: 0x3b7dd8, // Cool blue base
          roughness: 0.2,
          metalness: 0.8,
          emissive: 0x3b7dd8,
          emissiveIntensity: 0.15,
        })
        mesh = new THREE.Mesh(meshGeo, meshMat)
        mesh.position.copy(nodePos)
        scene.add(mesh)

        // Spinning wireframe orbit shell
        shellGeo = new THREE.TorusGeometry(0.72, 0.05, 8, 32)
        shellMat = new THREE.MeshBasicMaterial({
          color: 0x3b7dd8,
          wireframe: true,
          transparent: true,
          opacity: 0.35,
        })
        shell = new THREE.Mesh(shellGeo, shellMat)
        shell.rotation.x = Math.PI / 3
        shell.position.copy(nodePos)
        scene.add(shell)
      }

      // Keep reference for interactive clicks and layout renders
      mesh.userData = { ...mesh.userData, nodeId: node.id }
      threeNodes.current[node.id] = { mesh, shell, type: node.type }
    })

    // Setup ledger stacking chains (clean gold stacks)
    if (blockchainGroup.current) {
      while (blockchainGroup.current.children.length > 0) {
        const obj = blockchainGroup.current.children[0]
        blockchainGroup.current.remove(obj)
        obj.geometry?.dispose()
        obj.material?.dispose()
      }

      for (let i = 0; i < 3; i++) {
        const blockGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
        const blockMat = new THREE.MeshStandardMaterial({
          color: 0xd4a62e, // Gold block
          roughness: 0.3,
          metalness: 0.8,
          emissive: 0xd4a62e,
          emissiveIntensity: 0.15,
        })
        const block = new THREE.Mesh(blockGeo, blockMat)
        block.position.set(-1.8 + i * 1.2, -1.5, -3.2)
        blockchainGroup.current.add(block)

        if (i > 0) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-1.8 + (i - 1) * 1.2 + 0.25, -1.5, -3.2),
            new THREE.Vector3(-1.8 + i * 1.2 - 0.25, -1.5, -3.2)
          ])
          const lineMat = new THREE.LineBasicMaterial({ color: 0x475569 })
          const line = new THREE.Line(lineGeo, lineMat)
          blockchainGroup.current.add(line)
        }
      }
    }
  }

  // Handle mouse down for drag look-around
  const onCanvasMouseDown = (e) => {
    isDragging.current = false // reset dragging flag on mouse down
    prevMouse.current = { x: e.clientX, y: e.clientY }
    isUserInteracting.current = true
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current)
  }

  // Handle mouse move to update camera rotation
  const onCanvasMouseMove = (e) => {
    // If mouse is held down, we are dragging
    if (e.buttons !== 1) {
      isDragging.current = false
      return
    }
    isDragging.current = true

    const deltaX = e.clientX - prevMouse.current.x
    const deltaY = e.clientY - prevMouse.current.y

    userRot.current.x -= deltaX * 0.007
    userRot.current.y = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, userRot.current.y - deltaY * 0.007))

    prevMouse.current = { x: e.clientX, y: e.clientY }
  }

  // Handle mouse up to trigger transition timer
  const onCanvasMouseUp = () => {
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current)
    interactionTimeout.current = setTimeout(() => {
      isUserInteracting.current = false
    }, 3000)
    
    // Slight timeout to let click events complete before resetting drag flag
    setTimeout(() => {
      isDragging.current = false
    }, 50)
  }

  // WebGL and Mouse controls setup
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    if (!canvas.parentElement) return
    const width = canvas.parentElement.clientWidth
    const height = canvas.parentElement.clientHeight

    // 1. Scene & Lighting
    const scene = new THREE.Scene()
    scene.background = null // Translucent CSS overlay
    threeScene.current = scene

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45)
    scene.add(ambientLight)

    // Theme point light
    const pointLight = new THREE.PointLight(0xffffff, 1.8, 15)
    pointLight.position.set(0, 5, 2)
    scene.add(pointLight)

    // Subtler key directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85)
    dirLight.position.set(4, 10, 5)
    scene.add(dirLight)

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 5.5, 9.2)
    camera.lookAt(0, 0, 0)
    threeCamera.current = camera

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    threeRenderer.current = renderer

    // 4. Cyber floor grid helper
    const grid = new THREE.GridHelper(16, 16, 0x22304c, 0x161f30)
    grid.position.y = -1.6
    grid.material.opacity = 0.4
    grid.material.transparent = true
    scene.add(grid)

    // Blockchain ledger stack group
    const bgGroup = new THREE.Group()
    scene.add(bgGroup)
    blockchainGroup.current = bgGroup

    // Initialize meshes
    rebuild3DScene()

    // 5. Handles layout resize updates
    const handleResize = () => {
      if (!canvas.parentElement) return
      const w = canvas.parentElement.clientWidth
      const h = canvas.parentElement.clientHeight
      
      renderer.setSize(w, h)
      
      const panelWidth = getPanelOverlayWidth()
      const visibleWidth = w - panelWidth
      
      camera.aspect = w / h
      if (panelWidth > 0 && visibleWidth > 0) {
        camera.setViewOffset(w, h, 0, 0, visibleWidth, h)
      } else {
        camera.clearViewOffset()
      }
      camera.updateProjectionMatrix()
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(canvas.parentElement)

    // 6. Raycaster clicking
    const raycaster = new THREE.Raycaster()
    const mouse2D = new THREE.Vector2()

    const onCanvasClick = (e) => {
      // Ignore click if dragging occurred
      if (isDragging.current) return

      const cRect = canvas.getBoundingClientRect()
      const mx = e.clientX - cRect.left
      const my = e.clientY - cRect.top

      mouse2D.x = (mx / cRect.width) * 2 - 1
      mouse2D.y = -(my / cRect.height) * 2 + 1

      raycaster.setFromCamera(mouse2D, camera)
      const childrenToIntersect = []
      Object.values(threeNodes.current).forEach(n => {
        if (n.mesh) {
          // Add main mesh children recursively
          if (n.mesh.isGroup) {
            n.mesh.children.forEach(c => childrenToIntersect.push(c))
          } else {
            childrenToIntersect.push(n.mesh)
          }
        }
      })

      const intersects = raycaster.intersectObjects(childrenToIntersect)
      if (intersects.length > 0) {
        // Find ancestor with nodeId
        let clickedObj = intersects[0].object
        while (clickedObj && !clickedObj.userData.nodeId && clickedObj.parent) {
          clickedObj = clickedObj.parent
        }

        const nodeId = clickedObj.userData.nodeId
        if (nodeId && nodeId !== "mempool" && nodeId !== "stake-pool" && !nodeId.startsWith("voter") && nodeId !== "alice") {
          setSelectedMinerId(nodeId)
          addEduLog("Inspector Locked", `Console attached to node ${nodeId.toUpperCase()} live telemetry stream.`)
        } else {
          setSelectedMinerId(null)
        }
      } else {
        setSelectedMinerId(null)
      }
    }
    canvas.addEventListener("click", onCanvasClick)

    // Animation Tick
    const renderLoop = () => {
      simState.current.frame++
      const frame = simState.current.frame

      // Sync color dynamic shifts
      const curColorHex = parseInt(algo.color.replace("#", "0x"))
      pointLight.color.setHex(curColorHex)

      // Step intervals calculations
      const stepCount = steps.length
      const stepSize = 100 / stepCount
      const startProg = activeWorkflowStep * stepSize
      const endProg = (activeWorkflowStep + 1) * stepSize

      if (isPlaying && !reducedMotion) {
        const progIncr = (100 / stepCount) * 0.0075 * speed
        if (simState.current.progress < endProg) {
          simState.current.progress = Math.min(endProg, simState.current.progress + progIncr)
          setProgress(Math.floor(simState.current.progress))
          updateSimulationPhase(simState.current.progress)
        } else {
          if (isAutoPlay) {
            if (simState.current.waitFrames === 0) {
              simState.current.waitFrames = Math.floor(180 / speed)
              addEduLog("Step Complete", `Step ${activeWorkflowStep + 1} finished. Advancing shortly...`)
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
      }

      // Execute Algorithm Animations and Particle Spawns
      runConsensusStepAnimations(frame, simState.current.progress, scene, curColorHex)

      // Update flying particles
      for (let i = threeParticles.current.length - 1; i >= 0; i--) {
        const p = threeParticles.current[i]
        
        if (p.type === "spark") {
          p.mesh.position.add(p.velocity)
          p.life -= p.decay
          p.mesh.material.opacity = p.life
          if (p.life <= 0) {
            scene.remove(p.mesh)
            p.mesh.geometry.dispose()
            p.mesh.material.dispose()
            threeParticles.current.splice(i, 1)
          }
        } else if (p.type === "sig-pulse" || p.type === "trail") {
          p.life -= p.decay
          if (p.type === "sig-pulse") p.mesh.scale.addScalar(0.08 * speed)
          p.mesh.material.opacity = Math.max(0, p.life)
          if (p.life <= 0) {
            scene.remove(p.mesh)
            p.mesh.geometry.dispose()
            p.mesh.material.dispose()
            threeParticles.current.splice(i, 1)
          }
        } else {
          p.progress += p.speed
          
          // Bezier curve height path
          const t = p.progress
          const currentPos = new THREE.Vector3()
          currentPos.x = (1 - t) * (1 - t) * p.startPos.x + 2 * (1 - t) * t * p.midPoint.x + t * t * p.endPos.x
          currentPos.y = (1 - t) * (1 - t) * p.startPos.y + 2 * (1 - t) * t * p.midPoint.y + t * t * p.endPos.y
          currentPos.z = (1 - t) * (1 - t) * p.startPos.z + 2 * (1 - t) * t * p.midPoint.z + t * t * p.endPos.z
          
          p.mesh.position.copy(currentPos)

          if (p.progress >= 1) {
            scene.remove(p.mesh)
            p.mesh.geometry.dispose()
            p.mesh.material.dispose()
            threeParticles.current.splice(i, 1)
          }
        }
      }

      // Animate node rotations, glows, server rack blinking LEDs, and node statuses
      simState.current.nodes.forEach(node => {
        const obj = threeNodes.current[node.id]
        if (!obj) return

        // Spin outer shells
        if (obj.shell) {
          obj.shell.rotation.z += 0.006 * speed
          obj.shell.rotation.y += 0.003 * speed
        }

        // Rotate VDF Clock gears
        if (obj.type === "poh-leader") {
          obj.mesh.rotation.z += 0.015 * speed
        }

        // Spin pool models
        if (obj.type === "pool") {
          obj.mesh.rotation.y += 0.008 * speed
          obj.mesh.rotation.x += 0.004 * speed
        }

        // Blinking Server Rack LEDs
        if (obj.type === "miner" && obj.mesh.userData.leds) {
          const isHashing = node.status === "HASHING" || node.status === "MINING"
          obj.mesh.userData.leds.forEach((bladeLeds, bIdx) => {
            bladeLeds.forEach((led, lIdx) => {
              if (isHashing) {
                // Fast blink during mining
                led.material.opacity = Math.sin(frame * 0.25 + bIdx * 3 + lIdx * 7) > 0 ? 0.95 : 0.15
              } else {
                // Slow breathing pulse when idle
                led.material.opacity = Math.sin(frame * 0.05 + bIdx) > 0.4 ? 0.95 : 0.25
              }
            })
          })
        }

        // Dynamic State Color Shifting
        if (obj.type === "miner") {
          const cabinet = obj.mesh.children[0]
          const isWinner = node.isWinner
          const isHashing = node.status === "HASHING" || node.status === "MINING"

          if (isWinner) {
            // Gold Winner glow
            cabinet.material.color.setHex(0xffc94a)
            cabinet.material.emissive.setHex(0xffc94a)
            cabinet.material.emissiveIntensity = 0.7 + 0.3 * Math.sin(frame * 0.1 * speed)
            const s = 1.15 + 0.08 * Math.sin(frame * 0.12 * speed)
            obj.mesh.scale.set(s, s, s)
          } else if (isHashing) {
            // Pulsing active hashing blue glow
            cabinet.material.color.setHex(0x3b7dd8)
            cabinet.material.emissive.setHex(0x5b9bff)
            cabinet.material.emissiveIntensity = 0.3 + 0.2 * Math.sin(frame * 0.15 * speed)
            obj.mesh.scale.set(1.0, 1.0, 1.0)
          } else {
            // Standby desaturated blue dim (Dimmer if another node won)
            const hasWinnerInScene = simState.current.nodes.some(n => n.isWinner)
            const dimColor = hasWinnerInScene ? 0x2a4a78 : 0x3b7dd8
            cabinet.material.color.setHex(dimColor)
            cabinet.material.emissive.setHex(dimColor)
            cabinet.material.emissiveIntensity = hasWinnerInScene ? 0.05 : 0.15
            obj.mesh.scale.set(1.0, 1.0, 1.0)
          }
        } else if (obj.type === "client") {
          // Client terminal glow
          const screen = obj.mesh.children[3]
          if (screen) {
            const isActive = node.status === "ACTIVE"
            screen.material.emissiveIntensity = isActive ? 0.8 + 0.25 * Math.sin(frame * 0.1) : 0.45
          }
        } else if (obj.type !== "mempool") {
          // Standard consensus node glow transitions
          const isWinner = node.isWinner
          if (isWinner) {
            obj.mesh.material.color.setHex(0xffc94a)
            obj.mesh.material.emissive.setHex(0xffc94a)
            obj.mesh.material.emissiveIntensity = 0.8
            if (obj.shell) obj.shell.material.color.setHex(0xffc94a)
          } else if (node.status === "ACTIVE" || node.status === "VERIFYING" || node.status === "VOTING") {
            obj.mesh.material.color.setHex(0x3b7dd8)
            obj.mesh.material.emissive.setHex(0x5b9bff)
            obj.mesh.material.emissiveIntensity = 0.3
            if (obj.shell) obj.shell.material.color.setHex(0x5b9bff)
          } else {
            const hasWinnerInScene = simState.current.nodes.some(n => n.isWinner)
            const dimColor = hasWinnerInScene ? 0x2a4a78 : 0x3b7dd8
            obj.mesh.material.color.setHex(dimColor)
            obj.mesh.material.emissive.setHex(dimColor)
            obj.mesh.material.emissiveIntensity = 0.1
            if (obj.shell) obj.shell.material.color.setHex(dimColor)
          }
        }
      })

      // Expanding finalized wave ripple
      if (showCompletion) {
        if (!rippleMesh.current) {
          const ripGeo = new THREE.SphereGeometry(1, 32, 16)
          const ripMat = new THREE.MeshBasicMaterial({
            color: curColorHex,
            wireframe: true,
            transparent: true,
            opacity: 0.65,
          })
          rippleMesh.current = new THREE.Mesh(ripGeo, ripMat)
          const wNode = simState.current.nodes.find(n => n.isWinner) || simState.current.nodes[0]
          rippleMesh.current.position.set(wNode.x, wNode.y, wNode.z)
          scene.add(rippleMesh.current)
          rippleScale.current = 0.8
        }

        rippleScale.current += 0.12 * speed
        rippleMesh.current.scale.set(rippleScale.current, rippleScale.current, rippleScale.current)
        rippleMesh.current.material.opacity = Math.max(0, 0.65 - rippleScale.current * 0.08)

        if (rippleMesh.current.material.opacity <= 0) {
          scene.remove(rippleMesh.current)
          rippleMesh.current.geometry.dispose()
          rippleMesh.current.material.dispose()
          rippleMesh.current = null
        }
      }

      // Slider block committing animation to bottom ledger chain
      if (showCompletion && !animatingBlock.current) {
        const blockGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
        const blockMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 0.8,
        })
        const winNode = simState.current.nodes.find(n => n.isWinner) || simState.current.nodes[0]
        const blockMesh = new THREE.Mesh(blockGeo, blockMat)
        blockMesh.position.set(winNode.x, winNode.y, winNode.z)
        scene.add(blockMesh)

        animatingBlock.current = {
          mesh: blockMesh,
          start: new THREE.Vector3(winNode.x, winNode.y, winNode.z),
          end: new THREE.Vector3(1.8, -1.5, -3.2),
          prog: 0,
        }
      }

      if (animatingBlock.current) {
        const ab = animatingBlock.current
        ab.prog += 0.02 * speed
        ab.mesh.position.lerpVectors(ab.start, ab.end, ab.prog)
        ab.mesh.rotation.y += 0.05
        ab.mesh.rotation.x += 0.05

        if (ab.prog >= 1) {
          ab.mesh.position.copy(ab.end)
          ab.mesh.rotation.set(0, 0, 0)
          ab.mesh.material.color.setHex(0x1e293b)
          ab.mesh.material.emissive.setHex(curColorHex)
          ab.mesh.material.emissiveIntensity = 0.15
          blockchainGroup.current.add(ab.mesh)

          // Connective link
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0.6 + 0.25, -1.5, -3.2),
            new THREE.Vector3(1.8 - 0.25, -1.5, -3.2)
          ])
          const lineMat = new THREE.LineBasicMaterial({ color: 0x475569 })
          const line = new THREE.Line(lineGeo, lineMat)
          blockchainGroup.current.add(line)

          animatingBlock.current = null
        }
      }

      // Project 3D nodes coordinates to 2D HTML labels
      const containerWidth = canvas.clientWidth
      const containerHeight = canvas.clientHeight
      simState.current.nodes.forEach(node => {
        const obj = threeNodes.current[node.id]
        if (!obj) return
        const labelEl = document.getElementById(`node-label-${node.id}`)
        if (labelEl) {
          const tempV = new THREE.Vector3().copy(obj.mesh.position)
          tempV.project(camera)
          const screenX = (tempV.x * 0.5 + 0.5) * containerWidth
          const screenY = (tempV.y * -0.5 + 0.5) * containerHeight

          const isVisible = tempV.z <= 1.0 && screenX >= 0 && screenX <= containerWidth && screenY >= 0 && screenY <= containerHeight
          if (isVisible) {
            labelEl.style.display = "flex"
            // Render label slightly below the node spheres
            labelEl.style.transform = `translate3d(${screenX}px, ${screenY + 36}px, 0)`
          } else {
            labelEl.style.display = "none"
          }
        }
      })

      // Cinematic Camera Choreography & Smoothing
      let targetCameraPos = new THREE.Vector3(0, 5.5, 9.2)
      let targetLookAt = new THREE.Vector3(0, 0, 0)

      if (isUserInteracting.current) {
        // Drag override
        const orbitRadius = 9.2
        camera.position.x = orbitRadius * Math.cos(userRot.current.x) * Math.cos(userRot.current.y)
        camera.position.y = Math.max(0.6, orbitRadius * Math.sin(userRot.current.y))
        camera.position.z = orbitRadius * Math.sin(userRot.current.x) * Math.cos(userRot.current.y)
        camera.lookAt(0, 0, 0)
        cameraLookAt.current.set(0, 0, 0)
      } else {
        const winner = simState.current.nodes.find(n => n.isWinner)
        const mempool = simState.current.nodes.find(n => n.type === "mempool" || n.type === "client" || n.type === "voter")

        if (showCompletion) {
          targetCameraPos.set(0, 7.8, 8.2)
          targetLookAt.set(0, -0.6, 0)
        } else if (activeAttack === "nothingAtStake" && simState.current.progress >= 70) {
          const badVal = simState.current.nodes.find(n => n.id === "val-2")
          if (badVal) {
            targetCameraPos.set(badVal.x - 1.8, badVal.y + 1.2, badVal.z + 2.2)
            targetLookAt.set(badVal.x, badVal.y, badVal.z)
          }
        } else {
          const step = steps[activeWorkflowStep]
          const animState = step ? step.animationState : ""

          if (animState === "TX_CREATE" || animState === "REQUEST" || animState === "VOTE" || animState === "LOCK_STAKE") {
            if (mempool) {
              targetCameraPos.set(mempool.x - 2.2, mempool.y + 1.6, mempool.z + 2.8)
              targetLookAt.set(mempool.x, mempool.y, mempool.z)
            }
          } else if (animState === "HASH_RACE" || animState === "TICK_LOOP" || animState === "ITERATE" || animState === "SAMPLE") {
            // Smooth slow orbit around center cyber grid
            const angle = frame * 0.0035 * speed
            targetCameraPos.set(8.5 * Math.cos(angle), 4.8, 8.5 * Math.sin(angle))
            targetLookAt.set(0, 0, 0)
          } else if (winner && (animState === "HASH_SUCCESS" || animState === "PROPOSE_BLOCK" || animState === "MINT_REWARD" || animState === "PROPOSE" || animState === "SELECT_LEADER")) {
            targetCameraPos.set(winner.x - 2.0, winner.y + 1.4, winner.z + 2.5)
            targetLookAt.set(winner.x, winner.y, winner.z)
          } else {
            targetCameraPos.set(0, 5.5, 9.2)
            targetLookAt.set(0, 0, 0)
          }
        }

        // Smooth camera transitions using cubic easing interpolation (0.04 lerping)
        camera.position.lerp(targetCameraPos, 0.045 * speed)
        cameraLookAt.current.lerp(targetLookAt, 0.045 * speed)
        camera.lookAt(cameraLookAt.current)
      }

      renderer.render(scene, camera)
      animRef.current = requestAnimationFrame(renderLoop)
    }

    animRef.current = requestAnimationFrame(renderLoop)

    return () => {
      resizeObserver.disconnect()
      if (animRef.current) cancelAnimationFrame(animRef.current)
      canvas.removeEventListener("click", onCanvasClick)

      // Thorough WebGL graphics memory cleanup to prevent resource leaks
      threeParticles.current.forEach(p => {
        dispose3DObject(p.mesh, scene)
      })
      threeParticles.current = []

      Object.values(threeNodes.current).forEach(obj => {
        if (obj.mesh) dispose3DObject(obj.mesh, scene)
        if (obj.shell) dispose3DObject(obj.shell, scene)
      })
      threeNodes.current = {}

      if (lightningMesh.current) {
        dispose3DObject(lightningMesh.current, scene)
        lightningMesh.current = null
      }

      if (rippleMesh.current) {
        dispose3DObject(rippleMesh.current, scene)
        rippleMesh.current = null
      }

      if (animatingBlock.current) {
        dispose3DObject(animatingBlock.current.mesh, scene)
        animatingBlock.current = null
      }

      renderer.dispose()
    }
  }, [selectedAlgo, activeAttack, isPlaying, speed, reducedMotion, isAutoPlay, activeWorkflowStep, isFullscreen])

  // Centralized physics steps and mesh communications mapping
  const runConsensusStepAnimations = (frame, currentProg, scene, colorHex) => {
    const nodes = simState.current.nodes
    if (nodes.length === 0) return

    // 1. Nakamoto PoW Hashing
    if (selectedAlgo === "pow") {
      const miners = nodes.filter(n => n.type === "miner")
      const alice = nodes.find(n => n.id === "alice") || { x: -4.8, y: 1.0, z: -1.2 }
      const mempool = nodes.find(n => n.id === "mempool") || { x: -1.8, y: 0.2, z: 0 }

      if (currentProg < 20) {
        miners.forEach(m => { m.status = "IDLE"; m.isWinner = false })
        
        // Spawn/Animate Alice's transaction packet
        if (!activeTxPacket.current && scene) {
          const group = new THREE.Group()
          
          // Packet card
          const cardGeo = new THREE.BoxGeometry(0.3, 0.2, 0.08)
          const cardMat = new THREE.MeshStandardMaterial({
            color: 0x8b94ac, // grey unsigned
            roughness: 0.3,
          })
          const card = new THREE.Mesh(cardGeo, cardMat)
          card.name = "card"
          group.add(card)

          // Lock Group (attached above)
          const lockGroup = new THREE.Group()
          lockGroup.name = "lock"
          lockGroup.position.set(0, 0.14, 0)
          
          // Lock body
          const bodyGeo = new THREE.BoxGeometry(0.12, 0.09, 0.04)
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd4a62e, roughness: 0.3 })
          const body = new THREE.Mesh(bodyGeo, bodyMat)
          lockGroup.add(body)
          
          // Lock shackle (curved ring)
          const shackleGeo = new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI)
          const shackleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc })
          const shackle = new THREE.Mesh(shackleGeo, shackleMat)
          shackle.name = "shackle"
          shackle.position.set(0, 0.042, 0)
          shackle.rotation.z = Math.PI / 6 // open shackle
          lockGroup.add(shackle)
          
          group.add(lockGroup)
          group.position.set(alice.x, alice.y, alice.z)
          group.scale.set(0.001, 0.001, 0.001) // scale up
          
          scene.add(group)
          activeTxPacket.current = group
        }

        if (activeTxPacket.current) {
          const pkt = activeTxPacket.current
          const card = pkt.getObjectByName("card")
          const lock = pkt.getObjectByName("lock")
          const shackle = lock ? lock.getObjectByName("shackle") : null

          // Step 1: scale-in (0% to 5% step progress)
          if (currentProg < 5) {
            const scale = currentProg / 5
            pkt.scale.set(scale, scale, scale)
            if (alice) alice.status = "SIGNING"
          } 
          // Step 2: Sign transaction (5% to 10% step progress)
          else if (currentProg >= 5 && currentProg < 10) {
            pkt.scale.set(1.0, 1.0, 1.0)
            if (alice) alice.status = "SIGNED"
            
            // Snap shackle shut
            if (shackle && shackle.rotation.z > 0) {
              shackle.rotation.z = 0
              
              // Color transitions to signed green
              if (card && card.material.color.getHex() !== 0x4ad8a0) {
                card.material.color.setHex(0x4ad8a0)
                card.material.emissive.setHex(0x4ad8a0)
                card.material.emissiveIntensity = 0.45
                
                // Spawn signature pulse ring
                const ringGeo = new THREE.RingGeometry(0.1, 0.6, 32)
                const ringMat = new THREE.MeshBasicMaterial({ color: 0x4ad8a0, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
                const ring = new THREE.Mesh(ringGeo, ringMat)
                ring.position.copy(pkt.position)
                scene.add(ring)
                threeParticles.current.push({
                  mesh: ring,
                  type: "sig-pulse",
                  life: 1.0,
                  decay: 0.05 * speed
                })
              }
            }
          }
          // Step 3: travel along curved bezier path (10% to 20% step progress)
          else if (currentProg >= 10) {
            pkt.scale.set(1.0, 1.0, 1.0)
            if (alice) alice.status = "BROADCASTING"
            
            const t = (currentProg - 10) / 10 // 0 to 1
            const startPt = new THREE.Vector3(alice.x, alice.y, alice.z)
            const endPt = new THREE.Vector3(mempool.x, mempool.y, mempool.z)
            
            const mid = new THREE.Vector3().addVectors(startPt, endPt).multiplyScalar(0.5)
            mid.y += 1.5 // elevate arc
            
            const currentPos = new THREE.Vector3()
            currentPos.x = (1 - t) * (1 - t) * startPt.x + 2 * (1 - t) * t * mid.x + t * t * endPt.x
            currentPos.y = (1 - t) * (1 - t) * startPt.y + 2 * (1 - t) * t * mid.y + t * t * endPt.y
            currentPos.z = (1 - t) * (1 - t) * startPt.z + 2 * (1 - t) * t * mid.z + t * t * endPt.z
            
            pkt.position.copy(currentPos)
            
            // Draw a thin connection line trail
            if (frame % 3 === 0 && isPlaying) {
              const trailGeo = new THREE.SphereGeometry(0.04, 8, 8)
              const trailMat = new THREE.MeshBasicMaterial({ color: 0x4ad8a0, transparent: true, opacity: 0.6 })
              const trail = new THREE.Mesh(trailGeo, trailMat)
              trail.position.copy(currentPos)
              scene.add(trail)
              threeParticles.current.push({
                mesh: trail,
                type: "trail",
                life: 1.0,
                decay: 0.03 * speed
              })
            }
          }
        }
      } else if (currentProg >= 20 && currentProg < 40) {
        // Clear Alice's packet if visible
        if (activeTxPacket.current) {
          dispose3DObject(activeTxPacket.current, scene)
          activeTxPacket.current = null
          
          if (alice) alice.status = "IDLE"
          
          // Mempool color receiving-pulse
          const mempoolObj = threeNodes.current["mempool"]
          if (mempoolObj && mempoolObj.mesh) {
            mempoolObj.mesh.children.forEach(c => {
              c.material.color.setHex(0xffa85c) // receiving-pulse warm orange
              c.material.emissive.setHex(0xffa85c)
              c.material.emissiveIntensity = 0.8
            })
            
            // Add a ripple shockwave around mempool
            const ringGeo = new THREE.RingGeometry(0.5, 1.2, 32)
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xffa85c, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
            const ring = new THREE.Mesh(ringGeo, ringMat)
            ring.position.set(mempool.x, mempool.y, mempool.z)
            ring.rotation.x = Math.PI / 2
            scene.add(ring)
            threeParticles.current.push({
              mesh: ring,
              type: "sig-pulse",
              life: 1.0,
              decay: 0.04 * speed
            })
          }
        }

        // Return mempool colors to normal amber slowly after pulse
        const mempoolObj = threeNodes.current["mempool"]
        if (mempoolObj && mempoolObj.mesh) {
          mempoolObj.mesh.children.forEach(c => {
            c.material.color.lerp(new THREE.Color(0x1e293b), 0.05)
            c.material.emissive.lerp(new THREE.Color(0xe8823c), 0.05)
            c.material.emissiveIntensity = THREE.MathUtils.lerp(c.material.emissiveIntensity, 0.15, 0.05)
          })
        }

        // Show broadcasting packets from mempool to miners
        if (frame % 25 === 0 && isPlaying) {
          miners.forEach(miner => {
            const startPt = new THREE.Vector3(mempool.x, mempool.y, mempool.z)
            const endPt = new THREE.Vector3(miner.x, miner.y, miner.z)
            spawn3DParticle(startPt, endPt, 0xe8823c, "broadcast") // amber dots represent broadcasting Txs
          })
        }
      } else if (currentProg >= 40 && currentProg < 60) {
        // Return mempool to normal
        const mempoolObj = threeNodes.current["mempool"]
        if (mempoolObj && mempoolObj.mesh) {
          mempoolObj.mesh.children.forEach(c => {
            c.material.color.setHex(0x1e293b)
            c.material.emissive.setHex(0xe8823c)
            c.material.emissiveIntensity = 0.15
          })
        }

        miners.forEach(miner => {
          miner.status = "HASHING"
          miner.nonce += Math.floor(Math.random() * 4500) * speed
          miner.hashAttempts = miner.nonce
          miner.currentHash = "0000" + Math.random().toString(16).substr(2, 12).toUpperCase()

          if (frame % 4 === 0 && isPlaying) {
            const minerObj = threeNodes.current[miner.id]
            if (minerObj) spawnHashingSpark(minerObj.mesh.position)
          }
        })

        // Draw active green connection lines showing miners reading from mempool
        if (frame % 30 === 0 && isPlaying) {
          miners.forEach(miner => {
            spawn3DParticle(
              new THREE.Vector3(mempool.x, mempool.y, mempool.z),
              new THREE.Vector3(miner.x, miner.y, miner.z),
              0x4ad8a0, // teal-green
              "read-mempool"
            )
          })
        }
      } else if (currentProg >= 60 && currentProg < 80) {
        miners.forEach((miner, idx) => {
          if (idx === 0) {
            miner.status = "SOLVED"
            miner.isWinner = true
            miner.currentHash = "000000000000000000078A9C"
            
            // Flash gold Winner shockwave once on transition
            const minerObj = threeNodes.current[miner.id]
            if (minerObj && !simState.current.goldPulseFired) {
              simState.current.goldPulseFired = true
              
              // Scale pop (elastic bounce)
              minerObj.mesh.scale.set(1.4, 1.4, 1.4)
              
              // Spawn gold ring shockwave
              const ringGeo = new THREE.RingGeometry(0.6, 2.0, 32)
              const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc94a, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
              const ring = new THREE.Mesh(ringGeo, ringMat)
              ring.position.copy(minerObj.mesh.position)
              scene.add(ring)
              threeParticles.current.push({
                mesh: ring,
                type: "sig-pulse",
                life: 1.0,
                decay: 0.03 * speed
              })

              // Spawns 8 gold particle scatter burst
              for (let k = 0; k < 8; k++) {
                const spGeo = new THREE.SphereGeometry(0.08, 8, 8)
                const spMat = new THREE.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: 0.9 })
                const spMesh = new THREE.Mesh(spGeo, spMat)
                spMesh.position.copy(minerObj.mesh.position)
                scene.add(spMesh)
                
                const angle = (k / 8) * Math.PI * 2
                threeParticles.current.push({
                  mesh: spMesh,
                  velocity: new THREE.Vector3(Math.cos(angle) * 0.08, (Math.random() - 0.5) * 0.05 + 0.03, Math.sin(angle) * 0.08),
                  life: 1.0,
                  decay: 0.02 * speed,
                  type: "spark"
                })
              }
            }
          } else {
            miner.status = "IDLE"
            miner.isWinner = false
          }
        })
      } else if (currentProg >= 80 && currentProg < 100) {
        const winner = miners.find(m => m.isWinner)
        if (winner) {
          simState.current.goldPulseFired = false
          
          // Animate proposed block ghost particles traveling to other nodes
          if (frame % 25 === 0 && isPlaying) {
            miners.forEach(miner => {
              if (miner.id !== winner.id) {
                const startPt = new THREE.Vector3(winner.x, winner.y, winner.z)
                const endPt = new THREE.Vector3(miner.x, miner.y, miner.z)
                spawn3DParticle(startPt, endPt, 0x3b7dd8, "block-prop") // blue cube copies
              }
            })
          }
          
          // Trigger validator green verify flash
          miners.forEach(miner => {
            if (miner.id !== winner.id) {
              const t = (currentProg - 80) / 20 // 0 to 1
              if (t > 0.4 && t < 0.8) {
                miner.status = "VALIDATED"
                // Flash green pulse once
                const minerObj = threeNodes.current[miner.id]
                if (minerObj && !simState.current.blockPulseFired) {
                  const ringGeo = new THREE.RingGeometry(0.5, 1.2, 32)
                  const ringMat = new THREE.MeshBasicMaterial({ color: 0x4ad8a0, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
                  const ring = new THREE.Mesh(ringGeo, ringMat)
                  ring.position.copy(minerObj.mesh.position)
                  scene.add(ring)
                  threeParticles.current.push({
                    mesh: ring,
                    type: "sig-pulse",
                    life: 1.0,
                    decay: 0.05 * speed
                  })
                }
              }
            }
          })
          
          if ((currentProg - 80) / 20 >= 0.8) {
            simState.current.blockPulseFired = true
          }
        }
      }
    }

    // 2. Proof of Stake
    else if (selectedAlgo === "pos") {
      const pool = nodes.find(n => n.type === "pool")
      const validators = nodes.filter(n => n.type === "validator")

      if (currentProg < 12.5) {
        validators.forEach(v => { v.isWinner = false; v.status = "IDLE"; v.role = "STANDBY" })
        if (frame % 22 === 0 && isPlaying) {
          validators.forEach(v => {
            const startPt = new THREE.Vector3(v.x, v.y, v.z)
            const endPt = new THREE.Vector3(pool.x, pool.y, pool.z)
            spawn3DParticle(startPt, endPt, colorHex, "stake")
          })
        }
      } else if (currentProg >= 25 && currentProg < 37.5) {
        // Draw selection helper line rotating
        const angle = (frame * 0.05 * speed) % (Math.PI * 2)
        const targetPt = new THREE.Vector3(3.5 * Math.cos(angle), 0.2, 3.5 * Math.sin(angle))
        
        if (lightningMesh.current) {
          scene.remove(lightningMesh.current)
          lightningMesh.current.geometry.dispose()
          lightningMesh.current.material.dispose()
        }

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(pool.x, pool.y, pool.z),
          targetPt
        ])
        const lineMat = new THREE.LineBasicMaterial({ color: colorHex, opacity: 0.6, transparent: true })
        const line = new THREE.Line(lineGeo, lineMat)
        scene.add(line)
        lightningMesh.current = line

      } else if (currentProg >= 37.5 && currentProg < 50) {
        if (lightningMesh.current) {
          scene.remove(lightningMesh.current)
          lightningMesh.current = null
        }
        
        validators.forEach((v, idx) => {
          v.isWinner = idx === 2
          v.status = idx === 2 ? "PROPOSER" : "COMMITTEE"
          v.role = idx === 2 ? "SLOT_LEADER" : "ATTESTER"
        })

        const proposer = validators.find(v => v.isWinner)
        if (proposer && frame % 30 === 0 && isPlaying) {
          spawn3DParticle(new THREE.Vector3(proposer.x, proposer.y, proposer.z), new THREE.Vector3(pool.x, pool.y, pool.z), colorHex, "proposed-block")
        }
      } else if (currentProg >= 50 && currentProg < 62.5) {
        if (frame % 20 === 0 && isPlaying) {
          validators.forEach(v => {
            if (!v.isWinner) {
              spawn3DParticle(new THREE.Vector3(v.x, v.y, v.z), new THREE.Vector3(pool.x, pool.y, pool.z), 0x10b981, "attestation")
            }
          })
        }
      }

      // POS Slashing Attack Animation
      if (activeAttack === "nothingAtStake" && currentProg >= 70) {
        const badVal = validators.find(n => n.id === "val-2")
        if (badVal) {
          badVal.isSlashed = true
          badVal.status = "SLASHED"
          badVal.role = "BANNED"
          badVal.stake = 16

          // Jagged lightning line effect
          if (lightningMesh.current) {
            scene.remove(lightningMesh.current)
            lightningMesh.current.geometry.dispose()
            lightningMesh.current.material.dispose()
            lightningMesh.current = null
          }

          if (frame % 6 < 4) {
            const points = []
            const segs = 6
            for (let i = 0; i <= segs; i++) {
              const t = i / segs
              const ly = 5.0 + (badVal.y - 5.0) * t
              const lx = badVal.x + (t > 0 && t < 1 ? (Math.random() - 0.5) * 0.4 : 0)
              const lz = badVal.z + (t > 0 && t < 1 ? (Math.random() - 0.5) * 0.4 : 0)
              points.push(new THREE.Vector3(lx, ly, lz))
            }
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points)
            const lineMat = new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 2 })
            const line = new THREE.Line(lineGeo, lineMat)
            scene.add(line)
            lightningMesh.current = line
          }

          // Sparks eruption from validator
          if (frame % 2 === 0 && isPlaying) {
            spawnHashingSpark(new THREE.Vector3(badVal.x, badVal.y, badVal.z))
          }
        }
      }
    }

    // 3. Delegated Proof of Stake
    else if (selectedAlgo === "dpos") {
      const delegates = nodes.filter(n => n.type === "delegate")
      const voters = nodes.filter(n => n.type === "voter")
      const scheduler = nodes.find(n => n.id === "scheduler")

      if (currentProg < 20) {
        delegates.forEach((d, idx) => { d.isWinner = idx === 1; d.status = "STANDBY" })
        if (frame % 22 === 0 && isPlaying) {
          voters.forEach(v => {
            delegates.forEach(d => {
              spawn3DParticle(new THREE.Vector3(v.x, v.y, v.z), new THREE.Vector3(d.x, d.y, d.z), colorHex, "vote")
            })
          })
        }
      } else if (currentProg >= 40 && currentProg < 60) {
        const leader = delegates.find(d => d.isWinner)
        if (leader) {
          leader.status = "PRODUCING"
          if (frame % 25 === 0 && isPlaying) {
            spawn3DParticle(new THREE.Vector3(leader.x, leader.y, leader.z), new THREE.Vector3(0, 0.5, 0), colorHex, "dpos-block")
          }
        }
      }
    }

    // 4. Proof of Authority
    else if (selectedAlgo === "poa") {
      const center = nodes.find(n => n.id === "consensus-center")
      const auths = nodes.filter(n => n.type === "authority")

      if (currentProg < 20) {
        auths.forEach((a, idx) => { a.isWinner = idx === 0; a.signingStatus = "STANDBY" })
      } else if (currentProg >= 20 && currentProg < 40) {
        if (frame % 24 === 0 && isPlaying) {
          auths.forEach(a => {
            spawn3DParticle(new THREE.Vector3(center.x, center.y, center.z), new THREE.Vector3(a.x, a.y, a.z), colorHex, "key-auth")
          })
        }
      } else if (currentProg >= 40 && currentProg < 60) {
        const leader = auths.find(a => a.isWinner)
        if (leader) {
          leader.signingStatus = "PROPOSING"
          if (frame % 24 === 0 && isPlaying) {
            spawn3DParticle(new THREE.Vector3(leader.x, leader.y, leader.z), new THREE.Vector3(center.x, center.y, center.z), colorHex, "block-prop")
          }
        }
      }
    }

    // 5. PBFT Byzantine rounds
    else if (selectedAlgo === "pbft") {
      const client = nodes.find(n => n.type === "client")
      const primary = nodes.find(n => n.type === "primary")
      const replicas = nodes.filter(n => n.type === "replica")

      if (currentProg < 20) {
        primary.isWinner = true
        if (frame % 40 === 0 && isPlaying) {
          spawn3DParticle(new THREE.Vector3(client.x, client.y, client.z), new THREE.Vector3(primary.x, primary.y, primary.z), 0x06b6d4, "client-req")
        }
      } else if (currentProg >= 20 && currentProg < 40) {
        if (frame % 30 === 0 && isPlaying) {
          replicas.forEach(r => {
            spawn3DParticle(new THREE.Vector3(primary.x, primary.y, primary.z), new THREE.Vector3(r.x, r.y, r.z), 0x06b6d4, "pre-prep")
          })
        }
      } else if (currentProg >= 40 && currentProg < 60) {
        if (frame % 28 === 0 && isPlaying) {
          replicas.forEach(sender => {
            replicas.forEach(rec => {
              if (sender.id !== rec.id) {
                spawn3DParticle(new THREE.Vector3(sender.x, sender.y, sender.z), new THREE.Vector3(rec.x, rec.y, rec.z), 0xf59e0b, "prepare")
              }
            })
          })
        }
      } else if (currentProg >= 60 && currentProg < 80) {
        if (frame % 28 === 0 && isPlaying) {
          replicas.forEach(sender => {
            replicas.forEach(rec => {
              if (sender.id !== rec.id) {
                spawn3DParticle(new THREE.Vector3(sender.x, sender.y, sender.z), new THREE.Vector3(rec.x, rec.y, rec.z), 0x10b981, "commit")
              }
            })
          })
        }
      }
    }

    // 6. Proof of History
    else if (selectedAlgo === "poh") {
      const leader = nodes.find(n => n.type === "poh-leader")
      const validators = nodes.filter(n => n.type === "validator")

      if (isPlaying) {
        leader.hashCounter += Math.floor(Math.random() * 4000) * speed
        leader.time = (frame * 0.3 * speed).toFixed(1)
      }

      if (currentProg >= 20 && currentProg < 40) {
        if (frame % 20 === 0 && isPlaying) {
          spawn3DParticle(new THREE.Vector3(-5, 0.5, 0), new THREE.Vector3(leader.x, leader.y, leader.z), 0xf59e0b, "tx")
        }
      } else if (currentProg >= 60 && currentProg < 80) {
        if (frame % 16 === 0 && isPlaying) {
          validators.forEach(v => {
            spawn3DParticle(new THREE.Vector3(leader.x, leader.y, leader.z), new THREE.Vector3(v.x, v.y, v.z), 0x10b981, "history-seq")
          })
        }
      }
    }

    // 7. Proof of Elapsed Time
    else if (selectedAlgo === "poet") {
      if (currentProg < 20) {
        nodes.forEach((v, idx) => {
          v.status = "SLEEPING"
          if (v.teeTimer === 0) {
            v.teeTimer = 6 + idx * 8
            v.remaining = v.teeTimer
          }
        })
      } else if (currentProg >= 20 && currentProg < 40) {
        if (isPlaying) {
          nodes.forEach(v => {
            v.remaining = Math.max(0, v.teeTimer - (frame * 0.15 * speed))
          })
        }
      } else if (currentProg >= 40 && currentProg < 60) {
        nodes.forEach((v, idx) => {
          if (idx === 0) {
            v.status = "ACTIVE"
            v.isWinner = true
            v.remaining = 0
          } else {
            v.status = "SLEEPING"
            v.isWinner = false
          }
        })
      }
    }

    // 8. Avalanche Consensus
    else if (selectedAlgo === "avalanche") {
      if (currentProg >= 16 && currentProg < 32) {
        if (frame % 14 === 0 && isPlaying) {
          nodes.forEach(node => {
            const randPeer = nodes[Math.floor(Math.random() * nodes.length)]
            if (randPeer.id !== node.id) {
              const startPt = new THREE.Vector3(node.x, node.y, node.z)
              const endPt = new THREE.Vector3(randPeer.x, randPeer.y, randPeer.z)
              const pColor = node.preference === "BLUE" ? 0x06b6d4 : 0x8b5cf6
              spawn3DParticle(startPt, endPt, pColor, "query")
            }
          })
        }
      } else if (currentProg >= 32 && currentProg < 64) {
        nodes.forEach((n, idx) => {
          if (idx < 6) {
            n.preference = "BLUE"
            const obj = threeNodes.current[n.id]
            if (obj && obj.mesh) {
              // Smooth material color transition to blue
              const meshes = obj.mesh.isGroup ? obj.mesh.children : [obj.mesh]
              meshes.forEach(m => {
                if (m.material && m.material.color) {
                  m.material.color.setHex(0x111827)
                  m.material.emissive.setHex(0x06b6d4)
                }
              })
              if (obj.shell && obj.shell.material) {
                obj.shell.material.color.setHex(0x06b6d4)
              }
            }
          }
        })
      } else if (currentProg >= 64 && currentProg < 80) {
        nodes.forEach(n => {
          n.preference = "BLUE"
          n.confidence = 20
          n.round = Math.floor(frame * 0.1)

          // Color all nodes blue
          const obj = threeNodes.current[n.id]
          if (obj && obj.mesh) {
            const meshes = obj.mesh.isGroup ? obj.mesh.children : [obj.mesh]
            meshes.forEach(m => {
              if (m.material && m.material.color) {
                m.material.emissive.setHex(0x06b6d4)
              }
            })
            if (obj.shell && obj.shell.material) {
              obj.shell.material.color.setHex(0x06b6d4)
            }
          }
        })
      }
    }
  }

  // Evaluates step indices based on progress tickers
  const updateSimulationPhase = (prog) => {
    const stepCount = steps.length
    const stepSize = 100 / stepCount
    let currentStepIdx = Math.floor(prog / stepSize)
    if (currentStepIdx > stepCount - 1) currentStepIdx = stepCount - 1

    const targetStep = steps[currentStepIdx]
    const stepProgress = Math.floor(((prog % stepSize) / stepSize) * 100)

    let statusText = targetStep.title.toUpperCase()
    if (stepProgress === 0) {
      statusText = `READY: ${statusText}`
    } else if (stepProgress > 0 && stepProgress < 98) {
      statusText = `RUNNING: ${statusText} (${stepProgress}%)`
    } else {
      statusText = `${statusText} (DONE)`
    }
    setSimStatus(statusText)

    if (simState.current.lastLoggedStep !== currentStepIdx) {
      simState.current.lastLoggedStep = currentStepIdx
      addEduLog(`Phase ${currentStepIdx + 1}`, targetStep.description)
    }
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

  // Render Helpers to avoid code duplication across Normal and Fullscreen states
  const renderCanvas = () => (
    <div className={isFullscreen 
      ? "absolute inset-0 w-full h-full" 
      : `${explanationExpanded ? "xl:col-span-3" : "xl:col-span-5"} bg-slate-950/70 rounded-2xl border border-brand-border overflow-hidden relative flex flex-col h-[620px] transition-all duration-300`
    }>
      <canvas
        ref={canvasRef}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        aria-label={`Interactive protocol simulation canvas drawing 3D node interactions for ${algo.name}. Click node to inspect details.`}
      />

      {!explanationExpanded && (
        <button
          onClick={() => setExplanationExpanded(true)}
          className="absolute right-6 top-6 bg-slate-900/90 border border-brand-border hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-2xl transition-all cursor-pointer z-20 pointer-events-auto"
          title="Show explanation panel"
        >
          <Info className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>SHOW NARRATION</span>
        </button>
      )}

      {/* 3D Projected HTML labels Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {simNodes.map(node => (
          <div
            key={node.id}
            id={`node-label-${node.id}`}
            className="absolute pointer-events-none select-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
            style={{ left: 0, top: 0, display: "none" }}
          >
            <div className="px-2 py-0.8 bg-slate-950/85 border border-brand-border/60 rounded text-[9px] font-bold font-sans text-white tracking-wide shadow-md">
              {node.label}
            </div>
            {node.type !== "mempool" && node.type !== "pool" && !node.id.startsWith("voter") && (
              <div className="text-[7.5px] font-mono text-indigo-400 font-extrabold tracking-wider bg-slate-950/50 px-1 rounded uppercase">
                {node.status || node.preference || "STANDBY"}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Floating Protocol Inspector Overlay HUD */}
      {selectedMinerId && inspectorStats && (
        <div className="absolute top-4 right-4 bg-slate-950/95 border-2 border-indigo-500/50 rounded-2xl p-5 w-72 shadow-[0_0_20px_rgba(99,102,241,0.25)] text-xs font-mono animate-fade-in z-20 pointer-events-auto">
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
                  <span>PUZZLES SOLVED:</span>
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

      {/* Floating Success Celebration Toast */}
      {showCompletion && (
        <div className="absolute top-4 left-4 bg-slate-950/95 border-2 border-emerald-500/50 rounded-2xl p-4 w-76 shadow-[0_0_20px_rgba(16,185,129,0.25)] text-xs animate-fade-in z-20 pointer-events-auto flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-emerald-500/20 pb-1.5">
            <span className="text-white font-extrabold text-[12px] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              CONSENSUS ACHIEVED
            </span>
            <button
              onClick={() => dispatch({ type: "SET_SHOW_COMPLETION", payload: false })}
              className="text-slate-500 hover:text-white cursor-pointer"
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          <p className="text-[10px] text-slate-350 leading-relaxed font-sans">
            A new block has been signed, validated, and permanently appended to the ledger.
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 border-y border-brand-border/25 py-2 my-0.5 text-center font-mono">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Block</span>
              <span className="text-white font-bold text-[10.5px] mt-0.5">#{simState.current.blockHeight}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Time</span>
              <span className="text-indigo-400 font-bold text-[10.5px] mt-0.5">{(4200 / speed).toFixed(0)}ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Txs</span>
              <span className="text-emerald-450 font-bold text-[10.5px] mt-0.5">2,500</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-grow py-2 rounded-lg border border-brand-border bg-slate-900 text-white font-bold text-[10px] hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restart
            </button>
            <button
              onClick={handleStartAutoReplay}
              className="flex-grow py-2 rounded-lg border border-transparent dynamic-accent-bg text-slate-950 font-bold text-[10px] hover:opacity-90 flex items-center justify-center gap-1 transition-opacity cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Replay
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-0 right-0 text-[10px] font-mono text-slate-500 text-center bg-slate-950/50 py-1">
        TIP: Click nodes to inspect. Click & drag to rotate the 3D viewport.
      </div>
    </div>
  )

  const renderExplanation = () => (
    <div className={isFullscreen 
      ? "w-[360px] bg-slate-900/85 backdrop-blur border border-brand-border/40 p-5 rounded-2xl flex flex-col justify-between overflow-y-auto pointer-events-auto h-full shadow-2xl" 
      : "xl:col-span-2 p-6 rounded-2xl bg-slate-900/35 border border-brand-border/40 flex flex-col justify-between h-[620px]"
    }>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-brand-border/25 pb-2">
          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-400" />
            Live Classroom Explanation
          </span>
          <button
            onClick={() => setExplanationExpanded(false)}
            className="text-slate-500 hover:text-white cursor-pointer transition-colors text-[10px] font-bold font-mono hover:bg-slate-800 px-2 py-0.5 rounded border border-brand-border/40"
            title="Hide panel"
          >
            ✕ HIDE
          </button>
        </div>

        {/* Step name & description */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[24px] font-extrabold text-white tracking-tight uppercase leading-tight">
            {activeWorkflowStep + 1}. {activeStep.title}
          </span>
          <p className="text-[11px] text-slate-350 italic font-mono mt-0.5">
            Purpose: "{activeStep.purpose}"
          </p>
        </div>

        {/* Scannable primary content */}
        <div className="flex flex-col gap-4 mt-1 text-sm leading-relaxed text-slate-300 font-light">
          <div>
            <span className="block font-mono font-bold text-[9px] text-slate-500 uppercase">WHAT IS HAPPENING?</span>
            <p className="mt-0.5 text-xs text-slate-300">{activeStep.description}</p>
          </div>

          <div>
            <span className="block font-mono font-bold text-[9px] text-slate-500 uppercase">WHY IT MATTERS</span>
            <p className="mt-0.5 text-xs text-slate-400 font-light">{activeStep.securityContribution}</p>
          </div>
        </div>

        {/* Accordion Expand Details */}
        <div className="border-t border-brand-border/20 pt-2.5 mt-1">
          <button
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="text-[10px] font-mono font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1.5 transition-colors uppercase tracking-wider"
          >
            {detailsExpanded ? "Hide Advanced Details ▴" : "Show Advanced Details ▾"}
          </button>

          {detailsExpanded && (
            <div className="flex flex-col gap-3.5 mt-3.5 animate-fade-in text-[11px] leading-relaxed text-slate-300">
              <div className="grid grid-cols-2 gap-4 border-b border-brand-border/10 pb-3">
                <div>
                  <span className="block font-mono font-bold text-[9px] text-indigo-455 uppercase">WHO PARTICIPATES</span>
                  <p className="text-white font-semibold mt-0.5 text-[11px]">{activeStep.participants}</p>
                </div>
                <div>
                  <span className="block font-mono font-bold text-[9px] text-emerald-450 uppercase">SECURITY BENEFIT</span>
                  <p className="text-white font-semibold mt-0.5 text-[11px]">Integrity Protection</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-1">
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
          )}
        </div>
      </div>

      {/* Real-world block example aligned below */}
      <div className="p-4 rounded-xl bg-slate-950 border border-brand-border/50 text-[11px] mt-4">
        <span className="block font-mono font-bold text-[9px] text-indigo-400 uppercase tracking-wider mb-0.5">
          REAL-WORLD PROTOCOL MAPPING
        </span>
        <p className="text-slate-350 font-light italic leading-relaxed text-[10px]">
          "{activeStep.realWorldExample}"
        </p>
      </div>
    </div>
  )

  const renderControllers = () => (
    <div className={isFullscreen ? "w-full flex flex-col gap-2 pointer-events-auto" : "lg:col-span-2 flex flex-col gap-4"}>
      {!isFullscreen && (
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
          STEP CONTROLLER TOOLBAR (MANUAL DEFAULT)
        </span>
      )}

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
              className="w-11 h-11 rounded-full border border-brand-border bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="⏮ Previous Step"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handlePlayPause}
              className="px-4.5 h-11 rounded-full border border-brand-border bg-slate-950 flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:bg-slate-900 text-xs font-mono font-bold"
              title={isPlaying ? "Pause Step" : "Play Step"}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-500">PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-450" />
                  <span className="text-emerald-450">PLAY</span>
                </>
              )}
            </button>
            <button
              disabled={activeWorkflowStep === steps.length - 1}
              onClick={handleNextStep}
              className="w-11 h-11 rounded-full border border-brand-border bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="▶ Next Step"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="w-11 h-11 rounded-full border border-brand-border bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
              title="↺ Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Play Auto toggle */}
          <button
            onClick={handleAutoPlayToggle}
            className={`px-5 h-11 rounded-full border font-bold text-xs cursor-pointer transition-all duration-200 ${isAutoPlay
                ? "border-emerald-500 bg-emerald-950/20 text-emerald-450 shadow-[0_0_12px_rgba(16,185,129,0.15)] animate-pulse"
                : "border-brand-border bg-slate-950 text-slate-450 hover:text-white"
              }`}
          >
            {isAutoPlay ? "⏸ PAUSE AUTO" : "▶ PLAY AUTO"}
          </button>

          {/* Speed selectors */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 h-11 rounded-full border border-brand-border/40">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold cursor-pointer transition-colors ${speed === s
                    ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-400"
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
  )

  const renderLogs = () => (
    <div className={isFullscreen ? "w-full flex flex-col gap-2 pointer-events-auto" : "lg:col-span-3 flex flex-col gap-2"}>
      {!isFullscreen && (
        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-slate-500" />
          CLASSROOM LESSON EVENTS LOG (3D ACTIVE)
        </span>
      )}

      <div
        className={`flex-grow bg-slate-950/80 rounded-2xl border border-brand-border/60 p-5 overflow-y-auto font-sans text-xs leading-relaxed flex flex-col gap-3.5 scrollbar-thin select-text ${
          isFullscreen ? "h-[80px]" : "h-[160px]"
        }`}
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
  )

  const visualizerContent = (
    <section
      ref={containerRef}
      className={`select-none transition-all duration-300 flex flex-col ${
        isFullscreen 
          ? "fixed inset-0 z-[9999] p-6 w-screen h-screen flex flex-col gap-4 border-0" 
          : "glass-panel w-full border border-brand-border/60 bg-slate-950/20 p-6 rounded-2xl relative gap-6"
      }`}
      style={{ backgroundColor: isFullscreen ? "#070b19" : undefined }}
      aria-labelledby="sim-engine-section-title"
    >

      {/* Title Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border/30 pb-3 z-10 w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 dynamic-accent-text" />
            <h2 id="sim-engine-section-title" className="text-[16px] font-extrabold text-white uppercase tracking-tight leading-none">
              Step {activeWorkflowStep + 1}: {activeStep.title}
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-light pl-7">
            {activeStep.purpose}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono tracking-wider font-extrabold border bg-slate-950 uppercase"
            style={{ borderColor: algo.color, color: algo.color }}
          >
            {simStatus}
          </span>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl border border-brand-border bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center justify-center transition-colors shadow-lg"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-indigo-455" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isFullscreen ? (
        /* Fullscreen Presentation HUD View */
        <div className="relative flex-grow w-full overflow-hidden bg-slate-950/70 rounded-2xl border border-brand-border/40 flex flex-col z-0">
          {renderCanvas()}

          {/* Floating Explanation HUD Overlay (Right) */}
          {explanationExpanded && (
            <div className="absolute right-6 top-6 bottom-32 pointer-events-none z-10 flex">
              {renderExplanation()}
            </div>
          )}

          {/* Floating Controllers and Logs HUD Overlay (Bottom) */}
          <div className="absolute bottom-6 left-6 right-6 bg-slate-950/85 backdrop-blur-md border border-brand-border/40 p-5 rounded-2xl flex items-stretch justify-between pointer-events-none z-10 gap-6 shadow-2xl">
            <div className="w-[45%] flex items-center">
              {renderControllers()}
            </div>
            <div className="w-[52%] flex items-center">
              {renderLogs()}
            </div>
          </div>
        </div>
      ) : (
        /* Normal Grid Layout Dashboard */
        <>
          {/* 620px Main Centerpiece Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">
            {renderCanvas()}
            {explanationExpanded && renderExplanation()}
          </div>

          {/* Bottom Part: Step Controller Deck + Simulation logs */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch border-t border-brand-border/20 pt-6">
            {renderControllers()}
            {renderLogs()}
          </div>
        </>
      )}

    </section>
  )

  if (isFullscreen) {
    return createPortal(visualizerContent, document.body)
  }
  return visualizerContent
}
