import { useEffect, useRef } from 'react'

type Props = {
  video: HTMLVideoElement | null
  landmarks: { x: number; y: number }[] | null
}

export default function HandPreview({ video, landmarks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let raf: number
    const draw = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) { raf = requestAnimationFrame(draw); return }
      const w = 240
      const h = 160
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h

      ctx.clearRect(0, 0, w, h)
      if (video && video.readyState >= 2) {
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(video, -w, 0, w, h)
        ctx.restore()
      }
      if (landmarks && landmarks.length) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        for (const p of landmarks) {
          // landmarks are in [0..1] video coords; mirror X
          const x = (1 - p.x) * w
          const y = p.y * h
          ctx.beginPath()
          ctx.arc(x, y, 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [video, landmarks])

  return (
    <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 10, pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ borderRadius: 8, opacity: 0.9, background: 'rgba(0,0,0,0.25)' }} />
    </div>
  )
}


