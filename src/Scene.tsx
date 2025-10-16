import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useFrame, useThree } from '@react-three/fiber'
import Topography from './Topography'
import useMouseSpring from './hooks/useMouseSpring'
import type { Vector2 } from 'three'
import { useRef } from 'react'

type HandInput = { pointer: Vector2; confidence: React.MutableRefObject<number>; isFist: React.MutableRefObject<boolean> }

export default function Scene({ hand }: { hand?: HandInput }) {
  useThree()
  const { position, speed } = useMouseSpring()
  const chosen = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  useFrame(() => {
    const useHand = !!hand && hand.confidence.current > 0.6
    const src = useHand ? (hand!.pointer as any) : (position as any)
    chosen.current.x = src.x || 0
    chosen.current.y = src.y || 0
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


