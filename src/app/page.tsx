'use client'

import Particles from '@/components/Particles'

export default function HomePage() {
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden rounded-lg">
      <Particles />
      <div className="relative z-10 text-center select-none">
        <div className="text-6xl md:text-8xl font-extrabold tracking-tight drop-shadow-sm">HELLO WORLD</div>
        <div className="mt-2 text-2xl md:text-3xl text-gray-700">hello world</div>
      </div>
    </div>
  )
}
