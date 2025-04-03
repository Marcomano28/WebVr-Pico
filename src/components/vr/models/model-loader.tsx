'use client'

import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react'
import { useLoader, useFrame, useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'

interface ModelLoaderProps {
  url: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  removePlane?: boolean
  onLoad?: () => void
}

export interface GLTFModelHandle {
  playAnimation: (name: string) => boolean
  getCurrentAnimation: () => string | null
  getAnimationNames: () => string[]
}

const ModelLoader = forwardRef<GLTFModelHandle, ModelLoaderProps>(({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  removePlane = true,
  onLoad
}, ref) => {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(url)
  const { actions, names } = useAnimations(animations, group)
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null)
  
  useEffect(() => {
    if (removePlane) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name === "Plane") {
          console.log("Eliminando plano del modelo:", child.name);
          const parent = child.parent;
          if (parent) {
            parent.remove(child);
          }
        }
      });
    }
    
    if (names.length > 0) {
      console.log(`Modelo ${url} cargado con ${names.length} animaciones:`, names)
      
      if (names.length > 0 && actions[names[0]]) {
        playAnimation(names[0])
      }
    } else {
      console.log(`Modelo ${url} cargado sin animaciones`)
    }
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    if (onLoad) {
      onLoad()
    }
  }, [scene, actions, names, url, removePlane, onLoad])
  
  const playAnimation = (name: string): boolean => {
    if (!actions || !actions[name]) return false
    
    console.log(`Reproduciendo animación: ${name}`)
    
    if (currentAnimation && actions[currentAnimation]) {
      actions[currentAnimation].fadeOut(0.5)
    }
    
    actions[name].reset().fadeIn(0.5).play()
    setCurrentAnimation(name)
    return true
  }
  
  useImperativeHandle(ref, () => ({
    playAnimation,
    getCurrentAnimation: () => currentAnimation,
    getAnimationNames: () => names
  }))
  
  const finalScale = typeof scale === 'number' 
    ? [scale, scale, scale] as [number, number, number]
    : scale
  
  return (
    <group 
      ref={group} 
      position={position}
      rotation={Array.isArray(rotation) ? [rotation[0], rotation[1], rotation[2]] : [0, 0, 0]}
      scale={finalScale}
    >
      <primitive object={scene} />
    </group>
  )
})

ModelLoader.displayName = 'ModelLoader'

export default ModelLoader 