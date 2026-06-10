// components/ui/PolymarketBtn.tsx

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { pmUrl } from '@/lib/polymarket'

interface Props {
  teamName?: string
  variant?: 'champion' | 'match'
}

export default function PolymarketBtn({ teamName, variant: _variant = 'match' }: Props) {
  const t = useTranslations('polymarket')
  const url = pmUrl(teamName)

  return (
    <div style={{ marginTop: 12, textAlign: 'center' }}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-btn"
        style={{
          fontFamily: 'var(--font-pixel), monospace',
          fontSize: 9,
          padding: '8px 14px',
          color: '#fff',
          background: 'var(--color-b)',
          border: '2px solid var(--color-b)',
          boxShadow: '3px 3px 0 var(--color-b-sh)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          textDecoration: 'none',
          letterSpacing: '0.5px',
          cursor: 'pointer',
        }}
      >
        {t('cta')}
        <Image
          src="/poly-logo.jpeg"
          alt="Polymarket"
          width={18}
          height={18}
          style={{ display: 'block' }}
        />
      </a>
      <div style={{
        fontSize: 6,
        color: 'var(--color-muted)',
        marginTop: 6,
        letterSpacing: '0.3px',
        lineHeight: 1.8,
      }}>
        {t('disclaimer')}
      </div>
    </div>
  )
}
