import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useFrame, useThree } from '@react-three/fiber'
import Topography from './Topography'
import useMouseSpring from './hooks/useMouseSpring'
import type { Vector2 } from 'three'
import { useRef } from 'react'
import * as THREE from 'three'

type HandInput = { pointer: Vector2; confidence: React.MutableRefObject<number>; isFist: React.MutableRefObject<boolean> }

export default function Scene({ hand }: { hand?: HandInput }) {
  const { scene } = useThree()
  const { position, speed } = useMouseSpring()
  const chosen = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const bgColor = useRef(new THREE.Color(0.04, 0.04, 0.04))

  useFrame(() => {
    const useHand = !!hand && hand.confidence.current > 0.6
    const src = useHand ? (hand!.pointer as any) : (position as any)
    chosen.current.x = src.x || 0
    chosen.current.y = src.y || 0
    
    // Animate background color based on fist
    const isFist = hand?.isFist.current ?? false
    const targetColor = isFist ? new THREE.Color(0.08, 0.02, 0.03) : new THREE.Color(0.04, 0.04, 0.04)
    bgColor.current.lerp(targetColor, 0.05)
    scene.background = bgColor.current
  })

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[2, 3, 2]} intensity={0.15} />
      <Topography pointer={chosen.current} speed={speed} isFist={hand?.isFist} />
      <EffectComposer>
        <Bloom intensity={0.35} luminanceThreshold={0.7} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </>
  )
}


