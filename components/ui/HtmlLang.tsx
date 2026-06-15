'use client'
import { useEffect } from 'react'

// Houdt <html lang> in sync met de actieve locale. <html> leeft in de
// locale-onafhankelijke root-layout (default lang="en"); dit corrigeert het
// client-side per locale. Bewust géén html-attribuut in JSX op layout-niveau,
// zodat een taalwissel <html> (en dus data-theme) niet remount/reset.
export default function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  return null
}
