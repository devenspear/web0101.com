import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'web0101.com',
  description: 'Multi-repo prototype hub and admin portal',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
