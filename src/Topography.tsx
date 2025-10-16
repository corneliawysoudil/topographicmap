import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

type Props = {
  pointer: { x: number; y: number } | THREE.Vector2
  speed: React.MutableRefObject<number>
  isFist?: React.MutableRefObject<boolean>
}

export default function Topography({ pointer, speed, isFist }: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const geometry = useMemo(() => new THREE.PlaneGeometry(40, 40, 512, 512), [])
  const { camera } = useThree()
  const raycaster = useRef(new THREE.Raycaster()).current
  const wasFist = useRef(false)
  const fistRippleStart = useRef(-999)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uNoiseScale: { value: 11.0 },
    uNoiseOffset: { value: new THREE.Vector2() },
    uLineStep: { value: 0.03 },
    uLineThickness: { value: 0.025 },
    uEmissiveStrength: { value: 1.0 },
    uBaseColor: { value: new THREE.Color(0.02, 0.02, 0.025) },
    uLineColor: { value: new THREE.Color(1, 1, 1) },
    uRippleCenter: { value: new THREE.Vector2(9999, 9999) },
    uRippleStrength: { value: 0.0 },
    uRippleFreq: { value: 9.5 },
    uRippleDecay: { value: 2.5 },
    uRippleSpeed: { value: 3.0 },
    uGlobalRippleStart: { value: -999 },
    uRedTint: { value: 0.0 },
    uPeakyness: { value: 0.0 },
  }), [])

  const vertexShader = useMemo(() => `
    varying vec2 vUv;
    varying float vHeight;
    varying vec2 vPlanePos;

    uniform float uTime;
    uniform float uNoiseScale;
    uniform vec2 uNoiseOffset;
    uniform vec2 uRippleCenter;
    uniform float uRippleStrength;
    uniform float uRippleFreq;
    uniform float uRippleDecay;
    uniform float uRippleSpeed;
    uniform float uGlobalRippleStart;
    uniform float uPeakyness;

    // 2D Perlin Noise
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);} 
    vec2 fade(vec2 t){return t*t*t*(t*(t*6.0-15.0)+10.0);} 
    float perlin(vec2 P){
      vec2 Pi = floor(P); // Integer part for indexing
      vec2 Pf = fract(P); // Fractional part for interpolation
      vec4 ix = vec4(Pi.x, Pi.x+1.0, Pi.x, Pi.x+1.0);
      vec4 iy = vec4(Pi.y, Pi.y, Pi.y+1.0, Pi.y+1.0);
      vec4 fx = vec4(Pf.x, Pf.x-1.0, Pf.x, Pf.x-1.0);
      vec4 fy = vec4(Pf.y, Pf.y, Pf.y-1.0, Pf.y-1.0);

      vec4 i = permute(permute(ix) + iy);
      vec4 gx = 2.0*fract(i/41.0)-1.0;
      vec4 gy = abs(gx)-0.5; 
      vec4 tx = floor(gx+0.5);
      gx = gx - tx;

      vec2 g00 = vec2(gx.x,gy.x); vec2 g10 = vec2(gx.y,gy.y);
      vec2 g01 = vec2(gx.z,gy.z); vec2 g11 = vec2(gx.w,gy.w);

      vec4 norm = 1.79284291400159 - 0.85373472095314 *
        vec4(dot(g00,g00), dot(g10,g10), dot(g01,g01), dot(g11,g11));
      g00 *= norm.x; g10 *= norm.y; g01 *= norm.z; g11 *= norm.w;

      float n00 = dot(g00, vec2(fx.x, fy.x));
      float n10 = dot(g10, vec2(fx.y, fy.y));
      float n01 = dot(g01, vec2(fx.z, fy.z));
      float n11 = dot(g11, vec2(fx.w, fy.w));

      vec2 fade_xy = fade(Pf);
      vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
      float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
      return 2.3 * n_xy; // scale to ~[-1,1]
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 5; i++) {
        value += amplitude * perlin(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      vPlanePos = pos.xy;
      vec2 nUv = vUv * uNoiseScale + uNoiseOffset + vec2(0.03 * uTime);
      float h = fbm(nUv) * 0.6; // height scale
      
      // Apply peaky transformation when fist is detected
      if (uPeakyness > 0.01) {
        // Create sharp peaks by transforming the height
        float heightFrac = fract(h * 8.0); // Increased from 3.0 to 8.0 for more peaks
        float peaky = abs(heightFrac - 0.5) * 2.0; // V-shaped peaks
        peaky = 1.0 - peaky; // Invert to make peaks point up
        peaky = pow(peaky, 3.5); // Sharpen the peaks even more
        float peakyHeight = mix(0.0, 0.5, peaky);
        h = mix(h, h + peakyHeight, uPeakyness);
      }
      
      // Damped radial ripple around uRippleCenter (in plane local coords)
      float dist = distance(vPlanePos, uRippleCenter);
      if (uRippleStrength > 0.0) {
        float phase = uRippleFreq * dist - uRippleSpeed * uTime;
        float ripple = exp(-uRippleDecay * dist) * sin(phase) * uRippleStrength;
        h += ripple;
      }
      // Global fist ripple expanding from center
      if (uGlobalRippleStart > -900.0) {
        float elapsed = uTime - uGlobalRippleStart;
        float distFromCenter = length(vPlanePos);
        float waveRadius = elapsed * 8.0;
        float waveDist = abs(distFromCenter - waveRadius);
        float waveAmp = smoothstep(3.0, 0.0, waveDist) * smoothstep(0.0, 0.5, elapsed) * smoothstep(3.0, 1.0, elapsed);
        h += waveAmp * 0.8;
      }
      pos.z += h;
      vHeight = h;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `, [])

  const fragmentShader = useMemo(() => `
    precision highp float;
    varying vec2 vUv;
    varying float vHeight;

    uniform float uLineStep;
    uniform float uLineThickness;
    uniform float uEmissiveStrength;
    uniform vec3 uBaseColor;
    uniform vec3 uLineColor;
    uniform float uRedTint;

    void main(){
      float f = fract(vHeight / uLineStep);
      float d = abs(f - 0.5) * 2.0;
      float line = smoothstep(uLineThickness, 0.0, d);
      // Only draw the lines; background fully transparent.
      vec3 whiteColor = uLineColor;
      vec3 redColor = vec3(0.8, 0.05, 0.1); // Darker crimson red
      vec3 finalColor = mix(whiteColor, redColor, uRedTint);
      vec3 color = finalColor * line * uEmissiveStrength;
      float alpha = line;
      if (alpha <= 0.001) discard;
      gl_FragColor = vec4(color, alpha);
    }
  `, [])

  useFrame((_, dt) => {
    uniforms.uTime.value += dt
    const px = (pointer as any).x ?? 0
    const py = (pointer as any).y ?? 0
    const offsetScale = 0.25
    uniforms.uNoiseOffset.value.set(px * offsetScale, py * offsetScale)
    const base = 1.0
    const boost = 0.1 * (speed.current || 0)
    uniforms.uEmissiveStrength.value = base + boost
    
    // Fist gesture: trigger global ripple and fade to red
    const currentFist = isFist?.current ?? false
    if (currentFist && !wasFist.current) {
      // Fist detected - trigger ripple
      fistRippleStart.current = uniforms.uTime.value
      uniforms.uGlobalRippleStart.value = uniforms.uTime.value
    }
    wasFist.current = currentFist
    
    // Smooth red tint transition
    const targetRed = currentFist ? 1.0 : 0.0
    uniforms.uRedTint.value += (targetRed - uniforms.uRedTint.value) * 0.1
    
    // Smooth peaky transition
    const targetPeaky = currentFist ? 1.0 : 0.0
    uniforms.uPeakyness.value += (targetPeaky - uniforms.uPeakyness.value) * 0.08
    
    // Raycast pointer to get ripple center on the plane (local XY)
    if (meshRef.current) {
      raycaster.setFromCamera(new THREE.Vector2(px, py), camera)
      const hit = raycaster.intersectObject(meshRef.current, false)[0]
      if (hit) {
        const local = meshRef.current.worldToLocal(hit.point.clone())
        uniforms.uRippleCenter.value.set(local.x, local.y)
        // Optionally boost from hand Z via speed ref surrogate (kept subtle)
        uniforms.uRippleStrength.value = 0.15 + (speed.current || 0) * 0.2
      } else {
        uniforms.uRippleStrength.value = 0.0
      }
    }
  })

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial ref={materialRef}
        uniforms={uniforms as any}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}


