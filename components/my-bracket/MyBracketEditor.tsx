'use client'
import { useTranslations } from 'next-intl'
import { ROUND_ORDER, resolveBracket, type MyPicks, type Round } from '@/lib/my-picks'
import MatchPickRow from './MatchPickRow'

type FullKey = 'r32Full' | 'r16Full' | 'qfFull' | 'sfFull' | 'finalFull'

interface Props {
  picks: MyPicks
  onPick: (round: Round, index: number, team: string) => void
  onCopy: () => void
  copied: boolean
}

export default function MyBracketEditor({ picks, onPick, onCopy, copied }: Props) {
  const tr = useTranslations('rounds')
  const tmb = useTranslations('myBracket')
  const resolved = resolveBracket(picks)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>{tmb('editorTitle')}</div>
        <button
          type="button"
          className="px-btn"
          onClick={onCopy}
          style={{
            fontFamily: 'inherit', fontSize: 8, padding: '10px 16px',
            backgroundColor: 'var(--color-o)', color: '#fff', border: 'none',
            boxShadow: '4px 4px 0 var(--color-o-sh)',
          }}
        >
          {copied ? tmb('copied') : tmb('copyBtn')}
        </button>
      </div>

      {ROUND_ORDER.map(round => (
        <div key={round} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', letterSpacing: 1, marginBottom: 10 }}>
            {tr(`${round}Full` as FullKey)}
          </div>
          {resolved[round].map((m, i) => (
            <MatchPickRow key={i} match={m} onPick={team => onPick(round, i, team)} />
          ))}
        </div>
      ))}
    </div>
  )
}
