'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Interactive } from '@react-three/xr'
import { Html } from '@react-three/drei'
import { FBXModelHandle } from './fbx-model'

interface AnimationControlsProps {
  modelRef: React.RefObject<FBXModelHandle>
  position?: [number, number, number]
}

export default function AnimationControls({ 
  modelRef, 
  position = [0, 1.5, -2] 
}: AnimationControlsProps) {
  const [animCount, setAnimCount] = useState(0)
  const [currentAnim, setCurrentAnim] = useState(0)
  
  // Actualizar el estado con información del modelo
  useEffect(() => {
    const updateAnimInfo = () => {
      if (modelRef.current) {
        setAnimCount(modelRef.current.getAnimationCount())
        setCurrentAnim(modelRef.current.getCurrentAnimationIndex())
      }
    }
    
    // Verificar inicialmente
    updateAnimInfo()
    
    // Configurar un intervalo para actualizar periódicamente
    const intervalId = setInterval(updateAnimInfo, 500)
    
    return () => clearInterval(intervalId)
  }, [modelRef])
  
  // Reproducir animación previa
  const prevAnimation = () => {
    if (modelRef.current && animCount > 0) {
      const prevIndex = (currentAnim - 1 + animCount) % animCount
      modelRef.current.playAnimation(prevIndex)
    }
  }
  
  // Reproducir siguiente animación
  const nextAnimation = () => {
    if (modelRef.current && animCount > 0) {
      const nextIndex = (currentAnim + 1) % animCount
      modelRef.current.playAnimation(nextIndex)
    }
  }
  
  // Alternar reproducción/pausa
  const togglePlay = () => {
    if (modelRef.current) {
      modelRef.current.toggleAnimation()
    }
  }
  
  return (
    <group position={position}>
      {/* Panel de fondo */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[1.2, 0.5, 0.05]} />
        <meshStandardMaterial color="#333333" opacity={0.8} transparent />
      </mesh>
      
      {/* Controles con HTML */}
      <Html
        position={[0, 0, 0]}
        transform
        occlude
        distanceFactor={10}
        style={{
          width: '300px',
          height: '150px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        <div style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
          Controles de Animación
        </div>
        <div style={{ marginBottom: '20px', color: '#aaffaa', fontSize: '14px' }}>
          {animCount > 0 ? `Animación ${currentAnim + 1} de ${animCount}` : 'Sin animaciones'}
        </div>
      </Html>
      
      {/* Botones de control */}
      <group position={[0, -0.15, 0]}>
        {/* Botón anterior */}
        <Interactive onSelect={prevAnimation}>
          <group position={[-0.4, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.08, 0.08, 0.05, 32]} />
              <meshStandardMaterial color="#5555ff" />
            </mesh>
            <Html center transform position={[0, 0, 0.03]}>
              <div style={{ fontSize: '14px', color: 'white' }}>◀</div>
            </Html>
          </group>
        </Interactive>
        
        {/* Botón play/pausa */}
        <Interactive onSelect={togglePlay}>
          <group position={[0, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.08, 0.08, 0.05, 32]} />
              <meshStandardMaterial color="#55ff55" />
            </mesh>
            <Html center transform position={[0, 0, 0.03]}>
              <div style={{ fontSize: '14px', color: 'white' }}>⏯</div>
            </Html>
          </group>
        </Interactive>
        
        {/* Botón siguiente */}
        <Interactive onSelect={nextAnimation}>
          <group position={[0.4, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.08, 0.08, 0.05, 32]} />
              <meshStandardMaterial color="#5555ff" />
            </mesh>
            <Html center transform position={[0, 0, 0.03]}>
              <div style={{ fontSize: '14px', color: 'white' }}>▶</div>
            </Html>
          </group>
        </Interactive>
      </group>
    </group>
  )
} 