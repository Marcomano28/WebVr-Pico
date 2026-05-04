'use client'

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Lista de pistas disponibles
const AUDIO_TRACKS = [
  { id: 'track1', name: 'Ambiente-Jazz', path: '/audio/Two Grooves.mp3' },
  { id: 'track2', name: 'Ambiente', path: '/audio/Oceanvs Orientalis.mp3' },
  { id: 'track3', name: 'Relax', path: '/audio/Zen et fluide .mp3' },
  { id: 'track4', name: 'Nada', path: '' },
  // Agregar más pistas según sea necesario:
  // { id: 'track2', name: 'Otro tema', path: '/audio/otro-tema.mp3' },
]

// Tipo para el control de audio expuesto
export type AudioControl = {
  nextTrack: () => void;
  getCurrentTrack: () => { id: string; name: string; path: string };
  play: () => void;
  stop: () => void;
  isPlaying: () => boolean;
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
const SimpleAudio = forwardRef<AudioControl, SimpleAudioProps>(function SimpleAudio({
  initialTrackId = 'track1',
  volume = 0.4,
  autoPlay = false,
  loop = true,
  onTrackChange = null
}, ref) {
  // Tipar correctamente la referencia del audio
  const audioRef = useRef<THREE.Audio | null>(null)
  const pendingPlayRef = useRef(autoPlay)
  const { camera } = useThree()
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentTrackId, setCurrentTrackId] = useState(initialTrackId)
  
  // Obtener la información de la pista actual
  const getCurrentTrack = () => {
    return AUDIO_TRACKS.find(track => track.id === currentTrackId) || AUDIO_TRACKS[0]
  }
  
  // Cambiar a la siguiente pista
  const nextTrack = () => {
    console.log("⭐ nextTrack llamado - Cambiando a siguiente pista");
    pendingPlayRef.current = true
    setIsLoaded(false)

    if (audioRef.current) {
      if (audioRef.current.isPlaying) {
        audioRef.current.stop()
        console.log("⭐ Deteniendo la pista actual antes de cambiar")
      }
      audioRef.current.disconnect()
      console.log("⭐ Desconectando la instancia de audio actual")
    }

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
    pendingPlayRef.current = true

    if (!getCurrentTrack().path) {
      console.log('La pista actual no tiene audio asociado.')
      pendingPlayRef.current = false
      return
    }

    if (audioRef.current && isLoaded) {
      try {
        if (!audioRef.current.isPlaying) {
          audioRef.current.play()
          console.log(`Audio reproduciendo: ${getCurrentTrack().path}`)
        }
        pendingPlayRef.current = false
      } catch (error) {
        console.warn('Error al reproducir audio:', error)
      }
    }
  }

  // Efecto para cargar y reproducir la pista de audio actual
  useEffect(() => {
    console.log("Cargando pista de audio:", currentTrackId)
    setIsLoaded(false)

    // Detener reproducción anterior si existe
    if (audioRef.current && audioRef.current.isPlaying) {
      audioRef.current.stop()
    }
    
    const track = getCurrentTrack()
    const url = track.path

    if (!url) {
      audioRef.current = null
      pendingPlayRef.current = false
      console.log('Audio desactivado para la pista actual.')
      return
    }

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

        if (autoPlay || pendingPlayRef.current) {
          try {
            sound.play()
            pendingPlayRef.current = false
            console.log(`Audio iniciado por solicitud del usuario: ${url}`)
          } catch (error) {
            console.warn('Reproducción bloqueada, se necesita otra interacción del usuario:', error)
          }
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
      pendingPlayRef.current = false
      if (audioRef.current && audioRef.current.isPlaying) {
        audioRef.current.stop()
      }
    },
    isPlaying: () => Boolean(audioRef.current?.isPlaying)
  }));

  // Este componente no renderiza nada visible
  return null
});

export default SimpleAudio;
