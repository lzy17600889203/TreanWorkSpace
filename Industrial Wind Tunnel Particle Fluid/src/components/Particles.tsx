
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Particles({ count = 50000, color = '#00d4ff', speed = 0.5, windAngle = 0, turbulence = 0.1 }) {
  const pointsRef = useRef(null)
  const shaderMaterialRef = useRef(null)

  const [positions, randoms] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const rand = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      pos[i3] = (Math.random() - 0.5) * 30
      pos[i3 + 1] = (Math.random() - 0.5) * 15
      pos[i3 + 2] = (Math.random() - 0.5) * 30
      rand[i3] = Math.random()
      rand[i3 + 1] = Math.random()
      rand[i3 + 2] = Math.random()
    }

    return [pos, rand]
  }, [count])

  const vertexShader = `
    attribute vec3 aRandom;
    varying float vLife;
    varying vec3 vPosition;

    uniform float uTime;
    uniform float uSpeed;
    uniform float uWindAngle;
    uniform float uTurbulence;

    void main() {
      vPosition = position;
      vLife = fract(aRandom.x * 12.0 + uTime * uSpeed * 2.0);

      vec3 pos = position;
      float angle = uWindAngle * 3.14159 / 180.0;
      vec3 windDir = vec3(cos(angle), 0.0, sin(angle));

      vec3 turb = vec3(
        sin(uTime * 4.0 + pos.x * 0.3) * uTurbulence * 3.0,
        cos(uTime * 3.0 + pos.y * 0.3) * uTurbulence * 2.0,
        sin(uTime * 3.5 + pos.z * 0.3) * uTurbulence * 3.0
      );

      vec3 vortex = vec3(
        sin(pos.y * 0.5 + uTime * 5.0) * uTurbulence * 0.5,
        0.0,
        cos(pos.x * 0.5 + uTime * 5.0) * uTurbulence * 0.5
      );

      pos += (windDir * uSpeed * 2.5 + turb + vortex) * 0.3;

      if (vLife > 0.92) {
        pos.x = (aRandom.x - 0.5) * 30.0;
        pos.y = (aRandom.y - 0.5) * 15.0;
        pos.z = (aRandom.z - 0.5) * 30.0 - 15.0;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = 4.0 * (1.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `

  const fragmentShader = `
    uniform vec3 uColor;
    uniform float uTime;
    varying float vLife;
    varying vec3 vPosition;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);

      if (dist > 0.5) discard;

      float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
      alpha *= 0.8;
      
      float lifeAlpha = smoothstep(0.0, 0.2, vLife) * smoothstep(1.0, 0.8, vLife);
      alpha *= lifeAlpha;

      float flicker = 0.7 + 0.3 * sin(uTime * 15.0 + vPosition.x * 0.2 + vPosition.z * 0.2);

      gl_FragColor = vec4(uColor * flicker, alpha);
    }
  `

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: speed },
    uWindAngle: { value: windAngle },
    uTurbulence: { value: turbulence },
    uColor: { value: new THREE.Color(color) }
  }), [])

  useFrame((state) => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
      shaderMaterialRef.current.uniforms.uSpeed.value = speed
      shaderMaterialRef.current.uniforms.uWindAngle.value = windAngle
      shaderMaterialRef.current.uniforms.uTurbulence.value = turbulence
      shaderMaterialRef.current.uniforms.uColor.value.set(color)
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={count}
          array={randoms}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderMaterialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
