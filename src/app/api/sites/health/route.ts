import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSites } from '@/lib/sites'
import { ADMIN_COOKIE_NAME, readAdminSession } from '@/lib/admin-session'
import { VERCEL_TOKEN, VERCEL_TEAM_ID } from '@/lib/config'

export const dynamic = 'force-dynamic'

interface HealthStatus {
  id: string
  subdomain: string
  name: string
  status: 'healthy' | 'stale' | 'error' | 'no-project'
  message: string
  currentAlias?: string
  latestDeployment?: string
  vercelProjectId?: string
}

async function getProjectDomains(projectId: string): Promise<any[]> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  const url = new URL(`https://api.vercel.com/v9/projects/${projectId}/domains`)
  if (VERCEL_TEAM_ID) {
    url.searchParams.set('teamId', VERCEL_TEAM_ID)
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch domains: ${res.status}`)
  }

  const data = await res.json()
  return data.domains || []
}

async function getLatestProductionDeployment(projectId: string): Promise<string | null> {
  if (!VERCEL_TOKEN) {
    return null
  }

  const url = new URL(`https://api.vercel.com/v6/deployments`)
  url.searchParams.set('projectId', projectId)
  url.searchParams.set('target', 'production')
  url.searchParams.set('state', 'READY')
  url.searchParams.set('limit', '1')
  if (VERCEL_TEAM_ID) {
    url.searchParams.set('teamId', VERCEL_TEAM_ID)
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    return null
  }

  const data = await res.json()
  return data.deployments?.[0]?.url || null
}

export async function GET() {
  const cookieStore = cookies()
  const session = readAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value)

  if (!session.valid) {
    return NextResponse.json(
      { ok: false, error: 'Session expired' },
      { status: 401 }
    )
  }

  try {
    const sites = await getSites()
    const healthChecks: HealthStatus[] = []

    for (const site of sites) {
      if (!site.vercelProjectId) {
        healthChecks.push({
          id: site.id,
          subdomain: site.subdomain,
          name: site.name,
          status: 'no-project',
          message: 'No Vercel Project ID configured',
        })
        continue
      }

      try {
        // Get domains attached to this project
        const domains = await getProjectDomains(site.vercelProjectId)
        const subdomain = `${site.subdomain}.web0101.com`
        const domainInfo = domains.find((d: any) => d.name === subdomain)

        // Get latest production deployment
        const latestDeployment = await getLatestProductionDeployment(site.vercelProjectId)

        if (!domainInfo) {
          healthChecks.push({
            id: site.id,
            subdomain: site.subdomain,
            name: site.name,
            status: 'error',
            message: 'Domain not attached to project',
            vercelProjectId: site.vercelProjectId,
          })
          continue
        }

        // Check if domain is pointing to latest deployment
        const currentAlias = domainInfo.redirect || 'Production'

        healthChecks.push({
          id: site.id,
          subdomain: site.subdomain,
          name: site.name,
          status: 'healthy',
          message: 'Domain attached and active',
          currentAlias,
          latestDeployment: latestDeployment || undefined,
          vercelProjectId: site.vercelProjectId,
        })

      } catch (err: any) {
        healthChecks.push({
          id: site.id,
          subdomain: site.subdomain,
          name: site.name,
          status: 'error',
          message: `Health check failed: ${err.message}`,
          vercelProjectId: site.vercelProjectId,
        })
      }
    }

    return NextResponse.json({
      ok: true,
      healthChecks,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    )
  }
}
