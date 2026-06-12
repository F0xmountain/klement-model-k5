#!/usr/bin/env tsx
/**
 * Rebuilds lib/probability-snapshots.json from scratch out of lib/results.json:
 * one championship-probability snapshot per played match (simulate-tournament with
 * the Elo state up to that match). Run via tsx so it can import the TypeScript
 * model directly. Wired into update-results.yml, after fetch-results.mjs.
 */

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { buildSnapshots } from '../lib/probability-timeline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'lib', 'probability-snapshots.json')

const snapshots = buildSnapshots()
writeFileSync(OUT, JSON.stringify(snapshots, null, 2) + '\n', 'utf8')
console.log(`Wrote ${snapshots.length} probability snapshot(s).`)
