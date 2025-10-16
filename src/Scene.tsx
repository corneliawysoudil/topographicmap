import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useThree } from '@react-three/fiber'
import Topography from './Topography'
import useMouseSpring from './hooks/useMouseSpring'

export default function Scene() {
  useThree()
  const { position, speed } = useMouseSpring()

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[2, 3, 2]} intensity={0.15} />
      <Topography pointer={position} speed={speed} />
      <EffectComposer>
        <Bloom intensity={0.35} luminanceThreshold={0.7} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </>
  )
}


