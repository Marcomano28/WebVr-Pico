'use client'

import React from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, VRButton, Controllers } from '@react-three/xr'

interface ExtendedXRSession {
  layers?: any[]
  renderState?: {
    baseLayer: any
  }
  updateRenderState?: (state: any) => void
}

function tryEnablePicoWebXR() {
  if (typeof navigator !== 'undefined' && !navigator.xr) {
    console.log('Creando objeto navigator.xr porque no existe')
    // @ts-expect-error - Necesario para acceder a propiedades no estándar de WebXR
    navigator.xr = {
      isSessionSupported: () => Promise.resolve(false),
      requestSession: () => Promise.reject(new Error('WebXR no soportado'))
    }
  }

  if (navigator.xr && navigator.xr.requestSession) {
    const originalRequestSession = navigator.xr.requestSession
    // @ts-expect-error - Necesario para acceder a propiedades no estándar de WebXR
    navigator.xr.requestSession = async function(mode, options) {
      console.log('Interceptando llamada a requestSession')
      try {
        const session = await originalRequestSession.call(navigator.xr, mode, options)
        // @ts-expect-error - Necesario para acceder a propiedades no estándar de WebXR
        if (!session.layers) {
          console.log('Añadiendo propiedad layers a la sesión')
          session.layers = []
        }
        return session
      } catch (error) {
        console.error('Error en requestSession:', error)
        throw error
      }
    }
  }
}

export default function PicoVRScene() {
  const [message, setMessage] = React.useState('Inicializando escena...')

  React.useEffect(() => {
    tryEnablePicoWebXR()
  }, [])

  return (
    <>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        textAlign: 'center',
        zIndex: 1000
      }}>
        <div style={{ marginBottom: '10px', fontSize: '14px' }}>
          {message}
        </div>
      </div>

      <Canvas>
        <XR>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <Controllers />
          <mesh position={[0, 1.2, -2]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#5555FF" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        </XR>
      </Canvas>
    </>
  )
} 