/**
 * fill-missing-squads-v2.mjs
 * Werkt met het GRATIS API-Football plan (max 10 calls/minuut).
 *
 * Gebruik:
 *   API_KEY=jouwsleutel node fill-missing-squads-v2.mjs --dry-run
 *   API_KEY=jouwsleutel node fill-missing-squads-v2.mjs
 *
 * Duurt ~90 seconden totaal (pauze na call 8 om rate limit te respecteren).
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, "squads-db.json");
const API_KEY   = process.env.API_KEY;
const DRY_RUN   = process.argv.includes("--dry-run");
const BASE      = "https://v3.football.api-sports.io";

if (!API_KEY) {
  console.error("❌  Gebruik: API_KEY=jouwsleutel node fill-missing-squads-v2.mjs");
  process.exit(1);
}

const TEAM_IDS = {
  "Tunisia":            202,
  "Egypt":              21,
  "Iran":               13,
  "New Zealand":        173,
  "Cape Verde Islands": 90,
  "Saudi Arabia":       26,
  "Iraq":               79,
  "Jordan":             80,
  "DR Congo":           82,
  "Uzbekistan":         88,
  "Ghana":              89,
  "Panama":             192,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function mapCategory(pos) {
  const p = (pos || "").toLowerCase();
  if (p.startsWith("goal")) return "goalkeeper";
  if (p.startsWith("def"))  return "defender";
  if (p.startsWith("mid"))  return "midfielder";
  if (p.startsWith("att") || p.startsWith("for")) return "attacker";
  return "unknown";
}

async function apiGet(endpoint, params = {}) {
  const url = new URL(`${BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString(), { headers: { "x-apisports-key": API_KEY } });
  const data = await res.json();
  // rate limit zit soms in body zonder HTTP 429
  if (data.errors?.rateLimit) throw new Error("RATELIMIT:" + data.errors.rateLimit);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return data.response || [];
}

async function fetchWithPause(endpoint, params, callCount) {
  // Na elke 8e call: pauzeer 70s zodat de minuut-limiet reset
  if (callCount > 0 && callCount % 8 === 0) {
    console.log(`\n  ⏸️  ${callCount} calls gedaan — wacht 70s voor rate limit reset...`);
    await sleep(70000);
    console.log("  ▶️  Verder!\n");
  }

  // Altijd 7s tussen calls (= max ~8/minuut, ruim onder de limiet van 10)
  await sleep(7000);

  try {
    return await apiGet(endpoint, params);
  } catch (err) {
    if (err.message.startsWith("RATELIMIT")) {
      // Toch een rate limit geraakt — wacht 70s en probeer opnieuw
      console.log("  ⏳ Onverwachte rate limit — wacht 70s...");
      await sleep(70000);
      return await apiGet(endpoint, params);
    }
    throw err;
  }
}

async function main() {
  console.log("🌍 WK 2026 — ontbrekende selecties aanvullen");
  console.log("=".repeat(50));

  const db   = JSON.parse(readFileSync(DB_PATH, "utf8"));
  const gaps = Object.entries(db.teams).filter(([, t]) => t.needs_api_fill);

  console.log(`Landen te vullen : ${gaps.length}`);
  console.log(`Strategie        : 7s tussen calls, pauze na elke 8`);
  console.log(`Geschatte tijd   : ~${Math.ceil(gaps.length * 7 / 60 + Math.floor(gaps.length / 8) * 70 / 60)} minuten\n`);

  let callCount = 0, filled = 0, failed = [];

  for (const [nlName, team] of gaps) {
    const teamId = TEAM_IDS[team.name_en];
    if (!teamId) {
      console.log(`  ❓ ${nlName}: geen ID gevonden`);
      failed.push(nlName);
      continue;
    }

    console.log(`  ⬇️  ${nlName}...`);
    const resp = await fetchWithPause("players/squads", { team: teamId }, callCount);
    callCount++;

    const players = resp[0]?.players || [];
    if (players.length === 0) {
      console.log(`       ⚠️  0 spelers — overgeslagen`);
      failed.push(nlName);
      continue;
    }

    team.squad = players.map((p) => ({
      name:     p.name,
      club:     null,
      position: p.position || null,
      category: mapCategory(p.position),
      number:   p.number ?? null,
      age:      p.age    ?? null,
      status:   "fit",
      source:   "api-football",
    }));
    team.squad_count    = team.squad.length;
    team.squad_complete = team.squad.length >= 23;
    team.needs_api_fill = false;
    filled++;
    console.log(`       ✅ ${team.squad.length} spelers`);
  }

  db.meta.teams_complete      = Object.values(db.teams).filter((t) => t.squad_complete).length;
  db.meta.teams_need_api_fill = Object.values(db.teams).filter((t) => t.needs_api_fill).length;
  db.meta.api_fill_run_at     = new Date().toISOString();

  console.log("\n" + "=".repeat(50));
  console.log(`📊 API-calls   : ${callCount}`);
  console.log(`✅ Aangevuld   : ${filled}/${gaps.length}`);
  console.log(`📈 Volledig    : ${db.meta.teams_complete}/48`);

  if (failed.length) {
    console.log(`\n❌ Mislukt (${failed.length}): ${failed.join(", ")}`);
  }

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN — niets opgeslagen.");
  } else {
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
    console.log(`\n💾 squads-db.json opgeslagen.`);
  }
}

main().catch((e) => {
  console.error("❌ Fout:", e.message);
  process.exit(1);
});
