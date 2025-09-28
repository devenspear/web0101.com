import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-8 flex items-center justify-between">
          <a href="/" className="text-2xl font-semibold text-white/90 hover:text-white transition-colors">web0101.com</a>
          <nav className="text-sm text-white/60 space-x-4">
            <a className="hover:text-white/80 transition-colors" href="/">Home</a>
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}
