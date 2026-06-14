// Feature-flags voor nog niet afgeronde modeluitbreidingen.

// Hoogte-factor (Fase 2): teams uit een zeeniveau-land krijgen een kanspenalty op
// venues > 1500m, geschaald naar de genormaliseerde venue-hoogte (0–2500m). Teams
// uit een hooggelegen land (Mexico, Ecuador, …) zijn de hoogte gewend en krijgen
// geen penalty. Geactiveerd in het model én zichtbaar via de ⚠️-badge.
export const ALTITUDE_FACTOR_ENABLED = true
