'use client'

import { EB_Garamond } from 'next/font/google'
import QuotesRotator from '@/components/QuotesRotator'

const garamond = EB_Garamond({ subsets: ['latin'], display: 'swap' })

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-center px-4">
      <h1 className={`${garamond.className} text-6xl md:text-8xl font-semibold tracking-tight select-none text-white`}>
        HeLlO WoRlD
      </h1>
      <div className="mt-6 text-lg md:text-xl text-white/70 max-w-3xl">
        <QuotesRotator />
      </div>
    </div>
  )
}
