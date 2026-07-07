import React, { useRef, useEffect } from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData } from "../../constants/consensusData"

export default function RadarChartCanvas() {
  const canvasRef = useRef(null)
  const { state } = useExplorer()
  const { selectedAlgo, compareAlgo, reducedMotion } = state

  // Keep track of the current values for animation interpolation
  const animationState = useRef({
    scalability: 0,
    security: 0,
    decentralization: 0,
    startTime: 0,
    prevScores: { scalability: 0, security: 0, decentralization: 0 },
    targetScores: { scalability: 0, security: 0, decentralization: 0 },
    reqId: null,
  })

  const target = consensusData[selectedAlgo].trilemma

  useEffect(() => {
    // Save current scores as previous scores before updating targets
    animationState.current.prevScores = {
      scalability: animationState.current.scalability,
      security: animationState.current.security,
      decentralization: animationState.current.decentralization,
    }
    animationState.current.targetScores = { ...target }
    animationState.current.startTime = performance.now()

    const animate = (timestamp) => {
      const elapsed = timestamp - animationState.current.startTime
      const duration = reducedMotion ? 0 : 400 // Instant if reduced motion is enabled

      let progress = duration === 0 ? 1 : Math.min(elapsed / duration, 1)
      
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3)

      const prev = animationState.current.prevScores
      const targ = animationState.current.targetScores

      animationState.current.scalability = prev.scalability + (targ.scalability - prev.scalability) * ease
      animationState.current.security = prev.security + (targ.security - prev.security) * ease
      animationState.current.decentralization = prev.decentralization + (targ.decentralization - prev.decentralization) * ease

      draw()

      if (progress < 1) {
        animationState.current.reqId = requestAnimationFrame(animate)
      }
    }

    animationState.current.reqId = requestAnimationFrame(animate)

    return () => {
      if (animationState.current.reqId) {
        cancelAnimationFrame(animationState.current.reqId)
      }
    }
  }, [selectedAlgo, reducedMotion])

  // Redraw when compareAlgo changes
  useEffect(() => {
    draw()
  }, [compareAlgo])

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    
    // High-DPI Scaling Setup
    const dpr = window.devicePixelRatio || 1
    const size = 220
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    // Clear background
    ctx.clearRect(0, 0, size, size)

    const cx = size / 2
    const cy = size / 2
    const maxRadius = 80

    // Coordinates conversion utility
    const getCoordinates = (scal, sec, dec) => {
      const rScal = (scal / 10) * maxRadius
      const rSec = (sec / 10) * maxRadius
      const rDec = (dec / 10) * maxRadius

      return {
        scal: { x: cx, y: cy - rScal },
        sec: { x: cx + rSec * Math.cos(Math.PI / 6), y: cy + rSec * Math.sin(Math.PI / 6) },
        dec: { x: cx - rDec * Math.cos(Math.PI / 6), y: cy + rDec * Math.sin(Math.PI / 6) },
      }
    }

    // 1. Draw web grid circles or triangles
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
    ctx.lineWidth = 1
    for (let i = 1; i <= 5; i++) {
      const radius = (i / 5) * maxRadius
      ctx.beginPath()
      ctx.moveTo(cx, cy - radius)
      ctx.lineTo(cx + radius * Math.cos(Math.PI / 6), cy + radius * Math.sin(Math.PI / 6))
      ctx.lineTo(cx - radius * Math.cos(Math.PI / 6), cy + radius * Math.sin(Math.PI / 6))
      ctx.closePath()
      ctx.stroke()
    }

    // 2. Draw axis lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"
    ctx.setLineDash([2, 2])
    ctx.lineWidth = 1.5

    // Scalability axis
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx, cy - maxRadius)
    ctx.stroke()

    // Security axis
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + maxRadius * Math.cos(Math.PI / 6), cy + maxRadius * Math.sin(Math.PI / 6))
    ctx.stroke()

    // Decentralization axis
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx - maxRadius * Math.cos(Math.PI / 6), cy + maxRadius * Math.sin(Math.PI / 6))
    ctx.stroke()

    ctx.setLineDash([]) // Reset dash

    // 3. Draw Axis Labels
    ctx.fillStyle = "#94a3b8"
    ctx.font = "bold 9px Outfit, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("SCALABILITY", cx, cy - maxRadius - 8)
    
    ctx.textAlign = "left"
    ctx.fillText("SECURITY", cx + maxRadius * Math.cos(Math.PI / 6) + 4, cy + maxRadius * Math.sin(Math.PI / 6) + 8)
    
    ctx.textAlign = "right"
    ctx.fillText("DECENTRALIZATION", cx - maxRadius * Math.cos(Math.PI / 6) - 4, cy + maxRadius * Math.sin(Math.PI / 6) + 8)

    // 4. Fill and outline the COMPARISON radar area first (if active)
    if (compareAlgo) {
      const compData = consensusData[compareAlgo]
      if (compData) {
        const compScores = compData.trilemma
        const compPoints = getCoordinates(compScores.scalability, compScores.security, compScores.decentralization)
        
        ctx.fillStyle = compData.glow
        ctx.strokeStyle = compData.color
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 3])

        ctx.beginPath()
        ctx.moveTo(compPoints.scal.x, compPoints.scal.y)
        ctx.lineTo(compPoints.sec.x, compPoints.sec.y)
        ctx.lineTo(compPoints.dec.x, compPoints.dec.y)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        ctx.setLineDash([]) // Reset dash

        // Draw small comparison dots
        ctx.fillStyle = "#ffffff"
        ctx.strokeStyle = compData.color
        ctx.lineWidth = 1.5
        const drawCompDot = (p) => {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
        drawCompDot(compPoints.scal)
        drawCompDot(compPoints.sec)
        drawCompDot(compPoints.dec)
      }
    }

    // 5. Fill and outline the PRIMARY active radar area
    const { scalability, security, decentralization } = animationState.current
    const points = getCoordinates(scalability, security, decentralization)

    const activeColor = consensusData[selectedAlgo].color
    const activeGlow = consensusData[selectedAlgo].glow

    ctx.fillStyle = activeGlow
    ctx.strokeStyle = activeColor
    ctx.lineWidth = 2.5

    ctx.beginPath()
    ctx.moveTo(points.scal.x, points.scal.y)
    ctx.lineTo(points.sec.x, points.sec.y)
    ctx.lineTo(points.dec.x, points.dec.y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // 6. Draw primary point dots
    ctx.fillStyle = "#ffffff"
    ctx.strokeStyle = activeColor
    ctx.lineWidth = 2

    const drawDot = (p) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    drawDot(points.scal)
    drawDot(points.sec)
    drawDot(points.dec)
  }

  return (
    <div className="radar-chart-container relative flex items-center justify-center w-[220px] h-[220px]">
      <canvas
        ref={canvasRef}
        className="w-[220px] h-[220px]"
        aria-label={`Radar chart comparison showing blockchain trilemma scores.`}
        role="img"
      />
    </div>
  )
}
