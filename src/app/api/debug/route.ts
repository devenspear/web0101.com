import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { VERCEL_TOKEN, VERCEL_TEAM_ID, ROOT_DOMAIN } from '@/lib/config'
import { ADMIN_COOKIE_NAME, readAdminSession } from '@/lib/admin-session'

export async function GET() {
  const cookieStore = cookies()
  const session = readAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value)

  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const debugInfo: any = {
    environment: {
      hasVercelToken: !!VERCEL_TOKEN,
      vercelTokenPrefix: VERCEL_TOKEN ? `${VERCEL_TOKEN.substring(0, 8)}...` : 'none',
      hasTeamId: !!VERCEL_TEAM_ID,
      teamId: VERCEL_TEAM_ID || 'none',
      rootDomain: ROOT_DOMAIN,
      nodeEnv: process.env.NODE_ENV,
    },
    timestamp: new Date().toISOString(),
  }

  // Test Vercel API access
  if (VERCEL_TOKEN) {
    try {
      const testUrl = `https://api.vercel.com/v2/user${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`
      const testRes = await fetch(testUrl, {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      })

      debugInfo.vercelApiTest = {
        status: testRes.status,
        ok: testRes.ok,
        statusText: testRes.statusText,
      }

      if (testRes.ok) {
        const userData = await testRes.json()
        debugInfo.vercelApiTest.user = {
          id: userData.user?.id,
          username: userData.user?.username,
          email: userData.user?.email,
        }
      } else {
        debugInfo.vercelApiTest.error = await testRes.text()
      }
    } catch (err: any) {
      debugInfo.vercelApiTest = {
        error: err.message,
        type: 'network_error'
      }
    }
  } else {
    debugInfo.vercelApiTest = {
      error: 'No VERCEL_TOKEN configured'
    }
  }

  return NextResponse.json(debugInfo)
}