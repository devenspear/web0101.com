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
        if (!res.ok || !data?.ok) {
          setError(data?.error || `Request failed (${res.status})`)
          return
        }
        const s = data.site as Site
        setSites((prev) => [...prev, s])
        const aliasNote = data.aliasAdded ? 'Alias added.' : data.aliasMessage ? `Alias: ${data.aliasMessage}` : 'Alias not added.'
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} type="text" className="mt-1 w-full rounded border px-3 py-2" placeholder="My Prototype" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Subdomain</label>
            <div className="mt-1">
              <input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} type="text" className="w-full rounded border px-3 py-2" placeholder="myproto" required />
              <div className="mt-1 text-xs text-gray-600">Final: <span className={valid ? 'text-green-600' : 'text-red-600'}>{suggested || '—'}</span>.{rootDomain}</div>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">GitHub repo (owner/name or URL)</label>
            <input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} type="text" className="mt-1 w-full rounded border px-3 py-2" placeholder="devenspear/my-prototype" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Vercel Project ID (optional)</label>
            <input value={vercelProjectId} onChange={(e) => setVercelProjectId(e.target.value)} type="text" className="mt-1 w-full rounded border px-3 py-2" placeholder="prj_..." />
            <p className="text-xs text-gray-500 mt-1">If provided, {suggested ? `${suggested}.${rootDomain}` : 'the subdomain'} will be attached to this Vercel project automatically.</p>
          </div>
          <div className="md:col-span-2">
            <button disabled={isPending} className="rounded bg-black text-white px-4 py-2 disabled:opacity-60">{isPending ? 'Creating…' : 'Create'}</button>
          </div>
        </form>

        {message && (
          <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-green-800">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">
            {error}
          </div>
        )}
      </div>

      <aside className="space-y-3">
        <div className="rounded border p-3">
          <div className="font-medium">Tips</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>Use a short subdomain; only letters, numbers, and hyphens.</li>
            <li>If aliasing fails, you can try again after fixing the Project ID.</li>
            <li>Existing entries appear below; refresh if needed.</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}
