"use client"

import { useEffect, useState } from 'react'
import { DecryptedText } from './DecryptedText'

const QUOTES: string[] = [
  "The future is already here — it’s just not evenly distributed.",
  "Most disruption looks like a toy until it rewires an industry.",
  "Compounding learning beats compounding complexity.",
  "Build for the next order of magnitude — today.",
  "If it can be automated, it will be. Design for that world.",
  "Simplicity is a feature with the best scaling curve.",
]

export default function QuotesRotator() {
  const [idx, setIdx] = useState(0)
  const [key, setKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % QUOTES.length)
      setKey((k) => k + 1)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-[2lh]">
      <DecryptedText
        key={key}
        text={QUOTES[idx]}
        duration={1000}
        className="inline-block"
      />
    </div>
  )
}
