'use client'

import React from 'react'
import dynamic from 'next/dynamic'

// Cargar el componente de fallback que no depende de WebXR
const FallbackVRScene = dynamic(() => import('@/components/vr/fallback-vr'), { ssr: false })

export default function FallbackPage() {
  return (
    <div className="vr-fallback-container">
      <FallbackVRScene />
    </div>
  )
} 