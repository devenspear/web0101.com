'use client'

import { EB_Garamond } from 'next/font/google'
import QuotesRotator from '@/components/QuotesRotator'

const garamond = EB_Garamond({ subsets: ['latin'], display: 'swap' })

export default function HomePage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
      <h1 className={`${garamond.className} text-6xl md:text-8xl font-semibold tracking-tight select-none`}>
        HeLlO WoRlD
      </h1>
      <div className="mt-6 text-lg md:text-xl text-gray-700 max-w-3xl px-4">
        <QuotesRotator />
      </div>
    </div>
  )
}
