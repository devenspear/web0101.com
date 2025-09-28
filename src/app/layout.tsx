import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'web0101.com',
  description: 'Multi-repo prototype hub and admin portal',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <main>{children}</main>
      </body>
    </html>
  )
}
