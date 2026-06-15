import { Press_Start_2P, Archivo, Inter } from 'next/font/google'
import './globals.css'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'

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

// Zet het opgeslagen thema op <html> vóór de eerste paint (geen flash, default
// 'dark'). Dit is de ROOT-layout: hij is locale-onafhankelijk en remount NIET bij
// een taalwissel (/nl ↔ /en wisselt alleen de inhoud onder [locale]). Daardoor
// blijft <html data-theme> staan bij een taalwissel — anders dan toen <html> in
// de [locale]-layout zat en bij elke taalwissel opnieuw werd opgebouwd (zonder het
// thema). data-theme staat bewust niet in de JSX zodat React het niet beheert;
// suppressHydrationWarning omdat het script <html> aanpast vóór React hydrateert.
const themeInit =
  "(function(){try{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang start op de default-locale (en) en wordt per pagina client-side bijgesteld
  // door <HtmlLang> in de [locale]-layout.
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${pixelFont.variable} ${displayFont.variable} ${bodyFont.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  )
}
