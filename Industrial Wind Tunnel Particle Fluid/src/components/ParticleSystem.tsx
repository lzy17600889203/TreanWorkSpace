
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ParticleSystem({ config, modelPosition }) {
  const pointsRef = useRef(null);
  const shaderMaterialRef = useRef(null);
  
  const particleCount = config.count;
  
  const [positions, randoms] = useMemo(() =&gt; {
    const pos = new Float32Array(particleCount * 3);
    const rand = new Float32Array(particleCount * 3);
    
    for (let i = 0; i &lt; particleCount; i++) {
      const i3 = i * 3;
      
      pos[i3] = (Math.random() - 0.5) * 20;
      pos[i3 + 1] = (Math.random() - 0.5) * 10;
      pos[i3 + 2] = (Math.random() - 0.5) * 20;
      
      rand[i3] = Math.random();
      rand[i3 + 1] = Math.random();
      rand[i3 + 2] = Math.random();
    }
    
    return [pos, rand];
  }, [particleCount]);
  
  const vertexShader = `
    attribute vec3 aRandom;
    varying float vLife;
    varying vec3 vPosition;
    
    uniform float uTime;
    uniform float uSpeed;
    uniform float uWindAngle;
    uniform float uTurbulence;
    uniform vec3 uModelPosition;
    
    void main() {
      vPosition = position;
      vLife = fract(aRandom.x * 10.0 + uTime * uSpeed);
      
      vec3 pos = position;
      float angle = uWindAngle * 3.14159 / 180.0;
      vec3 windDir = vec3(cos(angle), 0.0, sin(angle));
      
      float dist = length(pos - uModelPosition);
      float influence = 1.0 - smoothstep(0.0, 3.0, dist);
      
      vec3 turbulence = vec3(
        sin(uTime * 2.0 + pos.x * 0.5) * uTurbulence,
        cos(uTime * 1.5 + pos.y * 0.5) * uTurbulence,
        sin(uTime * 1.8 + pos.z * 0.5) * uTurbulence
      );
      
      pos += (windDir * uSpeed + turbulence) * 0.1;
      
      if (vLife &gt; 0.9) {
        pos.x = (aRandom.x - 0.5) * 20.0;
        pos.y = (aRandom.y - 0.5) * 10.0;
        pos.z = (aRandom.z - 0.5) * 20.0 - 10.0;
      }
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = 2.0 * (1.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  
  const fragmentShader = `
    uniform vec3 uColor;
    uniform float uTime;
    varying float vLife;
    varying vec3 vPosition;
    
    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      
      if (dist &gt; 0.5) discard;
      
      float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
      alpha *= 0.6;
      
      float flicker = 0.8 + 0.2 * sin(uTime * 10.0 + vPosition.x * 0.1);
      
      gl_FragColor = vec4(uColor * flicker, alpha);
    }
  `;
  
  const uniforms = useMemo(() =&gt; ({
    uTime: { value: 0 },
    uSpeed: { value: config.speed },
    uWindAngle: { value: config.windAngle },
    uTurbulence: { value: config.turbulence },
    uColor: { value: new THREE.Color(config.color) },
    uModelPosition: { value: modelPosition }
  }), []);
  
  useFrame((state) =&gt; {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      shaderMaterialRef.current.uniforms.uSpeed.value = config.speed;
      shaderMaterialRef.current.uniforms.uWindAngle.value = config.windAngle;
      shaderMaterialRef.current.uniforms.uTurbulence.value = config.turbulence;
      shaderMaterialRef.current.uniforms.uColor.value.set(config.color);
      shaderMaterialRef.current.uniforms.uModelPosition.value = modelPosition;
    }
  });
  
  return (
    &lt;points ref={pointsRef}&gt;
      &lt;bufferGeometry&gt;
        &lt;bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        /&gt;
        &lt;bufferAttribute
          attach="attributes-aRandom"
          count={particleCount}
          array={randoms}
          itemSize={3}
        /&gt;
      &lt;/bufferGeometry&gt;
      &lt;shaderMaterial
        ref={shaderMaterialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      /&gt;
    &lt;/points&gt;
  );
}

export default ParticleSystem;
