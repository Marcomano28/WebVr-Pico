'use client';

import dynamic from 'next/dynamic'

// Carga dinámica para el componente ThreeJS
const SimpleFallbackVRScene = dynamic(() => import('@/components/vr/simple-fallback-vr'), { ssr: false })

export default function SimpleFallbackPage() {
  return <SimpleFallbackVRScene />
} 