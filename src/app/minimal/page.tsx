'use client'

import React from 'react'
import dynamic from 'next/dynamic'

// Carga dinámica de la escena minimalista
const MinimalVRScene = dynamic(() => import('@/components/vr/minimal-vr'), { ssr: false })

export default function MinimalPage() {
  return (
    <div className="vr-container">
      <MinimalVRScene />
    </div>
  )
} 