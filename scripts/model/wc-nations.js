/* eslint-disable */
// Reference data for every nation that played a World Cup 1994-2026 match.
// iso3: World Bank country code. latam: CONMEBOL + Mexico. temp: annual mean
// degrees C (static climate fact). gdp/pop fallbacks only for nations the World
// Bank does not cover reliably (e.g. North Korea). England/Scotland/Wales map to
// GBR (World Bank has no sub-UK series); a documented approximation. The data
// lives in lib/model/wc-nations.json so the browser route and these Node scripts
// share one source of truth.

const data = require('../../lib/model/wc-nations.json')

const NATIONS = data.nations
const HOSTS = {}
for (const [year, teams] of Object.entries(data.hosts)) HOSTS[Number(year)] = teams

module.exports = { NATIONS, HOSTS }
