import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import Scene from './Scene'
import HandPreview from './components/HandPreview'
import useHandPointer from './hooks/useHandPointer'

function App() {
  const dpr = useMemo<[number, number]>(() => (window.devicePixelRatio > 1.75 ? [1, 1.75] : [1, 2]), [])
  const containerRef = useRef<HTMLDivElement | null>(null)

  const hand = useHandPointer()

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <HandPreview video={hand.video} landmarks={hand.landmarks} />
      <Canvas
        dpr={dpr}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 45, near: 0.1, far: 200, position: [0, 2.5, 5] }}
      >
        <Suspense fallback={null}>
          <Scene hand={{ pointer: hand.pointer, confidence: hand.confidence, isFist: hand.isFist }} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default App
