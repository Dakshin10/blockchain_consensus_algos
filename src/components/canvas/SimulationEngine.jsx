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

// Helper to construct a rounded box using ExtrudeGeometry
const createRoundedBoxGeometry = (w, h, d, r, steps) => {
  const shape = new THREE.Shape()
  shape.moveTo(-w/2 + r, -h/2)
  shape.lineTo(w/2 - r, -h/2)
  shape.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r)
  shape.lineTo(w/2, h/2 - r)
  shape.quadraticCurveTo(w/2, h/2, w/2 - r, h/2)
  shape.lineTo(-w/2 + r, h/2)
  shape.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r)
  shape.lineTo(-w/2, -h/2 + r)
  shape.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2)
  
  const extrudeSettings = {
    steps: 1,
    depth: d - r * 2,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelSegments: steps,
    curveSegments: steps
  }
  
  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  geom.center()
  return geom
}

// Helper to construct a cylinder mesh acting as a thick line between two 3D vectors
const createThickLine = (p1, p2, thickness, color, opacity) => {
  const distance = p1.distanceTo(p2)
  const geometry = new THREE.CylinderGeometry(thickness, thickness, distance, 6)
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    depthWrite: false
  })
  const mesh = new THREE.Mesh(geometry, material)
  
  const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
  mesh.position.copy(midpoint)
  
  const direction = new THREE.Vector3().subVectors(p2, p1).normalize()
  const alignAxis = new THREE.Vector3(0, 1, 0)
  mesh.quaternion.setFromUnitVectors(alignAxis, direction)
  
  return mesh
}

const createPoaDocumentBlock = (colorHex = 0x10b981) => {
  const group = new THREE.Group();
  // Paper sheet
  const paperGeo = new THREE.BoxGeometry(0.38, 0.52, 0.04);
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // slate 100 (crisp document paper)
    roughness: 0.8,
    metalness: 0.1,
  });
  const paper = new THREE.Mesh(paperGeo, paperMat);
  group.add(paper);

  // Wax seal stamp
  const sealGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8);
  const sealMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.2,
    metalness: 0.7,
    emissive: colorHex,
    emissiveIntensity: 0.3,
  });
  const seal = new THREE.Mesh(sealGeo, sealMat);
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0.08, -0.14, 0.022);
  group.add(seal);

  return group;
};


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
  const dposLines = useRef([]) // Custom tracking lines for DPoS voting & verification
  const posLines = useRef([]) // Custom tracking lines for PoS staking & locks
  const pohHelixBeads = useRef([]) // Array of bead objects along the clock helix
  const pohBeadsGroup = useRef(null) // THREE.Group for helix beads


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
      // Stake Pool in center
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
          scale: 0.45, // default small size before staking animation
          opacity: 1.0
        })
      }
    } else if (selectedAlgo === "dpos") {
      // 5 Voters clustered on the left third
      nodes.push({ id: "voter-1", label: "VOTER_01", type: "voter", x: -4.2, y: 0.4, z: -1.2, status: "VOTING", stake: 1500 })
      nodes.push({ id: "voter-2", label: "VOTER_02", type: "voter", x: -4.8, y: 0.8, z: -0.5, status: "VOTING", stake: 3500 })
      nodes.push({ id: "voter-3", label: "VOTER_03", type: "voter", x: -4.0, y: 0.6, z: 0.6, status: "VOTING", stake: 4000 })
      nodes.push({ id: "voter-4", label: "VOTER_04", type: "voter", x: -4.6, y: 0.3, z: 1.2, status: "VOTING", stake: 2000 })
      nodes.push({ id: "voter-5", label: "VOTER_05", type: "voter", x: -3.8, y: 0.9, z: -0.1, status: "VOTING", stake: 3000 })
      
      // 5 Candidates in a shallow arc on the right two-thirds
      const dposCoords = [
        { x: 2.0, z: -2.5 },
        { x: 3.2, z: -1.2 },
        { x: 3.8, z: 0.0 },
        { x: 3.2, z: 1.2 },
        { x: 2.0, z: 2.5 }
      ]
      
      for (let i = 0; i < 5; i++) {
        nodes.push({
          id: `delegate-${i + 1}`,
          label: `DEL_0${i + 1}`,
          type: "delegate",
          x: dposCoords[i].x,
          y: 0.2,
          z: dposCoords[i].z,
          votes: 18000 + i * 3600,
          round: 1,
          status: "STANDBY",
          rewards: 0.4 * i,
          isWinner: false,
          role: "STANDBY",
          scale: 1.0,
          opacity: 1.0
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
      nodes.push({ id: "poh-leader", label: "LEADER", type: "poh-leader", x: -3.5, y: 0.5, z: 0, hashCounter: 5000000, time: 0.0, status: "TICKING" })
      for (let i = 0; i < 3; i++) {
        nodes.push({
          id: `poh-val-${i + 1}`,
          label: `VAL_0${i + 1}`,
          type: "validator",
          x: 2.8,
          y: 1.4 - i * 1.2,
          z: -1.2 + i * 1.2,
          status: "HIDDEN",
          scale: 1.0,
          opacity: 0.0
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

      if (dposLines.current) {
        dposLines.current.forEach(line => {
          threeScene.current.remove(line);
          line.geometry.dispose();
          line.material.dispose();
        });
        dposLines.current = [];
      }

      if (simState.current.schedulerRing) {
        threeScene.current.remove(simState.current.schedulerRing);
        simState.current.schedulerRing.geometry.dispose();
        simState.current.schedulerRing.material.dispose();
        simState.current.schedulerRing = null;
      }

      if (simState.current.schedulerMarker) {
        threeScene.current.remove(simState.current.schedulerMarker);
        simState.current.schedulerMarker.geometry.dispose();
        simState.current.schedulerMarker.material.dispose();
        simState.current.schedulerMarker = null;
      }

      if (simState.current.dposBlock) {
        threeScene.current.remove(simState.current.dposBlock);
        simState.current.dposBlock.geometry.dispose();
        simState.current.dposBlock.material.dispose();
        simState.current.dposBlock = null;
      }

      if (simState.current.blockGlowMesh) {
        threeScene.current.remove(simState.current.blockGlowMesh);
        simState.current.blockGlowMesh.geometry.dispose();
        simState.current.blockGlowMesh.material.dispose();
        simState.current.blockGlowMesh = null;
      }

      if (posLines.current) {
        posLines.current.forEach(line => {
          threeScene.current.remove(line);
          line.geometry.dispose();
          line.material.dispose();
        });
        posLines.current = [];
      }

      if (pohHelixBeads.current) {
        pohHelixBeads.current.forEach(bead => {
          if (pohBeadsGroup.current) pohBeadsGroup.current.remove(bead.mesh);
          else threeScene.current?.remove(bead.mesh);
          bead.mesh.geometry?.dispose();
          bead.mesh.material?.dispose();
        });
        pohHelixBeads.current = [];
      }
      if (pohBeadsGroup.current && threeScene.current) {
        threeScene.current.remove(pohBeadsGroup.current);
        pohBeadsGroup.current = null;
      }

      if (simState.current.selectionBeam) {
        threeScene.current.remove(simState.current.selectionBeam);
        simState.current.selectionBeam.geometry.dispose();
        simState.current.selectionBeam.material.dispose();
        simState.current.selectionBeam = null;
      }

      if (simState.current.posBlock) {
        threeScene.current.remove(simState.current.posBlock);
        simState.current.posBlock.geometry.dispose();
        simState.current.posBlock.material.dispose();
        simState.current.posBlock = null;
      }

      if (simState.current.posBlockGlow) {
        threeScene.current.remove(simState.current.posBlockGlow);
        simState.current.posBlockGlow.geometry.dispose();
        simState.current.posBlockGlow.material.dispose();
        simState.current.posBlockGlow = null;
      }

      simState.current.goldPulseFired = false
      simState.current.blockPulseFired = false
      simState.current.dposPulseFired = false
      simState.current.verifierPulsesFired = false
      simState.current.blockGlowCreated = false
      simState.current.lastDposStep = -1
      
      simState.current.posWinnerPulseFired = false
      simState.current.posBlockGlowCreated = false
      simState.current.posAttestationFired = false
      simState.current.lastPosStep = -1
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
        if (selectedAlgo === "pos") {
          // Centered Gold Sphere representing the stake pool
          meshGeo = new THREE.SphereGeometry(0.75, 32, 32)
          meshMat = new THREE.MeshStandardMaterial({
            color: 0xd4a62e, // deep gold
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0xd4a62e,
            emissiveIntensity: 0.2,
          })
        } else {
          // Floating Torus Knot representing dynamic staking/consortium pool
          meshGeo = new THREE.TorusKnotGeometry(0.48, 0.14, 64, 8)
          meshMat = new THREE.MeshStandardMaterial({
            color: 0x3b7dd8,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0x3b7dd8,
            emissiveIntensity: 0.2,
          })
        }
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
          emissive: 0xf0a830, // Amber-gold clock
          emissiveIntensity: 0.3,
        })
        const centerCyl = new THREE.Mesh(meshGeo, meshMat)
        centerCyl.rotation.x = Math.PI / 2
        group.add(centerCyl)

        // Radial ticks representing chronological time slots
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2
          const tickGeo = new THREE.BoxGeometry(0.08, 0.2, 0.08)
          const tickMat = new THREE.MeshBasicMaterial({ color: 0xf0a830 })
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
        let baseColor = 0x3b7dd8;
        if (selectedAlgo === "dpos") {
          if (node.type === "voter") {
            baseColor = 0x4a90e2; // Voter sky blue
          } else if (node.type === "delegate") {
            baseColor = 0x6b4fa0; // Delegate muted purple
          }
        } else if (selectedAlgo === "poa") {
          baseColor = 0x5a627a; // Unverified neutral grey
        }

        meshGeo = new THREE.SphereGeometry(0.5, 32, 32)
        meshMat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.2,
          metalness: 0.8,
          emissive: baseColor,
          emissiveIntensity: 0.15,
        })
        mesh = new THREE.Mesh(meshGeo, meshMat)
        mesh.position.copy(nodePos)
        scene.add(mesh)

        // Spinning wireframe orbit shell
        shellGeo = new THREE.TorusGeometry(0.72, 0.05, 8, 32)
        shellMat = new THREE.MeshBasicMaterial({
          color: baseColor,
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

    // Setup PoS validator-to-pool lock lines initially
    if (selectedAlgo === "pos" && scene) {
      if (posLines.current) {
        posLines.current.forEach(line => scene.remove(line));
        posLines.current = [];
      }
      
      const poolNode = newNodes.find(n => n.id === "stake-pool");
      const validators = newNodes.filter(n => n.type === "validator");
      
      if (poolNode) {
        const poolPos = new THREE.Vector3(poolNode.x, poolNode.y, poolNode.z);
        validators.forEach(v => {
          const valPos = new THREE.Vector3(v.x, v.y, v.z);
          const lineGeo = new THREE.BufferGeometry().setFromPoints([valPos, poolPos]);
          const lineMat = new THREE.LineBasicMaterial({
            color: 0xd4a62e,
            transparent: true,
            opacity: 0.2
          });
          const line = new THREE.Line(lineGeo, lineMat);
          scene.add(line);
          posLines.current.push(line);
        });
      }
    }

    // Setup ledger stacking chains (clean gold stacks, or teal rounded stacks for DPoS)
    if (blockchainGroup.current) {
      while (blockchainGroup.current.children.length > 0) {
        const obj = blockchainGroup.current.children[0]
        blockchainGroup.current.remove(obj)
        obj.geometry?.dispose()
        obj.material?.dispose()
      }

      // Do NOT show PoW blockchain stacks in idle/pre-selection state for PoS or PoA
      if (selectedAlgo !== "pos") {
        const isDpos = selectedAlgo === "dpos";
        const isPoa = selectedAlgo === "poa";

        if (isPoa) {
          // Pre-populate with 3 historical document seals
          for (let i = 0; i < 3; i++) {
            const doc = createPoaDocumentBlock(0x10b981);
            doc.position.set(-1.8 + i * 1.2, -1.5, -3.2);
            doc.userData = { producerLabel: `AUTH_0${(i % 3) + 1}` };
            blockchainGroup.current.add(doc);
            
            if (i > 0) {
              const lineGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-1.8 + (i - 1) * 1.2 + 0.25, -1.5, -3.2),
                new THREE.Vector3(-1.8 + i * 1.2 - 0.25, -1.5, -3.2)
              ]);
              const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.4 });
              const line = new THREE.Line(lineGeo, lineMat);
              blockchainGroup.current.add(line);
            }
          }
        } else {
          const blockGeo = isDpos ? createRoundedBoxGeometry(0.5, 0.5, 0.5, 0.08, 4) : new THREE.BoxGeometry(0.5, 0.5, 0.5);

          for (let i = 0; i < 3; i++) {
            const blockColor = isDpos ? 0x0a9c86 : 0xd4a62e;
            const blockMat = new THREE.MeshStandardMaterial({
              color: blockColor,
              roughness: 0.3,
              metalness: 0.8,
              emissive: blockColor,
              emissiveIntensity: 0.15,
            })
            const block = new THREE.Mesh(blockGeo, blockMat)
            block.position.set(-1.8 + i * 1.2, -1.5, -3.2)
            
            if (isDpos) {
              // Set producer names for the 3 historical blocks
              block.userData = { producerLabel: `DEL_0${(i % 3) + 1}` };
            }
            
            blockchainGroup.current.add(block)

            if (i > 0) {
              const lineGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-1.8 + (i - 1) * 1.2 + 0.25, -1.5, -3.2),
                new THREE.Vector3(-1.8 + i * 1.2 - 0.25, -1.5, -3.2)
              ])
              const lineMat = new THREE.LineBasicMaterial({ color: isDpos ? 0x0a9c86 : 0x475569 })
              const line = new THREE.Line(lineGeo, lineMat)
              blockchainGroup.current.add(line)
            }
          }
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
          if (selectedAlgo === "dpos") {
            // Apply scale
            const s = node.scale !== undefined ? node.scale : 1.0;
            obj.mesh.scale.set(s, s, s);
            if (obj.shell) obj.shell.scale.set(s, s, s);
            
            // Apply opacity
            const opacity = node.opacity !== undefined ? node.opacity : 1.0;
            const setOpacity = (m, op) => {
              if (m.material) {
                m.material.transparent = op < 1.0;
                m.material.opacity = op;
              }
            };
            if (obj.mesh.isGroup) {
              obj.mesh.traverse(child => setOpacity(child, opacity));
            } else {
              setOpacity(obj.mesh, opacity);
            }
            if (obj.shell) {
              obj.shell.material.transparent = true;
              obj.shell.material.opacity = opacity * 0.35;
            }

            // Apply position
            obj.mesh.position.set(node.x, node.y, node.z);
            if (obj.shell) {
              obj.shell.position.set(node.x, node.y, node.z);
            }

            // DPoS dynamic color logic
            let color = 0x6b4fa0; // Default delegate purple
            let emissive = 0x6b4fa0;
            let intensity = 0.15;
            
            if (node.type === "voter") {
              if (node.status === "FLASH_VOTING" || node.status === "RECALL_VOTE") {
                const isFlash = node.status === "RECALL_VOTE" ? (Math.sin(frame * 0.4) > 0) : true;
                color = node.status === "RECALL_VOTE" ? (isFlash ? 0xe24a4a : 0x4a90e2) : 0x7db8ff; // warning flash red or vote blue
                emissive = color;
                intensity = 0.8;
              } else {
                color = 0x4a90e2; // Idle voter blue
                emissive = 0x4a90e2;
                intensity = 0.2;
              }
            } else if (node.type === "delegate") {
              if (node.status === "SLASHED") {
                const isFlash = Math.sin(frame * 0.4) > 0;
                color = isFlash ? 0xe24a4a : 0x4a4a55; // Red warning flash
                emissive = color;
                intensity = isFlash ? 0.95 : 0.1;
              } else if (node.status === "RECALLED_GREY") {
                color = 0x4a4a55; // Fade to grey
                emissive = 0x4a4a55;
                intensity = 0.05;
              } else if (node.status === "PRODUCING" || node.status === "ACTIVE_SLOT") {
                color = 0x00d4b8; // Solid teal-green, no pulse
                emissive = 0x00d4b8;
                intensity = 0.6;
              } else if (node.status === "ELECTED") {
                color = 0x00d4b8; // Teal-green
                emissive = 0x00d4b8;
                intensity = 0.4;
              } else if (node.status === "VERIFIED") {
                color = 0x00d4b8; // Verified teal-green
                emissive = 0x00d4b8;
                intensity = 0.45;
              } else if (node.status === "CANDIDATE_PULSING") {
                // Pulse synced to vote-tally updates
                const pulse = 0.5 + 0.5 * Math.sin(frame * 0.15 * speed);
                const c1 = new THREE.Color(0x6b4fa0);
                const c2 = new THREE.Color(0x9b6fe0);
                const interpColor = c1.clone().lerp(c2, pulse);
                color = interpColor.getHex();
                emissive = color;
                intensity = 0.35 + 0.3 * pulse;
              } else {
                // Standby
                color = 0x6b4fa0;
                emissive = 0x6b4fa0;
                intensity = 0.15;
              }
            }
            
            obj.mesh.material.color.setHex(color);
            obj.mesh.material.emissive.setHex(emissive);
            obj.mesh.material.emissiveIntensity = intensity;
            if (obj.shell) {
              obj.shell.material.color.setHex(emissive);
            }
          } else if (selectedAlgo === "poa") {
            // Apply position for node
            obj.mesh.position.set(node.x, node.y, node.z);
            
            // Special ring detachment animation for revoked authority node
            if (obj.shell) {
              if (node.status === "REVOKED_GREY") {
                if (obj.shell.position.y === node.y) {
                  // Initialize falling physics
                  obj.shell.userData = { yVel: -0.05, yPos: node.y };
                }
                if (obj.shell.userData && obj.shell.userData.yPos !== undefined) {
                  obj.shell.userData.yVel -= 0.005 * speed;
                  obj.shell.userData.yPos += obj.shell.userData.yVel * speed;
                  obj.shell.position.set(node.x, obj.shell.userData.yPos, node.z);
                  
                  // Rotate randomly like a falling ring
                  obj.shell.rotation.x += 0.08 * speed;
                  obj.shell.rotation.z += 0.04 * speed;
                  
                  // Fade out opacity
                  obj.shell.material.transparent = true;
                  obj.shell.material.opacity = Math.max(0, 0.35 * (1 + obj.shell.userData.yPos / 2));
                }
              } else {
                obj.shell.position.set(node.x, node.y, node.z);
              }
            }
            
            // Apply scale
            const s = node.scale !== undefined ? node.scale : 1.0;
            obj.mesh.scale.set(s, s, s);
            if (obj.shell && node.status !== "REVOKED_GREY") obj.shell.scale.set(s, s, s);

            // Apply opacity
            const opacity = node.opacity !== undefined ? node.opacity : 1.0;
            const setOpacity = (m, op) => {
              if (m.material) {
                m.material.transparent = op < 1.0;
                m.material.opacity = op;
              }
            };
            if (obj.mesh.isGroup) {
              obj.mesh.traverse(child => setOpacity(child, opacity));
            } else {
              setOpacity(obj.mesh, opacity);
            }
            if (obj.shell && node.status !== "REVOKED_GREY") {
              obj.shell.material.transparent = true;
              obj.shell.material.opacity = opacity * 0.35;
            }

            // Custom coloring for PoA nodes
            let color = 0x5a627a; // Unverified neutral grey
            let emissive = 0x5a627a;
            let intensity = 0.1;

            if (node.type === "pool") {
              // Seal of Authority color
              color = 0x10b981; // emerald
              emissive = 0x10b981;
              intensity = 0.3;
              if (node.status === "SEAL_GLOW" || node.status === "ACTIVE") {
                intensity = 0.7;
              }
            } else if (node.type === "authority") {
              if (node.status === "REVOKED") {
                // Flash warning red
                const isFlash = Math.sin(frame * 0.4) > 0;
                color = isFlash ? 0xe24a4a : 0x3a3f4a;
                emissive = color;
                intensity = isFlash ? 0.95 : 0.1;
              } else if (node.status === "REVOKED_GREY") {
                color = 0x3a3f4a; // dead grey
                emissive = 0x3a3f4a;
                intensity = 0.05;
              } else if (node.status === "VERIFIED" || node.status === "KYC_OK") {
                color = 0x3b7dd8; // verified blue
                emissive = 0x3b7dd8;
                intensity = 0.25;
              } else if (node.status === "PROPOSING" || node.status === "ACTIVE_SLOT") {
                color = 0x10b981; // active green
                emissive = 0x10b981;
                intensity = 0.7;
              } else if (node.status === "VERIFYING") {
                color = 0x4a90e2; // blue verified sweep
                emissive = 0x4a90e2;
                intensity = 0.6;
              } else {
                // UNVERIFIED
                color = 0x5a627a;
                emissive = 0x5a627a;
                intensity = 0.1;
              }
            }

            // Apply color to mesh
            if (obj.mesh.material) {
              obj.mesh.material.color.setHex(color);
              obj.mesh.material.emissive.setHex(emissive);
              obj.mesh.material.emissiveIntensity = intensity;
            } else {
              obj.mesh.traverse(child => {
                if (child.material) {
                  child.material.color.setHex(color);
                  child.material.emissive.setHex(emissive);
                  child.material.emissiveIntensity = intensity;
                }
              });
            }
            if (obj.shell && node.status !== "REVOKED_GREY") {
              obj.shell.material.color.setHex(emissive);
            }
          } else if (selectedAlgo === "pos") {
            // Apply position
            obj.mesh.position.set(node.x, node.y, node.z);
            if (obj.shell) {
              obj.shell.position.set(node.x, node.y, node.z);
            }
            
            // Apply scale
            const s = node.scale !== undefined ? node.scale : 1.0;
            obj.mesh.scale.set(s, s, s);
            if (obj.shell) obj.shell.scale.set(s, s, s);

            // Apply opacity
            const opacity = node.opacity !== undefined ? node.opacity : 1.0;
            const setOpacity = (m, op) => {
              if (m.material) {
                m.material.transparent = op < 1.0;
                m.material.opacity = op;
              }
            };
            if (obj.mesh.isGroup) {
              obj.mesh.traverse(child => setOpacity(child, opacity));
            } else {
              setOpacity(obj.mesh, opacity);
            }
            if (obj.shell) {
              obj.shell.material.transparent = true;
              obj.shell.material.opacity = opacity * 0.35;
            }

            // Custom coloring for PoS nodes
            let color = 0x2a5a9c; // Dim steel-blue base
            let emissive = 0x2a5a9c;
            let intensity = 0.1;

            if (node.type === "pool") {
              // Pool color (gold `#D4A62E`)
              color = 0xd4a62e;
              emissive = 0xd4a62e;
              intensity = 0.2;
              if (node.status === "FLASH_DEPOSIT") {
                // Brighten gold
                color = 0xf0c860;
                emissive = 0xf0c860;
                intensity = 0.8;
              }
            } else if (node.type === "validator") {
              if (node.status === "SLASHED") {
                // Flash warning red
                const isFlash = Math.sin(frame * 0.4) > 0;
                color = isFlash ? 0xe24a4a : 0x3a3f4a;
                emissive = color;
                intensity = isFlash ? 0.95 : 0.1;
              } else if (node.status === "SLASHED_GREY") {
                color = 0x3a3f4a; // dead grey
                emissive = 0x3a3f4a;
                intensity = 0.05;
              } else if (node.status === "SELECTED" || node.status === "PROPOSER") {
                color = 0x00d4b8; // solid teal-green
                emissive = 0x00d4b8;
                intensity = 0.7;
              } else if (node.status === "ATTESTING") {
                // Pulse attestation-blue
                color = 0x4a90e2;
                emissive = 0x4a90e2;
                intensity = 0.6;
              } else if (node.status === "STAKED") {
                color = 0x3b7dd8; // medium blue
                emissive = 0x3b7dd8;
                intensity = 0.2;
              } else if (node.status === "ELIGIBLE") {
                // Brighten selection-eligible blue
                color = 0x5b9bff;
                emissive = 0x5b9bff;
                intensity = 0.45;
              } else {
                // Idle / low stake before animation
                color = 0x2a5a9c; // dim steel-blue
                emissive = 0x2a5a9c;
                intensity = 0.1;
              }
            }

            // Apply color to mesh
            if (obj.mesh.material) {
              obj.mesh.material.color.setHex(color);
              obj.mesh.material.emissive.setHex(emissive);
              obj.mesh.material.emissiveIntensity = intensity;
            } else {
              obj.mesh.traverse(child => {
                if (child.material) {
                  child.material.color.setHex(color);
                  child.material.emissive.setHex(emissive);
                  child.material.emissiveIntensity = intensity;
                }
              });
            }
            if (obj.shell) {
              obj.shell.material.color.setHex(emissive);
            }
          } else if (selectedAlgo === "poh") {
            // Apply position, scale, opacity
            obj.mesh.position.set(node.x, node.y, node.z);
            if (obj.shell) obj.shell.position.set(node.x, node.y, node.z);
            
            const s = node.scale !== undefined ? node.scale : 1.0;
            obj.mesh.scale.set(s, s, s);
            if (obj.shell) obj.shell.scale.set(s, s, s);

            const opacity = node.opacity !== undefined ? node.opacity : 1.0;
            const setOpacity = (m, op) => {
              if (m.material) {
                m.material.transparent = op < 1.0;
                m.material.opacity = op;
              }
            };
            if (obj.mesh.isGroup) {
              obj.mesh.traverse(child => setOpacity(child, opacity));
            } else {
              setOpacity(obj.mesh, opacity);
            }
            if (obj.shell) {
              obj.shell.material.transparent = true;
              obj.shell.material.opacity = opacity * 0.35;
            }

            // Custom coloring for PoH nodes
            let color = 0x3b7dd8; // Default validator blue
            let emissive = 0x3b7dd8;
            let intensity = 0.2;

            if (node.type === "poh-leader") {
              color = 0xf0a830; // warm amber-gold
              emissive = 0xf0a830;
              intensity = 0.5 + 0.15 * Math.sin(frame * 0.1 * speed);
            } else if (node.type === "validator") {
              if (node.status === "HIDDEN") {
                // hidden
              } else if (node.status === "VERIFIED") {
                color = 0x4ad8a0; // teal-green verified
                emissive = 0x4ad8a0;
                intensity = 0.65;
              } else {
                // VERIFYING
                color = 0x3b7dd8;
                emissive = 0x3b7dd8;
                intensity = 0.3 + 0.2 * Math.sin(frame * 0.08 * speed);
              }
            }

            if (obj.mesh.material) {
              obj.mesh.material.color.setHex(color);
              if (obj.mesh.material.emissive) {
                obj.mesh.material.emissive.setHex(emissive);
                obj.mesh.material.emissiveIntensity = intensity;
              }
            } else {
              obj.mesh.traverse(child => {
                if (child.material) {
                  child.material.color.setHex(color);
                  if (child.material.emissive) {
                    child.material.emissive.setHex(emissive);
                    child.material.emissiveIntensity = intensity;
                  }
                }
              });
            }
            if (obj.shell) {
              obj.shell.material.color.setHex(emissive);
            }
          } else {
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
              obj.mesh.material.emissiveIntensity = hasWinnerInScene ? 0.05 : 0.15
              if (obj.shell) obj.shell.material.color.setHex(dimColor)
            }
          }
        }
      })

      // Expanding finalized wave ripple
      if (showCompletion && selectedAlgo !== "dpos" && selectedAlgo !== "pos") {
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
      if (showCompletion && selectedAlgo !== "dpos" && selectedAlgo !== "pos" && !animatingBlock.current) {
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

      if (animatingBlock.current && selectedAlgo !== "dpos" && selectedAlgo !== "pos") {
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

      if (dposLines.current) {
        dposLines.current.forEach(line => {
          dispose3DObject(line, scene)
        })
        dposLines.current = []
      }

      if (simState.current.schedulerRing) {
        dispose3DObject(simState.current.schedulerRing, scene)
        simState.current.schedulerRing = null
      }

      if (simState.current.schedulerMarker) {
        dispose3DObject(simState.current.schedulerMarker, scene)
        simState.current.schedulerMarker = null
      }

      if (simState.current.dposBlock) {
        dispose3DObject(simState.current.dposBlock, scene)
        simState.current.dposBlock = null
      }

      if (simState.current.blockGlowMesh) {
        dispose3DObject(simState.current.blockGlowMesh, scene)
        simState.current.blockGlowMesh = null
      }

      if (posLines.current) {
        posLines.current.forEach(line => {
          dispose3DObject(line, scene)
        })
        posLines.current = []
      }

      if (simState.current.selectionBeam) {
        dispose3DObject(simState.current.selectionBeam, scene)
        simState.current.selectionBeam = null
      }

      if (simState.current.posBlock) {
        dispose3DObject(simState.current.posBlock, scene)
        simState.current.posBlock = null
      }

      if (simState.current.posBlockGlow) {
        dispose3DObject(simState.current.posBlockGlow, scene)
        simState.current.posBlockGlow = null
      }

      if (pohHelixBeads.current) {
        pohHelixBeads.current.forEach(bead => {
          dispose3DObject(bead.mesh, scene)
        })
        pohHelixBeads.current = []
      }

      if (pohBeadsGroup.current) {
        dispose3DObject(pohBeadsGroup.current, scene)
        pohBeadsGroup.current = null
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
      
      const currentStepIdx = Math.floor(currentProg / 12.5);
      if (simState.current.lastPosStep !== currentStepIdx) {
        simState.current.lastPosStep = currentStepIdx;
        
        // Reset properties
        validators.forEach((v, idx) => {
          v.scale = currentStepIdx === 0 ? 0.45 : (0.4 + (v.stake / 128) * 0.5);
          v.opacity = 1.0;
          v.status = currentStepIdx === 0 ? "IDLE" : "STAKED";
          v.isWinner = false;
          if (idx === 1) { // VAL_02
            v.stake = 64; // Reset to original stake
          }
        });
        
        if (pool) {
          pool.scale = 1.0;
          pool.status = "ACTIVE";
        }
        
        // Return original validator positions
        const stakes = [32, 64, 96, 128, 48, 80];
        validators.forEach((v, i) => {
          const angle = (i / 6) * Math.PI * 2;
          v.x = 3.5 * Math.cos(angle);
          v.y = 0.2;
          v.z = 3.5 * Math.sin(angle);
        });

        // Clean up transient elements
        if (dposLines.current) {
          dposLines.current.forEach(line => scene.remove(line));
          dposLines.current = [];
        }
        
        if (simState.current.selectionBeam) {
          scene.remove(simState.current.selectionBeam);
          simState.current.selectionBeam = null;
        }
        if (simState.current.posBlock) {
          scene.remove(simState.current.posBlock);
          simState.current.posBlock = null;
        }
        if (simState.current.posBlockGlow) {
          scene.remove(simState.current.posBlockGlow);
          simState.current.posBlockGlow = null;
        }
        
        simState.current.posWinnerPulseFired = false;
        simState.current.posBlockGlowCreated = false;
        simState.current.posAttestationFired = false;
      }

      // Step 1: Stake Tokens (0 to 12.5)
      if (currentProg < 12.5) {
        const t = currentProg / 12.5;
        
        // 0.0s - 0.8s (t < 0.64): Emit gold deposit lines/particles traveling inward
        if (t < 0.64) {
          const t_line = t / 0.64;
          
          if (dposLines.current.length === 0 && scene && pool) {
            validators.forEach(v => {
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const endPos = new THREE.Vector3(pool.x, pool.y, pool.z);
              const thickness = v.stake / 1200; // proportional
              const line = createThickLine(startPos, endPos, thickness, 0xd4a62e, 1.0);
              scene.add(line);
              dposLines.current.push(line);
            });
          }
          
          if (dposLines.current.length > 0) {
            const poolPos = new THREE.Vector3(pool.x, pool.y, pool.z);
            dposLines.current.forEach((line, idx) => {
              const v = validators[idx];
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const currentEnd = new THREE.Vector3().lerpVectors(startPos, poolPos, t_line);
              line.position.copy(new THREE.Vector3().addVectors(startPos, currentEnd).multiplyScalar(0.5));
              const dist = startPos.distanceTo(currentEnd);
              line.scale.set(1, Math.max(0.001, dist / startPos.distanceTo(poolPos)), 1);
            });
          }
          
          if (frame % 12 === 0 && isPlaying && pool) {
            validators.forEach(v => {
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const endPos = new THREE.Vector3(pool.x, pool.y, pool.z);
              spawn3DParticle(startPos, endPos, 0xf0c860, "stake-deposit");
            });
          }
        }
        // 0.8s - 1.2s (0.64 <= t < 0.96): Pool pulses and grows very slightly
        else if (t >= 0.64 && t < 0.96) {
          if (dposLines.current.length > 0) {
            dposLines.current.forEach(line => scene.remove(line));
            dposLines.current = [];
          }
          
          if (pool) {
            pool.status = "FLASH_DEPOSIT";
            const t_pulse = (t - 0.64) / 0.32;
            const ease_pulse = Math.sin(t_pulse * Math.PI);
            pool.scale = 1.0 + 0.05 * ease_pulse;
          }
        }
        // 1.2s - 1.8s (t >= 0.96): Validators grow to stake-proportional sizes
        else {
          if (pool) {
            pool.status = "ACTIVE";
            pool.scale = 1.0;
          }
          
          const t_grow = (t - 0.96) / 0.04; // 0 to 1
          const ease_grow = t_grow * t_grow * (3 - 2 * t_grow);
          
          validators.forEach(v => {
            const startScale = 0.45;
            const endScale = 0.4 + (v.stake / 128) * 0.5;
            v.scale = startScale + (endScale - startScale) * ease_grow;
            v.status = "STAKED";
          });
        }
      }
      
      // Step 2: Become Validator (12.5 to 25)
      else if (currentProg >= 12.5 && currentProg < 25) {
        if (dposLines.current.length > 0) {
          dposLines.current.forEach(line => scene.remove(line));
          dposLines.current = [];
        }
        validators.forEach(v => {
          v.scale = 0.4 + (v.stake / 128) * 0.5;
          v.status = "STAKED";
        });
      }
      
      // Step 3: Validator Selection (25 to 37.5)
      else if (currentProg >= 25 && currentProg < 37.5) {
        const t = (currentProg - 25) / 12.5;
        
        validators.forEach((v, idx) => {
          v.scale = 0.4 + (v.stake / 128) * 0.5;
          v.opacity = 1.0;
          v.status = "STAKED";
        });
        
        // Phase 3A: 0% to 75% step progress (25 to 34.3 prog) - Sweeping beam
        if (t < 0.75) {
          const t_sweep = t / 0.75;
          const sweepAngle = t_sweep * Math.PI * 4; // 2 rotations
          
          const valAngles = [0, 1, 2, 3, 4, 5].map(i => (i / 6) * Math.PI * 2);
          const stakes = [32, 64, 96, 128, 48, 80];
          
          let modulatedAngle = sweepAngle;
          for (let i = 0; i < 6; i++) {
            const stakeWeight = stakes[i] / 128;
            modulatedAngle -= 0.22 * stakeWeight * Math.sin(sweepAngle - valAngles[i]);
          }
          
          const poolPos = new THREE.Vector3(pool ? pool.x : 0, pool ? pool.y : 0.5, pool ? pool.z : 0);
          const beamEnd = new THREE.Vector3(
            3.5 * Math.cos(modulatedAngle),
            0.35,
            3.5 * Math.sin(modulatedAngle)
          );
          
          if (!simState.current.selectionBeam && scene) {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([poolPos, beamEnd]);
            const lineMat = new THREE.LineBasicMaterial({
              color: 0x00d4b8,
              linewidth: 2,
              transparent: true,
              opacity: 0.85
            });
            const line = new THREE.Line(lineGeo, lineMat);
            scene.add(line);
            simState.current.selectionBeam = line;
          }
          
          if (simState.current.selectionBeam) {
            const positions = [poolPos.x, poolPos.y, poolPos.z, beamEnd.x, beamEnd.y, beamEnd.z];
            simState.current.selectionBeam.geometry.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(positions, 3)
            );
            simState.current.selectionBeam.geometry.attributes.position.needsUpdate = true;
          }
          
          // Highlight validators as selection scanning beam sweeps near them
          validators.forEach((v, idx) => {
            const angleDiff = Math.abs((modulatedAngle % (Math.PI * 2)) - valAngles[idx]);
            if (angleDiff < 0.35 || angleDiff > (Math.PI * 2 - 0.35)) {
              v.status = "ELIGIBLE";
            } else {
              v.status = "STAKED";
            }
          });
        }
        // Phase 3B: 75% to 90% step progress (34.3 to 36.2 prog) - Hard stop on VAL_04
        else if (t >= 0.75 && t < 0.9) {
          const targetAngle = (3 / 6) * Math.PI * 2; // angle for VAL_04
          const poolPos = new THREE.Vector3(pool ? pool.x : 0, pool ? pool.y : 0.5, pool ? pool.z : 0);
          const beamEnd = new THREE.Vector3(
            3.5 * Math.cos(targetAngle),
            0.35,
            3.5 * Math.sin(targetAngle)
          );
          
          if (simState.current.selectionBeam) {
            const positions = [poolPos.x, poolPos.y, poolPos.z, beamEnd.x, beamEnd.y, beamEnd.z];
            simState.current.selectionBeam.geometry.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(positions, 3)
            );
            simState.current.selectionBeam.geometry.attributes.position.needsUpdate = true;
          }
          
          validators[3].status = "ELIGIBLE";
        }
        // Phase 3C: 90% to 100% step progress (36.2 to 37.5 prog) - Selected pop & ring pulse
        else {
          if (simState.current.selectionBeam) {
            scene.remove(simState.current.selectionBeam);
            simState.current.selectionBeam = null;
          }
          
          const t_pop = (t - 0.9) / 0.1;
          const ease_pop = Math.sin(t_pop * Math.PI);
          const baseScale = 0.4 + (validators[3].stake / 128) * 0.5;
          validators[3].scale = baseScale * (1.0 + 0.15 * ease_pop);
          validators[3].status = "SELECTED";
          validators[3].isWinner = true;
          
          if (!simState.current.posWinnerPulseFired && scene) {
            simState.current.posWinnerPulseFired = true;
            const ringGeo = new THREE.RingGeometry(0.5, 1.2, 32);
            const ringMat = new THREE.MeshBasicMaterial({
              color: 0x00d4b8,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.8
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(validators[3].x, validators[3].y, validators[3].z);
            ring.rotation.x = Math.PI / 2;
            scene.add(ring);
            
            threeParticles.current.push({
              mesh: ring,
              type: "sig-pulse",
              life: 1.0,
              decay: 0.04 * speed
            });
          }
          
          validators.forEach((v, idx) => {
            if (idx !== 3) {
              v.opacity = 0.7;
            }
          });
        }
      }
      
      // Step 4: Block Proposal (37.5 to 50)
      else if (currentProg >= 37.5 && currentProg < 50) {
        const t = (currentProg - 37.5) / 12.5;
        
        if (simState.current.selectionBeam) {
          scene.remove(simState.current.selectionBeam);
          simState.current.selectionBeam = null;
        }
        
        validators.forEach((v, idx) => {
          v.scale = 0.4 + (v.stake / 128) * 0.5;
          if (idx === 3) {
            v.status = "PROPOSER";
            v.isWinner = true;
            v.opacity = 1.0;
          } else {
            v.status = "STAKED";
            v.opacity = 0.7;
          }
        });
        
        // Phase 4A: 0% to 48% step progress (37.5 to 43.5 prog) - Block materialization
        if (t < 0.48) {
          const t_scale = t / 0.48;
          const ease_scale = t_scale * t_scale * (3 - 2 * t_scale);
          
          if (!simState.current.posBlock && scene) {
            const blockGeom = createRoundedBoxGeometry(0.5, 0.5, 0.5, 0.08, 4);
            const blockMat = new THREE.MeshStandardMaterial({
              color: 0x00d4b8,
              emissive: 0x00d4b8,
              emissiveIntensity: 0.6,
              roughness: 0.3,
              metalness: 0.8
            });
            const blockMesh = new THREE.Mesh(blockGeom, blockMat);
            blockMesh.position.set(validators[3].x, validators[3].y + 1.2, validators[3].z);
            blockMesh.scale.set(0, 0, 0);
            scene.add(blockMesh);
            simState.current.posBlock = blockMesh;
          }
          
          if (simState.current.posBlock) {
            simState.current.posBlock.scale.set(ease_scale, ease_scale, ease_scale);
          }
        }
        // Phase 4B: 48% to 100% step progress (43.5 to 50 prog) - Block travels to ledger chain
        else {
          const t_travel = (t - 0.48) / 0.52;
          const ease_travel = t_travel * t_travel * (3 - 2 * t_travel);
          
          const startPos = new THREE.Vector3(validators[3].x, validators[3].y + 1.2, validators[3].z);
          const endPos = new THREE.Vector3(-1.8, -1.5, -3.2);
          
          if (simState.current.posBlock) {
            simState.current.posBlock.position.lerpVectors(startPos, endPos, ease_travel);
            
            const brightTeal = new THREE.Color(0x00d4b8);
            const deepTeal = new THREE.Color(0x0a9c86);
            simState.current.posBlock.material.color.lerpColors(brightTeal, deepTeal, ease_travel);
            simState.current.posBlock.material.emissive.lerpColors(brightTeal, deepTeal, ease_travel);
            simState.current.posBlock.material.emissiveIntensity = 0.6 - 0.45 * ease_travel;
            
            simState.current.posBlock.userData = { producerLabel: "VAL_04" };
          }
        }
      }
      
      // Step 5: Validator Attestation (50 to 62.5) & Step 6: Consensus (62.5 to 75)
      else if (currentProg >= 50 && currentProg < 75) {
        const t = (currentProg - 50) / 25;
        
        validators.forEach((v, idx) => {
          v.scale = 0.4 + (v.stake / 128) * 0.5;
          if (idx === 3) {
            v.status = "PROPOSER";
            v.isWinner = true;
            v.opacity = 1.0;
          } else {
            v.opacity = 0.7;
          }
        });

        if (simState.current.posBlock) {
          simState.current.posBlock.position.set(-1.8, -1.5, -3.2);
          simState.current.posBlock.material.color.setHex(0x0a9c86);
          simState.current.posBlock.material.emissive.setHex(0x0a9c86);
          simState.current.posBlock.material.emissiveIntensity = 0.15;
        }

        const attesters = [
          { idx: 0, start: 0.05, end: 0.35 },
          { idx: 1, start: 0.12, end: 0.42 },
          { idx: 2, start: 0.20, end: 0.50 },
          { idx: 4, start: 0.28, end: 0.58 },
          { idx: 5, start: 0.35, end: 0.65 }
        ];
        
        attesters.forEach(att => {
          const val = validators[att.idx];
          if (t >= att.start && t < att.end) {
            val.status = "ATTESTING";
            val.opacity = 1.0;
            
            if (frame % 15 === 0 && isPlaying) {
              const startPos = new THREE.Vector3(val.x, val.y, val.z);
              const endPos = new THREE.Vector3(-1.8, -1.5, -3.2);
              spawn3DParticle(startPos, endPos, 0x4a90e2, "attestation-cast");
            }
          } else {
            if (t >= att.end) {
              val.status = "STAKED";
              val.opacity = 0.85;
            } else {
              val.status = "STAKED";
            }
          }
        });
      }
      
      // Step 7: Finalization (75 to 87.5)
      else if (currentProg >= 75 && currentProg < 87.5) {
        const t = (currentProg - 75) / 12.5;
        
        validators.forEach((v, idx) => {
          v.scale = 0.4 + (v.stake / 128) * 0.5;
          v.status = "STAKED";
          v.opacity = 1.0;
          v.isWinner = false;
        });

        if (simState.current.posBlock) {
          simState.current.posBlock.position.set(-1.8, -1.5, -3.2);
          simState.current.posBlock.material.color.setHex(0x0a9c86);
          simState.current.posBlock.material.emissive.setHex(0x0a9c86);
          simState.current.posBlock.material.emissiveIntensity = 0.15;
          
          if (!simState.current.posBlockGlowCreated && scene) {
            simState.current.posBlockGlowCreated = true;
            
            const glowGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
            const glowMat = new THREE.MeshBasicMaterial({
              color: 0x00d4b8,
              wireframe: true,
              transparent: true,
              opacity: 0.45
            });
            const glowMesh = new THREE.Mesh(glowGeo, glowMat);
            glowMesh.position.copy(simState.current.posBlock.position);
            scene.add(glowMesh);
            simState.current.posBlockGlow = glowMesh;
          }
        }
      }
      
      // Step 8: Rewards / Slashing (87.5 to 100)
      else if (currentProg >= 87.5 && currentProg <= 100) {
        const t = (currentProg - 87.5) / 12.5;
        
        if (simState.current.posBlockGlow) {
          scene.remove(simState.current.posBlockGlow);
          simState.current.posBlockGlow = null;
        }

        if (dposLines.current.length > 0 && t < 0.96) {
          dposLines.current.forEach(line => scene.remove(line));
          dposLines.current = [];
        }

        validators[3].status = "STAKED";
        validators[3].opacity = 1.0;

        // Phase 8A: 0% to 32% step progress (87.5 to 91.5 prog) - Flash red misbehavior penalty
        if (t < 0.32) {
          validators[1].status = "SLASHED";
          validators[1].scale = 0.4 + (validators[1].stake / 128) * 0.5;
        }
        // Phase 8B: 32% to 96% step progress (91.5 to 99.5 prog) - Shrink and turn grey
        else if (t >= 0.32 && t < 0.96) {
          const t_shrink = (t - 0.32) / 0.64;
          const ease_shrink = t_shrink * t_shrink;
          
          const startScale = 0.4 + (64 / 128) * 0.5;
          const targetScale = 0.35;
          
          validators[1].scale = startScale + (targetScale - startScale) * ease_shrink;
          validators[1].status = "SLASHED_GREY";
          validators[1].stake = 64 - Math.floor(t_shrink * 48);
        }
        // Phase 8C: 96% to 100% step progress (99.5 to 100 prog) - Value leaving system
        else {
          validators[1].scale = 0.35;
          validators[1].status = "SLASHED_GREY";
          validators[1].stake = 16;
          
          const t_line = (t - 0.96) / 0.04;
          
          if (dposLines.current.length === 0 && scene && pool) {
            const poolPos = new THREE.Vector3(pool.x, pool.y, pool.z);
            const outPos = new THREE.Vector3(0, 3.0, 0);
            const redLine = createThickLine(poolPos, outPos, 0.025, 0xe24a4a, 0.9);
            scene.add(redLine);
            dposLines.current.push(redLine);
          }
          
          if (dposLines.current.length > 0) {
            dposLines.current.forEach(line => {
              line.position.y = 0.5 + t_line * 2.5;
              if (line.material) {
                line.material.opacity = Math.max(0, 0.9 * (1.0 - t_line));
              }
            });
          }
        }
      }
    }

    // 3. Delegated Proof of Stake
    else if (selectedAlgo === "dpos") {
      const delegates = nodes.filter(n => n.type === "delegate")
      const voters = nodes.filter(n => n.type === "voter")

      // Clear any effects if the step changes
      const currentStepIdx = Math.floor(currentProg / 20);
      if (simState.current.lastDposStep !== currentStepIdx) {
        simState.current.lastDposStep = currentStepIdx;
        
        // Reset node configurations
        delegates.forEach(d => {
          d.scale = 1.0;
          d.opacity = 1.0;
          d.status = "STANDBY";
        });
        voters.forEach((v, idx) => {
          v.scale = 1.0;
          v.opacity = 1.0;
          v.status = "VOTING";
          if (idx === 4) {
            v.x = -3.8;
            v.y = 0.9;
            v.z = -0.1;
            v.label = "VOTER_05";
          }
        });
        
        // Return DEL_02 to its arc position if it was in the active slot
        delegates[1].x = 3.2;
        delegates[1].y = 0.2;
        delegates[1].z = -1.2;

        // Clean up visual refs
        if (dposLines.current) {
          dposLines.current.forEach(line => scene.remove(line));
          dposLines.current = [];
        }
        if (simState.current.schedulerRing) {
          scene.remove(simState.current.schedulerRing);
          simState.current.schedulerRing = null;
        }
        if (simState.current.schedulerMarker) {
          scene.remove(simState.current.schedulerMarker);
          simState.current.schedulerMarker = null;
        }
        if (simState.current.dposBlock) {
          scene.remove(simState.current.dposBlock);
          simState.current.dposBlock = null;
        }
        if (simState.current.blockGlowMesh) {
          scene.remove(simState.current.blockGlowMesh);
          simState.current.blockGlowMesh = null;
        }
        simState.current.dposPulseFired = false;
        simState.current.verifierPulsesFired = false;
        simState.current.blockGlowCreated = false;
      }

      // Step 1: Delegate Election (0 to 20)
      if (currentProg < 20) {
        const t = currentProg / 20;
        
        // Phase 1A: 0% to 50% step progress (0 to 10 prog)
        if (t < 0.5) {
          const t_line = t / 0.5;
          
          voters.forEach(v => { v.status = "FLASH_VOTING"; });
          delegates.forEach(d => { d.status = "CANDIDATE_PULSING"; });
          
          // Target delegates: Voter1 -> Del1, Voter2 -> Del2, Voter3 -> Del2, Voter4 -> Del3, Voter5 -> Del4
          const targets = [delegates[0], delegates[1], delegates[1], delegates[2], delegates[3]];
          
          if (dposLines.current.length === 0 && scene) {
            voters.forEach((v, idx) => {
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const targetPos = new THREE.Vector3(targets[idx].x, targets[idx].y, targets[idx].z);
              const thickness = v.stake / 50000;
              const line = createThickLine(startPos, targetPos, thickness, 0x4a90e2, 1.0);
              scene.add(line);
              dposLines.current.push(line);
            });
          }
          
          if (dposLines.current.length > 0) {
            dposLines.current.forEach((line, idx) => {
              const v = voters[idx];
              const target = targets[idx];
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const targetPos = new THREE.Vector3(target.x, target.y, target.z);
              const currentEnd = new THREE.Vector3().lerpVectors(startPos, targetPos, t_line);
              
              line.position.copy(new THREE.Vector3().addVectors(startPos, currentEnd).multiplyScalar(0.5));
              const dist = startPos.distanceTo(currentEnd);
              line.scale.set(1, Math.max(0.001, dist / startPos.distanceTo(targetPos)), 1);
            });
          }
          
          if (frame % 15 === 0 && isPlaying) {
            voters.forEach((v, idx) => {
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const targetPos = new THREE.Vector3(targets[idx].x, targets[idx].y, targets[idx].z);
              spawn3DParticle(startPos, targetPos, 0x7db8ff, "vote-cast");
            });
          }
        }
        // Phase 1B: 50% to 90% step progress (10 to 18 prog)
        else if (t >= 0.5 && t < 0.9) {
          voters.forEach(v => { v.status = "VOTING"; });
          delegates.forEach(d => { d.status = "CANDIDATE_PULSING"; });
          
          if (dposLines.current.length > 0) {
            dposLines.current.forEach(line => {
              line.scale.set(1, 1, 1);
              if (line.material) {
                line.material.opacity = 0.5;
              }
            });
          }
        }
        // Phase 1C: 90% to 100% step progress (18 to 20 prog)
        else {
          voters.forEach(v => { v.status = "VOTING"; });
          delegates.forEach((d, idx) => {
            if (idx < 4) {
              d.status = "ELECTED";
            } else {
              d.status = "STANDBY";
            }
          });
          
          if (!simState.current.dposPulseFired && scene) {
            simState.current.dposPulseFired = true;
            for (let i = 0; i < 4; i++) {
              const d = delegates[i];
              const ringGeo = new THREE.RingGeometry(0.5, 1.2, 32);
              const ringMat = new THREE.MeshBasicMaterial({
                color: 0x00d4b8,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
              });
              const ring = new THREE.Mesh(ringGeo, ringMat);
              ring.position.set(d.x, d.y, d.z);
              ring.rotation.x = Math.PI / 2;
              scene.add(ring);
              
              threeParticles.current.push({
                mesh: ring,
                type: "sig-pulse",
                life: 1.0,
                decay: 0.05 * speed
              });
            }
          }
        }
      }
      
      // Step 2: Slot Scheduling (20 to 40)
      else if (currentProg >= 20 && currentProg < 40) {
        const t = (currentProg - 20) / 20;
        
        if (dposLines.current.length > 0) {
          dposLines.current.forEach(line => scene.remove(line));
          dposLines.current = [];
        }
        
        // Phase 2A: 0% to 70% step progress (20 to 34 prog)
        if (t < 0.7) {
          const t_ticket = t / 0.7;
          
          delegates.forEach((d, idx) => {
            if (idx < 4) d.status = "ELECTED";
          });
          
          if (!simState.current.schedulerRing && scene) {
            const ringGeom = new THREE.RingGeometry(3.45, 3.55, 64);
            const ringMat = new THREE.MeshBasicMaterial({
              color: 0x00d4b8,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.15,
              depthWrite: false
            });
            const ringMesh = new THREE.Mesh(ringGeom, ringMat);
            ringMesh.rotation.x = Math.PI / 2;
            ringMesh.position.set(1.0, 0.2, 0.0);
            scene.add(ringMesh);
            simState.current.schedulerRing = ringMesh;
          }
          
          if (!simState.current.schedulerMarker && scene) {
            const markerGeom = new THREE.SphereGeometry(0.18, 16, 16);
            const markerMat = new THREE.MeshBasicMaterial({
              color: 0x00d4b8,
              transparent: true,
              opacity: 0.95
            });
            const markerMesh = new THREE.Mesh(markerGeom, markerMat);
            scene.add(markerMesh);
            simState.current.schedulerMarker = markerMesh;
          }
          
          if (simState.current.schedulerMarker) {
            const activeDelegates = [delegates[0], delegates[1], delegates[2], delegates[3]];
            const idxFraction = t_ticket * (activeDelegates.length - 1);
            const idx1 = Math.floor(idxFraction);
            const idx2 = Math.min(activeDelegates.length - 1, idx1 + 1);
            const factor = idxFraction - idx1;
            
            const p1 = new THREE.Vector3(activeDelegates[idx1].x, 0.35, activeDelegates[idx1].z);
            const p2 = new THREE.Vector3(activeDelegates[idx2].x, 0.35, activeDelegates[idx2].z);
            simState.current.schedulerMarker.position.lerpVectors(p1, p2, factor);
            
            activeDelegates.forEach((d, idx) => {
              if (idxFraction >= idx - 0.2 && idxFraction <= idx + 0.2) {
                d.status = `SLOT #${idx + 1}`;
              } else {
                d.status = "ELECTED";
              }
            });
          }
        }
        // Phase 2B: 70% to 100% step progress (34 to 40 prog)
        else {
          const t_move = (t - 0.7) / 0.3;
          const ease_t = t_move * t_move * (3 - 2 * t_move);
          
          if (simState.current.schedulerMarker) {
            scene.remove(simState.current.schedulerMarker);
            simState.current.schedulerMarker = null;
          }
          
          const startPos = new THREE.Vector3(3.2, 0.2, -1.2);
          const activeSlotPos = new THREE.Vector3(0.0, 1.0, 1.8);
          delegates[1].x = startPos.x + (activeSlotPos.x - startPos.x) * ease_t;
          delegates[1].y = startPos.y + (activeSlotPos.y - startPos.y) * ease_t;
          delegates[1].z = startPos.z + (activeSlotPos.z - startPos.z) * ease_t;
          
          delegates[1].scale = 1.0 + 0.15 * ease_t;
          delegates[1].status = "ACTIVE_SLOT";
          
          delegates[0].status = "ELECTED";
          delegates[2].status = "ELECTED";
          delegates[3].status = "ELECTED";
        }
      }
      
      // Step 3: Block Production (40 to 60)
      else if (currentProg >= 40 && currentProg < 60) {
        const t = (currentProg - 40) / 20;
        
        if (simState.current.schedulerRing) {
          scene.remove(simState.current.schedulerRing);
          simState.current.schedulerRing = null;
        }
        
        delegates[1].x = 0.0;
        delegates[1].y = 1.0;
        delegates[1].z = 1.8;
        delegates[1].scale = 1.15;
        delegates[1].status = "PRODUCING";
        
        // Phase 3A: 0% to 55% step progress (40 to 51 prog) - Block materialization
        if (t < 0.55) {
          const t_scale = t / 0.55;
          const ease_scale = t_scale * t_scale * (3 - 2 * t_scale);
          
          if (!simState.current.dposBlock && scene) {
            const blockGeom = createRoundedBoxGeometry(0.5, 0.5, 0.5, 0.08, 4);
            const blockMat = new THREE.MeshStandardMaterial({
              color: 0x00d4b8,
              emissive: 0x00d4b8,
              emissiveIntensity: 0.6,
              roughness: 0.3,
              metalness: 0.8
            });
            const blockMesh = new THREE.Mesh(blockGeom, blockMat);
            blockMesh.position.set(0.0, 2.2, 1.8);
            blockMesh.scale.set(0, 0, 0);
            scene.add(blockMesh);
            simState.current.dposBlock = blockMesh;
          }
          
          if (simState.current.dposBlock) {
            simState.current.dposBlock.scale.set(ease_scale, ease_scale, ease_scale);
          }
        }
        // Phase 3B: 55% to 100% step progress (51 to 60 prog) - Block travels to ledger chain
        else {
          const t_travel = (t - 0.55) / 0.45;
          const ease_travel = t_travel * t_travel * (3 - 2 * t_travel);
          
          const startPos = new THREE.Vector3(0.0, 2.2, 1.8);
          const endPos = new THREE.Vector3(1.8, -1.5, -3.2);
          
          if (simState.current.dposBlock) {
            simState.current.dposBlock.position.lerpVectors(startPos, endPos, ease_travel);
            
            const brightTeal = new THREE.Color(0x00d4b8);
            const deepTeal = new THREE.Color(0x0a9c86);
            simState.current.dposBlock.material.color.lerpColors(brightTeal, deepTeal, ease_travel);
            simState.current.dposBlock.material.emissive.lerpColors(brightTeal, deepTeal, ease_travel);
            simState.current.dposBlock.material.emissiveIntensity = 0.6 - 0.45 * ease_travel;
          }
        }
      }
      
      // Step 4: Delegate Verification (60 to 80)
      else if (currentProg >= 60 && currentProg < 80) {
        const t = (currentProg - 60) / 20;
        
        if (simState.current.dposBlock) {
          simState.current.dposBlock.position.set(1.8, -1.5, -3.2);
          simState.current.dposBlock.material.color.setHex(0x0a9c86);
          simState.current.dposBlock.material.emissive.setHex(0x0a9c86);
          simState.current.dposBlock.material.emissiveIntensity = 0.15;
        }
        
        delegates[1].x = 0.0;
        delegates[1].y = 1.0;
        delegates[1].z = 1.8;
        delegates[1].scale = 1.15;
        delegates[1].status = "VERIFYING";
        
        // Phase 4A: 0% to 50% step progress (60 to 70 prog) - Emit verification lines
        if (t < 0.5) {
          const t_line = t / 0.5;
          const verifiers = [delegates[0], delegates[2], delegates[3], delegates[4]];
          const blockPos = new THREE.Vector3(1.8, -1.5, -3.2);
          
          if (dposLines.current.length === 0 && scene) {
            verifiers.forEach(v => {
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const line = createThickLine(startPos, blockPos, 0.015, 0x00d4b8, 0.8);
              scene.add(line);
              dposLines.current.push(line);
            });
          }
          
          if (dposLines.current.length > 0) {
            dposLines.current.forEach((line, idx) => {
              const v = verifiers[idx];
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const currentEnd = new THREE.Vector3().lerpVectors(startPos, blockPos, t_line);
              
              line.position.copy(new THREE.Vector3().addVectors(startPos, currentEnd).multiplyScalar(0.5));
              const dist = startPos.distanceTo(currentEnd);
              line.scale.set(1, Math.max(0.001, dist / startPos.distanceTo(blockPos)), 1);
            });
          }
        }
        // Phase 4B: 50% to 85% step progress (70 to 77 prog) - Confirm ring pulses
        else if (t >= 0.5 && t < 0.85) {
          if (dposLines.current.length > 0) {
            dposLines.current.forEach(line => {
              if (line.material) line.material.opacity = 0.25;
            });
          }
          
          if (!simState.current.verifierPulsesFired && scene) {
            simState.current.verifierPulsesFired = true;
            const verifiers = [delegates[0], delegates[2], delegates[3], delegates[4]];
            verifiers.forEach(v => {
              v.status = "VERIFIED";
              const ringGeo = new THREE.RingGeometry(0.5, 1.2, 32);
              const ringMat = new THREE.MeshBasicMaterial({
                color: 0x00d4b8,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
              });
              const ring = new THREE.Mesh(ringGeo, ringMat);
              ring.position.set(v.x, v.y, v.z);
              ring.rotation.x = Math.PI / 2;
              scene.add(ring);
              
              threeParticles.current.push({
                mesh: ring,
                type: "sig-pulse",
                life: 1.0,
                decay: 0.04 * speed
              });
            });
          }
        }
        // Phase 4C: 85% to 100% step progress (77 to 80 prog) - Confirmed outline glow
        else {
          if (dposLines.current.length > 0) {
            dposLines.current.forEach(line => scene.remove(line));
            dposLines.current = [];
          }
          
          if (!simState.current.blockGlowCreated && scene && simState.current.dposBlock) {
            simState.current.blockGlowCreated = true;
            
            const glowGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
            const glowMat = new THREE.MeshBasicMaterial({
              color: 0x00d4b8,
              wireframe: true,
              transparent: true,
              opacity: 0.45
            });
            const glowMesh = new THREE.Mesh(glowGeo, glowMat);
            glowMesh.position.copy(simState.current.dposBlock.position);
            scene.add(glowMesh);
            simState.current.blockGlowMesh = glowMesh;
          }
        }
      }
      
      // Step 5: Governance Recall (80 to 100)
      else if (currentProg >= 80 && currentProg <= 100) {
        const t = (currentProg - 80) / 20;
        
        if (dposLines.current.length > 0) {
          dposLines.current.forEach(line => scene.remove(line));
          dposLines.current = [];
        }
        if (simState.current.blockGlowMesh) {
          scene.remove(simState.current.blockGlowMesh);
          simState.current.blockGlowMesh = null;
        }
        
        // Return DEL_02 to its arc position
        const t_ret = Math.min(1.0, t / 0.15);
        const ease_ret = t_ret * t_ret * (3 - 2 * t_ret);
        const activeSlotPos = new THREE.Vector3(0.0, 1.0, 1.8);
        const arcPos = new THREE.Vector3(3.2, 0.2, -1.2);
        delegates[1].x = activeSlotPos.x + (arcPos.x - activeSlotPos.x) * ease_ret;
        delegates[1].y = activeSlotPos.y + (arcPos.y - activeSlotPos.y) * ease_ret;
        delegates[1].z = activeSlotPos.z + (arcPos.z - activeSlotPos.z) * ease_ret;
        delegates[1].scale = 1.15 - 0.15 * ease_ret;
        delegates[1].status = "ELECTED";
        
        // Phase 5A: 15% to 50% step progress (83 to 90 prog) - Voter anger lines
        if (t >= 0.15 && t < 0.5) {
          const t_line = (t - 0.15) / 0.35;
          const targetPos = new THREE.Vector3(delegates[3].x, delegates[3].y, delegates[3].z);
          const angryVoters = [voters[0], voters[1], voters[3]];
          
          if (dposLines.current.length === 0 && scene) {
            angryVoters.forEach(v => {
              v.status = "RECALL_VOTE";
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const line = createThickLine(startPos, targetPos, 0.02, 0xe24a4a, 0.9);
              scene.add(line);
              dposLines.current.push(line);
            });
          }
          
          if (dposLines.current.length > 0) {
            dposLines.current.forEach((line, idx) => {
              const v = angryVoters[idx];
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const currentEnd = new THREE.Vector3().lerpVectors(startPos, targetPos, t_line);
              
              line.position.copy(new THREE.Vector3().addVectors(startPos, currentEnd).multiplyScalar(0.5));
              const dist = startPos.distanceTo(currentEnd);
              line.scale.set(1, Math.max(0.001, dist / startPos.distanceTo(targetPos)), 1);
            });
          }
        }
        // Phase 5B: 50% to 75% step progress (90 to 95 prog) - Slashed warning flashes
        else if (t >= 0.5 && t < 0.75) {
          if (dposLines.current.length > 0) {
            dposLines.current.forEach(line => scene.remove(line));
            dposLines.current = [];
          }
          voters.forEach(v => { v.status = "VOTING"; });
          delegates[3].status = "SLASHED";
        }
        // Phase 5C: 75% to 90% step progress (95 to 98 prog) - DEL_04 flies out
        else if (t >= 0.75 && t < 0.9) {
          const t_out = (t - 0.75) / 0.15;
          const ease_out = t_out * t_out;
          
          const startArcPos = new THREE.Vector3(3.2, 0.2, 1.2);
          const outPos = new THREE.Vector3(4.5, -1.0, 2.0);
          
          delegates[3].x = startArcPos.x + (outPos.x - startArcPos.x) * ease_out;
          delegates[3].y = startArcPos.y + (outPos.y - startArcPos.y) * ease_out;
          delegates[3].z = startArcPos.z + (outPos.z - startArcPos.z) * ease_out;
          
          delegates[3].scale = 1.0 - 0.4 * ease_out;
          delegates[3].opacity = 1.0 - 0.7 * ease_out;
          delegates[3].status = "RECALLED_GREY";
        }
        // Phase 5D: 90% to 100% step progress (98 to 100 prog) - Voter 5 promotes to arc
        else {
          delegates[3].x = 4.5;
          delegates[3].y = -1.0;
          delegates[3].z = 2.0;
          delegates[3].scale = 0.6;
          delegates[3].opacity = 0.3;
          delegates[3].status = "RECALLED_GREY";
          
          const t_promo = (t - 0.9) / 0.1;
          const ease_promo = t_promo * t_promo * (3 - 2 * t_promo);
          
          const voterStart = new THREE.Vector3(-3.8, 0.9, -0.1);
          const delegateArcPos = new THREE.Vector3(3.2, 0.2, 1.2);
          
          voters[4].x = voterStart.x + (delegateArcPos.x - voterStart.x) * ease_promo;
          voters[4].y = voterStart.y + (delegateArcPos.y - voterStart.y) * ease_promo;
          voters[4].z = voterStart.z + (delegateArcPos.z - voterStart.z) * ease_promo;
          
          voters[4].label = "DEL_04_NEW";
          voters[4].status = "STANDBY";
        }
      }
    }

    // 4. Proof of Authority
    else if (selectedAlgo === "poa") {
      const center = nodes.find(n => n.id === "consensus-center")
      const auths = nodes.filter(n => n.type === "authority")
      const centerPos = new THREE.Vector3(center.x, center.y, center.z)

      // Step 1: Identity Verification (0 to 20)
      if (currentProg < 20) {
        // Reset subsequent steps' transient states
        if (dposLines.current.length > 0) {
          dposLines.current.forEach(line => scene.remove(line));
          dposLines.current = [];
        }
        if (simState.current.posBlock) {
          scene.remove(simState.current.posBlock);
          simState.current.posBlock.traverse(child => {
            child.geometry?.dispose();
            child.material?.dispose();
          });
          simState.current.posBlock = null;
        }
        if (simState.current.posBlockGlow) {
          scene.remove(simState.current.posBlockGlow);
          simState.current.posBlockGlow.geometry?.dispose();
          simState.current.posBlockGlow.material?.dispose();
          simState.current.posBlockGlow = null;
        }
        center.status = "ACTIVE"
        auths.forEach(a => {
          a.scale = 1.0;
          a.opacity = 1.0;
        });

        // Individually verify AUTH nodes one at a time based on currentProg
        auths.forEach((a, idx) => {
          const triggerProg = 3 + idx * 4; // 3, 7, 11, 15
          if (currentProg >= triggerProg) {
            if (a.status !== "KYC_OK") {
              a.status = "KYC_OK";
              // Trigger a small checkmark / signature circle pulse at node coordinates
              if (scene) {
                const pulseGeo = new THREE.RingGeometry(0.3, 0.8, 16);
                const pulseMat = new THREE.MeshBasicMaterial({
                  color: 0x3b7dd8, // verified blue
                  side: THREE.DoubleSide,
                  transparent: true,
                  opacity: 0.8,
                });
                const pulse = new THREE.Mesh(pulseGeo, pulseMat);
                pulse.position.set(a.x, a.y + 0.3, a.z);
                pulse.rotation.x = Math.PI / 2;
                scene.add(pulse);

                threeParticles.current.push({
                  mesh: pulse,
                  type: "sig-pulse",
                  life: 1.0,
                  decay: 0.05 * speed
                });
              }
            }
          } else {
            a.status = "UNVERIFIED";
          }
        });
      }
      
      // Step 2: Key Authorization (20 to 40)
      else if (currentProg >= 20 && currentProg < 40) {
        const t = (currentProg - 20) / 20;
        auths.forEach(a => {
          a.status = "KYC_OK";
          a.scale = 1.0;
          a.opacity = 1.0;
        });

        // Initialize key registration lines if not present
        if (dposLines.current.length === 0 && scene) {
          auths.forEach(a => {
            const startPos = new THREE.Vector3(a.x, a.y, a.z);
            const line = createThickLine(startPos, centerPos, 0.012, 0x10b981, 0.3);
            scene.add(line);
            dposLines.current.push(line);
          });
        }

        // Animate key registration pulses along the lines
        if (frame % 28 === 0 && isPlaying) {
          auths.forEach(a => {
            const startPos = new THREE.Vector3(a.x, a.y, a.z);
            spawn3DParticle(startPos, centerPos, 0x10b981, "key-auth");
          });
        }

        // Medallion brightens and glows on arrival
        if (t >= 0.7) {
          center.status = "SEAL_GLOW";
          if (!simState.current.posAttestationFired && scene) {
            simState.current.posAttestationFired = true;
            // Spawn medallion ripple
            const ringGeo = new THREE.RingGeometry(0.8, 2.2, 32);
            const ringMat = new THREE.MeshBasicMaterial({
              color: 0x10b981,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.7
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(center.x, center.y, center.z);
            ring.rotation.x = Math.PI / 2;
            scene.add(ring);
            
            threeParticles.current.push({
              mesh: ring,
              type: "sig-pulse",
              life: 1.0,
              decay: 0.03 * speed
            });
          }
        } else {
          center.status = "ACTIVE";
          simState.current.posAttestationFired = false;
        }
      }

      // Step 3: Block Proposal (40 to 60)
      else if (currentProg >= 40 && currentProg < 60) {
        const t = (currentProg - 40) / 20;

        // Clean Step 2 lines
        if (dposLines.current.length > 0) {
          dposLines.current.forEach(line => scene.remove(line));
          dposLines.current = [];
        }

        // AUTH_01 (proposer in active slot) brightens & pops
        auths.forEach((a, idx) => {
          if (idx === 0) {
            a.status = "PROPOSING";
            a.scale = 1.25;
          } else {
            a.status = "KYC_OK";
            a.scale = 1.0;
          }
          a.opacity = 1.0;
        });

        // Phase 3A: 0% to 55% step progress (40 to 51 prog) - Grow beveled block/document above AUTH_01
        if (t < 0.55) {
          const t_grow = t / 0.55;
          const ease_scale = t_grow * t_grow * (3 - 2 * t_grow);
          const propNode = auths[0];
          
          if (!simState.current.posBlock && scene) {
            const docBlock = createPoaDocumentBlock(0x10b981);
            docBlock.position.set(propNode.x, propNode.y + 1.2, propNode.z);
            docBlock.scale.set(0, 0, 0);
            scene.add(docBlock);
            simState.current.posBlock = docBlock;
          }
          
          if (simState.current.posBlock) {
            simState.current.posBlock.position.set(propNode.x, propNode.y + 1.2, propNode.z);
            simState.current.posBlock.scale.set(ease_scale, ease_scale, ease_scale);
          }
        }
        // Phase 3B: 55% to 100% step progress (51 to 60 prog) - Document slides to center seal
        else {
          const t_travel = (t - 0.55) / 0.45;
          const ease_travel = t_travel * t_travel * (3 - 2 * t_travel);
          const propNode = auths[0];
          const startPos = new THREE.Vector3(propNode.x, propNode.y + 1.2, propNode.z);
          const endPos = new THREE.Vector3(center.x, center.y + 0.15, center.z);
          
          if (simState.current.posBlock) {
            simState.current.posBlock.position.lerpVectors(startPos, endPos, ease_travel);
            // Spin doc slightly for presentation feel
            simState.current.posBlock.rotation.y = ease_travel * Math.PI * 0.5;
          }
          if (t_travel > 0.9) {
            center.status = "SEAL_GLOW";
          }
        }
      }

      // Step 4: Signature Audit (60 to 80)
      else if (currentProg >= 60 && currentProg < 80) {
        const t = (currentProg - 60) / 20;

        auths[0].status = "KYC_OK";
        auths[0].scale = 1.0;

        // Position proposed document at center seal
        if (simState.current.posBlock) {
          simState.current.posBlock.position.set(center.x, center.y + 0.15, center.z);
          simState.current.posBlock.rotation.y = Math.PI * 0.5;
        }

        // Auditors (AUTH_02, AUTH_03, AUTH_04) send audit pulses to proposed block
        const auditors = [auths[1], auths[2], auths[3]];
        auditors.forEach(a => {
          a.status = "VERIFYING";
        });

        // Phase 4A: 0% to 50% step progress (60 to 70 prog) - Emit audit lines
        if (t < 0.5) {
          const t_line = t / 0.5;
          if (dposLines.current.length === 0 && scene) {
            auditors.forEach(a => {
              const startPos = new THREE.Vector3(a.x, a.y, a.z);
              const line = createThickLine(startPos, centerPos, 0.015, 0x10b981, 0.8);
              scene.add(line);
              dposLines.current.push(line);
            });
          }
          
          if (dposLines.current.length > 0) {
            dposLines.current.forEach((line, idx) => {
              const a = auditors[idx];
              const startPos = new THREE.Vector3(a.x, a.y, a.z);
              const currentEnd = new THREE.Vector3().lerpVectors(startPos, centerPos, t_line);
              line.position.copy(new THREE.Vector3().addVectors(startPos, currentEnd).multiplyScalar(0.5));
              const dist = startPos.distanceTo(currentEnd);
              line.scale.set(1, Math.max(0.001, dist / startPos.distanceTo(centerPos)), 1);
            });
          }
        }
        // Phase 4B: 50% to 85% step progress (70 to 77 prog) - Confirm ring pulses
        else if (t >= 0.5 && t < 0.85) {
          if (dposLines.current.length > 0) {
            dposLines.current.forEach(line => {
              if (line.material) line.material.opacity = 0.25;
            });
          }
          
          if (!simState.current.posWinnerPulseFired && scene) {
            simState.current.posWinnerPulseFired = true;
            auditors.forEach(a => {
              a.status = "KYC_OK";
              const ringGeo = new THREE.RingGeometry(0.5, 1.2, 32);
              const ringMat = new THREE.MeshBasicMaterial({
                color: 0x10b981,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
              });
              const ring = new THREE.Mesh(ringGeo, ringMat);
              ring.position.set(a.x, a.y, a.z);
              ring.rotation.x = Math.PI / 2;
              scene.add(ring);
              
              threeParticles.current.push({
                mesh: ring,
                type: "sig-pulse",
                life: 1.0,
                decay: 0.04 * speed
              });
            });
          }
        }
        // Phase 4C: 85% to 100% step progress (77 to 80 prog) - Confirmed glow & slide to ledger tip
        else {
          if (dposLines.current.length > 0) {
            dposLines.current.forEach(line => scene.remove(line));
            dposLines.current = [];
          }

          if (!simState.current.posBlockGlowCreated && scene && simState.current.posBlock) {
            simState.current.posBlockGlowCreated = true;
            const glowGeo = new THREE.BoxGeometry(0.44, 0.58, 0.08);
            const glowMat = new THREE.MeshBasicMaterial({
              color: 0x10b981,
              wireframe: true,
              transparent: true,
              opacity: 0.65
            });
            const glowMesh = new THREE.Mesh(glowGeo, glowMat);
            glowMesh.position.copy(simState.current.posBlock.position);
            glowMesh.rotation.copy(simState.current.posBlock.rotation);
            scene.add(glowMesh);
            simState.current.posBlockGlow = glowMesh;
          }

          // Slide document to ledger chain tip (1.8, -1.5, -3.2)
          const t_slide = (t - 0.85) / 0.15;
          const ease_slide = t_slide * t_slide;
          const ledgerTip = new THREE.Vector3(1.8, -1.5, -3.2);
          
          if (simState.current.posBlock) {
            simState.current.posBlock.position.lerpVectors(centerPos, ledgerTip, ease_slide);
            // Flatten rotation for stack integration
            simState.current.posBlock.rotation.y = (1 - ease_slide) * Math.PI * 0.5;
            if (simState.current.posBlockGlow) {
              simState.current.posBlockGlow.position.copy(simState.current.posBlock.position);
              simState.current.posBlockGlow.rotation.copy(simState.current.posBlock.rotation);
            }
          }
        }
      }

      // Step 5: Authority Revocation (80 to 100)
      else if (currentProg >= 80 && currentProg <= 100) {
        const t = (currentProg - 80) / 20;

        // Cleanup Step 4 glow
        if (simState.current.posBlockGlow) {
          scene.remove(simState.current.posBlockGlow);
          simState.current.posBlockGlow = null;
        }

        // Ensure proposed block is added to ledger stack on step end
        if (simState.current.posBlock) {
          simState.current.posBlock.position.set(1.8, -1.5, -3.2);
          simState.current.posBlock.rotation.set(0, 0, 0);
          blockchainGroup.current.add(simState.current.posBlock);
          simState.current.posBlock = null;
        }

        const badNode = auths[2]; // AUTH_03 is dishonest
        
        // 0.0s - 0.25s (80 to 85 prog) - Flash badNode red
        if (t < 0.25) {
          badNode.status = "REVOKED";
        }
        // 0.25s - 0.6s (85 to 92 prog) - Shrink, desaturate, fall ring
        else if (t >= 0.25 && t < 0.6) {
          const t_fall = (t - 0.25) / 0.35;
          badNode.status = "REVOKED_GREY";
          badNode.scale = 1.0 - 0.6 * t_fall; // Shrink
        }
        // 0.6s onward (92 to 100 prog) - Label is REVOKED
        else {
          badNode.status = "REVOKED_GREY";
          badNode.scale = 0.4;
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

      // Ensure beads group exists in scene
      if (!pohBeadsGroup.current && scene) {
        pohBeadsGroup.current = new THREE.Group();
        scene.add(pohBeadsGroup.current);
      }

      // Continuous ticking of the amber VDF helix clock in background (active in all steps!)
      if (isPlaying) {
        // Spawn an amber bead every 10 frames (faster at higher speeds)
        const spawnInterval = Math.max(2, Math.floor(10 / speed));
        if (frame % spawnInterval === 0) {
          if (!simState.current.pohTickIndex) simState.current.pohTickIndex = 0;
          simState.current.pohTickIndex++;

          const beadGeo = new THREE.SphereGeometry(0.12, 16, 16);
          const beadMat = new THREE.MeshStandardMaterial({
            color: 0xf0a830, // Amber-gold
            emissive: 0xf0a830,
            emissiveIntensity: 0.6,
          });
          const beadMesh = new THREE.Mesh(beadGeo, beadMat);
          
          const idx = simState.current.pohTickIndex;
          const a = idx * 0.45;
          // Helix wraps around X axis from -3.5 to 0.5
          const x = -3.5 + (idx % 35) * 0.14;
          const y = 0.5 + 0.6 * Math.cos(a);
          const z = 0.6 * Math.sin(a);
          beadMesh.position.set(x, y, z);
          
          if (pohBeadsGroup.current) {
            pohBeadsGroup.current.add(beadMesh);
          }
          
          pohHelixBeads.current.push({
            mesh: beadMesh,
            index: idx,
            x, y, z,
            angle: a,
            txAttached: false,
          });

          // Limit count to 25 to keep helix centered and compact
          if (pohHelixBeads.current.length > 25) {
            const oldBead = pohHelixBeads.current.shift();
            if (oldBead) {
              if (pohBeadsGroup.current) pohBeadsGroup.current.remove(oldBead.mesh);
              oldBead.mesh.geometry?.dispose();
              oldBead.mesh.material?.dispose();
            }
          }
        }
      }

      // Easing tail effects for beads: newest is large/bright, oldest fades/shrinks
      pohHelixBeads.current.forEach((bead, i) => {
        const ageRatio = i / pohHelixBeads.current.length;
        const targetScale = bead.txAttached ? 1.1 : (0.35 + 0.65 * ageRatio);
        bead.mesh.scale.set(targetScale, targetScale, targetScale);
        if (bead.mesh.material) {
          bead.mesh.material.transparent = true;
          bead.mesh.material.opacity = 0.15 + 0.85 * ageRatio;
        }
      });

      // Step 1: Sequential Ticking (0 to 20)
      if (currentProg < 20) {
        // Reset validators to hidden state
        validators.forEach(v => {
          v.status = "HIDDEN";
          v.opacity = 0.0;
        });

        // Reset step 3/4 objects
        if (dposLines.current.length > 0) {
          dposLines.current.forEach(line => scene.remove(line));
          dposLines.current = [];
        }
        if (simState.current.blockGlowMesh) {
          scene.remove(simState.current.blockGlowMesh);
          simState.current.blockGlowMesh.geometry?.dispose();
          simState.current.blockGlowMesh.material?.dispose();
          simState.current.blockGlowMesh = null;
        }
        if (simState.current.posBlock) {
          scene.remove(simState.current.posBlock);
          simState.current.posBlock.geometry?.dispose();
          simState.current.posBlock.material?.dispose();
          simState.current.posBlock = null;
        }
        if (simState.current.posBlockGlow) {
          scene.remove(simState.current.posBlockGlow);
          simState.current.posBlockGlow.geometry?.dispose();
          simState.current.posBlockGlow.material?.dispose();
          simState.current.posBlockGlow = null;
        }

        simState.current.pohVerificationArcsCreated = false;
        simState.current.pohWinnerPulseFired = false;
      }

      // Step 2: Transaction Anchoring (20 to 40)
      else if (currentProg >= 20 && currentProg < 40) {
        validators.forEach(v => {
          v.status = "HIDDEN";
          v.opacity = 0.0;
        });

        // Spawn a teal transaction packet from off-screen top-left
        if (!activeTxPacket.current && scene && frame % 40 === 0 && isPlaying) {
          const txGeo = new THREE.SphereGeometry(0.15, 8, 8);
          const txMat = new THREE.MeshBasicMaterial({ color: 0x4ad8a0 });
          const txMesh = new THREE.Mesh(txGeo, txMat);
          txMesh.position.set(-5, 3.2, 1.5);
          scene.add(txMesh);
          activeTxPacket.current = txMesh;
          simState.current.pohTxProg = 0;
        }

        if (activeTxPacket.current) {
          simState.current.pohTxProg += 0.035 * speed;
          const latestBead = pohHelixBeads.current[pohHelixBeads.current.length - 1];
          if (latestBead) {
            const startPos = new THREE.Vector3(-5, 3.2, 1.5);
            const endPos = new THREE.Vector3(latestBead.x, latestBead.y, latestBead.z);
            activeTxPacket.current.position.lerpVectors(startPos, endPos, Math.min(1.0, simState.current.pohTxProg));

            if (simState.current.pohTxProg >= 1.0) {
              // Anchor transaction into clock bead
              scene.remove(activeTxPacket.current);
              activeTxPacket.current.geometry?.dispose();
              activeTxPacket.current.material?.dispose();
              activeTxPacket.current = null;

              latestBead.txAttached = true;
              if (latestBead.mesh.material) {
                latestBead.mesh.material.color.setHex(0x4ad8a0); // green
                latestBead.mesh.material.emissive.setHex(0x4ad8a0);
              }

              // Pulse ring at anchoring coordinate
              const ringGeo = new THREE.RingGeometry(0.2, 0.6, 16);
              const ringMat = new THREE.MeshBasicMaterial({
                color: 0x4ad8a0,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
              });
              const ring = new THREE.Mesh(ringGeo, ringMat);
              ring.position.copy(latestBead.mesh.position);
              scene.add(ring);

              threeParticles.current.push({
                mesh: ring,
                type: "sig-pulse",
                life: 1.0,
                decay: 0.05 * speed
              });
            }
          } else {
            scene.remove(activeTxPacket.current);
            activeTxPacket.current = null;
          }
        }
      }

      // Step 3: Block Packaging (40 to 60)
      else if (currentProg >= 40 && currentProg < 60) {
        const t = (currentProg - 40) / 20;
        validators.forEach(v => {
          v.status = "HIDDEN";
          v.opacity = 0.0;
        });

        // Phase 3A: 0% to 50% step progress (40 to 50 prog) - Bounding wireframe capsule
        if (t < 0.5) {
          if (!simState.current.blockGlowMesh && scene) {
            const capGeo = new THREE.BoxGeometry(2.0, 1.5, 1.5);
            const capMat = new THREE.MeshBasicMaterial({
              color: 0xe8823c, // warm orange wireframe
              wireframe: true,
              transparent: true,
              opacity: 0.45
            });
            const cap = new THREE.Mesh(capGeo, capMat);
            cap.position.set(-1.8, 0.5, 0);
            scene.add(cap);
            simState.current.blockGlowMesh = cap;
          }
        }
        // Phase 3B: 55% to 100% step progress (50 to 60 prog) - Compress capsule and beads into orange block
        else {
          const t_compress = (t - 0.5) / 0.5;
          const ease_compress = t_compress * t_compress * (3 - 2 * t_compress);

          if (simState.current.blockGlowMesh) {
            const scale = 1.0 - 0.8 * ease_compress;
            simState.current.blockGlowMesh.scale.set(scale, scale, scale);
            simState.current.blockGlowMesh.material.opacity = 0.45 * (1.0 - ease_compress);
          }

          if (!simState.current.posBlock && scene) {
            const blockGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
            const blockMat = new THREE.MeshStandardMaterial({
              color: 0xe8823c, // warm orange
              roughness: 0.25,
              metalness: 0.8,
              emissive: 0xe8823c,
              emissiveIntensity: 0.4,
            });
            const block = new THREE.Mesh(blockGeo, blockMat);
            block.position.set(-1.8, 0.5, 0);
            block.scale.set(0, 0, 0);
            scene.add(block);
            simState.current.posBlock = block;
          }

          if (simState.current.posBlock) {
            simState.current.posBlock.scale.set(ease_compress, ease_compress, ease_compress);
          }
        }
      }

      // Step 4: Parallel Verification (60 to 80)
      else if (currentProg >= 60 && currentProg < 80) {
        const t = (currentProg - 60) / 20;

        // Clean Step 3 capsule
        if (simState.current.blockGlowMesh) {
          scene.remove(simState.current.blockGlowMesh);
          simState.current.blockGlowMesh = null;
        }

        // Keep orange block centered
        if (simState.current.posBlock) {
          simState.current.posBlock.position.set(-1.8, 0.5, 0);
          simState.current.posBlock.scale.set(1, 1, 1);
        }

        // Animate validators fading in from opacity 0 to 1
        validators.forEach(v => {
          v.status = "VERIFYING";
          v.opacity = Math.min(1.0, t / 0.35); // quick fade in
        });

        // Phase 4A: Draw thin audit lines from block to each validator
        if (t < 0.5) {
          const t_line = t / 0.5;
          const blockPos = new THREE.Vector3(-1.8, 0.5, 0);
          
          if (dposLines.current.length === 0 && scene) {
            validators.forEach(v => {
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const line = createThickLine(blockPos, startPos, 0.012, 0xe8823c, 0.5);
              scene.add(line);
              dposLines.current.push(line);
            });
          }

          if (dposLines.current.length > 0) {
            dposLines.current.forEach((line, idx) => {
              const v = validators[idx];
              const startPos = new THREE.Vector3(v.x, v.y, v.z);
              const currentEnd = new THREE.Vector3().lerpVectors(blockPos, startPos, t_line);
              line.position.copy(new THREE.Vector3().addVectors(blockPos, currentEnd).multiplyScalar(0.5));
              const dist = blockPos.distanceTo(currentEnd);
              line.scale.set(1, Math.max(0.001, dist / blockPos.distanceTo(startPos)), 1);
            });
          }
        }
        // Phase 4B: 50% to 85% step progress (70 to 77 prog) - Verification progress arcs around validators
        else if (t >= 0.5 && t < 0.85) {
          if (dposLines.current.length > 0) {
            dposLines.current.forEach(line => {
              if (line.material) line.material.opacity = 0.2;
            });
          }

          if (!simState.current.pohVerificationArcsCreated && scene) {
            simState.current.pohVerificationArcsCreated = true;
            validators.forEach(v => {
              // Create checking ring pulse
              const ringGeo = new THREE.RingGeometry(0.55, 0.72, 32);
              const ringMat = new THREE.MeshBasicMaterial({
                color: 0x3b7dd8, // validator blue checking
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
              });
              const ring = new THREE.Mesh(ringGeo, ringMat);
              ring.position.set(v.x, v.y, v.z);
              ring.rotation.x = Math.PI / 2;
              scene.add(ring);

              threeParticles.current.push({
                mesh: ring,
                type: "sig-pulse",
                life: 1.0,
                decay: 0.03 * speed
              });
            });
          }
        }
        // Phase 4C: 85% to 100% step progress (77 to 80 prog) - Block glows
        else {
          if (dposLines.current.length > 0) {
            dposLines.current.forEach(line => scene.remove(line));
            dposLines.current = [];
          }

          if (!simState.current.posBlockGlow && scene && simState.current.posBlock) {
            simState.current.posBlockGlow = true; // flag
            const glowGeo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
            const glowMat = new THREE.MeshBasicMaterial({
              color: 0x4ad8a0,
              wireframe: true,
              transparent: true,
              opacity: 0.5
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.copy(simState.current.posBlock.position);
            scene.add(glow);
            simState.current.blockGlowMesh = glow; // Reuse blockGlowMesh for Step 4 confirmed glow
          }
        }
      }

      // Step 5: State Finalization (80 to 100)
      else if (currentProg >= 80 && currentProg <= 100) {
        const t = (currentProg - 80) / 20;

        // Clean Step 4 glow
        if (simState.current.blockGlowMesh) {
          scene.remove(simState.current.blockGlowMesh);
          simState.current.blockGlowMesh = null;
        }

        // Validators pulse green to verify slices, then fade out
        validators.forEach(v => {
          v.status = "VERIFIED";
          v.opacity = Math.max(0.0, 1.0 - (t - 0.5) / 0.5); // fade out on second half
        });

        // Phase 5A: Transition block to deep gold & slide to ledger tip (1.8, -1.5, -3.2)
        if (simState.current.posBlock) {
          if (simState.current.posBlock.material) {
            simState.current.posBlock.material.color.setHex(0xd4a62e);
            simState.current.posBlock.material.emissive.setHex(0xd4a62e);
          }

          const blockStartPos = new THREE.Vector3(-1.8, 0.5, 0);
          const blockEndPos = new THREE.Vector3(1.8, -1.5, -3.2);
          simState.current.posBlock.position.lerpVectors(blockStartPos, blockEndPos, Math.min(1.0, t / 0.8));

          // At step end, commit block to blockchainGroup
          if (t >= 0.95) {
            simState.current.posBlock.position.copy(blockEndPos);
            // Attach producer label to block
            simState.current.posBlock.userData = { producerLabel: "SOL_LEADER" };
            blockchainGroup.current.add(simState.current.posBlock);
            simState.current.posBlock = null;
          }
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
    
    // Bind to the active workflow step to prevent boundary off-by-one mismatches
    const currentStepIdx = activeWorkflowStep
    const stepProgStart = currentStepIdx * stepSize
    const stepProgress = Math.min(100, Math.max(0, Math.floor(((prog - stepProgStart) / stepSize) * 100)))

    const targetStep = steps[currentStepIdx]
    let statusText = targetStep.title.toUpperCase()
    
    if (stepProgress === 0) {
      statusText = `ACTIVE: ${statusText}`
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

  const renderBlockLabels = () => {
    if (!threeCamera.current || !blockchainGroup.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const containerWidth = canvas.clientWidth;
    const containerHeight = canvas.clientHeight;
    const labels = [];
    
    // 1. Existing finalized blocks in blockchainGroup
    blockchainGroup.current.children.forEach((child, idx) => {
      if (child.isMesh) {
        const tempV = new THREE.Vector3().copy(child.position);
        tempV.project(threeCamera.current);
        const screenX = (tempV.x * 0.5 + 0.5) * containerWidth;
        const screenY = (tempV.y * -0.5 + 0.5) * containerHeight;
        const isVisible = tempV.z <= 1.0 && screenX >= 0 && screenX <= containerWidth && screenY >= 0 && screenY <= containerHeight;
        
        if (isVisible) {
          const defaultLabel = selectedAlgo === "pos" ? "VAL_04" : selectedAlgo === "poh" ? "SOL_LEADER" : "DEL_02";
          let producer = child.userData.producerLabel || defaultLabel;
          labels.push(
            <div
              key={`block-label-${idx}`}
              className="absolute pointer-events-none select-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{
                left: `${screenX}px`,
                top: `${screenY + 28}px`,
              }}
            >
              <div className="px-1.5 py-0.5 bg-slate-900/90 border border-emerald-500/40 rounded text-[7.5px] font-mono font-extrabold text-emerald-450 tracking-wider shadow-md uppercase">
                {producer}
              </div>
            </div>
          );
        }
      }
    });
    
    // 2. Active animating block in Step 3/4
    const activeBlock = selectedAlgo === "pos" || selectedAlgo === "poh" ? simState.current.posBlock : simState.current.dposBlock;
    if (activeBlock) {
      const tempV = new THREE.Vector3().copy(activeBlock.position);
      tempV.project(threeCamera.current);
      const screenX = (tempV.x * 0.5 + 0.5) * containerWidth;
      const screenY = (tempV.y * -0.5 + 0.5) * containerHeight;
      const isVisible = tempV.z <= 1.0 && screenX >= 0 && screenX <= containerWidth && screenY >= 0 && screenY <= containerHeight;
      
      if (isVisible) {
        const proposerLabel = selectedAlgo === "pos" ? "VAL_04" : selectedAlgo === "poh" ? "SOL_LEADER" : "DEL_02";
        labels.push(
          <div
            key="block-label-animating"
            className="absolute pointer-events-none select-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{
              left: `${screenX}px`,
              top: `${screenY + 28}px`,
            }}
          >
            <div className="px-1.5 py-0.5 bg-slate-900/90 border border-emerald-500/40 rounded text-[7.5px] font-mono font-extrabold text-emerald-450 tracking-wider shadow-md uppercase animate-pulse">
              {proposerLabel}
            </div>
          </div>
        );
      }
    }
    
    return labels;
  };

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
            className="absolute pointer-events-none select-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5"
            style={{ left: 0, top: 0, display: "none" }}
          >
            <div className="px-2 py-0.8 bg-slate-950/85 border border-brand-border/60 rounded text-[9px] font-bold font-sans text-white tracking-wide shadow-md">
              {node.label}
            </div>
            {node.type !== "mempool" && node.type !== "pool" && !node.id.startsWith("voter") && (
              <div className={`text-[7.5px] font-mono font-extrabold tracking-wider bg-slate-950/50 px-1 rounded uppercase ${
                node.status === "REVOKED" || node.status === "REVOKED_GREY"
                  ? "text-rose-500 animate-pulse"
                  : node.status === "UNVERIFIED"
                  ? "text-slate-500"
                  : "text-indigo-400"
              }`}>
                {node.status || "STANDBY"}
              </div>
            )}
          </div>
        ))}
        {/* Render block labels for DPoS or PoS blocks in blockchainGroup */}
        {(selectedAlgo === "dpos" || selectedAlgo === "pos" || selectedAlgo === "poh") && renderBlockLabels()}
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
