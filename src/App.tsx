import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import Scene from './Scene'

function App() {
  const dpr = useMemo<[number, number]>(() => (window.devicePixelRatio > 1.75 ? [1, 1.75] : [1, 2]), [])
  const containerRef = useRef<HTMLDivElement | null>(null)

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <Canvas
        dpr={dpr}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 45, near: 0.1, far: 200, position: [0, 2.5, 5] }}
      >
        <color attach="background" args={[0.04, 0.04, 0.04]} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default App
