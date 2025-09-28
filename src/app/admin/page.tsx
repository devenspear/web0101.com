export default function AdminPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md px-4">
        <form method="post" action="/api/auth/login" className="relative">
          <input
            name="password"
            type="password"
            placeholder="•••••••••"
            className="w-full rounded-xl border border-white/20 bg-white/5 backdrop-blur-md px-6 py-4 pr-16 text-center text-white placeholder-white/40 focus:border-white/40 focus:bg-white/10 focus:outline-none transition-all"
            required
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all"
          >
            →
          </button>
        </form>
      </div>
    </div>
  )
}
