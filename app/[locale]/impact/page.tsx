import MatchImpactView from '@/components/impact/MatchImpactView'
import { getMatchImpact } from '@/lib/match-impact'

export default function ImpactPage() {
  return <MatchImpactView data={getMatchImpact()} />
}
