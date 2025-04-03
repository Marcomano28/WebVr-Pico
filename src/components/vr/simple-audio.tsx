'use client'

import React, { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Componente de audio simple que reproduce automáticamente un archivo de audio
 * con volumen bajo al cargar la escena.
 */
export default function SimpleAudio({ 
  url = '/audio/Zen et fluide.mp3',
  volume = 0.2, 
  autoPlay = true,
  loop = true
}) {
  // Tipar correctamente la referencia del audio
  const audioRef = useRef<THREE.Audio | null>(null)
  const { camera } = useThree()
  
  useEffect(() => {
    // Crear un listener de audio y adjuntarlo a la cámara
    const listener = new THREE.AudioListener()
    camera.add(listener)
    
    // Crear un objeto de audio global (no posicional)
    const sound = new THREE.Audio(listener)
    audioRef.current = sound
    
    // Cargar el archivo de audio
    const audioLoader = new THREE.AudioLoader()
    
    // Intentar cargar y reproducir el audio
    audioLoader.load(
      url, 
      (buffer) => {
        sound.setBuffer(buffer)
        sound.setVolume(volume)
        sound.setLoop(loop)
        
        if (autoPlay) {
          // Reproducir con un pequeño retraso para evitar problemas en algunos navegadores
          setTimeout(() => {
            try {
              sound.play()
              console.log(`Audio reproduciendo: ${url}`)
            } catch (error) {
              console.warn('No se pudo reproducir audio automáticamente:', error)
            }
          }, 1000)
        }
      },
      // Callback de progreso
      (xhr) => {
        const percent = (xhr.loaded / xhr.total) * 100
        console.log(`Audio cargando: ${Math.round(percent)}%`)
      },
      // Callback de error
      (error) => {
        console.error('Error al cargar audio:', error)
      }
    )
    
    // Limpieza al desmontar
    return () => {
      if (audioRef.current) {
        audioRef.current.stop()
        audioRef.current.disconnect()
      }
      camera.remove(listener)
    }
  }, [camera, url, volume, autoPlay, loop])
  
  // Este componente no renderiza nada visible
  return null
} 