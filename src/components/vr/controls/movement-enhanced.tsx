'use client'

import { useXR, useController } from '@react-three/xr'
import { useFrame } from '@react-three/fiber'
import { Vector3, Quaternion, Euler } from 'three'
import { useRef } from 'react'

interface MovementEnhancedProps {
  speed?: number
  rotationSpeed?: number
}

export default function MovementEnhanced({ 
  speed = 2, 
  rotationSpeed = 0.02
}: MovementEnhancedProps) {
  const { player } = useXR()
  const direction = useRef(new Vector3())
  const stickValue = useRef(0)
  
  // Referencias a los controladores
  const leftController = useController('left')
  const rightController = useController('right')
  
  useFrame(() => {
    if (!player) return

    // Control con el joystick izquierdo para movimiento lateral
    if (leftController?.inputSource?.gamepad) {
      const gamepad = leftController.inputSource.gamepad
      const axes = gamepad.axes

      // Compatibilidad: algunas gafas usan índices diferentes para los ejes
      // Verificamos primero los índices estándar (0) y luego alternativas (2)
      const horizontalValue = !isNaN(axes[0]) && axes[0] !== 0 ? axes[0] : 
                           (!isNaN(axes[2]) && axes[2] !== 0 ? axes[2] : 0);

      if (horizontalValue !== 0) {
        // Crear vector de dirección lateral (izquierda/derecha)
        const lateralDirection = new Vector3(horizontalValue, 0, 0)
        
        // Aplicar la rotación del jugador al vector de movimiento
        lateralDirection.applyQuaternion(player.quaternion)
       
        // Aplicar velocidad y mover
        lateralDirection.multiplyScalar(speed * 0.02)
        player.position.add(lateralDirection)
      }
    }
    
    // Control con el stick derecho para rotación y movimiento adelante/atrás
    if (rightController?.inputSource?.gamepad) {
      const gamepad = rightController.inputSource.gamepad
      const axes = gamepad.axes

      // Compatibilidad: algunas gafas usan índices diferentes para los ejes
      const horizontalValue = !isNaN(axes[2]) && axes[2] !== 0 ? axes[2] : 
                           (!isNaN(axes[0]) && axes[0] !== 0 ? axes[0] : 0);
      
      const verticalValue = !isNaN(axes[3]) && axes[3] !== 0 ? axes[3] : 
                         (!isNaN(axes[1]) && axes[1] !== 0 ? axes[1] : 0);

      // Rotación horizontal
      if (horizontalValue !== 0) {
        // Suavizar la rotación interpolando el valor actual y el destino
        stickValue.current = stickValue.current * 0.8 + horizontalValue * 0.3
        
        // Crear una rotación en Y basada en el valor del stick suavizado
        const rotationAngle = stickValue.current * rotationSpeed
        const rotationY = new Quaternion().setFromEuler(new Euler(0, rotationAngle, 0))

        // Aplicar la rotación al jugador
        player.quaternion.multiply(rotationY)
      } else {
        // Reducir gradualmente el valor cuando no hay entrada
        stickValue.current *= 0.9
      }
      
      // Movimiento adelante/atrás
      if (verticalValue !== 0) {
        // Crear vector de dirección adelante/atrás
        const moveDirection = new Vector3(0, 0, verticalValue)
        
        // Aplicar la rotación del jugador al vector de movimiento
        moveDirection.applyQuaternion(player.quaternion)
        
        // Aplicar velocidad y mover
        moveDirection.multiplyScalar(speed * 0.02)
        player.position.add(moveDirection)
      }
    }
  })

  return null
}
