'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Componente VR estable que muestra una escena básica sin usar WebXR
export default function SimpleFallbackVR() {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    
    // Crear escena, cámara y renderer
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 1.6, 3)
    
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    
    // Limpiar contenedor y añadir el canvas
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild)
    }
    containerRef.current.appendChild(renderer.domElement)
    
    // Añadir luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 10, 5)
    scene.add(directionalLight)
    
    // Añadir objetos a la escena
    // Cubo
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
    const material = new THREE.MeshStandardMaterial({ color: 0x5555ff })
    const cube = new THREE.Mesh(geometry, material)
    cube.position.set(0, 1.2, -2)
    scene.add(cube)
    
    // Suelo
    const floorGeometry = new THREE.PlaneGeometry(10, 10)
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    scene.add(floor)
    
    // Función de animación
    const animate = () => {
      requestAnimationFrame(animate)
      
      // Rotar el cubo
      cube.rotation.x += 0.01
      cube.rotation.y += 0.01
      
      renderer.render(scene, camera)
    }
    
    // Manejar redimensionamiento de la ventana
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    
    window.addEventListener('resize', handleResize)
    
    // Iniciar animación
    animate()
    
    // Limpieza al desmontar
    return () => {
      window.removeEventListener('resize', handleResize)
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
      
      // Liberar memoria
      scene.clear()
      renderer.dispose()
    }
  }, [])
  
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
      
      {/* Panel informativo */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        zIndex: 1000,
        maxWidth: '80%'
      }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Modo sin WebXR</h2>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
          Versión alternativa sin WebXR para Pico Neo 3
        </p>
        <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#aaaaaa' }}>
          Esta escena usa Three.js directamente y evita el error "cannot read properties of undefined (reading 'layers')"
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <a 
            href="/"
            style={{
              padding: '8px 12px',
              backgroundColor: '#5555FF',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '14px'
            }}>
            Volver al inicio
          </a>
          
          <a 
            href="/pico"
            style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(85,85,255,0.3)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '14px'
            }}>
            Intentar versión Pico
          </a>
        </div>
      </div>
    </div>
  )
} 