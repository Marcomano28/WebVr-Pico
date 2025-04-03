'use client'

import React from 'react'
import { useKTX2 } from "@react-three/drei"
import * as THREE from 'three'

export const Floor = () => {
  const props = useKTX2({
    map: "/textures/Marble006_2K-JPG_Color_uastc.ktx2",
    displacementMap: "/textures/Marble006_2K-JPG_Displacement_uastc.ktx2",
    normalMap: "/textures/Marble006_2K-JPG_NormalGL_uastc.ktx2",
    roughnessMap: "/textures/Marble006_2K-JPG_Roughness_uastc.ktx2",
  })

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.05, 0]} // Posición ajustada para no cubrir los modelos
      receiveShadow
    >
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial 
        {...props} 
        displacementScale={0.02}
        envMapIntensity={0.2}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}

export default Floor 