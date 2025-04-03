'use client'

import React from 'react'

type XRSessionMode = 'immersive-vr' | 'immersive-ar' | 'inline'

interface PicoFixedVRSceneProps {
  children?: React.ReactNode
}

interface ExtendedXRSession {
  layers?: any[]
  renderState?: {
    baseLayer: any
  }
  updateRenderState?: (state: any) => void
}

interface XRSystem {
  isSessionSupported(mode: XRSessionMode): Promise<boolean>
  requestSession(mode: XRSessionMode, options?: any): Promise<ExtendedXRSession>
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void
  ondevicechange?: ((this: XRSystem, ev: Event) => any) | null
  onsessiongranted?: ((this: XRSystem, ev: Event) => any) | null
  dispatchEvent(event: Event): boolean
}

declare global {
  interface Navigator {
    xr?: XRSystem
  }
}

export function tryEnablePicoWebXR() {
  if (typeof navigator !== 'undefined' && !navigator.xr) {
    console.log('Creando objeto navigator.xr porque no existe')
    navigator.xr = {
      isSessionSupported: () => Promise.resolve(false),
      requestSession: () => Promise.reject(new Error('WebXR no soportado')),
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      ondevicechange: null,
      onsessiongranted: null
    }
  }

  const PatchedVRButton = ({ onClick }: { onClick: () => void }) => {
    const handleSession = (session: ExtendedXRSession) => {
      if (session && !session.layers) {
        console.log('Añadiendo propiedad layers a la sesión')
        session.layers = []
      }
    }

    if (navigator.xr && navigator.xr.requestSession) {
      const originalRequestSession = navigator.xr.requestSession.bind(navigator.xr)
      navigator.xr.requestSession = async function(mode: XRSessionMode, options?: any) {
        console.log('Interceptando llamada a requestSession')
        try {
          const session = await originalRequestSession(mode, options) as unknown as ExtendedXRSession
          handleSession(session)
          return session
        } catch (error) {
          console.error('Error en requestSession:', error)
          throw error
        }
      }
    }

    return (
      <button
        onClick={onClick}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          backgroundColor: '#5555FF',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Entrar en VR
      </button>
    )
  }

  return PatchedVRButton
}

const PicoFixedVRScene: React.FC<PicoFixedVRSceneProps> = ({ children }) => {
  const [isSupported, setIsSupported] = React.useState<boolean>(false)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    async function checkSupport() {
      try {
        if (navigator.xr) {
          const supported = await navigator.xr.isSessionSupported('immersive-vr')
          setIsSupported(supported)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      }
    }
    checkSupport()
  }, [])

  const [showInfo, setShowInfo] = React.useState<boolean>(true)

  React.useEffect(() => {
    const timer = setTimeout(() => setShowInfo(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {showInfo && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '10px', fontSize: '14px' }}>
            {error ? error.message : isSupported ? 'WebXR soportado' : 'Verificando soporte WebXR...'}
          </div>
        </div>
      )}
      {children}
    </>
  )
}

export default PicoFixedVRScene 