import { redirect } from '@/i18n/navigation'

// Geconsolideerd (sessie 15, stap 5): de Monte Carlo-simulatie leeft nu op /model
// (component ModelMonteCarlo, via lib/simulate-tournament.ts). Deze route blijft
// bestaan als redirect zodat oude / gedeelde URLs werken.
export default async function McRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect({ href: '/model', locale })
}
