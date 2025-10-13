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
  const [healthStatus, setHealthStatus] = useState<Record<string, any>>({})
  const [healthCheckLoading, setHealthCheckLoading] = useState(false)
  const [refreshingAlias, setRefreshingAlias] = useState<Record<string, boolean>>({})

  const suggested = useMemo(() => slugify(subdomain), [subdomain])
  const valid = useMemo(() => /^[a-z0-9-]{1,63}$/.test(suggested) && !suggested.startsWith('-') && !suggested.endsWith('-'), [suggested])

  // Project ID validation
  const isValidProjectId = useMemo(() => {
    if (!vercelProjectId.trim()) return true // Optional field
    return /^prj_[a-zA-Z0-9]{26}$/.test(vercelProjectId.trim())
  }, [vercelProjectId])

  const projectIdWarning = useMemo(() => {
    if (!vercelProjectId.trim() || isValidProjectId) return null
    return 'Project ID should start with "prj_" followed by 26 characters'
  }, [vercelProjectId, isValidProjectId])

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

          // Enhanced error messaging based on status code
          let errorMessage = data?.error || `Request failed (${res.status})`

          if (res.status === 401) {
            errorMessage = 'Authentication failed. Please refresh the page and sign in again.'
          } else if (res.status === 403) {
            errorMessage = 'Permission denied. Check your admin access and try again.'
          } else if (res.status === 409) {
            errorMessage = `Subdomain "${suggested}" already exists. Please choose a different name.`
          } else if (res.status === 500) {
            errorMessage = 'Server error occurred. Please check the console for details and try again.'
          } else if (!res.ok && data?.error) {
            // Server provided specific error message
            errorMessage = data.error
          }

          setError(errorMessage)
          return
        }

        const s = data.site as Site
        setSites((prev) => [...prev, s])

        // Enhanced success/warning messaging for domain attachment
        console.log('[ADMIN CLIENT] Domain attachment details:', {
          aliasAdded: data.aliasAdded,
          aliasMessage: data.aliasMessage,
          debugInfo: data.debugInfo
        })

        let statusMessage = `✅ Created ${s.name} and added to registry.`

        if (data.aliasAdded) {
          statusMessage += ` ✅ Domain ${s.subdomain}.${rootDomain} successfully attached to Vercel project.`
          if (data.aliasMessage) {
            statusMessage += ` (${data.aliasMessage})`
          }
        } else if (data.aliasMessage) {
          // Domain attachment failed - provide detailed guidance
          statusMessage += ` ⚠️ WARNING: Domain attachment failed - ${data.aliasMessage}`

          if (data.aliasMessage.includes('Failed to attach domain alias')) {
            statusMessage += `\n\n🔧 Troubleshooting:\n• Verify Project ID is correct (check Vercel dashboard)\n• Ensure VERCEL_TOKEN has domain permissions\n• Try the Project ID with 'TD' instead of 'Tb' (or vice versa) - Vercel has known UI/API inconsistencies`
          }

          if (data.debugInfo?.error) {
            statusMessage += `\n\n📋 Technical Details: ${data.debugInfo.error}`
          }
        } else {
          statusMessage += ` ⚠️ No Vercel Project ID provided - domain not attached.`
        }

        setMessage(statusMessage)
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

  async function checkAliasHealth() {
    setHealthCheckLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sites/health')
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Health check failed')
        return
      }

      const statusMap: Record<string, any> = {}
      data.healthChecks.forEach((check: any) => {
        statusMap[check.id] = check
      })
      setHealthStatus(statusMap)
      setMessage('Health check completed')
    } catch (err: any) {
      setError(`Health check failed: ${err.message}`)
    } finally {
      setHealthCheckLoading(false)
    }
  }

  async function refreshAlias(siteId: string, subdomain: string, vercelProjectId: string) {
    if (!vercelProjectId) {
      setError('No Vercel Project ID configured for this site')
      return
    }

    setRefreshingAlias(prev => ({ ...prev, [siteId]: true }))
    setError(null)
    setMessage(null)

    try {
      const res = await fetch('/api/sites/refresh-alias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, vercelProjectId }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to refresh alias')
        return
      }

      setMessage(`✅ Successfully refreshed ${subdomain}.${rootDomain} to latest deployment`)

      // Re-check health after refresh
      await checkAliasHealth()
    } catch (err: any) {
      setError(`Failed to refresh alias: ${err.message}`)
    } finally {
      setRefreshingAlias(prev => ({ ...prev, [siteId]: false }))
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
              className={`w-full rounded-xl border backdrop-blur-md px-4 py-3 text-white placeholder-white/40 focus:bg-white/10 focus:outline-none transition-all ${
                projectIdWarning
                  ? 'border-yellow-400/50 bg-yellow-400/5 focus:border-yellow-400/70'
                  : 'border-white/10 bg-white/5 focus:border-white/20'
              }`}
              placeholder="prj_..."
            />
            {projectIdWarning && (
              <p className="text-xs text-yellow-400 mt-1">⚠️ {projectIdWarning}</p>
            )}
            <p className="text-xs text-white/40 mt-2">
              If provided, {suggested ? `${suggested}.${rootDomain}` : 'the subdomain'} will be attached to this Vercel project automatically.
              {vercelProjectId.trim() && (
                <span className="block mt-1">
                  💡 Tip: Copy from Vercel Dashboard → Project Settings → General → Project ID
                </span>
              )}
            </p>
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
            <div className="whitespace-pre-line">{message}</div>
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 backdrop-blur-md p-4 text-red-300">
            <div className="whitespace-pre-line">{error}</div>
          </div>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white/90">Existing prototypes</h2>
            <button
              onClick={checkAliasHealth}
              disabled={healthCheckLoading}
              className="text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg border border-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {healthCheckLoading ? 'Checking...' : '🔍 Check Health'}
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl divide-y divide-white/10">
            {sites.length === 0 && (
              <div className="p-6 text-white/50 text-center">No sites yet.</div>
            )}
            {sites.map((s) => {
              const health = healthStatus[s.id]
              return (
                <div key={s.id} className="p-6 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-white/90 flex items-center flex-wrap gap-2">
                        {s.name}
                        {s.status && (
                          <span className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/70">
                            {s.status}
                          </span>
                        )}
                        {health && (
                          <span className={`text-xs px-3 py-1 rounded-full border ${
                            health.status === 'healthy'
                              ? 'bg-green-500/20 border-green-400/30 text-green-300'
                              : health.status === 'no-project'
                              ? 'bg-gray-500/20 border-gray-400/30 text-gray-300'
                              : 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300'
                          }`}>
                            {health.status === 'healthy' && '✅ Healthy'}
                            {health.status === 'stale' && '⚠️ Stale'}
                            {health.status === 'error' && '❌ Error'}
                            {health.status === 'no-project' && '⚪ No Project'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-white/60 mt-1">{s.url}</div>
                      {health && health.message && (
                        <div className="text-xs text-white/40 mt-1">{health.message}</div>
                      )}
                    </div>
                    <div className="text-sm space-x-3 flex items-center">
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
                      {s.vercelProjectId && (
                        <button
                          onClick={() => refreshAlias(s.id, s.subdomain, s.vercelProjectId!)}
                          disabled={!!refreshingAlias[s.id]}
                          className="text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Refresh alias to latest production deployment"
                        >
                          {refreshingAlias[s.id] ? 'Refreshing...' : '🔄 Refresh'}
                        </button>
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
              )
            })}
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
              Copy Project ID from Vercel Dashboard → Project Settings → General.
            </li>
            <li className="flex items-start">
              <span className="block w-1 h-1 rounded-full bg-white/40 mt-2 mr-3 flex-shrink-0"></span>
              If domain attachment fails, try replacing 'TD' with 'Tb' in Project ID (or vice versa).
            </li>
            <li className="flex items-start">
              <span className="block w-1 h-1 rounded-full bg-white/40 mt-2 mr-3 flex-shrink-0"></span>
              Check browser console for detailed debugging information.
            </li>
            <li className="flex items-start">
              <span className="block w-1 h-1 rounded-full bg-white/40 mt-2 mr-3 flex-shrink-0"></span>
              Use "Check System Status" to verify Vercel API connectivity.
            </li>
            <li className="flex items-start">
              <span className="block w-1 h-1 rounded-full bg-white/40 mt-2 mr-3 flex-shrink-0"></span>
              Click "Check Health" to verify all subdomains are pointing to correct deployments.
            </li>
            <li className="flex items-start">
              <span className="block w-1 h-1 rounded-full bg-white/40 mt-2 mr-3 flex-shrink-0"></span>
              Use "Refresh" button to update a subdomain to its latest production deployment.
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
              <div className="text-xs text-white/60 mb-2">System Status:</div>
              <div className="text-xs text-white/80 space-y-1">
                <div>Vercel Token: {debugInfo.environment?.hasVercelToken ? '✅ Configured' : '❌ Missing'}</div>
                <div>Team ID: {debugInfo.environment?.hasTeamId ? '✅ Configured' : '⚠️ Not set (using personal account)'}</div>
                <div>API Access: {debugInfo.vercelApiTest?.ok ? '✅ Working' : '❌ Failed'}</div>
                {debugInfo.vercelApiTest?.user && (
                  <div className="text-green-400">
                    Authenticated as: {debugInfo.vercelApiTest.user.username || debugInfo.vercelApiTest.user.email}
                  </div>
                )}
              </div>

              {debugInfo.vercelApiTest?.error && (
                <div className="mt-3 p-2 rounded bg-red-500/20 border border-red-500/30">
                  <div className="text-xs text-red-300 font-medium">API Error:</div>
                  <div className="text-xs text-red-200 mt-1">{debugInfo.vercelApiTest.error}</div>
                  <div className="text-xs text-red-200/70 mt-2">
                    💡 Check environment variables in Vercel dashboard
                  </div>
                </div>
              )}

              {debugInfo.vercelApiTest?.ok && (
                <div className="mt-3 p-2 rounded bg-green-500/20 border border-green-500/30">
                  <div className="text-xs text-green-300">✅ All systems operational - domain attachment should work!</div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
