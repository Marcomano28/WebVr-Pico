'use client'

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Lista de pistas disponibles
const AUDIO_TRACKS = [
  { id: 'track1', name: 'Ambiente', path: '/audio/Two Grooves.mp3' },
  { id: 'track1', name: 'Ambiente', path: '/audio/Oceanvs Orientalis.mp3' },
  { id: 'track1', name: 'Ambiente', path: '/audio/Zen et fluide .mp3' },
  // Agregar más pistas según sea necesario:
  // { id: 'track2', name: 'Otro tema', path: '/audio/otro-tema.mp3' },
]

// Tipo para el control de audio expuesto
export type AudioControl = {
  nextTrack: () => void;
  getCurrentTrack: () => { id: string; name: string; path: string };
  play: () => void;
  stop: () => void;
};

// Props para el componente de audio
export interface SimpleAudioProps {
  initialTrackId?: string;
  volume?: number;
  autoPlay?: boolean;
  loop?: boolean;
  onTrackChange?: (track: { id: string; name: string; path: string }) => void;
}

/**
 * Componente de audio simple que reproduce automáticamente un archivo de audio
 * y permite cambiar entre diferentes pistas.
 */
const SimpleAudio = forwardRef<AudioControl, SimpleAudioProps>(({
  initialTrackId = 'track1',
  volume = 0.4, 
  autoPlay = true,
  loop = true,
  onTrackChange = null
}, ref) => {
  // Tipar correctamente la referencia del audio
  const audioRef = useRef<THREE.Audio | null>(null)
  const { camera, gl } = useThree()
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentTrackId, setCurrentTrackId] = useState(initialTrackId)
  
  // Obtener la información de la pista actual
  const getCurrentTrack = () => {
    return AUDIO_TRACKS.find(track => track.id === currentTrackId) || AUDIO_TRACKS[0]
  }
  
  // Cambiar a la siguiente pista
  const nextTrack = () => {
    console.log("⭐ nextTrack llamado - Cambiando a siguiente pista");
    const currentIndex = AUDIO_TRACKS.findIndex(track => track.id === currentTrackId)
    const nextIndex = (currentIndex + 1) % AUDIO_TRACKS.length
    console.log(`⭐ Cambiando de pista ${currentIndex} a ${nextIndex} (${AUDIO_TRACKS[nextIndex].name})`);
    setCurrentTrackId(AUDIO_TRACKS[nextIndex].id)
    
    // Notificar el cambio si hay un manejador
    if (onTrackChange) {
      onTrackChange(AUDIO_TRACKS[nextIndex])
    } else {
      console.log("⚠️ No hay manejador onTrackChange definido");
    }
    
    return AUDIO_TRACKS[nextIndex]; // Retornar la nueva pista para facilitar depuración
  }
  
  // Función para intentar reproducir el audio - puede ser llamada por una interacción del usuario
  const playAudio = () => {
    if (audioRef.current && isLoaded) {
      try {
        if (!audioRef.current.isPlaying) {
          audioRef.current.play()
          console.log(`Audio reproduciendo: ${getCurrentTrack().path}`)
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
  
  // Efecto para cargar y reproducir la pista de audio actual
  useEffect(() => {
    console.log("Cargando pista de audio:", currentTrackId)
    
    // Detener reproducción anterior si existe
    if (audioRef.current && audioRef.current.isPlaying) {
      audioRef.current.stop()
    }
    
    const track = getCurrentTrack()
    const url = track.path
    
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
  }, [camera, currentTrackId, volume, autoPlay, loop])
  
  // Exponer métodos para controlar desde componentes padres
  useImperativeHandle(ref, () => ({
    nextTrack,
    getCurrentTrack,
    play: playAudio,
    stop: () => {
      if (audioRef.current && audioRef.current.isPlaying) {
        audioRef.current.stop()
      }
    }
  }));
  
  // Este componente no renderiza nada visible
  return null
});

export default SimpleAudio; 