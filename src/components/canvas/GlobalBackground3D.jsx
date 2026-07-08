import React, { useEffect, useRef } from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData } from "../../constants/consensusData"
import * as THREE from "three"

export default function GlobalBackground3D() {
  const { state } = useExplorer()
  const { selectedAlgo } = state
  const algo = consensusData[selectedAlgo]

  const containerRef = useRef(null)
  const animRef = useRef(null)
  const targetColor = useRef(new THREE.Color(0x8b5cf6)) // starts violet
  const currentColor = useRef(new THREE.Color(0x8b5cf6))

  useEffect(() => {
    if (algo) {
      targetColor.current.setHex(parseInt(algo.color.replace("#", "0x")))
    }
  }, [selectedAlgo])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = window.innerWidth
    const height = window.innerHeight

    // 1. Scene and Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
    camera.position.set(0, 0, 10)

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    container.appendChild(renderer.domElement)

    // 3. Constellation Particles Setup
    const particleCount = 120
    const positions = new Float32Array(particleCount * 3)
    const velocities = []

    // Randomize initial positions in a box
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10

      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005
        )
      )
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

    // Soft glowing circle texture for particles
    const canvas = document.createElement("canvas")
    canvas.width = 16
    canvas.height = 16
    const ctx = canvas.getContext("2d")
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
    grad.addColorStop(0, "rgba(255, 255, 255, 1)")
    grad.addColorStop(1, "rgba(255, 255, 255, 0)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 16, 16)
    const texture = new THREE.CanvasTexture(canvas)

    const material = new THREE.PointsMaterial({
      size: 0.16,
      map: texture,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const particleSystem = new THREE.Points(geometry, material)
    scene.add(particleSystem)

    // Create line segments for connecting nodes
    const maxConnections = 300
    const linePositions = new Float32Array(maxConnections * 2 * 3)
    const lineColors = new Float32Array(maxConnections * 2 * 3)

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3))
    lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3))

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
    })

    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lineSegments)

    // 4. Parallax Mouse Tracker
    let mouse = { x: 0, y: 0 }
    let targetCamPos = { x: 0, y: 0 }

    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener("mousemove", onMouseMove)

    // 5. Handles window resize updates
    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener("resize", handleResize)

    // Render Animation Loop
    const tick = () => {
      // Interpolate colors smoothly
      currentColor.current.lerp(targetColor.current, 0.03)
      material.color.copy(currentColor.current)

      const coords = geometry.attributes.position.array

      // Update positions and velocities (floating motion)
      for (let i = 0; i < particleCount; i++) {
        const vel = velocities[i]
        coords[i * 3] += vel.x
        coords[i * 3 + 1] += vel.y
        coords[i * 3 + 2] += vel.z

        // Bounce back borders
        if (Math.abs(coords[i * 3]) > 10) vel.x *= -1
        if (Math.abs(coords[i * 3 + 1]) > 6) vel.y *= -1
        if (Math.abs(coords[i * 3 + 2]) > 5) vel.z *= -1
      }
      geometry.attributes.position.needsUpdate = true

      // Recalculate line segments between neighboring nodes
      let lineIndex = 0
      for (let i = 0; i < particleCount; i++) {
        const x1 = coords[i * 3]
        const y1 = coords[i * 3 + 1]
        const z1 = coords[i * 3 + 2]

        for (let j = i + 1; j < particleCount; j++) {
          const x2 = coords[j * 3]
          const y2 = coords[j * 3 + 1]
          const z2 = coords[j * 3 + 2]

          const dist = Math.hypot(x1 - x2, y1 - y2, z1 - z2)
          if (dist < 2.6 && lineIndex < maxConnections) {
            // Add connection vertices
            const posOffset = lineIndex * 6
            linePositions[posOffset] = x1
            linePositions[posOffset + 1] = y1
            linePositions[posOffset + 2] = z1

            linePositions[posOffset + 3] = x2
            linePositions[posOffset + 4] = y2
            linePositions[posOffset + 5] = z2

            // Colors mapping
            const colorOffset = lineIndex * 6
            lineColors[colorOffset] = currentColor.current.r
            lineColors[colorOffset + 1] = currentColor.current.g
            lineColors[colorOffset + 2] = currentColor.current.b

            lineColors[colorOffset + 3] = currentColor.current.r
            lineColors[colorOffset + 4] = currentColor.current.g
            lineColors[colorOffset + 5] = currentColor.current.b

            lineIndex++
          }
        }
      }
      lineGeometry.attributes.position.needsUpdate = true
      lineGeometry.attributes.color.needsUpdate = true
      lineGeometry.setDrawRange(0, lineIndex * 2)

      // Slow parallax camera damping
      targetCamPos.x = mouse.x * 1.5
      targetCamPos.y = mouse.y * 1.0
      camera.position.x += (targetCamPos.x - camera.position.x) * 0.05
      camera.position.y += (targetCamPos.y - camera.position.y) * 0.05
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)

    // Cleanup memory to prevent context leaks
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("resize", handleResize)
      if (animRef.current) cancelAnimationFrame(animRef.current)

      geometry.dispose()
      material.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
      texture.dispose()

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none -z-10 w-full h-full overflow-hidden opacity-30"
    />
  )
}
