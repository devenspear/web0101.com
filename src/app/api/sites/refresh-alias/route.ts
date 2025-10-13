import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE_NAME, adminCookieOptions, readAdminSession } from '@/lib/admin-session'
import { VERCEL_TOKEN, VERCEL_TEAM_ID, ROOT_DOMAIN } from '@/lib/config'

export const dynamic = 'force-dynamic'

async function getLatestProductionURL(projectId: string): Promise<string | null> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured')
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
    throw new Error(`Failed to fetch deployments: ${res.status}`)
  }

  const data = await res.json()
  const latestDeployment = data.deployments?.[0]

  if (!latestDeployment) {
    throw new Error('No production deployment found')
  }

  return latestDeployment.url
}

async function updateDomainAlias(projectId: string, domain: string, deploymentUrl: string): Promise<void> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  // First, remove existing domain
  const deleteUrl = new URL(`https://api.vercel.com/v2/projects/${projectId}/domains/${encodeURIComponent(domain)}`)
  if (VERCEL_TEAM_ID) {
    deleteUrl.searchParams.set('teamId', VERCEL_TEAM_ID)
  }

  const deleteRes = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
    },
  })

  // Ignore 404 if domain wasn't attached
  if (!deleteRes.ok && deleteRes.status !== 404) {
    console.warn(`Warning: Failed to remove domain ${domain}: ${deleteRes.status}`)
  }

  // Wait a moment for DNS propagation
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Re-add domain to project
  const addUrl = new URL(`https://api.vercel.com/v2/projects/${projectId}/domains`)
  if (VERCEL_TEAM_ID) {
    addUrl.searchParams.set('teamId', VERCEL_TEAM_ID)
  }

  const addRes = await fetch(addUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
  })

  if (!addRes.ok && addRes.status !== 409) {
    const errorText = await addRes.text()
    throw new Error(`Failed to add domain: ${addRes.status} - ${errorText}`)
  }
}

export async function POST(req: Request) {
  const cookieStore = cookies()
  const session = readAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value)

  if (!session.valid) {
    const res = NextResponse.json({ ok: false, error: 'Session expired' }, { status: 401 })
    res.cookies.delete(ADMIN_COOKIE_NAME)
    return res
  }

  function respond(body: Record<string, unknown>, init?: ResponseInit) {
    const res = NextResponse.json(body, init)
    res.cookies.set(ADMIN_COOKIE_NAME, String(Date.now()), adminCookieOptions)
    return res
  }

  try {
    const body = await req.json()
    const { subdomain, vercelProjectId } = body

    if (!subdomain || !vercelProjectId) {
      return respond(
        { ok: false, error: 'Missing subdomain or vercelProjectId' },
        { status: 400 }
      )
    }

    const domain = `${subdomain}.${ROOT_DOMAIN}`

    // Get latest production deployment
    const latestDeploymentUrl = await getLatestProductionURL(vercelProjectId)

    if (!latestDeploymentUrl) {
      return respond(
        { ok: false, error: 'No production deployment found for this project' },
        { status: 404 }
      )
    }

    // Update the domain alias
    await updateDomainAlias(vercelProjectId, domain, latestDeploymentUrl)

    return respond({
      ok: true,
      message: `Successfully refreshed alias for ${domain}`,
      latestDeployment: latestDeploymentUrl,
    })
  } catch (err: any) {
    console.error('[REFRESH-ALIAS] Error:', err)
    return respond(
      { ok: false, error: err.message || 'Unexpected error' },
      { status: 500 }
    )
  }
}
