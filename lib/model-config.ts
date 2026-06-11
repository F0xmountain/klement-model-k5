import configOverrides from './model-config.json'

// Instelbare modelgewichten — geserveerd vanuit lib/model-config.json (geschreven
// via /admin/model-config). De defaults hieronder zijn de canonieke startwaarden;
// model-config.json bevat alleen de afwijkingen die de admin heeft opgeslagen.
export interface ModelWeights {
  // Klement-basisfactoren (som van gdp+pop+temp+fifa+host ≈ 0.87)
  gdp: number          // default 0.20
  pop: number          // default 0.15
  temp: number         // default 0.15
  fifa: number         // default 0.32 (teamsterkte-slot, gedeeld FIFA/Elo)
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
}

export const DEFAULT_WEIGHTS: ModelWeights = {
  gdp: 0.20,
  pop: 0.15,
  temp: 0.15,
  fifa: 0.32,
  host: 0.05,
  eloWeight: 0.30,
  formWeight: 0.15,
  leagueWeight: 0.10,
  marketWeight: 0.20,
  starPenalty1: 0.08,
  starPenalty2: 0.05,
  starPenalty3: 0.03,
}

// Som van de basisfactoren die rond 0.87 hoort te liggen (configurator-waarschuwing)
export const BASE_FACTOR_TARGET = 0.87

export function baseFactorSum(w: ModelWeights): number {
  return w.gdp + w.pop + w.temp + w.fifa + w.host
}

export function getModelWeights(): ModelWeights {
  return { ...DEFAULT_WEIGHTS, ...(configOverrides as Partial<ModelWeights>) }
}
