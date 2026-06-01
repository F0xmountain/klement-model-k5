import type { Metadata } from 'next'
import { Press_Start_2P } from 'next/font/google'
import './globals.css'
import Nav from '@/components/ui/Nav'

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
})

export const metadata: Metadata = {
  title: 'WC26 Klement — World Cup 2026 Predictor',
  description:
    'An econometric model that called 2014, 2018 and 2022 correctly — now running on all 48 teams.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={pixelFont.variable}>
      <body className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
