'use client'

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useFrame, useGraph } from '@react-three/fiber'
import { useAnimations, useFBX, useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'

// Interfaces para tipar correctamente los nodos del modelo
interface AvaturnNodes {
  Hips: THREE.Object3D
  avaturn_body?: {
    geometry: THREE.BufferGeometry
    material: THREE.Material
    skeleton: THREE.SkeletonHelper
  }
  avaturn_hair_0?: {
    geometry: THREE.BufferGeometry
    material: THREE.Material
    skeleton: THREE.SkeletonHelper
  }
  avaturn_hair_1?: {
    geometry: THREE.BufferGeometry
    material: THREE.Material
    skeleton: THREE.SkeletonHelper
  }
  avaturn_look_0?: {
    geometry: THREE.BufferGeometry
    material: THREE.Material
    skeleton: THREE.SkeletonHelper
  }
  avaturn_shoes_0?: {
    geometry: THREE.BufferGeometry
    material: THREE.Material
    skeleton: THREE.SkeletonHelper
  }
  [key: string]: any
}

interface AvaturnMaterials {
  avaturn_body_material?: THREE.Material
  avaturn_hair_0_material?: THREE.Material
  avaturn_hair_1_material?: THREE.Material
  avaturn_look_0_material?: THREE.Material
  avaturn_shoes_0_material?: THREE.Material
  [key: string]: any
}

// Interfaz para las propiedades del componente
interface AnimatedAvatarProps {
  modelUrl: string
  animationUrl: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  headFollow?: boolean
  onLoad?: () => void
}

// Interfaz para el manejador de referencia del componente
export interface AnimatedAvatarHandle {
  playAnimation: (name: string) => boolean
  getCurrentAnimation: () => string | null
  getAnimationNames: () => string[]
}

const AnimatedAvatar = forwardRef<AnimatedAvatarHandle, AnimatedAvatarProps>(({
  modelUrl, 
  animationUrl,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  headFollow = false,
  onLoad
}, ref) => {
  const group = useRef<THREE.Group>(null)
  
  // Cargar el modelo GLB
  const { scene } = useGLTF(modelUrl)
  
  // Clonar la escena para evitar problemas de referencia
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  
  // Extraer nodos y materiales del modelo
  const { nodes, materials } = useGraph(clone) as { 
    nodes: AvaturnNodes, 
    materials: AvaturnMaterials 
  }
  
  // Cargar animación externa FBX
  const { animations: externalAnimations } = useFBX(animationUrl)
  
  // Asignar nombre a la animación para identificarla
  const animationName = animationUrl.split('/').pop()?.split('.')[0] || 'animation'
  if (externalAnimations && externalAnimations.length > 0) {
    externalAnimations[0].name = animationName
  }
  
  // Configurar animaciones
  const { actions, names } = useAnimations(externalAnimations, group)
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null)
  
  // Reproducir la animación al cargar
  useEffect(() => {
    console.log(`Modelo cargado: ${modelUrl}`)
    console.log(`Animación cargada: ${animationUrl}`)
    
    if (names.length > 0) {
      console.log('Animaciones disponibles:', names)
      
      // Reproducir la primera animación
      if (actions && actions[names[0]]) {
        actions[names[0]].reset().play()
        setCurrentAnimation(names[0])
        console.log(`Reproduciendo animación: ${names[0]}`)
      }
    }
    
    // Notificar que el modelo ha sido cargado
    if (onLoad) {
      onLoad()
    }
  }, [modelUrl, animationUrl, actions, names, onLoad])
  
  // Implementar seguimiento de cabeza si está habilitado
  useFrame((state) => {
    if (headFollow && group.current) {
      const head = group.current.getObjectByName('Head')
      if (head) {
        head.lookAt(state.camera.position)
      }
    }
  })
  
  // Función para reproducir una animación específica
  const playAnimation = (name: string): boolean => {
    if (!actions || !actions[name]) return false
    
    console.log(`Reproduciendo animación: ${name}`)
    
    // Detener animación actual
    if (currentAnimation && actions[currentAnimation]) {
      actions[currentAnimation].fadeOut(0.5)
    }
    
    // Reproducir nueva animación y mantener la posición vertical
    actions[name].reset().fadeIn(0.5).play()
    
    // Importante: desactivar el desplazamiento vertical que causa el problema
    if (actions[name]) {
      actions[name].enabled = true
      actions[name].setEffectiveTimeScale(1)
      actions[name].setEffectiveWeight(1)
      // Evitar que la animación mueva la posición vertical del modelo
      actions[name].clampWhenFinished = true
      // Esta es la clave: evita que la animación modifique la posición Y
      actions[name].getClip().tracks = actions[name].getClip().tracks.filter(track => 
        !track.name.includes('position.y')
      )
    }
    
    setCurrentAnimation(name)
    return true
  }
  
  // Exponer métodos para controlar la animación
  useImperativeHandle(ref, () => ({
    playAnimation,
    getCurrentAnimation: () => currentAnimation,
    getAnimationNames: () => names
  }))
  
  // Calcular la escala final
  const finalScale = typeof scale === 'number' 
    ? [scale, scale, scale] as [number, number, number]
    : scale
  
  // Renderizar el componente
  return (
    <group 
      ref={group} 
      position={position}
      rotation={Array.isArray(rotation) ? [rotation[0], rotation[1], rotation[2]] : [0, 0, 0]}
      scale={finalScale}
      dispose={null}
    >
      {nodes && nodes.Hips && (
        <group position={[-3.8, -0.09, 0.8]} rotation={[-Math.PI/2, 0, 0]}>
          <primitive object={nodes.Hips} />
          {nodes.avaturn_body && (
            <skinnedMesh 
              geometry={nodes.avaturn_body.geometry} 
              material={materials.avaturn_body_material!} 
              skeleton={nodes.avaturn_body.skeleton}
              castShadow
              receiveShadow
            />
          )}
          {nodes.avaturn_hair_0 && (
            <skinnedMesh 
              geometry={nodes.avaturn_hair_0.geometry} 
              material={materials.avaturn_hair_0_material!} 
              skeleton={nodes.avaturn_hair_0.skeleton}
              castShadow
            />
          )}
          {nodes.avaturn_hair_1 && (
            <skinnedMesh 
              geometry={nodes.avaturn_hair_1.geometry} 
              material={materials.avaturn_hair_1_material!} 
              skeleton={nodes.avaturn_hair_1.skeleton}
              castShadow
            />
          )}
          {nodes.avaturn_look_0 && (
            <skinnedMesh 
              geometry={nodes.avaturn_look_0.geometry} 
              material={materials.avaturn_look_0_material!} 
              skeleton={nodes.avaturn_look_0.skeleton}
              castShadow
            />
          )}
          {nodes.avaturn_shoes_0 && (
            <skinnedMesh 
              geometry={nodes.avaturn_shoes_0.geometry} 
              material={materials.avaturn_shoes_0_material!} 
              skeleton={nodes.avaturn_shoes_0.skeleton}
              castShadow
            />
          )}
        </group>
      )}
    </group>
  )
})

AnimatedAvatar.displayName = 'AnimatedAvatar'

export default AnimatedAvatar 