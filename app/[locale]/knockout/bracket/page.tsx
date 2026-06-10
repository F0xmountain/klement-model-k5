import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import BracketView from '@/components/knockout/BracketView'
import PixelParticles from '@/components/ui/PixelParticles'

const ROUND_TABS = [
  { href: '/knockout/bracket', key: 'bracket' },
  { href: '/knockout/r32',    key: 'r32'     },
  { href: '/knockout/r16',    key: 'r16'     },
  { href: '/knockout/qf',     key: 'qf'      },
  { href: '/knockout/sf',     key: 'sf'      },
  { href: '/knockout/final',  key: 'final'   },
] as const

export default function BracketPage() {
  const tr = useTranslations('rounds')
  const tk = useTranslations('knockout')
  return (
    <div className="page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="mix" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="ko-tabs">
          {ROUND_TABS.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              className={`ko-tab${href === '/knockout/bracket' ? ' active' : ''}`}
            >
              {tr(key)}
            </Link>
          ))}
        </div>

        <div style={{ padding: '16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'var(--color-muted)', letterSpacing: 1 }}>
              {tk('bracketLegendTitle')}
            </span>
            <span style={{ fontSize: 8, color: 'var(--color-muted)' }}>
              <span style={{ color: 'var(--color-g)', marginRight: 4 }}>█</span>{tk('bracketLegend')}
            </span>
          </div>
          <BracketView />
        </div>
      </div>
    </div>
  )
}
