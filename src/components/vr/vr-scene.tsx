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
  pitch: -12
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

const DEMO_STT_RESPONSES: { question: string }[] = [
  {
    question: 'Que coche es mas radical?'
  },
  {
    question: 'Cual suena mas emocional?'
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

interface SpeechBubbleAnchorProps {
  visible: boolean
  bubbleSize: SpeechBubbleSize
  tailPosition: VectorTuple
  directionPosition: VectorTuple
  anchorPosition: VectorTuple
  onPlacementChange: (placement: SpeechBubblePlacement) => void
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

function placementIsClose(previous: SpeechBubblePlacement | null, next: SpeechBubblePlacement) {
  if (!previous) return false
  if (previous.offscreen !== next.offscreen) return false
  if (next.offscreen) return true

  return Math.abs(previous.x - next.x) < 0.5 &&
    Math.abs(previous.y - next.y) < 0.5 &&
    Math.abs(previous.tipX - next.tipX) < 0.5 &&
    Math.abs(previous.tipY - next.tipY) < 0.5
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
    <mesh
      geometry={geometry}
      position={PACO_CHARACTER_POSITION}
      rotation={[0, PACO_CHARACTER_ROTATION_Y, 0]}
      renderOrder={10}
    >
      <meshBasicMaterial
        map={texture}
        transparent={true}
        alphaTest={0.02}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
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

  // Estado para rastrear si el modelo está cargado
  const [modelLoaded, setModelLoaded] = useState(false)
  const [activeDialogue, setActiveDialogue] = useState<DialogueLine>(INTRO_DIALOGUE[0])
  const [thinkingAgent, setThinkingAgent] = useState<AgentId | null>(null)
  const [introDialogueIndex, setIntroDialogueIndex] = useState(0)
  const [demoQuestionIndex, setDemoQuestionIndex] = useState(0)
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
  const [currentTrack, setCurrentTrack] = useState({ id: 'track1', name: 'Ambiente' })
  
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

  const showDialogueLine = useCallback((line: DialogueLine) => {
    if (dialogueTimeoutRef.current) {
      window.clearTimeout(dialogueTimeoutRef.current)
    }

    setThinkingAgent(line.speaker)
    dialogueTimeoutRef.current = window.setTimeout(() => {
      setActiveDialogue(line)
      setThinkingAgent(null)
      dialogueTimeoutRef.current = null
    }, 650)
  }, [])

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

  const handleNextIntroDialogue = useCallback(() => {
    setIntroDialogueIndex((currentIndex) => {
      const nextIndex = (currentIndex + 1) % INTRO_DIALOGUE.length
      showDialogueLine(INTRO_DIALOGUE[nextIndex])
      return nextIndex
    })
  }, [showDialogueLine])

  const handleDemoQuestion = useCallback(() => {
    setDemoQuestionIndex((currentIndex) => {
      const nextQuestion = DEMO_STT_RESPONSES[currentIndex]
      console.log(`Pregunta STT simulada: ${nextQuestion.question}`)
      void askBackendQuestion(nextQuestion.question)
      return (currentIndex + 1) % DEMO_STT_RESPONSES.length
    })
  }, [askBackendQuestion])

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
    }
  }, [])

  const samiBubbleVisible = thinkingAgent === 'sami' || (!thinkingAgent && activeDialogue.speaker === 'sami')
  const alfredBubbleVisible = thinkingAgent === 'alfred' || (!thinkingAgent && activeDialogue.speaker === 'alfred')
  const pacoBubbleVisible = thinkingAgent === 'paco' || (!thinkingAgent && activeDialogue.speaker === 'paco')
  const isRotaPanorama = sceneMode === 'rota-panorama'

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

          {/* Controles de movimiento básicos */}
          <MovementEnhanced
            speed={2}
            rotationSpeed={0.008}
          />

          {/* Botón reutilizado: avanza la presentación de los agentes */}
          <Interactive onSelect={handleNextIntroDialogue}>
            <mesh position={[0, 0.1, -1]}>
              <sphereGeometry args={[0.05]} />
              <meshStandardMaterial color="green" emissive="green" emissiveIntensity={0.5} />
            </mesh>
          </Interactive>

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

          {/* Esfera amarilla: portal provisional hacia Rota con panorama y personaje reales */}
          <Interactive onSelect={handleRotaPortalToggle}>
            <mesh position={[0.4, 0.1, -1]}>
              <sphereGeometry args={[0.05]} />
              <meshStandardMaterial color="#ffd400" emissive="#ffd400" emissiveIntensity={0.7} />
            </mesh>
          </Interactive>
          
        </XR>
        
        {/* OrbitControls para navegadores no-VR */}
        <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} enableDamping={true} dampingFactor={0.03}/>
      </Canvas>
    </>
  )
}

export default VRScene
