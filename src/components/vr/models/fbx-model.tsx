'use client'

import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFBX } from '@react-three/drei'
import * as THREE from 'three'

interface FBXModelProps {
  url: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  animationIndex?: number
  animationSpeed?: number
  autoPlay?: boolean
  onLoaded?: () => void
}

export interface FBXModelHandle {
  playAnimation: (index: number) => boolean
  getAnimationCount: () => number
  getCurrentAnimationIndex: () => number
}

const FBXModel = forwardRef<FBXModelHandle, FBXModelProps>(
  ({ url, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, animationIndex = 0, animationSpeed = 1, autoPlay = true, onLoaded }, ref) => {
    const fbx = useFBX(url)
    const mixer = useRef<THREE.AnimationMixer | null>(null)
    const actions = useRef<THREE.AnimationAction[]>([])
    const currentAction = useRef<THREE.AnimationAction | null>(null)
    const [currentAnimationIndex, setCurrentAnimationIndex] = useState<number>(animationIndex)
    const [initialized, setInitialized] = useState(false)

    // Función para crear y configurar el mixer de animación
    const setupAnimations = () => {
      if (!fbx) return
      
      console.log(`FBX modelo cargado: ${url}`)
      
      // Crear mixer una sola vez
      if (!mixer.current) {
        mixer.current = new THREE.AnimationMixer(fbx)
        console.log('Mixer de animación creado')
      }
      
      // Verificar si hay animaciones directamente en el modelo
      if (fbx.animations && fbx.animations.length > 0) {
        console.log(`El modelo tiene ${fbx.animations.length} animaciones incorporadas`)
        
        // Crear acciones para cada animación
        actions.current = fbx.animations.map((clip: THREE.AnimationClip, index: number) => {
          console.log(`Animación ${index}: ${clip.name}, Duración: ${clip.duration}s`)
          return mixer.current!.clipAction(clip)
        })
        
        // Si hay animaciones y autoPlay está habilitado, reproducir la primera
        if (autoPlay && !initialized) {
          playAnimationAtIndex(animationIndex)
          setInitialized(true)
        }
      } else {
        console.warn(`El modelo ${url} no tiene animaciones incorporadas`)
      }
      
      // Aplicar sombras al modelo
      fbx.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      
      // Notificar que el modelo está cargado
      if (onLoaded) {
        onLoaded()
      }
    }
    
    // Helper para reproducir una animación específica
    const playAnimationAtIndex = (index: number): boolean => {
      if (!mixer.current || actions.current.length === 0) return false
      
      // Validar el índice
      const validIndex = Math.min(Math.max(0, index), actions.current.length - 1)
      console.log(`Reproduciendo animación ${validIndex}`)
      
      // Detener animación actual si existe
      if (currentAction.current) {
        currentAction.current.fadeOut(0.2)
        currentAction.current.stop()
      }
      
      // Obtener y configurar la nueva acción
      const action = actions.current[validIndex]
      
      // Configurar la animación
      action.reset()
      action.fadeIn(0.2)
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.clampWhenFinished = false
      action.timeScale = animationSpeed
      action.play()
      
      // Actualizar referencias
      currentAction.current = action
      setCurrentAnimationIndex(validIndex)
      
      return true
    }

    // Configurar animaciones cuando el modelo se carga
    useEffect(() => {
      if (fbx) {
        setupAnimations()
      }
    }, [fbx])

    // Exponer métodos a través de la referencia
    useImperativeHandle(ref, () => ({
      playAnimation: playAnimationAtIndex,
      getAnimationCount: () => actions.current.length,
      getCurrentAnimationIndex: () => currentAnimationIndex
    }))

    // Actualizar el mixer en cada frame
    useFrame((_, delta) => {
      if (mixer.current) {
        mixer.current.update(delta * animationSpeed)
      }
    })

    // Renderizar el modelo
    return (
      <primitive 
        object={fbx} 
        position={position} 
        rotation={Array.isArray(rotation) ? [rotation[0], rotation[1], rotation[2]] : [0, 0, 0]} 
        scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
      />
    )
  }
)

FBXModel.displayName = 'FBXModel'

export default FBXModel 