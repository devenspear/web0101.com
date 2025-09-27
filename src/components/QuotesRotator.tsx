"use client"

import { useEffect, useState } from 'react'
import { DecryptedText } from './DecryptedText'

const QUOTES: string[] = [
  "The future is already here — it’s just not evenly distributed.",
  "Move fast. Make things. Learn faster.",
  "Perfection is the enemy of shipped.",
  "What would you build if you couldn’t fail?",
  "The best way to predict the future is to invent it.",
  "Constraint breeds creativity.",
  "Start now. Optimize later.",
  "Simple scales."
]

export default function QuotesRotator() {
  const [idx, setIdx] = useState(0)
  const [key, setKey] = useState(0)

  useEffect(() => {
    // advance to next quote ~1.6s after decrypt completes
    let t: any
    function schedule() {
      t = setTimeout(() => {
        setIdx((i) => (i + 1) % QUOTES.length)
        setKey((k) => k + 1)
      }, 1600)
    }
    return () => clearTimeout(t)
  }, [idx])

  return (
    <div className="min-h-[2lh]">
      <DecryptedText
        key={key}
        text={QUOTES[idx]}
        duration={1000}
        className="inline-block"
        onDone={() => {
          /* no-op; timer above rotates */
        }}
      />
    </div>
  )
}
