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

  // Zet het opgeslagen thema vóór de eerste paint (geen flash-of-wrong-theme).
  // Default = dark (SSR rendert data-theme="dark"); alleen naar light flippen als
  // localStorage dat zegt. suppressHydrationWarning omdat dit script het attribuut
  // op <html> kan wijzigen vóórdat React hydrateert.
  const themeInit =
    "(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();"

  return (
    <html
      lang={locale}
      data-theme="dark"
      suppressHydrationWarning
      className={`${pixelFont.variable} ${displayFont.variable} ${bodyFont.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
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
