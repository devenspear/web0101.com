import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ROOT_DOMAIN } from '@/lib/config'
import type { Site } from '@/lib/types'
import { commitSitesJson, fetchSitesAndSha } from '@/lib/github'
import { addDomainAliasToProject } from '@/lib/vercel'
import { ADMIN_COOKIE_NAME, adminCookieOptions, readAdminSession } from '@/lib/admin-session'

function toSlugSubdomain(input: string) {
  // normalize and replace whitespace with hyphens
  const base = input.toLowerCase().trim().replace(/\s+/g, '-')
  // remove any characters that are not allowed
  const cleaned = base.replace(/[^a-z0-9-]/g, '')
  // collapse multiple hyphens
  return cleaned.replace(/-+/g, '-')
}

export async function GET() {
  const { sites } = await fetchSitesAndSha()
  return NextResponse.json(sites, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  const cookieStore = cookies()
  const session = readAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value)
  if (!session.valid) {
    const res = NextResponse.json({ ok: false, error: 'Session expired. Please sign in again.' }, { status: 401 })
    res.cookies.delete(ADMIN_COOKIE_NAME)
    return res
  }

  function respond(body: Record<string, unknown>, init?: ResponseInit) {
    const res = NextResponse.json(body, init)
    res.cookies.set(ADMIN_COOKIE_NAME, String(Date.now()), adminCookieOptions)
    return res
  }

  const contentType = req.headers.get('content-type') || ''
  const wantsJson = (req.headers.get('accept') || '').includes('application/json')
  let name = ''
  let subdomain = ''
  let githubRepo = ''
  let vercelProjectId = ''

  if (contentType.includes('application/json')) {
    const body = await req.json()
    name = String(body.name || '')
    subdomain = String(body.subdomain || '')
    githubRepo = String(body.githubRepo || '')
    vercelProjectId = String(body.vercelProjectId || '')
  } else {
    const form = await req.formData()
    name = String(form.get('name') || '')
    subdomain = String(form.get('subdomain') || '')
    githubRepo = String(form.get('githubRepo') || '')
    vercelProjectId = String(form.get('vercelProjectId') || '')
  }

  if (!name || !subdomain) {
    const msg = 'Missing required fields'
    if (wantsJson) return respond({ ok: false, error: msg }, { status: 400 })
    const res = new NextResponse(msg, { status: 400 })
    res.cookies.set(ADMIN_COOKIE_NAME, String(Date.now()), adminCookieOptions)
    return res
  }

  const id = toSlugSubdomain(subdomain)
  // Validate final id
  if (!/^[a-z0-9-]{1,63}$/.test(id) || id.startsWith('-') || id.endsWith('-')) {
    const msg = 'Invalid subdomain. Use only letters, numbers, and hyphens.'
    if (wantsJson) return respond({ ok: false, error: msg }, { status: 400 })
    const res = new NextResponse(msg, { status: 400 })
    res.cookies.set(ADMIN_COOKIE_NAME, String(Date.now()), adminCookieOptions)
    return res
  }

  const domain = `${id}.${ROOT_DOMAIN}`
  const url = `https://${domain}`

  try {
    const { sites } = await fetchSitesAndSha()
    if (sites.some((s) => s.id === id)) {
      const msg = 'Subdomain already exists'
      if (wantsJson) return respond({ ok: false, error: msg }, { status: 409 })
      const conflict = new NextResponse(msg, { status: 409 })
      conflict.cookies.set(ADMIN_COOKIE_NAME, String(Date.now()), adminCookieOptions)
      return conflict
    }

    const site: Site = {
      id,
      name,
      subdomain: id,
      url,
      githubRepo: githubRepo || undefined,
      vercelProjectId: vercelProjectId || undefined,
      createdAt: new Date().toISOString(),
      status: 'active',
    }

    let aliasAdded = false
    let aliasMessage: string | undefined
    let debugInfo: any = {}

    // Try to attach domain alias if project is provided
    if (vercelProjectId) {
      console.log(`[SITES API] Attempting to attach domain ${domain} to project ${vercelProjectId}`)

      // Helper function to try domain attachment with potential ID variations
      async function tryDomainAttachment(projectId: string, attempt: number = 1): Promise<{added: boolean, message?: string, debugInfo?: any}> {
        try {
          const res = await addDomainAliasToProject(projectId, domain)
          return {
            added: !!res?.added,
            message: res?.message,
            debugInfo: res?.debugInfo || {}
          }
        } catch (e: any) {
          const errorMsg = e?.message || 'Unknown error'
          console.error(`[SITES API] Domain attachment attempt ${attempt} failed:`, e)

          // Check if it's a "project not found" error and suggest alternatives
          if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('forbidden')) {
            // Try common Vercel UI/API inconsistencies
            if (attempt === 1) {
              let alternativeId = projectId

              // Convert TD to Tb and vice versa (known Vercel UI/API issue)
              if (projectId.includes('TD')) {
                alternativeId = projectId.replace('TD', 'Tb')
                console.log(`[SITES API] Trying alternative project ID: ${alternativeId}`)
                return tryDomainAttachment(alternativeId, 2)
              } else if (projectId.includes('Tb')) {
                alternativeId = projectId.replace('Tb', 'TD')
                console.log(`[SITES API] Trying alternative project ID: ${alternativeId}`)
                return tryDomainAttachment(alternativeId, 2)
              }
            }

            return {
              added: false,
              message: `Project "${projectId}" not found. Verify the Project ID in your Vercel dashboard. Note: Vercel UI sometimes shows different characters than the API expects (TD vs Tb).`,
              debugInfo: {
                error: errorMsg,
                suggestion: 'Double-check Project ID from Vercel dashboard settings',
                attemptedIds: attempt === 1 ? [projectId] : [vercelProjectId, projectId]
              }
            }
          }

          return {
            added: false,
            message: `Domain attachment failed: ${errorMsg}`,
            debugInfo: { error: errorMsg, projectId, attempt }
          }
        }
      }

      const result = await tryDomainAttachment(vercelProjectId)
      aliasAdded = result.added
      aliasMessage = result.message
      debugInfo = result.debugInfo || {}

      console.log(`[SITES API] Final domain attachment result:`, { aliasAdded, aliasMessage, debugInfo })
    } else {
      console.log(`[SITES API] No Vercel project ID provided, skipping domain attachment`)
      aliasMessage = 'No Project ID provided - domain will not be attached to Vercel'
    }

    const nextSites = [...sites, site]
    await commitSitesJson(nextSites, `Add site: ${name} (${id})`)

    if (wantsJson) {
      return respond({ ok: true, site, aliasAdded, aliasMessage, debugInfo })
    } else {
      // Redirect back to admin
      const res = NextResponse.redirect(new URL('/admin', req.url))
      res.headers.set('Cache-Control', 'no-store')
      res.cookies.set(ADMIN_COOKIE_NAME, String(Date.now()), adminCookieOptions)
      return res
    }
  } catch (err: any) {
    const msg = err?.message || 'Unexpected error'
    if (wantsJson) return respond({ ok: false, error: msg }, { status: 500 })
    const res = new NextResponse(msg, { status: 500 })
    res.cookies.set(ADMIN_COOKIE_NAME, String(Date.now()), adminCookieOptions)
    return res
  }
}
