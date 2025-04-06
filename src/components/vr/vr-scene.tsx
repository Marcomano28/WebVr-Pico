'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { VRButton, XR, Controllers, Hands, Interactive } from '@react-three/xr'
import { Environment, OrbitControls, Text } from '@react-three/drei'
import MovementEnhanced from './controls/movement-enhanced'
import ModelLoader, { GLTFModelHandle } from './models/model-loader'
import FBXModel, { FBXModelHandle } from './models/fbx-model'
import { Floor } from './floor'
import AnimatedAvatar, { AnimatedAvatarHandle } from './models/animated-avatar'
import SimpleAudio, { AudioControl } from './simple-audio'

// Componente para verificar compatibilidad con WebXR
const VRSupport = () => {
  const [isVRSupported, setIsVRSupported] = useState<boolean | null>(null)
  const [errorDetail, setErrorDetail] = useState<string>('')

  useEffect(() => {
    // Verificación de soporte para WebXR
    async function checkXRSupport() {
      if (typeof navigator === 'undefined' || !navigator.xr) {
        setIsVRSupported(false)
        setErrorDetail('WebXR API no disponible en este navegador')
        return
      }

      try {
        // Intentar verificar si el dispositivo soporta VR inmersivo
        const isSupported = await navigator.xr.isSessionSupported('immersive-vr')
        setIsVRSupported(isSupported)
        if (!isSupported) {
          setErrorDetail('Este dispositivo no soporta sesiones VR inmersivas')
        }
      } catch (error) {
        console.error('Error verificando soporte WebXR:', error)
        setIsVRSupported(false)
        setErrorDetail('Error al verificar compatibilidad con WebXR')
      }
    }

    checkXRSupport()
  }, [])

  // Muestra mensaje según el estado de soporte
  if (isVRSupported === null) {
    return <div className="vr-checking">Verificando compatibilidad VR...</div>
  }

  if (isVRSupported === false) {
    return (
      <div className="vr-error">
        <h3>VR no soportado</h3>
        <p>{errorDetail}</p>
        <p>Recomendaciones:</p>
        <ul>
          <li>Usa el navegador integrado de Pico Neo 3</li>
          <li>Actualiza el firmware de tu dispositivo</li>
          <li>Verifica que WebXR esté habilitado en la configuración del navegador</li>
        </ul>
      </div>
    )
  }

  // Si VR es soportado, continúa con normalidad
  return null
}

export function VRScene() {
  // Referencias a los modelos
  const modelRef = useRef<GLTFModelHandle>(null)
  const carModelRef = useRef<GLTFModelHandle>(null)
  const avatarRef = useRef<AnimatedAvatarHandle>(null)
  const mclarenRef = useRef<GLTFModelHandle>(null)
  
  // Referencia al componente de audio
  const audioRef = useRef<AudioControl>(null)
  
  // Estado para rastrear si el modelo está cargado
  const [modelLoaded, setModelLoaded] = useState(false)
  const [animationNames, setAnimationNames] = useState<string[]>([])
  const [avatarAnimations, setAvatarAnimations] = useState<string[]>([])
  
  // Estado para rastrear información de audio
  const [currentTrack, setCurrentTrack] = useState({ id: 'track1', name: 'Ambiente' })
  
  // Función para manejar cuando el modelo se carga
  const handleModelLoaded = useCallback(() => {
    console.log("Modelo cargado correctamente")
    setModelLoaded(true)
    
    // Comprobar animaciones del modelo GLB
    if (modelRef.current) {
      const names = modelRef.current.getAnimationNames()
      setAnimationNames(names)
      console.log("Animaciones disponibles en GLB:", names)
      if (names.length > 0) {
        modelRef.current.playAnimation(names[0])
      }
    }
    
    // Comprobar animaciones del avatar animado
    if (avatarRef.current) {
      const names = avatarRef.current.getAnimationNames()
      setAvatarAnimations(names)
      console.log("Animaciones disponibles en el avatar:", names)
    }
  }, [])
  
  // Manejador de cambio de pista de audio
  const handleTrackChange = useCallback((track: { id: string; name: string; path: string }) => {
    setCurrentTrack({ id: track.id, name: track.name })
    console.log(`Música cambiada a: ${track.name}`)
  }, [])

  return (
    <>
      <VRSupport />
      <VRButton className="vr-button" />
      <Canvas shadows>
        <XR>
          {/* Ambiente con intensidad normal */}
          <Environment preset="sunset" />
          <Controllers />
          <Hands />
          
          {/* Añadir audio ambiental con volumen bajo */}
          <SimpleAudio 
            ref={audioRef} 
            volume={0.4} 
            onTrackChange={handleTrackChange} 
          />
          
          {/* Iluminación básica */}
          <ambientLight intensity={0.2} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
          
          {/* Suelo con texturas KTX2 */}
          <Floor />
          
          {/* Modelo GLB con capacidad de animación - con removePlane para eliminar el plano blanco */}
          <ModelLoader 
            ref={modelRef}
            url="/models/SAvatar1.glb" 
            position={[0, 0, -5]} 
            scale={0.9}
            removePlane={true}
            initialAnimationIndex={5}
            onLoad={handleModelLoaded}
          />
          
          {/* Modelo del Lamborghini */}
          <ModelLoader 
            ref={carModelRef}
            url="/models/lamborghini_huracan.glb" 
            position={[-3, 0, -5]} 
            scale={1} 
            rotation={[0, Math.PI/4, 0]}
            onLoad={handleModelLoaded}
          />
          
          {/* Modelo del McLaren Senna */}
          <ModelLoader 
            ref={mclarenRef}
            url="/models/mclaren_senna.glb" 
            position={[2, 0, -5]} 
            scale={1} 
            rotation={[0, Math.PI/6, 0]}
            onLoad={handleModelLoaded}
          />
          
          {/* Avatar animado con animación externa FBX - ahora con el mismo tamaño que el modelo estático (scale=1) */}
          <AnimatedAvatar 
            ref={avatarRef}
            modelUrl="/models/AlfredAvatar.glb"
            animationUrl="/models/fbx/Standing W_Briefcase Idle (1).fbx"
            position={[5, 0, -5]} 
            scale={1}
            headFollow={true}
            initialAnimationIndex={1}
            onLoad={handleModelLoaded}
          />
          
          {/* Controles de movimiento básicos */}
          <MovementEnhanced 
            speed={2} 
            rotationSpeed={0.008} 
          />
          
          {/* Botón para cambiar animación del GLB */}
          {animationNames.length > 0 && (
            <Interactive onSelect={() => {
              if (modelRef.current) {
                const currentAnim = modelRef.current.getCurrentAnimation();
                const allAnims = modelRef.current.getAnimationNames();
                const currentIndex = currentAnim ? allAnims.indexOf(currentAnim) : -1;
                const nextIndex = (currentIndex + 1) % allAnims.length;
                modelRef.current.playAnimation(allAnims[nextIndex]);
                console.log(`GLB: Cambiado a animación ${allAnims[nextIndex]}`);
              }
            }}>
              <mesh position={[0, 0.1, -1]}>
                <sphereGeometry args={[0.05]} />
                <meshStandardMaterial color="green" emissive="green" emissiveIntensity={0.5} />
              </mesh>
            </Interactive>
          )}
          
          {/* Botón para cambiar música (esfera azul) - MEJORADO */}
          <Interactive onSelect={() => {
            if (audioRef.current) {
              audioRef.current.nextTrack();
              console.log("INTERACCIÓN DETECTADA: Cambiando pista de audio");
            } else {
              console.log("ERROR: audioRef es null");
            }
          }}>
            <mesh position={[0.2, 0.1, -1]}>
              <sphereGeometry args={[0.05]} />
              <meshStandardMaterial color="#0077ff" emissive="#0088ff" emissiveIntensity={1.0} />
            </mesh>
          </Interactive>
          
          {/* Botón para cambiar animación del avatar */}
          {avatarAnimations.length > 0 && (
            <Interactive onSelect={() => {
              if (avatarRef.current) {
                const currentAnim = avatarRef.current.getCurrentAnimation();
                const allAnims = avatarRef.current.getAnimationNames();
                const currentIndex = currentAnim ? allAnims.indexOf(currentAnim) : -1;
                const nextIndex = (currentIndex + 1) % allAnims.length;
                avatarRef.current.playAnimation(allAnims[nextIndex]);
                console.log(`Avatar: Cambiado a animación ${allAnims[nextIndex]}`);
              }
            }}>
              <mesh position={[0.4, 0.1, -1]}>
                <sphereGeometry args={[0.05]} />
                <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={0.5} />
              </mesh>
            </Interactive>
          )}
          
        </XR>
        
        {/* OrbitControls para navegadores no-VR */}
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} enableDamping={true} dampingFactor={0.03}/>
      </Canvas>
    </>
  )
}

export default VRScene 