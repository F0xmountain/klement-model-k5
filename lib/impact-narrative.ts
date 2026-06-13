// Narratieve duiding van een kampioenskans-verandering. De teksten zelf staan in
// de i18n-bestanden (impact.*); deze module kiest de juiste sleutel op basis van
// grootte en richting van de delta, en levert de invulwaarden. De component
// rendert via useTranslations (hard regel 5: geen hardcoded strings).

export type Translator = (key: string, values?: Record<string, string | number>) => string

// Drempel waaronder een effect verwaarloosbaar is (0.3 procentpunt).
export const NEGLIGIBLE = 0.003

export function isNegligible(delta: number): boolean {
  return Math.abs(delta) < NEGLIGIBLE
}

// i18n-sleutel (binnen namespace "impact") voor een gegeven delta.
export function deltaKey(delta: number): string {
  if (delta > 0.03) return 'strongGain'
  if (delta > 0.01) return 'moderateGain'
  if (delta >= NEGLIGIBLE) return 'slightGain'
  if (delta > -NEGLIGIBLE) return 'negligible'
  if (delta > -0.01) return 'slightLoss'
  if (delta >= -0.03) return 'moderateLoss'
  return 'strongLoss'
}

export interface NarrativeContext {
  group?: string
  winner?: string
}

// Eén zin over het effect op één team.
export function impactNarrative(t: Translator, teamName: string, delta: number, ctx: NarrativeContext = {}): string {
  return t(deltaKey(delta), { team: teamName, group: ctx.group ?? '', winner: ctx.winner ?? '' })
}

// 1 zin over wat de uitslag betekent voor het toernooi: de grootste winnaar staat
// centraal (die profiteert het meest van deze uitslag). Bij verwaarloosbare
// effecten een neutrale zin.
export function matchSummaryNarrative(
  t: Translator,
  params: {
    group: string
    biggestWinner: { team: string; delta: number }
    biggestLoser: { team: string; delta: number }
  },
): string {
  const { group, biggestWinner } = params
  if (isNegligible(biggestWinner.delta)) return t('negligible')
  return impactNarrative(t, biggestWinner.team, biggestWinner.delta, {
    group,
    winner: biggestWinner.team,
  })
}
