'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Componente de audio simple que reproduce automáticamente un archivo de audio
 * con volumen bajo al cargar la escena.
 */
export default function SimpleAudio({ 
  url = '/audio/Zen et fluide.mp3',
  volume = 0.8, 
  autoPlay = true,
  loop = true
}) {
  // Tipar correctamente la referencia del audio
  const audioRef = useRef<THREE.Audio | null>(null)
  const { camera, gl } = useThree()
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Función para intentar reproducir el audio - puede ser llamada por una interacción del usuario
  const playAudio = () => {
    if (audioRef.current && isLoaded) {
      try {
        if (!audioRef.current.isPlaying) {
          audioRef.current.play()
          console.log(`Audio reproduciendo: ${url}`)
        }
      } catch (error) {
        console.warn('Error al reproducir audio:', error)
      }
    }
  }
  
  // Escuchar eventos del canvas para intentar reproducir después de una interacción
  useEffect(() => {
    const domElement = gl.domElement
    
    const handleInteraction = () => {
      playAudio()
    }
    
    domElement.addEventListener('click', handleInteraction)
    domElement.addEventListener('touchstart', handleInteraction)
    
    return () => {
      domElement.removeEventListener('click', handleInteraction)
      domElement.removeEventListener('touchstart', handleInteraction)
    }
  }, [gl, isLoaded])
  
  useEffect(() => {
    console.log("Inicializando componente de audio...")
    
    // Crear un listener de audio y adjuntarlo a la cámara
    const listener = new THREE.AudioListener()
    camera.add(listener)
    
    // Crear un objeto de audio global (no posicional)
    const sound = new THREE.Audio(listener)
    audioRef.current = sound
    
    // Cargar el archivo de audio
    const audioLoader = new THREE.AudioLoader()
    
    console.log(`Intentando cargar audio desde: ${url}`)
    
    // Intentar cargar y reproducir el audio
    audioLoader.load(
      url, 
      (buffer) => {
        console.log("Audio cargado correctamente:", url)
        sound.setBuffer(buffer)
        sound.setVolume(volume)
        sound.setLoop(loop)
        setIsLoaded(true)
        
        // Para un mejor manejo de políticas de reproducción:
        // 1. Intento inmediato de reproducción
        if (autoPlay) {
          setTimeout(() => {
            try {
              sound.play()
              console.log(`Audio iniciado automáticamente: ${url}`)
            } catch (error) {
              console.warn('Reproducción automática bloqueada, esperando interacción del usuario:', error)
            }
          }, 1000)
        }
        
        // 2. Intento adicional después de un tiempo
        setTimeout(() => {
          if (!sound.isPlaying) {
            try {
              sound.play()
              console.log("Segundo intento de reproducción exitoso")
            } catch (error) {
              console.warn('Segundo intento de reproducción fallido:', error)
            }
          }
        }, 3000)
      },
      // Callback de progreso
      (xhr) => {
        const percent = (xhr.loaded / xhr.total) * 100
        console.log(`Audio cargando: ${Math.round(percent)}%`)
      },
      // Callback de error
      (error) => {
        console.error('Error al cargar audio:', error)
        console.error('URL que falló:', url)
      }
    )
    
    // Limpieza al desmontar
    return () => {
      console.log("Limpiando recursos de audio")
      if (audioRef.current) {
        if (audioRef.current.isPlaying) {
          audioRef.current.stop()
        }
        audioRef.current.disconnect()
      }
      camera.remove(listener)
    }
  }, [camera, url, volume, autoPlay, loop])
  
  // Este componente no renderiza nada visible
  return null
} 