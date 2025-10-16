import { useEffect, useRef } from 'react'
import { Vector2 } from 'three'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

type HandPointer = {
  pointer: Vector2
  confidence: React.MutableRefObject<number>
  zDepth: number
  video: HTMLVideoElement | null
  landmarks: { x: number; y: number }[] | null
}

export default function useHandPointer() {
  const pointer = useRef(new Vector2(0, 0))
  const confidenceRef = useRef(0)
  const zDepthRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const landmarksRef = useRef<{ x: number; y: number }[] | null>(null)
  const handRef = useRef<HandLandmarker | null>(null)
  const rafHandle = useRef<number | null>(null)

  useEffect(() => {
    let stopped = false
    const setup = async () => {
      try {
        // Video
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
        const video = document.createElement('video')
        video.playsInline = true
        video.muted = true
        video.autoplay = true
        video.srcObject = stream
        video.style.display = 'none'
        videoRef.current = video

        await video.play()

        // HandLandmarker
        const files = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )
        handRef.current = await HandLandmarker.createFromOptions(files, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          },
          numHands: 1,
          runningMode: 'VIDEO',
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        const loop = () => {
          if (stopped) return
          if (video.readyState >= 2 && handRef.current) {
            const now = performance.now()
            const result = handRef.current.detectForVideo(video, now)
            const lm = result.landmarks && result.landmarks[0]
            if (lm && lm.length > 8) {
              const tip = lm[8] // index fingertip
              // x,y in [0..1] (video coords); convert to normalized [-1,1], Y up
              // Mirror X so hand-left = cursor-left (natural for user-facing camera)
              const nx = (1 - tip.x) * 2 - 1
              const ny = (1 - tip.y) * 2 - 1
              // Simple smoothing
              pointer.current.lerp(new Vector2(nx, ny), 0.35)
              // crude confidence proxy based on presence of landmarks
              confidenceRef.current = 0.95
              zDepthRef.current = -tip.z || 0
              // store all normalized landmarks
              landmarksRef.current = lm.map((p) => ({ x: p.x, y: p.y }))
            } else {
              confidenceRef.current = 0
              landmarksRef.current = null
            }
          }
          rafHandle.current = requestAnimationFrame(loop)
        }
        rafHandle.current = requestAnimationFrame(loop)
      } catch (e) {
        // Permission denied or error; leave confidence at 0 to fallback to mouse
        console.warn('Hand pointer init failed:', e)
      }
    }
    setup()

    return () => {
      stopped = true
      if (rafHandle.current) cancelAnimationFrame(rafHandle.current)
      if (videoRef.current) {
        const tracks = (videoRef.current.srcObject as MediaStream | null)?.getTracks() || []
        tracks.forEach((t) => t.stop())
        videoRef.current.remove()
        videoRef.current = null
      }
      if (handRef.current) {
        handRef.current.close()
        handRef.current = null
      }
    }
  }, [])

  return {
    pointer: pointer.current,
    confidence: confidenceRef,
    zDepth: zDepthRef.current,
    video: videoRef.current,
    landmarks: landmarksRef.current,
  } as HandPointer
}


