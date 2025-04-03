'use client'

import React from 'react'
import dynamic from 'next/dynamic'

// Carga dinámica solo de la escena simple
const SimpleVRScene = dynamic(() => import('@/components/vr/simple-vr'), { ssr: false })

export default function SimplePage() {
  return (
    <div className="vr-container">
      <SimpleVRScene />
    </div>
  )
} 