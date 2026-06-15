import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Press_Start_2P, Archivo, Inter } from 'next/font/google'
import { hasLocale } from 'next-intl'
import { NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import '../globals.css'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import Nav from '@/components/ui/Nav'

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
})

// Broadcast-sans voor koppen/cijfers/scoreborden — breed en vet, ESPN-avondgevoel.
const displayFont = Archivo({
  weight: ['600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

// Rustige sans voor lopende tekst.
const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

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

  return (
    <html lang={locale} className={`${pixelFont.variable} ${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <NextIntlClientProvider>
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
      </body>
    </html>
  )
}
