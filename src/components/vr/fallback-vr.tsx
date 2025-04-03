'use client'

import React, { useEffect } from 'react'
import * as THREE from 'three'

// Componente VR que usa Three.js directamente sin React Three Fiber ni WebXR
export default function FallbackVRScene() {
  useEffect(() => {
    // Verificar si el DOM está disponible
    if (typeof window === 'undefined') return

    // Crear el renderer de Three.js
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000)
    
    // Añadir el canvas al DOM
    const container = document.getElementById('vr-container')
    if (container) {
      // Limpiar cualquier contenido previo
      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }
      container.appendChild(renderer.domElement)
    }
    
    // Manejo de error específico para debuggear problemas de WebXR
    if (typeof navigator !== 'undefined' && navigator.xr) {
      try {
        // Intenta acceder a navigator.xr de forma segura
        console.log('Estado de WebXR en modo fallback:', {
          xrExists: !!navigator.xr,
          requestSessionExists: typeof navigator.xr?.requestSession === 'function',
          isSessionSupportedExists: typeof navigator.xr?.isSessionSupported === 'function'
        })
        
        // Verificar si hay soporte para layers (el origen del error)
        const testRequestSession = async () => {
          try {
            if (typeof navigator.xr?.requestSession === 'function') {
              const session = await navigator.xr.requestSession('inline');
              // Inspeccionar la sesión de manera segura
              console.log('Sesión XR creada:', session);
              console.log('Propiedades de la sesión:', Object.keys(session));
              // @ts-ignore - Inspeccionar layers aunque no esté en el tipo
              console.log('Sesión layers:', session.layers);
              await session.end();
            }
          } catch (e: unknown) {
            const error = e as Error;
            console.log('Error de prueba con navigator.xr.requestSession:', error.message);
          }
        }
        
        // Ejecutar prueba opcional de WebXR
        testRequestSession();
      } catch (err) {
        console.error('Error en la verificación de WebXR en modo fallback:', err)
      }
    }
    
    // Crear una escena básica
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 5
    
    // Añadir iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)
    
    // Crear un cubo como elemento visual
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({ color: 0x5555ff })
    const cube = new THREE.Mesh(geometry, material)
    scene.add(cube)
    
    // Añadir suelo
    const planeGeometry = new THREE.PlaneGeometry(10, 10)
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -1
    scene.add(plane)
    
    // Botón para intentar entrar a VR manualmente
    const vrButton = document.createElement('button')
    vrButton.textContent = 'Entrar a VR'
    vrButton.style.position = 'absolute'
    vrButton.style.bottom = '20px'
    vrButton.style.right = '20px'
    vrButton.style.padding = '12px 16px'
    vrButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    vrButton.style.color = 'white'
    vrButton.style.border = '2px solid #5555FF'
    vrButton.style.borderRadius = '5px'
    vrButton.style.fontSize = '16px'
    vrButton.style.cursor = 'pointer'
    vrButton.style.zIndex = '100'
    
    // Añadir evento al botón
    vrButton.addEventListener('click', () => {
      alert('Esta es una versión de fallback que no utiliza WebXR. Por favor intenta con la versión /pico o /minimal que implementan WebXR correctamente.')
    })
    
    // Añadir el botón al DOM
    document.body.appendChild(vrButton)
    
    // Panel de información
    const infoPanel = document.createElement('div')
    infoPanel.style.position = 'absolute'
    infoPanel.style.top = '10px'
    infoPanel.style.left = '10px'
    infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
    infoPanel.style.color = 'white'
    infoPanel.style.padding = '10px'
    infoPanel.style.borderRadius = '5px'
    infoPanel.style.zIndex = '100'
    infoPanel.style.maxWidth = '80%'
    
    // Contenido del panel
    infoPanel.innerHTML = `
      <h3 style="margin:0 0 10px 0;font-size:16px;">Modo fallback - Sin WebXR</h3>
      <p style="color:#FFA500">Esta es una versión de respaldo que no requiere WebXR.</p>
      <p style="font-size:12px;">Para una experiencia VR completa, intenta con:</p>
      <ul style="margin:5px 0 0 15px;padding:0;font-size:12px;">
        <li><a href="/pico" style="color:#5555FF">Versión para Pico Browser</a></li>
        <li><a href="/minimal" style="color:#5555FF">Versión minimalista</a></li>
        <li><a href="/simple" style="color:#5555FF">Versión simple</a></li>
      </ul>
    `
    
    // Añadir el panel al DOM
    document.body.appendChild(infoPanel)
    
    // Función de animación
    function animate() {
      requestAnimationFrame(animate)
      
      // Animar el cubo
      cube.rotation.x += 0.01
      cube.rotation.y += 0.01
      
      renderer.render(scene, camera)
    }
    
    // Iniciar la animación
    animate()
    
    // Manejar cambios de tamaño de ventana
    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    
    window.addEventListener('resize', handleResize)
    
    // Limpiar
    return () => {
      window.removeEventListener('resize', handleResize)
      if (container) {
        container.removeChild(renderer.domElement)
      }
      document.body.removeChild(vrButton)
      document.body.removeChild(infoPanel)
      
      // Liberar recursos de Three.js
      geometry.dispose()
      material.dispose()
      planeGeometry.dispose()
      planeMaterial.dispose()
      renderer.dispose()
    }
  }, [])
  
  return (
    <div id="vr-container" style={{ width: '100%', height: '100vh' }} />
  )
} 