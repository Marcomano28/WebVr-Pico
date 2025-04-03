'use client'

import React, { useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { VRButton, XR, Controllers } from '@react-three/xr'

// Cubo simple sin dependencias complejas
function Box(props: any) {
  const mesh = useRef<THREE.Mesh>(null!)
  
  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.x += 0.01
      mesh.current.rotation.y += 0.01
    }
  })
  
  return (
    <mesh
      {...props}
      ref={mesh}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={props.color || 'blue'} />
    </mesh>
  )
}

// Suelo simple
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="gray" />
    </mesh>
  )
}

// Función para verificar WebXR
function checkVRSupport() {
  if (typeof window !== 'undefined' && window.navigator) {
    if (!window.navigator.xr) {
      return {
        supported: false,
        message: 'Tu navegador no soporta WebXR. Por favor usa un navegador compatible con WebXR.'
      }
    }
    
    return { supported: true, message: '' }
  }
  
  return {
    supported: false,
    message: 'No se puede verificar el soporte de WebXR en este entorno.'
  }
}

export default function SimpleVRScene() {
  const vrSupport = typeof window !== 'undefined' ? checkVRSupport() : { supported: true, message: '' }
  
  return (
    <>
      {!vrSupport.supported && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          maxWidth: '90%',
          zIndex: 100
        }}>
          <h3 style={{ color: 'red', marginBottom: '10px' }}>Error: VR no soportado</h3>
          <p>{vrSupport.message}</p>
        </div>
      )}
      
      <VRButton 
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 10
        }}
      />
      
      <Canvas>
        <XR>
          {/* Iluminación básica */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 5, 5]} intensity={1} />
          
          {/* Escena básica */}
          <Box position={[0, 1.5, -3]} />
          <Box position={[-2, 1, -5]} color="red" />
          <Floor />
        </XR>
      </Canvas>
    </>
  )
} 