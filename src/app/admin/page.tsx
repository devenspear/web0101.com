import { cookies } from 'next/headers'
import { getSites } from '@/lib/sites'
import { ROOT_DOMAIN } from '@/lib/config'
import AdminClient from '@/components/AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const admin = cookies().get('admin')?.value === '1'
  const sites = admin ? await getSites() : []
  if (!admin) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold mb-4">Admin login</h1>
        <form method="post" action="/api/auth/login" className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input name="password" type="password" className="mt-1 w-full rounded border px-3 py-2" required />
          </div>
          <button className="rounded bg-black text-white px-4 py-2">Sign in</button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 p-6 bg-white/80 shadow-lg backdrop-blur">
        <h1 className="text-2xl font-semibold mb-2">Create / link a prototype</h1>
        <p className="text-gray-600 mb-4">Add a record to the registry and optionally attach a subdomain to an existing Vercel project.</p>
        <AdminClient rootDomain={ROOT_DOMAIN} initialSites={sites} />
      </section>
    </div>
  )
}
