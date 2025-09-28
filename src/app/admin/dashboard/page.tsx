import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSites } from '@/lib/sites'
import { ROOT_DOMAIN } from '@/lib/config'
import AdminClient from '@/components/AdminClient'
import { ADMIN_COOKIE_NAME, readAdminSession } from '@/lib/admin-session'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const session = readAdminSession(cookies().get(ADMIN_COOKIE_NAME)?.value)
  if (!session.valid) {
    redirect('/admin')
  }

  const sites = await getSites()

  return (
    <div className="min-h-screen bg-black">
      <div className="space-y-8">
        <section className="rounded-2xl border border-white/10 p-8 bg-white/5 shadow-2xl backdrop-blur-xl">
          <h1 className="text-2xl font-semibold mb-2 text-white/90">Create / link a prototype</h1>
          <p className="text-white/60 mb-6">Add a record to the registry and optionally attach a subdomain to an existing Vercel project.</p>
          <AdminClient rootDomain={ROOT_DOMAIN} initialSites={sites} />
        </section>
      </div>
    </div>
  )
}
