"use client"

import { useEffect, useMemo, useState, useTransition } from 'react'
import type { Site } from '@/lib/types'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

export default function AdminClient({ rootDomain, initialSites }: { rootDomain: string; initialSites: Site[] }) {
  const [name, setName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [vercelProjectId, setVercelProjectId] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sites, setSites] = useState<Site[]>(initialSites)
  const [isPending, startTransition] = useTransition()
  const [deleteBusy, setDeleteBusy] = useState<Record<string, boolean>>({})
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  const suggested = useMemo(() => slugify(subdomain), [subdomain])
  const valid = useMemo(() => /^[a-z0-9-]{1,63}$/.test(suggested) && !suggested.startsWith('-') && !suggested.endsWith('-'), [suggested])

  useEffect(() => {
    setError(null)
    setMessage(null)
  }, [name, subdomain, githubRepo, vercelProjectId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const payload = {
      name: name.trim(),
      subdomain: suggested,
      githubRepo: githubRepo.trim(),
      vercelProjectId: vercelProjectId.trim(),
    }

    if (!payload.name || !payload.subdomain) {
      setError('Please provide a name and subdomain.')
      return
    }
    if (!valid) {
      setError('Subdomain can only contain lowercase letters, numbers, and hyphens.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        console.log('[ADMIN CLIENT] API Response:', {
          status: res.status,
          ok: res.ok,
          data
        })

        if (!res.ok || !data?.ok) {
          console.error('[ADMIN CLIENT] Request failed:', { status: res.status, data })
          setError(data?.error || `Request failed (${res.status})`)
          return
        }

        const s = data.site as Site
        setSites((prev) => [...prev, s])

        // Enhanced debugging for domain attachment
        const aliasNote = data.aliasAdded ? 'Alias added.' : data.aliasMessage ? `Alias: ${data.aliasMessage}` : 'Alias not added.'
        console.log('[ADMIN CLIENT] Domain attachment details:', {
          aliasAdded: data.aliasAdded,
          aliasMessage: data.aliasMessage,
          debugInfo: data.debugInfo
        })

        setMessage(`Created ${s.name} at ${s.url}. ${aliasNote}`)
        setName('')
        setSubdomain('')
        setGithubRepo('')
        // keep vercelProjectId, often reused
      } catch (err: any) {
        setError(err?.message || 'Unexpected error')
      }
    })
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this prototype? This will detach the subdomain alias (if attached) and remove it from the registry.')) return
    setDeleteBusy((m) => ({ ...m, [id]: true }))
    try {
      const res = await fetch(`/api/sites/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        setError(data?.error || `Delete failed (${res.status})`)
      } else {
        setSites((prev) => prev.filter((s) => s.id !== id))
        setMessage('Deleted successfully')
      }
    } catch (e: any) {
      setError(e?.message || 'Unexpected error')
    } finally {
      setDeleteBusy((m) => ({ ...m, [id]: false }))
    }
  }

  async function loadDebugInfo() {
    try {
      const res = await fetch('/api/debug')
      const data = await res.json()
      setDebugInfo(data)
      setShowDebug(true)
    } catch (err: any) {
      setError(`Debug info failed: ${err.message}`)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 text-white placeholder-white/40 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all"
              placeholder="My Prototype"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Subdomain</label>
            <div>
              <input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                type="text"
                className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 text-white placeholder-white/40 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all"
                placeholder="myproto"
                required
              />
              <div className="mt-2 text-xs text-white/50">Final: <span className={valid ? 'text-green-400' : 'text-red-400'}>{suggested || '—'}</span>.{rootDomain}</div>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/80 mb-2">GitHub repo (owner/name or URL)</label>
            <input
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              type="text"
              className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 text-white placeholder-white/40 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all"
              placeholder="devenspear/my-prototype"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/80 mb-2">Vercel Project ID (optional)</label>
            <input
              value={vercelProjectId}
              onChange={(e) => setVercelProjectId(e.target.value)}
              type="text"
              className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 text-white placeholder-white/40 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all"
              placeholder="prj_..."
            />
            <p className="text-xs text-white/40 mt-2">If provided, {suggested ? `${suggested}.${rootDomain}` : 'the subdomain'} will be attached to this Vercel project automatically.</p>
          </div>
          <div className="md:col-span-2">
            <button
              disabled={isPending}
              className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-6 py-3 backdrop-blur-md border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>

        {message && (
          <div className="mt-6 rounded-xl border border-green-400/20 bg-green-400/10 backdrop-blur-md p-4 text-green-300">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 backdrop-blur-md p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-white/90">Existing prototypes</h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl divide-y divide-white/10">
            {sites.length === 0 && (
              <div className="p-6 text-white/50 text-center">No sites yet.</div>
            )}
            {sites.map((s) => (
              <div key={s.id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white/90 flex items-center">
                      {s.name}
                      {s.status && (
                        <span className="ml-3 text-xs px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/70">
                          {s.status}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-white/60 mt-1">{s.url}</div>
                  </div>
                  <div className="text-sm space-x-4 flex items-center">
                    <a
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                    {s.githubRepo && (
                      <a
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        href={s.githubRepo.startsWith('http') ? s.githubRepo : `https://github.com/${s.githubRepo}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Repo
                      </a>
                    )}
                    <button
                      onClick={() => onDelete(s.id)}
                      disabled={!!deleteBusy[s.id]}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {deleteBusy[s.id] ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="font-medium text-white/90 mb-3">Tips</div>
          <ul className="space-y-2 text-sm text-white/60">
            <li className="flex items-start">
              <span className="block w-1 h-1 rounded-full bg-white/40 mt-2 mr-3 flex-shrink-0"></span>
              Use a short subdomain; only letters, numbers, and hyphens.
            </li>
            <li className="flex items-start">
              <span className="block w-1 h-1 rounded-full bg-white/40 mt-2 mr-3 flex-shrink-0"></span>
              If aliasing fails, you can try again after fixing the Project ID.
            </li>
            <li className="flex items-start">
              <span className="block w-1 h-1 rounded-full bg-white/40 mt-2 mr-3 flex-shrink-0"></span>
              Existing entries appear below; refresh if needed.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="font-medium text-white/90 mb-3">Debug</div>
          <button
            onClick={loadDebugInfo}
            className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Check System Status
          </button>

          {showDebug && debugInfo && (
            <div className="mt-4">
              <div className="text-xs text-white/60 mb-2">Environment:</div>
              <div className="text-xs text-white/80 space-y-1">
                <div>Token: {debugInfo.environment?.hasVercelToken ? '✅' : '❌'}</div>
                <div>Team ID: {debugInfo.environment?.hasTeamId ? '✅' : '❌'}</div>
                <div>API Test: {debugInfo.vercelApiTest?.ok ? '✅' : '❌'}</div>
              </div>
              {debugInfo.vercelApiTest?.error && (
                <div className="text-xs text-red-400 mt-2">
                  API Error: {debugInfo.vercelApiTest.error}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
