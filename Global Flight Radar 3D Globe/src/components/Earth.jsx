import React, { useMemo } from 'react'
import * as THREE from 'three'

const Earth = () => {
  const textureCanvas = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#1a3a5c')
    gradient.addColorStop(0.5, '#0d2840')
    gradient.addColorStop(1, '#0a1f33')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1024, 512)

    const continents = [
      { x: 200, y: 100, w: 200, h: 180 },
      { x: 50, y: 120, w: 120, h: 150 },
      { x: 550, y: 120, w: 180, h: 200 },
      { x: 750, y: 160, w: 100, h: 100 },
      { x: 250, y: 320, w: 150, h: 120 },
      { x: 780, y: 350, w: 80, h: 80 }
    ]

    ctx.fillStyle = '#2d5a3d'
    continents.forEach(cont => {
      ctx.beginPath()
      ctx.ellipse(cont.x + cont.w/2, cont.y + cont.h/2, cont.w/2, cont.h/2, 0, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.fillStyle = '#ffd700'
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 1024
      const y = Math.random() * 512
      ctx.beginPath()
      ctx.arc(x, y, Math.random() * 2 + 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    return canvas
  }, [])

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(textureCanvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }, [textureCanvas])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          map={texture}
          bumpScale={0.05}
          shininess={10}
        />
      </mesh>
      
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial
          color="#00aaff"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

export default Earth
