'use client'

import React from 'react'
import { Canvas } from '@react-three/fiber'
import { VRButton, XR } from '@react-three/xr'

// Escena VR sumamente minimalista para máxima compatibilidad
export default function MinimalVRScene() {
  return (
    <>
      {/* Mensaje simple sobre el botón */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 10
      }}>
        <strong>Escena VR Mínima</strong>
        <p>Para Pico Neo 3</p>
      </div>
      
      {/* Botón VR simple */}
      <VRButton 
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 10
        }}
      />
      
      {/* Canvas con una escena extremadamente básica */}
      <Canvas>
        <XR>
          {/* Iluminación básica */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 5, 5]} />
          
          {/* Un solo cubo azul */}
          <mesh position={[0, 1.5, -3]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="blue" />
          </mesh>
          
          {/* Plano como suelo */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#444" />
          </mesh>
        </XR>
      </Canvas>
    </>
  )
} 