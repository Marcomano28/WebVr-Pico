'use client'

import React from 'react'
import dynamic from 'next/dynamic'

// Carga dinámica del componente VR para Pico con correcciones
const PicoFixedVRScene = dynamic(() => import('@/components/vr/pico-fixed-vr'), { ssr: false })

export default function PicoFixedPage() {
  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      background: '#000'
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1>Modo Pico Fixed</h1>
        <p>Esta versión incluye parches específicos para el navegador Pico.</p>
        <p>Si estás viendo errores con &quot;cannot read properties of undefined (reading &apos;layers&apos;)&quot;, esta versión debería funcionar mejor.</p>
        
        <div style={{
          marginTop: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <a
            href="/"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#5555FF',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.25rem'
            }}
          >
            Volver al Inicio
          </a>
        </div>
      </div>
    </div>
  )
} 