import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import Nav from '@/components/ui/Nav'
import HtmlLang from '@/components/ui/HtmlLang'

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)
  const t = await getTranslations('footer')

  // <html>/<body> + het thema-script leven in de root-layout (app/layout.tsx),
  // locale-onafhankelijk, zodat een taalwissel het thema-attribuut niet reset.
  // Deze layout rendert alleen de locale-afhankelijke inhoud.
  return (
    <NextIntlClientProvider>
      <HtmlLang locale={locale} />
      <div className="page-wrap">
        <Nav />
        <main>{children}</main>
        <footer className="footer">
          <span style={{ fontSize: 6, color: 'var(--color-muted)' }}>
            {t('copyright')}
          </span>
          <span style={{ fontSize: 6, color: 'var(--color-r)' }}>{t('source')}</span>
        </footer>
      </div>
    </NextIntlClientProvider>
  )
}
