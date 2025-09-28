import { VERCEL_TOKEN, VERCEL_TEAM_ID } from '@/lib/config'

const VC_API = 'https://api.vercel.com'

function assertVercelToken() {
  if (!VERCEL_TOKEN) throw new Error('Missing VERCEL_TOKEN env var')
}

function debugLog(message: string, data?: any) {
  console.log(`[VERCEL API] ${message}`, data ? JSON.stringify(data, null, 2) : '')
}

export async function addDomainAliasToProject(projectId: string, domain: string): Promise<{ added: boolean; message?: string; debugInfo?: any }> {
  debugLog('Starting domain attachment', { projectId, domain })

  try {
    assertVercelToken()
    debugLog('Vercel token validation passed')
  } catch (err) {
    debugLog('Vercel token validation failed', { error: err })
    throw err
  }

  const url = new URL(`${VC_API}/v2/projects/${projectId}/domains`)
  if (VERCEL_TEAM_ID) {
    url.searchParams.set('teamId', VERCEL_TEAM_ID)
    debugLog('Using team ID', { teamId: VERCEL_TEAM_ID })
  } else {
    debugLog('No team ID configured - using personal account')
  }

  const requestBody = { name: domain }
  debugLog('Making API request', {
    url: url.toString(),
    method: 'POST',
    body: requestBody,
    hasToken: !!VERCEL_TOKEN,
    tokenPrefix: VERCEL_TOKEN ? `${VERCEL_TOKEN.substring(0, 8)}...` : 'none'
  })

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    })
    debugLog('API response received', {
      status: res.status,
      statusText: res.statusText
    })
  } catch (fetchErr) {
    debugLog('Fetch request failed', { error: fetchErr })
    throw new Error(`Network error during Vercel API call: ${fetchErr}`)
  }

  if (res.status === 409) {
    debugLog('Domain already attached (409)')
    return { added: true, message: 'Domain already attached', debugInfo: { status: 409 } }
  }

  if (!res.ok) {
    const text = await res.text()
    debugLog('API request failed', { status: res.status, responseText: text })
    throw new Error(`Vercel alias failed: ${res.status} ${text}`)
  }

  let message: string | undefined
  let responseData: any
  try {
    responseData = await res.json()
    debugLog('API response data', responseData)
    message = responseData?.verified ? 'Domain attached and verified' : 'Domain attached'
  } catch (parseErr) {
    debugLog('Failed to parse response JSON', { error: parseErr })
    message = 'Domain attached (response not parseable)'
  }

  debugLog('Domain attachment completed successfully', { message, responseData })
  return { added: true, message, debugInfo: { status: res.status, responseData } }
}

export async function removeDomainAliasFromProject(projectId: string, domain: string): Promise<{ removed: boolean }> {
  assertVercelToken()
  const url = new URL(`${VC_API}/v2/projects/${projectId}/domains/${encodeURIComponent(domain)}`)
  if (VERCEL_TEAM_ID) url.searchParams.set('teamId', VERCEL_TEAM_ID)

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (res.status === 404) return { removed: false }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vercel domain removal failed: ${res.status} ${text}`)
  }
  return { removed: true }
}
