'use client';

import dynamic from 'next/dynamic'

// Carga dinámica para el componente VR
const VRScene = dynamic(() => import('@/components/vr/vr-scene'), { ssr: false })

export default function VRPage() {
  return <VRScene />
} 