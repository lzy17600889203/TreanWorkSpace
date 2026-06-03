import React, { useMemo } from 'react'
import * as THREE from 'three'

const latLonToVector3 = (lat, lon, radius = 1.02) => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  
  return new THREE.Vector3(x, y, z)
}

const FlightPath = ({ flight }) => {
  const points = useMemo(() => {
    const start = latLonToVector3(flight.originLat, flight.originLon)
    const end = latLonToVector3(flight.destLat, flight.destLon)
    
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    mid.normalize().multiplyScalar(1.4)
    
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    return curve.getPoints(100)
  }, [flight])

  const color = flight.delayed ? '#ffd700' : '#00d4ff'

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.7} />
    </line>
  )
}

export default FlightPath
