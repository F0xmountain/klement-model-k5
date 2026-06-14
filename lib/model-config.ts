import configOverrides from './model-config.json'

// Instelbare modelgewichten — geserveerd vanuit lib/model-config.json (geschreven
// via /admin/model-config). De defaults hieronder zijn de canonieke startwaarden;
// model-config.json bevat alleen de afwijkingen die de admin heeft opgeslagen.
export interface ModelWeights {
  // Klement-basisfactoren (som van gdp+pop+temp+fifa+host = 1.00)
  gdp: number          // default 0.20
  pop: number          // default 0.15
  temp: number         // default 0.15
  fifa: number         // default 0.45 (teamsterkte-slot, gedeeld FIFA/Elo)
  host: number         // default 0.05
  // Uitbreidingsfactoren
  eloWeight: number    // default 0.30 (% van het fifa-slot dat naar Elo gaat)
  formWeight: number   // default 0.15
  leagueWeight: number // default 0.10
  marketWeight: number // default 0.20 (Polymarket-blend)
  // Sterspeler-penalty's (positieve getallen, toegepast als negatief — in %-punt)
  starPenalty1: number // default 0.08
  starPenalty2: number // default 0.05
  starPenalty3: number // default 0.03
  starPlayerScale: number // 0.5–2.0, default 1.0 — multiplier op alle sterspeler-penalty's
  // Bivariate Poisson correlatieparameter (lambda3) voor de scoreverdeling op /versus
  bivariateCorrelation: number // default 0.11, range 0.05–0.20 (Karlis-Ntzoufras 2003)
  // Aan/uit-schakelaars voor venue-gebonden factoren
  altitudeEnabled: boolean // default true
  travelEnabled: boolean   // default true
}

export const DEFAULT_WEIGHTS: ModelWeights = {
  gdp: 0.20,
  pop: 0.15,
  temp: 0.15,
  fifa: 0.45,
  host: 0.05,
  eloWeight: 0.30,
  formWeight: 0.15,
  leagueWeight: 0.10,
  marketWeight: 0.20,
  starPenalty1: 0.08,
  starPenalty2: 0.05,
  starPenalty3: 0.03,
  starPlayerScale: 1.0,
  bivariateCorrelation: 0.11,
  altitudeEnabled: true,
  travelEnabled: true,
}

// Som van de basisfactoren die rond 1.00 hoort te liggen (configurator-waarschuwing)
export const BASE_FACTOR_TARGET = 1.00

// Opslaan is alleen toegestaan als de basis-som binnen deze marge van 1.00 ligt;
// daarbuiten is de configuratie te ver weg om zinvol te zijn.
export const BASE_SUM_SAVE_MIN = 0.95
export const BASE_SUM_SAVE_MAX = 1.05

export function baseFactorSum(w: ModelWeights): number {
  return w.gdp + w.pop + w.temp + w.fifa + w.host
}

export function baseSumWithinSaveRange(w: ModelWeights): boolean {
  const s = baseFactorSum(w)
  return s >= BASE_SUM_SAVE_MIN && s <= BASE_SUM_SAVE_MAX
}

// Schaalt de basisfactoren (gdp/pop/temp/fifa/host) proportioneel zodat hun som
// exact BASE_FACTOR_TARGET (1.00) is. Uitbreidings- en sterspeler-gewichten
// blijven ongewijzigd.
export function normalizeBaseWeights(w: ModelWeights): ModelWeights {
  const sum = baseFactorSum(w)
  if (sum <= 0) return w
  const f = BASE_FACTOR_TARGET / sum
  return {
    ...w,
    gdp: w.gdp * f,
    pop: w.pop * f,
    temp: w.temp * f,
    fifa: w.fifa * f,
    host: w.host * f,
  }
}

export function getModelWeights(): ModelWeights {
  return { ...DEFAULT_WEIGHTS, ...(configOverrides as Partial<ModelWeights>) }
}
