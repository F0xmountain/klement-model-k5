import { redirect } from '@/i18n/navigation'

// Geconsolideerd (sessie 15, stap 5): de modeluitleg (formule, herkomst, quote)
// leeft nu op /model. Deze route blijft bestaan als redirect zodat oude /
// gedeelde URLs werken.
export default async function AboutRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect({ href: '/model', locale })
}
