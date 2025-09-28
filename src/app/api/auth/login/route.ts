import { NextResponse } from 'next/server'
import { ADMIN_PASSWORD } from '@/lib/config'
import { ADMIN_COOKIE_NAME, adminCookieOptions } from '@/lib/admin-session'

export async function POST(req: Request) {
  const form = await req.formData()
  const password = String(form.get('password') || '')
  if (!ADMIN_PASSWORD) {
    return new NextResponse('Server is missing ADMIN_PASSWORD', { status: 500 })
  }
  if (password !== ADMIN_PASSWORD) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const res = NextResponse.redirect(new URL('/admin/dashboard', req.url))
  // Session cookie with one-hour inactivity TTL enforced server-side
  res.cookies.set(ADMIN_COOKIE_NAME, String(Date.now()), adminCookieOptions)
  return res
}
