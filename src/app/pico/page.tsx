'use client'

import React from 'react'
import dynamic from 'next/dynamic'

// Carga dinámica de la escena para Pico Browser
const PicoVRScene = dynamic(() => import('@/components/vr/pico-vr'), { ssr: false })

export default function PicoPage() {
  return (
    <div className="vr-container">
      <PicoVRScene />
    </div>
  )
} 