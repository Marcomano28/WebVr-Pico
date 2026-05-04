'use client'

import { useXR, useController } from '@react-three/xr'
import { useFrame } from '@react-three/fiber'
import { MathUtils, Vector3, Quaternion } from 'three'
import { useRef } from 'react'

interface MovementEnhancedProps {
  speed?: number
  rotationSpeed?: number
  deadzone?: number
  smoothing?: number
}

function applyDeadzone(value: number | undefined, deadzone: number) {
  if (!Number.isFinite(value)) return 0

  const axis = value || 0
  const magnitude = Math.abs(axis)

  if (magnitude <= deadzone) return 0

  return Math.sign(axis) * ((magnitude - deadzone) / (1 - deadzone))
}

function pickAxis(axes: readonly number[], primaryIndex: number, fallbackIndex: number, deadzone: number) {
  const primaryValue = applyDeadzone(axes[primaryIndex], deadzone)

  if (primaryValue !== 0) return primaryValue

  return applyDeadzone(axes[fallbackIndex], deadzone)
}

export default function MovementEnhanced({
  speed = 2,
  rotationSpeed = 0.02,
  deadzone = 0.18,
  smoothing = 14
}: MovementEnhancedProps) {
  const { player } = useXR()
  const lateralAxis = useRef(0)
  const forwardAxis = useRef(0)
  const turnAxis = useRef(0)
  const moveDirection = useRef(new Vector3())
  const yawQuaternion = useRef(new Quaternion())
  const upAxis = useRef(new Vector3(0, 1, 0))

  // Referencias a los controladores
  const leftController = useController('left')
  const rightController = useController('right')

  useFrame((_, delta) => {
    if (!player) return

    let lateralTarget = 0
    let forwardTarget = 0
    let turnTarget = 0

    // Control con el joystick izquierdo para movimiento lateral
    if (leftController?.inputSource?.gamepad) {
      const gamepad = leftController.inputSource.gamepad
      const axes = gamepad.axes

      // Compatibilidad: algunas gafas usan índices diferentes para los ejes
      // Verificamos primero los índices estándar y luego alternativas.
      lateralTarget = pickAxis(axes, 0, 2, deadzone)
    }

    // Control con el stick derecho para rotación y movimiento adelante/atrás
    if (rightController?.inputSource?.gamepad) {
      const gamepad = rightController.inputSource.gamepad
      const axes = gamepad.axes

      // Compatibilidad: algunas gafas usan índices diferentes para los ejes
      turnTarget = pickAxis(axes, 2, 0, deadzone)
      forwardTarget = pickAxis(axes, 3, 1, deadzone)
    }

    lateralAxis.current = MathUtils.damp(lateralAxis.current, lateralTarget, smoothing, delta)
    forwardAxis.current = MathUtils.damp(forwardAxis.current, forwardTarget, smoothing, delta)
    turnAxis.current = MathUtils.damp(turnAxis.current, turnTarget, smoothing, delta)

    if (Math.abs(lateralAxis.current) < 0.001) lateralAxis.current = 0
    if (Math.abs(forwardAxis.current) < 0.001) forwardAxis.current = 0
    if (Math.abs(turnAxis.current) < 0.001) turnAxis.current = 0

    if (turnAxis.current !== 0) {
      const rotationAngle = turnAxis.current * rotationSpeed * 60 * delta

      yawQuaternion.current.setFromAxisAngle(upAxis.current, rotationAngle)
      player.quaternion.multiply(yawQuaternion.current)
    }

    if (lateralAxis.current !== 0 || forwardAxis.current !== 0) {
      moveDirection.current.set(lateralAxis.current, 0, forwardAxis.current)

      if (moveDirection.current.lengthSq() > 1) {
        moveDirection.current.normalize()
      }

      moveDirection.current.applyQuaternion(player.quaternion)
      moveDirection.current.y = 0

      player.position.addScaledVector(moveDirection.current, speed * delta)
    }
  })

  return null
}
