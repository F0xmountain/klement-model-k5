import Link from 'next/link'
import BracketView from '@/components/knockout/BracketView'
import PixelParticles from '@/components/ui/PixelParticles'

const ROUND_TABS = [
  { href: '/knockout/bracket', label: 'BRACKET' },
  { href: '/knockout/r32',    label: 'R32'     },
  { href: '/knockout/r16',    label: 'R16'     },
  { href: '/knockout/qf',     label: 'QF'      },
  { href: '/knockout/sf',     label: 'SF'      },
  { href: '/knockout/final',  label: 'FINAL'   },
]

export default function BracketPage() {
  return (
    <div className="page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="mix" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="ko-tabs">
          {ROUND_TABS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`ko-tab${href === '/knockout/bracket' ? ' active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div style={{ padding: '16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'var(--color-muted)', letterSpacing: 1 }}>
              FULL BRACKET - MODEL PREDICTIONS
            </span>
            <span style={{ fontSize: 8, color: 'var(--color-muted)' }}>
              <span style={{ color: 'var(--color-g)', marginRight: 4 }}>█</span>GREEN = MODEL PICK
              · CLICK ANY MATCH FOR DETAIL
            </span>
          </div>
          <BracketView />
        </div>
      </div>
    </div>
  )
}
