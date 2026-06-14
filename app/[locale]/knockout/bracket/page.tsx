import { redirect } from '@/i18n/navigation'

// Geconsolideerd (sessie 15, stap 3): de model-bracket leeft nu uitsluitend in de
// klement-tab van /my-bracket. Deze route blijft bestaan als redirect zodat oude /
// gedeelde URLs en de knockout-tabbalk-links blijven werken.
export default async function KnockoutBracketRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect({ href: { pathname: '/my-bracket', query: { tab: 'klement' } }, locale })
}
