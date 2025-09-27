"use client"

import { useEffect, useRef } from 'react'

export default function Particles() {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0

    function resize() {
      const { innerWidth: w, innerHeight: h } = window
      canvas.width = w
      canvas.height = Math.max(h * 0.7, 480)
    }

    resize()
    window.addEventListener('resize', resize)

    const colors = [
      '#ef4444', // red-500
      '#f59e0b', // amber-500
      '#10b981', // emerald-500
      '#3b82f6', // blue-500
      '#a855f7', // purple-500
      '#ec4899', // pink-500
    ]

    const N = 60
    const circles: { x: number; y: number; r: number; dx: number; dy: number; color: string; a: number; da: number }[] = []

    for (let i = 0; i < N; i++) {
      circles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 6 + Math.random() * 14,
        dx: (-0.5 + Math.random()) * 0.6,
        dy: (-0.5 + Math.random()) * 0.6,
        color: colors[i % colors.length],
        a: Math.random() * Math.PI * 2,
        da: (-0.5 + Math.random()) * 0.02,
      })
    }

    function step() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const c of circles) {
        c.x += c.dx
        c.y += c.dy
        c.a += c.da
        if (c.x < -50) c.x = canvas.width + 50
        if (c.x > canvas.width + 50) c.x = -50
        if (c.y < -50) c.y = canvas.height + 50
        if (c.y > canvas.height + 50) c.y = -50
        const alpha = 0.35 + 0.25 * Math.sin(c.a)
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.fillStyle = c.color
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />
  )
}
