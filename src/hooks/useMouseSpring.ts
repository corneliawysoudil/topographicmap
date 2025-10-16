import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector2 } from 'three'

type SpringState = {
  position: Vector2
  velocity: Vector2
}

export default function useMouseSpring() {
  const state = useRef<SpringState>({ position: new Vector2(0, 0), velocity: new Vector2(0, 0) })
  const target = useRef(new Vector2(0, 0))
  const speedRef = useRef(0)

  useEffect(() => {
    const handle = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      target.current.set(x, -y)
    }
    window.addEventListener('pointermove', handle, { passive: true })
    return () => window.removeEventListener('pointermove', handle)
  }, [])

  useFrame((_, dt) => {
    const k = 10 // spring constant
    const c = 2 * Math.sqrt(k) * 0.9 // damping for near-critical
    const pos = state.current.position
    const vel = state.current.velocity
    const toTarget = target.current.clone().sub(pos)

    // Verlet-like integration for smoothness
    const accel = toTarget.multiplyScalar(k).add(vel.clone().multiplyScalar(-c))
    vel.add(accel.multiplyScalar(dt))
    pos.add(vel.clone().multiplyScalar(dt))

    // speed magnitude for emissive boost
    speedRef.current = Math.min(1, vel.length() * 2)
  })

  return { position: state.current.position, speed: speedRef }
}


