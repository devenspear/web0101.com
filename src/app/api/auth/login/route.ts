import { NextResponse } from 'next/server'
import { ADMIN_PASSWORD } from '@/lib/config'

export async function POST(req: Request) {
  const form = await req.formData()
  const password = String(form.get('password') || '')
  if (!ADMIN_PASSWORD) {
    return new NextResponse('Server is missing ADMIN_PASSWORD', { status: 500 })
  }
  if (password !== ADMIN_PASSWORD) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const res = NextResponse.redirect(new URL('/admin', req.url))
  res.cookies.set('admin', '1', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}
