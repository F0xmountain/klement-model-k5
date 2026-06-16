import Image from 'next/image'
import Link from 'next/link'

// Root 404-handler (app-router). Rendert binnen de root-layout, dus buiten de
// [locale]-laag — daarom geen nav/footer en geen next-intl. useTranslations is hier
// niet beschikbaar, dus de tekst staat bewust tweetalig (NL + EN) naast elkaar.
// Volledig token-gedreven, dus dark/light flipt mee.
export const metadata = {
  title: '404 — Reynaerds Den',
}

export default function NotFound() {
  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        gap: 4,
      }}
    >
      <Image
        src="/404_fox.png"
        alt="Een vos in pak die verdwaald om zich heen kijkt"
        width={420}
        height={280}
        priority
        sizes="(max-width: 480px) 80vw, 420px"
        style={{ width: 'auto', maxWidth: '100%', height: 'auto', marginBottom: 8 }}
      />

      <div className="eyebrow" style={{ marginBottom: 8 }}>ERROR 404</div>

      <h1
        className="font-display"
        style={{ fontSize: 'clamp(48px, 12vw, 96px)', color: 'var(--color-r)', margin: 0 }}
      >
        404
      </h1>

      <p style={{ fontSize: 14, color: 'var(--color-txt)', margin: '6px 0 0' }}>
        Pagina niet gevonden
      </p>
      <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: '2px 0 0' }}>
        Page not found
      </p>

      <Link
        href="/"
        className="px-btn font-display"
        style={{
          marginTop: 24,
          fontSize: 13,
          padding: '12px 24px',
          color: 'var(--color-r)',
          backgroundColor: 'var(--color-bg)',
          border: '2px solid var(--color-r)',
          boxShadow: '4px 4px 0 var(--color-r-sh)',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        ← Terug naar start · Back home
      </Link>
    </main>
  )
}
