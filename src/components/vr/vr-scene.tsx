'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { VRButton, XR, Controllers, Hands, Interactive } from '@react-three/xr'
import { Environment, OrbitControls } from '@react-three/drei'
import MovementEnhanced from './controls/movement-enhanced'
import ModelLoader, { GLTFModelHandle } from './models/model-loader'
import { Floor } from './floor'
import AnimatedAvatar, { AnimatedAvatarHandle } from './models/animated-avatar'
import SimpleAudio, { AudioControl } from './simple-audio'
import SpeechBubbleOverlay, {
  SpeechBubblePlacement,
  SpeechBubbleSize
} from './dialogue/speech-bubble-overlay'
import {
  SPEECH_BUBBLE_MIN_HEIGHT,
  SPEECH_BUBBLE_MIN_WIDTH,
  clamp,
  getSpeechBubbleExit
} from './dialogue/speech-bubble'

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

type AgentId = 'sami' | 'alfred' | 'paco'
type SceneMode = 'showroom' | 'rota-panorama'
type VectorTuple = [number, number, number]

interface DialogueLine {
  speaker: AgentId
  text: string
  reveal?: boolean
}

const SAMI_STANDING_ANIMATION = 'postura'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
const CHAT_SESSION_STORAGE_KEY = 'webvr-car-agents-session-id'
const SPEECH_BUBBLE_TAIL_OFFSET = 36
const INITIAL_BUBBLE_SIZE = {
  w: SPEECH_BUBBLE_MIN_WIDTH,
  h: SPEECH_BUBBLE_MIN_HEIGHT
}
const AGENT_MODEL_POINTS: Record<'sami' | 'alfred', {
  position: VectorTuple
  scale: number
}> = {
  sami: {
    position: [0, 0, -5],
    scale: 0.98
  },
  alfred: {
    position: [5, 0, -5],
    scale: 1
  }
}
const ROTA_VIEW = {
  yaw: -110,
  pitch: -35
}
const PACO_CHARACTER = {
  yawOffset: 0,
  pitch: -50,
  distance: 2.9,
  height: 5.6,
  feetOffset: 2.2,
  aspect: 448 / 558,
  bubble: {
    side: 'left',
    tailX: 0.1,
    anchorX: 27.35,
    anchorY: 12.14,
    tailY: 0.82,
    offset: 160
  }
} as const
const PANORAMA_CAMERA_RADIUS = 2

const INTRO_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sami',
    text: 'Soy Sami. Te presento el Lamborghini Huracan: un superdeportivo V10, muy directo, bajo y pensado para sensaciones intensas.'
  },
  {
    speaker: 'alfred',
    text: 'Y yo soy Alfred. A mi lado tienes el McLaren Senna, mas radical, ligero y enfocado en aerodinamica de circuito.'
  },
  {
    speaker: 'sami',
    text: 'Cuando el usuario pregunte por voz, cada agente respondera sobre su coche y podremos comparar prestaciones, diseno y experiencia de conduccion.'
  }
]

function vectorToTuple(vector: THREE.Vector3): VectorTuple {
  return [vector.x, vector.y, vector.z]
}

function getRotaPanoramaCameraPosition() {
  const centerAzimuth = THREE.MathUtils.degToRad(ROTA_VIEW.yaw)
  const centerPolar = THREE.MathUtils.degToRad(90 - ROTA_VIEW.pitch)

  return new THREE.Vector3().setFromSpherical(new THREE.Spherical(
    PANORAMA_CAMERA_RADIUS,
    centerPolar,
    centerAzimuth
  ))
}

function getPacoCharacterPosition() {
  const yaw = ROTA_VIEW.yaw + 180 + PACO_CHARACTER.yawOffset
  const pitch = PACO_CHARACTER.pitch

  return new THREE.Vector3().setFromSpherical(new THREE.Spherical(
    PACO_CHARACTER.distance,
    THREE.MathUtils.degToRad(90 - pitch),
    THREE.MathUtils.degToRad(yaw)
  ))
}

function getPacoCharacterRotationY() {
  const toCamera = getRotaPanoramaCameraPosition().sub(getPacoCharacterPosition())

  return Math.atan2(toCamera.x, toCamera.z)
}

function getPacoCharacterWorldPoint(localPoint: THREE.Vector3) {
  return localPoint
    .clone()
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), PACO_CHARACTER_ROTATION_Y)
    .add(PACO_CHARACTER_POSITION_VECTOR)
}

function getPacoBubblePoints() {
  const bubble = PACO_CHARACTER.bubble
  const height = PACO_CHARACTER.height
  const width = height * PACO_CHARACTER.aspect
  const feetOffset = PACO_CHARACTER.feetOffset
  const side = bubble.side === 'left' ? -1 : 1
  const tailOffsetX = Math.abs(bubble.tailX ?? 0)
  const tailY = height * (bubble.tailY ?? 0.72) - feetOffset
  const anchorY = height * (bubble.anchorY ?? 1.14) - feetOffset
  const anchorX = side * width * (bubble.anchorX ?? 1.35)

  const tailCenterWorld = getPacoCharacterWorldPoint(new THREE.Vector3(0, tailY, 0))
  const anchorWorld = getPacoCharacterWorldPoint(new THREE.Vector3(anchorX, anchorY, 0))
  const panoramaCamera = new THREE.PerspectiveCamera(70, 1, 0.001, 1000)

  panoramaCamera.position.copy(getRotaPanoramaCameraPosition())
  panoramaCamera.lookAt(0, 0, 0)
  panoramaCamera.updateMatrixWorld(true)
  panoramaCamera.updateProjectionMatrix()

  const tailCenterNdc = tailCenterWorld.clone().project(panoramaCamera)
  const anchorNdc = anchorWorld.clone().project(panoramaCamera)
  const anchorScreenDirection = Math.sign(anchorNdc.x - tailCenterNdc.x) || side
  const tailX = anchorScreenDirection * width * tailOffsetX
  const tailWorld = getPacoCharacterWorldPoint(new THREE.Vector3(tailX, tailY, 0))

  return {
    tailPosition: vectorToTuple(tailWorld),
    directionPosition: vectorToTuple(tailCenterWorld),
    anchorPosition: vectorToTuple(anchorWorld)
  }
}

const PACO_CHARACTER_POSITION_VECTOR = getPacoCharacterPosition()
const PACO_CHARACTER_POSITION = vectorToTuple(PACO_CHARACTER_POSITION_VECTOR)
const PACO_CHARACTER_ROTATION_Y = getPacoCharacterRotationY()
const PACO_BUBBLE_POINTS = getPacoBubblePoints()

const AGENT_BUBBLE_POINTS: Record<AgentId, {
  tailPosition: VectorTuple
  directionPosition: VectorTuple
  anchorPosition: VectorTuple
}> = {
  sami: {
    tailPosition: [0.25, 1.45, -5],
    directionPosition: [0, 1.35, -5],
    anchorPosition: [-1.15, 2.2, -5]
  },
  alfred: {
    tailPosition: [5.05, 1.55, -5],
    directionPosition: [5, 1.4, -5],
    anchorPosition: [3.65, 2.2, -5]
  },
  paco: PACO_BUBBLE_POINTS
}

function normalizeAgentId(agentId?: string | null): AgentId {
  if (agentId === 'alfred' || agentId === 'paco') return agentId

  return 'sami'
}

function getPreferredAgentForQuestion(question: string): AgentId {
  const text = question.toLowerCase()

  if (/\b(mclaren|senna|circuito|pista|aerodinamica|aerodinámica|radical|downforce)\b/.test(text)) {
    return 'alfred'
  }

  return 'sami'
}

interface ChatStreamPayload {
  content?: string
  sessionId?: string
  agent?: {
    id?: string
  }
  message?: {
    content?: string
  }
  error?: string
  code?: string | null
}

interface AgentMessageResult {
  agentId: AgentId
  content: string
}

interface TranscriptionResult {
  text?: string
  error?: string
}

interface SpeechBubbleAnchorProps {
  visible: boolean
  bubbleSize: SpeechBubbleSize
  tailPosition: VectorTuple
  directionPosition: VectorTuple
  anchorPosition: VectorTuple
  onPlacementChange: (placement: SpeechBubblePlacement) => void
}

interface SpeechBubble3DProps {
  visible: boolean
  text: string
  typing?: boolean
  anchorPosition: VectorTuple
  tailPosition: VectorTuple
}

const VOICE_RECORDING_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav'
]

type VoiceInputStatus = 'idle' | 'recording' | 'transcribing'

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''

  return VOICE_RECORDING_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || ''
}

function getAudioFormatFromMimeType(mimeType: string) {
  const normalized = mimeType.toLowerCase()

  if (normalized.includes('webm')) return 'webm'
  if (normalized.includes('wav')) return 'wav'
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3'
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'm4a'
  if (normalized.includes('ogg')) return 'ogg'

  return 'webm'
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      const result = String(reader.result || '')
      const [, base64 = ''] = result.split(',')

      resolve(base64)
    }
    reader.onerror = () => reject(reader.error || new Error('Could not read audio blob'))
    reader.readAsDataURL(blob)
  })
}

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function getBubble3DText(text: string, typing?: boolean) {
  if (typing) return '...'

  const trimmed = text.trim()

  if (!trimmed) return ''
  if (trimmed.length <= 220) return trimmed

  return `${trimmed.slice(0, 217).trim()}...`
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word

    if (context.measureText(testLine).width <= maxWidth || !currentLine) {
      currentLine = testLine
      return
    }

    lines.push(currentLine)
    currentLine = word
  })

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.slice(0, 7)
}

function createBubbleTextTexture(text: string) {
  const canvas = document.createElement('canvas')
  const width = 1024
  const height = 512
  const context = canvas.getContext('2d')

  canvas.width = width
  canvas.height = height

  if (!context) return null

  context.clearRect(0, 0, width, height)
  context.fillStyle = '#1f2328'
  context.font = '500 52px Arial, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  const lines = wrapCanvasText(context, text, width * 0.82)
  const lineHeight = 64
  const firstY = height / 2 - ((lines.length - 1) * lineHeight) / 2

  lines.forEach((line, index) => {
    context.fillText(line, width / 2, firstY + index * lineHeight)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  return texture
}

function SpeechBubbleAnchor({
  visible,
  bubbleSize,
  tailPosition,
  directionPosition,
  anchorPosition,
  onPlacementChange
}: SpeechBubbleAnchorProps) {
  const { camera, size } = useThree()
  const frameVectors = useMemo(() => ({
    tail: new THREE.Vector3(),
    directionTail: new THREE.Vector3(),
    anchor: new THREE.Vector3(),
    tailNdc: new THREE.Vector3(),
    directionTailNdc: new THREE.Vector3(),
    anchorNdc: new THREE.Vector3()
  }), [])

  useFrame(() => {
    if (!visible) {
      onPlacementChange({ x: 0, y: 0, tipX: 0, tipY: 0, offscreen: true })
      return
    }

    const { w, h } = bubbleSize

    frameVectors.tail.fromArray(tailPosition)
    frameVectors.directionTail.fromArray(directionPosition)
    frameVectors.anchor.fromArray(anchorPosition)

    frameVectors.tailNdc.copy(frameVectors.tail).project(camera)
    frameVectors.directionTailNdc.copy(frameVectors.directionTail).project(camera)
    frameVectors.anchorNdc.copy(frameVectors.anchor).project(camera)

    const tailX = (frameVectors.tailNdc.x * 0.5 + 0.5) * size.width
    const tailY = (frameVectors.tailNdc.y * -0.5 + 0.5) * size.height
    const directionTailX = (frameVectors.directionTailNdc.x * 0.5 + 0.5) * size.width
    const directionTailY = (frameVectors.directionTailNdc.y * -0.5 + 0.5) * size.height
    const anchorX = (frameVectors.anchorNdc.x * 0.5 + 0.5) * size.width
    const anchorY = (frameVectors.anchorNdc.y * -0.5 + 0.5) * size.height
    const outsideMargin = Math.max(110, Math.min(size.width, size.height) * 0.18)
    const pointIsBehind = frameVectors.tailNdc.z < -1 || frameVectors.tailNdc.z > 1
    const pointIsOutside =
      tailX < -outsideMargin ||
      tailX > size.width + outsideMargin ||
      tailY < -outsideMargin ||
      tailY > size.height + outsideMargin

    if (pointIsBehind || pointIsOutside) {
      onPlacementChange({ x: 0, y: 0, tipX: 0, tipY: 0, offscreen: true })
      return
    }

    const dx = anchorX - directionTailX
    const dy = anchorY - directionTailY
    const distance = Math.hypot(dx, dy)

    if (distance < 1) {
      onPlacementChange({ x: 0, y: 0, tipX: 0, tipY: 0, offscreen: true })
      return
    }

    const ux = dx / distance
    const uy = dy / distance
    const tipAngleDeg = Math.atan2(-uy, -ux) * 180 / Math.PI
    const exit = getSpeechBubbleExit(tipAngleDeg, w, h)
    const dynamicOffset = SPEECH_BUBBLE_TAIL_OFFSET + clamp((h - 96) * 0.08, 0, 18)
    const x = tailX + ux * dynamicOffset - exit.x
    const y = tailY + uy * dynamicOffset - exit.y
    const bubbleIsOutside =
      x + w < -outsideMargin ||
      x > size.width + outsideMargin ||
      y + h < -outsideMargin ||
      y > size.height + outsideMargin

    if (bubbleIsOutside) {
      onPlacementChange({ x: 0, y: 0, tipX: 0, tipY: 0, offscreen: true })
      return
    }

    onPlacementChange({
      x,
      y,
      tipX: tailX - x,
      tipY: tailY - y,
      offscreen: false
    })
  })

  return null
}

function SpeechBubble3D({
  visible,
  text,
  typing = false,
  anchorPosition,
  tailPosition
}: SpeechBubble3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const bubbleText = useMemo(() => getBubble3DText(text, typing), [text, typing])
  const anchorVector = useMemo(() => new THREE.Vector3().fromArray(anchorPosition), [anchorPosition])
  const tailVector = useMemo(() => new THREE.Vector3().fromArray(tailPosition), [tailPosition])
  const worldTailOffset = useMemo(() => tailVector.sub(anchorVector), [anchorVector, tailVector])
  const textTexture = useMemo(() => createBubbleTextTexture(bubbleText), [bubbleText])
  const width = 1.85
  const height = 0.72

  useEffect(() => {
    return () => {
      textTexture?.dispose()
    }
  }, [textTexture])

  useFrame(() => {
    if (!groupRef.current) return

    groupRef.current.quaternion.copy(camera.quaternion)
  })

  if (!visible || (!bubbleText && !typing)) return null

  return (
    <group ref={groupRef} position={anchorPosition} renderOrder={30}>
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#fff8df" transparent opacity={0.94} depthWrite={false} />
      </mesh>
      <mesh position={[-width * 0.34, -height * 0.46, -0.01]} rotation={[0, 0, -0.55]}>
        <coneGeometry args={[0.13, 0.34, 3]} />
        <meshBasicMaterial color="#fff8df" transparent opacity={0.94} depthWrite={false} />
      </mesh>
      {textTexture && (
        <mesh position={[0, 0.01, 0.006]}>
          <planeGeometry args={[width * 0.92, height * 0.78]} />
          <meshBasicMaterial map={textTexture} transparent depthWrite={false} />
        </mesh>
      )}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, -height * 0.42, -0.018, worldTailOffset.x, worldTailOffset.y, worldTailOffset.z]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#fff8df" transparent opacity={0.75} depthWrite={false} />
      </line>
    </group>
  )
}

function placementIsClose(previous: SpeechBubblePlacement | null, next: SpeechBubblePlacement) {
  if (!previous) return false
  if (previous.offscreen !== next.offscreen) return false
  if (next.offscreen) return true

  return Math.abs(previous.x - next.x) < 0.5 &&
    Math.abs(previous.y - next.y) < 0.5 &&
    Math.abs(previous.tipX - next.tipX) < 0.5 &&
    Math.abs(previous.tipY - next.tipY) < 0.5
}

function DesktopOrbitControls() {
  const { gl } = useThree()
  const [enabled, setEnabled] = useState(() => !gl.xr.isPresenting)

  useEffect(() => {
    const xr = gl.xr as unknown as {
      isPresenting: boolean
      addEventListener?: (type: string, listener: () => void) => void
      removeEventListener?: (type: string, listener: () => void) => void
    }
    const handleSessionStart = () => setEnabled(false)
    const handleSessionEnd = () => setEnabled(true)

    setEnabled(!xr.isPresenting)
    xr.addEventListener?.('sessionstart', handleSessionStart)
    xr.addEventListener?.('sessionend', handleSessionEnd)

    return () => {
      xr.removeEventListener?.('sessionstart', handleSessionStart)
      xr.removeEventListener?.('sessionend', handleSessionEnd)
    }
  }, [gl])

  return (
    <OrbitControls
      enabled={enabled}
      enableZoom={true}
      enablePan={true}
      enableRotate={true}
      enableDamping={true}
      dampingFactor={0.06}
    />
  )
}

function RotaPanoramaCameraView() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.copy(getRotaPanoramaCameraPosition())
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera])

  return null
}

function PacoCharacterPlane({ texture }: { texture: THREE.Texture }) {
  const geometry = useMemo(() => {
    const height = PACO_CHARACTER.height
    const width = height * PACO_CHARACTER.aspect
    const geometry = new THREE.PlaneGeometry(width, height)

    geometry.translate(0, (height / 2) - PACO_CHARACTER.feetOffset, 0)

    return geometry
  }, [])

  return (
    <>
      {/* Plano de sombra para dar sensación de estar pisando el suelo */}
      <mesh
        position={[PACO_CHARACTER_POSITION[0], PACO_CHARACTER_POSITION[1] - PACO_CHARACTER.feetOffset + 0.01, PACO_CHARACTER_POSITION[2]]}
        rotation={[-Math.PI / 2, PACO_CHARACTER_ROTATION_Y, 0]}
        receiveShadow
      >
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.3} />
      </mesh>
      {/* Personaje Paco */}
      <mesh
        geometry={geometry}
        position={PACO_CHARACTER_POSITION}
        rotation={[0, PACO_CHARACTER_ROTATION_Y, 0]}
        renderOrder={10}
        castShadow
      >
        <meshBasicMaterial
          map={texture}
          transparent={true}
          alphaTest={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

function RotaPanoramaScene() {
  const panoramaTexture = useLoader(THREE.TextureLoader, '/textures/panoramas/rotaN.png')
  const pacoTexture = useLoader(THREE.TextureLoader, '/models/characters/Paco.png')

  useEffect(() => {
    panoramaTexture.wrapS = THREE.RepeatWrapping
    panoramaTexture.repeat.x = -1
    panoramaTexture.needsUpdate = true
  }, [panoramaTexture])

  useEffect(() => {
    pacoTexture.colorSpace = THREE.SRGBColorSpace
    pacoTexture.needsUpdate = true
  }, [pacoTexture])

  return (
    <>
      <RotaPanoramaCameraView />
      {/* Luz direccional para sombras en el panorama */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <mesh>
        <sphereGeometry args={[10, 30, 30]} />
        <meshBasicMaterial map={panoramaTexture} side={THREE.BackSide} />
      </mesh>
      <PacoCharacterPlane texture={pacoTexture} />
    </>
  )
}

export function VRScene() {
  // Referencias a los modelos
  const modelRef = useRef<GLTFModelHandle>(null)
  const carModelRef = useRef<GLTFModelHandle>(null)
  const avatarRef = useRef<AnimatedAvatarHandle>(null)
  const mclarenRef = useRef<GLTFModelHandle>(null)
  
  // Referencia al componente de audio
  const audioRef = useRef<AudioControl>(null)
  const dialogueTimeoutRef = useRef<number | null>(null)
  const chatSessionIdRef = useRef<string | null>(null)
  const chatRequestTokenRef = useRef(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const voiceChunksRef = useRef<Blob[]>([])
  const voicePressActiveRef = useRef(false)

  // Estado para rastrear si el modelo está cargado
  const [modelLoaded, setModelLoaded] = useState(false)
  const [activeDialogue, setActiveDialogue] = useState<DialogueLine>(INTRO_DIALOGUE[0])
  const [thinkingAgent, setThinkingAgent] = useState<AgentId | null>(null)
  const [voiceStatus, setVoiceStatus] = useState<VoiceInputStatus>('idle')
  const [sceneMode, setSceneMode] = useState<SceneMode>('showroom')
  const [bubbleSizes, setBubbleSizes] = useState<Record<AgentId, SpeechBubbleSize>>({
    sami: INITIAL_BUBBLE_SIZE,
    alfred: INITIAL_BUBBLE_SIZE,
    paco: INITIAL_BUBBLE_SIZE
  })
  const [bubblePlacements, setBubblePlacements] = useState<Record<AgentId, SpeechBubblePlacement | null>>({
    sami: null,
    alfred: null,
    paco: null
  })
  
  // Estado para rastrear información de audio
  const [currentTrack, setCurrentTrack] = useState({ id: 'track1', name: 'Ambiente-Jazz' })
  
  // Función para manejar cuando el modelo se carga
  const handleModelLoaded = useCallback(() => {
    console.log("Modelo cargado correctamente")
    setModelLoaded(true)

    // Sami queda fijado a una postura estable para conversar.
    if (modelRef.current) {
      const names = modelRef.current.getAnimationNames()
      console.log("Animación activa para Sami:", names)
      modelRef.current.playAnimation(SAMI_STANDING_ANIMATION)
    }

    // Alfred usa un FBX standing idle como base conversacional.
    if (avatarRef.current) {
      const names = avatarRef.current.getAnimationNames()
      console.log("Animación activa para Alfred:", names)
    }
  }, [])
  
  // Manejador de cambio de pista de audio
  const handleTrackChange = useCallback((track: { id: string; name: string; path: string }) => {
    setCurrentTrack({ id: track.id, name: track.name })
    console.log(`Música cambiada a: ${track.name}`)
  }, [])

  const handleBubbleSizeChange = useCallback((agentId: AgentId, size: SpeechBubbleSize) => {
    setBubbleSizes((previous) => {
      const current = previous[agentId]

      if (current.w === size.w && current.h === size.h) return previous

      return {
        ...previous,
        [agentId]: size
      }
    })
  }, [])

  const handleBubblePlacementChange = useCallback((agentId: AgentId, placement: SpeechBubblePlacement) => {
    setBubblePlacements((previous) => {
      if (placementIsClose(previous[agentId], placement)) return previous

      return {
        ...previous,
        [agentId]: placement
      }
    })
  }, [])

  const handleSamiBubbleSizeChange = useCallback((size: SpeechBubbleSize) => {
    handleBubbleSizeChange('sami', size)
  }, [handleBubbleSizeChange])

  const handleAlfredBubbleSizeChange = useCallback((size: SpeechBubbleSize) => {
    handleBubbleSizeChange('alfred', size)
  }, [handleBubbleSizeChange])

  const handlePacoBubbleSizeChange = useCallback((size: SpeechBubbleSize) => {
    handleBubbleSizeChange('paco', size)
  }, [handleBubbleSizeChange])

  const handleSamiBubblePlacementChange = useCallback((placement: SpeechBubblePlacement) => {
    handleBubblePlacementChange('sami', placement)
  }, [handleBubblePlacementChange])

  const handleAlfredBubblePlacementChange = useCallback((placement: SpeechBubblePlacement) => {
    handleBubblePlacementChange('alfred', placement)
  }, [handleBubblePlacementChange])

  const handlePacoBubblePlacementChange = useCallback((placement: SpeechBubblePlacement) => {
    handleBubblePlacementChange('paco', placement)
  }, [handleBubblePlacementChange])

  const ensureChatSessionId = useCallback(() => {
    if (chatSessionIdRef.current) return chatSessionIdRef.current

    const existing = window.localStorage?.getItem(CHAT_SESSION_STORAGE_KEY)

    if (existing) {
      chatSessionIdRef.current = existing
      return existing
    }

    const nextId = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    window.localStorage?.setItem(CHAT_SESSION_STORAGE_KEY, nextId)
    chatSessionIdRef.current = nextId
    return nextId
  }, [])

  const readAgentMessageStream = useCallback(async (
    response: Response,
    onDelta?: (partialText: string, payload: ChatStreamPayload, speaker: AgentId) => void
  ): Promise<AgentMessageResult> => {
    if (!response.body) {
      throw new Error('Chat stream response was empty')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''
    let speaker: AgentId = 'sami'
    const streamState: { donePayload: ChatStreamPayload | null } = {
      donePayload: null
    }

    const processEvent = (rawEvent: string) => {
      const lines = rawEvent.split('\n')
      let eventName = 'message'
      const dataLines: string[] = []

      lines.forEach((line) => {
        if (!line || line.startsWith(':')) return

        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim()
          return
        }

        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart())
        }
      })

      if (!dataLines.length) return

      let payload: ChatStreamPayload

      try {
        payload = JSON.parse(dataLines.join('\n'))
      } catch {
        return
      }

      if (payload.agent?.id) {
        speaker = normalizeAgentId(payload.agent.id)
      }

      if (eventName === 'meta') {
        if (payload.sessionId && payload.sessionId !== chatSessionIdRef.current) {
          chatSessionIdRef.current = payload.sessionId
          window.localStorage?.setItem(CHAT_SESSION_STORAGE_KEY, payload.sessionId)
        }
        return
      }

      if (eventName === 'delta') {
        content += payload.content || ''
        onDelta?.(content, payload, speaker)
        return
      }

      if (eventName === 'done') {
        streamState.donePayload = payload
        return
      }

      if (eventName === 'error') {
        throw new Error(payload.error || 'Chat stream failed')
      }
    }

    while (true) {
      const { value, done } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

      while (true) {
        const boundary = buffer.indexOf('\n\n')

        if (boundary === -1) break

        const rawEvent = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        processEvent(rawEvent)
      }
    }

    const donePayload = streamState.donePayload

    if (donePayload?.sessionId && donePayload.sessionId !== chatSessionIdRef.current) {
      chatSessionIdRef.current = donePayload.sessionId
      window.localStorage?.setItem(CHAT_SESSION_STORAGE_KEY, donePayload.sessionId)
    }

    return {
      agentId: normalizeAgentId(donePayload?.agent?.id || speaker),
      content: donePayload?.message?.content || content
    }
  }, [])

  const sendAgentMessage = useCallback(async (
    text: string,
    onDelta?: (partialText: string, payload: ChatStreamPayload, speaker: AgentId) => void,
    agentId: AgentId | 'auto' = 'auto'
  ): Promise<AgentMessageResult> => {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: ensureChatSessionId(),
        agentId,
        message: text,
        stream: true
      })
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || `Chat request failed (${response.status})`)
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('text/event-stream')) {
      return readAgentMessageStream(response, onDelta)
    }

    const payload = await response.json().catch(() => ({}))

    if (payload.sessionId && payload.sessionId !== chatSessionIdRef.current) {
      chatSessionIdRef.current = payload.sessionId
      window.localStorage?.setItem(CHAT_SESSION_STORAGE_KEY, payload.sessionId)
    }

    return {
      agentId: normalizeAgentId(payload.agent?.id),
      content: payload.message?.content || ''
    }
  }, [ensureChatSessionId, readAgentMessageStream])

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    const audioBase64 = await blobToBase64(audioBlob)
    const mimeType = audioBlob.type || 'audio/webm'
    const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: ensureChatSessionId(),
        audioBase64,
        mimeType,
        format: getAudioFormatFromMimeType(mimeType),
        language: 'es'
      })
    })

    const payload: TranscriptionResult = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload.error || `Transcription request failed (${response.status})`)
    }

    const text = String(payload.text || '').trim()

    if (!text) {
      throw new Error('La transcripcion llego vacia')
    }

    return text
  }, [ensureChatSessionId])

  const getVoiceFeedbackSpeaker = useCallback((): AgentId => {
    if (sceneMode === 'rota-panorama') return 'paco'
    if (activeDialogue.speaker === 'paco') return 'sami'

    return activeDialogue.speaker
  }, [activeDialogue.speaker, sceneMode])

  const askBackendQuestion = useCallback(async (question: string) => {
    const preferredAgent = sceneMode === 'rota-panorama' ? 'paco' : getPreferredAgentForQuestion(question)
    const requestToken = chatRequestTokenRef.current + 1
    chatRequestTokenRef.current = requestToken

    if (dialogueTimeoutRef.current) {
      window.clearTimeout(dialogueTimeoutRef.current)
      dialogueTimeoutRef.current = null
    }

    setThinkingAgent(preferredAgent)
    setActiveDialogue({
      speaker: preferredAgent,
      text: ''
    })

    try {
      const result = await sendAgentMessage(question, (partialText, _payload, speaker) => {
        if (chatRequestTokenRef.current !== requestToken) return

        setThinkingAgent(null)
        setActiveDialogue({
          speaker,
          text: partialText,
          reveal: false
        })
      }, preferredAgent)

      if (chatRequestTokenRef.current !== requestToken) return

      setThinkingAgent(null)
      setActiveDialogue({
        speaker: result.agentId,
        text: result.content,
        reveal: false
      })
    } catch (error) {
      console.error(error)

      if (chatRequestTokenRef.current !== requestToken) return

      setThinkingAgent(null)
      setActiveDialogue({
        speaker: preferredAgent,
        text: 'No puedo conectar ahora con el backend de IA. Arranca npm run dev:api y revisa OPENROUTER_API_KEY en .env.local.',
        reveal: false
      })
    }
  }, [sceneMode, sendAgentMessage])

  const handleVoiceRecordingComplete = useCallback(async (audioBlob: Blob, feedbackSpeaker: AgentId) => {
    setVoiceStatus('transcribing')
    setThinkingAgent(feedbackSpeaker)
    setActiveDialogue({
      speaker: feedbackSpeaker,
      text: 'Estoy transcribiendo tu pregunta...',
      reveal: false
    })

    try {
      if (audioBlob.size < 512) {
        throw new Error('La grabacion fue demasiado corta')
      }

      const transcript = await transcribeAudio(audioBlob)

      console.log(`Transcripción STT: ${transcript}`)
      setVoiceStatus('idle')
      await askBackendQuestion(transcript)
    } catch (error) {
      console.error(error)
      setVoiceStatus('idle')
      setThinkingAgent(null)
      setActiveDialogue({
        speaker: feedbackSpeaker,
        text: 'No pude transcribir bien la pregunta. Prueba otra vez manteniendo pulsado el micro un poco mas.',
        reveal: false
      })
    }
  }, [askBackendQuestion, transcribeAudio])

  const stopVoiceRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current

    if (!recorder || recorder.state === 'inactive') return

    recorder.stop()
    mediaRecorderRef.current = null
  }, [])

  const startVoiceRecording = useCallback(async () => {
    const feedbackSpeaker = getVoiceFeedbackSpeaker()

    if (voiceStatus !== 'idle' || mediaRecorderRef.current) return

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setActiveDialogue({
        speaker: feedbackSpeaker,
        text: 'Este navegador no me da acceso al microfono para STT. Necesito HTTPS y soporte de MediaRecorder.',
        reveal: false
      })
      return
    }

    try {
      audioRef.current?.stop()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      const mimeType = getSupportedAudioMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      voiceChunksRef.current = []
      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const chunks = voiceChunksRef.current
        const audioBlob = new Blob(chunks, {
          type: recorder.mimeType || mimeType || 'audio/webm'
        })

        voiceChunksRef.current = []
        stopMediaStream(stream)
        mediaStreamRef.current = null
        void handleVoiceRecordingComplete(audioBlob, feedbackSpeaker)
      }

      recorder.start(250)

      if (!voicePressActiveRef.current) {
        recorder.stop()
        mediaRecorderRef.current = null
        return
      }

      setVoiceStatus('recording')
      setThinkingAgent(feedbackSpeaker)
      setActiveDialogue({
        speaker: feedbackSpeaker,
        text: 'Te escucho...',
        reveal: false
      })
    } catch (error) {
      console.error(error)
      stopMediaStream(mediaStreamRef.current)
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      setVoiceStatus('idle')
      setThinkingAgent(null)
      setActiveDialogue({
        speaker: feedbackSpeaker,
        text: 'No pude abrir el microfono. Revisa permisos del navegador o del visor.',
        reveal: false
      })
    }
  }, [getVoiceFeedbackSpeaker, handleVoiceRecordingComplete, voiceStatus])

  const handleVoiceRecordStart = useCallback(() => {
    voicePressActiveRef.current = true

    if (voiceStatus !== 'idle') return

    void startVoiceRecording()
  }, [startVoiceRecording, voiceStatus])

  const handleVoiceRecordEnd = useCallback(() => {
    voicePressActiveRef.current = false

    stopVoiceRecording()
  }, [stopVoiceRecording])

  const handleAudioButtonSelect = useCallback(() => {
    const audio = audioRef.current

    if (!audio) {
      console.log("ERROR: audioRef es null")
      return
    }

    const track = audio.getCurrentTrack()

    if (track.path && !audio.isPlaying()) {
      audio.play()
      console.log("Audio activado desde la esfera azul")
      return
    }

    audio.nextTrack()
    console.log("INTERACCIÓN DETECTADA: Cambiando pista de audio")
  }, [])

  const handleRotaPortalToggle = useCallback(() => {
    setSceneMode((currentMode) => {
      const nextMode: SceneMode = currentMode === 'showroom' ? 'rota-panorama' : 'showroom'

      chatRequestTokenRef.current += 1

      if (dialogueTimeoutRef.current) {
        window.clearTimeout(dialogueTimeoutRef.current)
        dialogueTimeoutRef.current = null
      }

      setActiveDialogue({
        speaker: nextMode === 'rota-panorama' ? 'paco' : 'sami',
        text: nextMode === 'rota-panorama'
          ? 'Soy Paco. Ahora estoy colocado en Rota con mi panorama y mi personaje reales; esta burbuja ya queda conectada a mis coordenadas.'
          : 'Volvemos al showroom. La esfera amarilla queda como portal provisional entre el showroom y Rota.',
        reveal: true
      })
      setThinkingAgent(null)

      return nextMode
    })
  }, [])

  useEffect(() => {
    return () => {
      if (dialogueTimeoutRef.current) {
        window.clearTimeout(dialogueTimeoutRef.current)
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      }

      stopMediaStream(mediaStreamRef.current)
    }
  }, [])

  const samiBubbleVisible = thinkingAgent === 'sami' || (!thinkingAgent && activeDialogue.speaker === 'sami')
  const alfredBubbleVisible = thinkingAgent === 'alfred' || (!thinkingAgent && activeDialogue.speaker === 'alfred')
  const pacoBubbleVisible = thinkingAgent === 'paco' || (!thinkingAgent && activeDialogue.speaker === 'paco')
  const isRotaPanorama = sceneMode === 'rota-panorama'
  const voiceButtonColor = voiceStatus === 'recording'
    ? '#ff3b30'
    : voiceStatus === 'transcribing'
      ? '#31d5ff'
      : '#18a957'
  const voiceButtonEmissive = voiceStatus === 'recording'
    ? '#ff1f1f'
    : voiceStatus === 'transcribing'
      ? '#00bfff'
      : 'green'
  const voiceButtonScale = voiceStatus === 'recording' ? 1.35 : 1

  return (
    <>
      <VRSupport />
      <VRButton className="vr-button" />
      <SpeechBubbleOverlay
        text={activeDialogue.speaker === 'sami' ? activeDialogue.text : ''}
        visible={samiBubbleVisible}
        typing={thinkingAgent === 'sami'}
        reveal={activeDialogue.reveal !== false}
        variant="tail"
        placement={bubblePlacements.sami}
        onSizeChange={handleSamiBubbleSizeChange}
      />
      <SpeechBubbleOverlay
        text={activeDialogue.speaker === 'alfred' ? activeDialogue.text : ''}
        visible={alfredBubbleVisible}
        typing={thinkingAgent === 'alfred'}
        reveal={activeDialogue.reveal !== false}
        variant="tail"
        placement={bubblePlacements.alfred}
        onSizeChange={handleAlfredBubbleSizeChange}
      />
      <SpeechBubbleOverlay
        text={activeDialogue.speaker === 'paco' ? activeDialogue.text : ''}
        visible={pacoBubbleVisible}
        typing={thinkingAgent === 'paco'}
        reveal={activeDialogue.reveal !== false}
        variant="tail"
        placement={bubblePlacements.paco}
        onSizeChange={handlePacoBubbleSizeChange}
      />
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
            autoPlay={false}
            onTrackChange={handleTrackChange} 
          />
          
          {/* Iluminación básica */}
          <ambientLight intensity={0.2} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />

          {isRotaPanorama ? (
            <RotaPanoramaScene />
          ) : (
            <>
              {/* Suelo con texturas KTX2 */}
              <Floor />

              {/* Modelo GLB con capacidad de animación - con removePlane para eliminar el plano blanco */}
              <ModelLoader
                ref={modelRef}
                url="/models/Sami.glb"
                position={AGENT_MODEL_POINTS.sami.position}
                scale={AGENT_MODEL_POINTS.sami.scale}
                removePlane={true}
                lockedAnimationName={SAMI_STANDING_ANIMATION}
                initialAnimationIndex={4}
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
                position={AGENT_MODEL_POINTS.alfred.position}
                scale={AGENT_MODEL_POINTS.alfred.scale}
                headFollow={true}
                initialAnimationIndex={0}
                onLoad={handleModelLoaded}
              />
            </>
          )}

          <SpeechBubbleAnchor
            visible={samiBubbleVisible}
            bubbleSize={bubbleSizes.sami}
            onPlacementChange={handleSamiBubblePlacementChange}
            {...AGENT_BUBBLE_POINTS.sami}
          />

          <SpeechBubbleAnchor
            visible={alfredBubbleVisible}
            bubbleSize={bubbleSizes.alfred}
            onPlacementChange={handleAlfredBubblePlacementChange}
            {...AGENT_BUBBLE_POINTS.alfred}
          />

          <SpeechBubbleAnchor
            visible={pacoBubbleVisible}
            bubbleSize={bubbleSizes.paco}
            onPlacementChange={handlePacoBubblePlacementChange}
            {...AGENT_BUBBLE_POINTS.paco}
          />

          <SpeechBubble3D
            text={activeDialogue.speaker === 'sami' ? activeDialogue.text : ''}
            visible={samiBubbleVisible}
            typing={thinkingAgent === 'sami'}
            anchorPosition={AGENT_BUBBLE_POINTS.sami.anchorPosition}
            tailPosition={AGENT_BUBBLE_POINTS.sami.tailPosition}
          />

          <SpeechBubble3D
            text={activeDialogue.speaker === 'alfred' ? activeDialogue.text : ''}
            visible={alfredBubbleVisible}
            typing={thinkingAgent === 'alfred'}
            anchorPosition={AGENT_BUBBLE_POINTS.alfred.anchorPosition}
            tailPosition={AGENT_BUBBLE_POINTS.alfred.tailPosition}
          />

          <SpeechBubble3D
            text={activeDialogue.speaker === 'paco' ? activeDialogue.text : ''}
            visible={pacoBubbleVisible}
            typing={thinkingAgent === 'paco'}
            anchorPosition={AGENT_BUBBLE_POINTS.paco.anchorPosition}
            tailPosition={AGENT_BUBBLE_POINTS.paco.tailPosition}
          />

          {/* Controles de movimiento básicos */}
          <MovementEnhanced
            speed={2}
            rotationSpeed={0.008}
            deadzone={0.22}
            smoothing={12}
          />

          {/* Esfera verde: microfono push-to-talk para STT */}
          <Interactive
            onSelectStart={handleVoiceRecordStart}
            onSelectEnd={handleVoiceRecordEnd}
          >
            <mesh position={[0, 0.1, -1]} scale={voiceButtonScale}>
              <sphereGeometry args={[0.05]} />
              <meshStandardMaterial color={voiceButtonColor} emissive={voiceButtonEmissive} emissiveIntensity={0.8} />
            </mesh>
          </Interactive>

          {/* Esfera azul: activa el audio y despues cambia de pista */}
          <Interactive onSelect={handleAudioButtonSelect}>
            <mesh position={[0.2, 0.1, -1]}>
              <sphereGeometry args={[0.05]} />
              <meshStandardMaterial color="#0077ff" emissive="#0088ff" emissiveIntensity={1.0} />
            </mesh>
          </Interactive>

          {/* Esfera amarilla: portal provisional hacia Rota con panorama y personaje reales */}
          <Interactive onSelect={handleRotaPortalToggle}>
            <mesh position={[0.4, 0.1, -1]}>
              <sphereGeometry args={[0.05]} />
              <meshStandardMaterial color="#ffd400" emissive="#ffd400" emissiveIntensity={0.7} />
            </mesh>
          </Interactive>
          
        </XR>
        
        {/* OrbitControls solo para navegador no-VR */}
        <DesktopOrbitControls />
      </Canvas>
    </>
  )
}

export default VRScene
