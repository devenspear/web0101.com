"use client"

import { useEffect, useMemo, useRef, useState } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*?'

export function DecryptedText({
  text,
  duration = 900,
  fps = 60,
  className,
  onDone,
}: {
  text: string
  duration?: number
  fps?: number
  className?: string
  onDone?: () => void
}) {
  const [out, setOut] = useState('')
  const raf = useRef<number | null>(null)
  const start = useRef<number | null>(null)
  const letters = useMemo(() => text.split(''), [text])

  useEffect(() => {
    function step(ts: number) {
      if (start.current == null) start.current = ts
      const t = ts - start.current
      const progress = Math.min(1, t / duration)
      const reveal = Math.floor(progress * letters.length)
      let s = ''
      for (let i = 0; i < letters.length; i++) {
        const ch = letters[i]
        if (ch === ' ') {
          s += ' '
          continue
        }
        if (i < reveal) s += ch
        else s += CHARS[Math.floor(Math.random() * CHARS.length)]
      }
      setOut(s)
      if (progress < 1) raf.current = requestAnimationFrame(step)
      else onDone?.()
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      raf.current = null
      start.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, duration, fps])

  return <span className={className}>{out}</span>
}
