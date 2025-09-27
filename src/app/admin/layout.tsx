import './globals.css'
import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <header className="mb-8 flex items-center justify-between">
            <a href="/" className="text-2xl font-semibold">web0101.com</a>
            <nav className="text-sm text-gray-600 space-x-4">
              <a className="hover:underline" href="/">Home</a>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
