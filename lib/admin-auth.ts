import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'admin_auth'

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  return !!token && token === process.env.ADMIN_PASSWORD
}
