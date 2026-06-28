#!/usr/bin/env node
/* eslint-disable */
// Standalone Node script: matches the CommonJS + eslint-disable convention of the
// other scripts in this directory, which are not part of the typed app build.
const { writeFileSync } = require('node:fs')
const { join } = require('node:path')

const API_URL = 'http://localhost:3000/api/optimize'
const OUT_PATH = join(__dirname, '..', 'lib', 'sensitivity', 'optimal-weights.json')
const SCHEMA_VERSION = 1
const REGENERATE =
  'From kalsh-main: npm run dev (starts server on http://localhost:3000), then in a ' +
  'second shell npm run export:weights.'

async function main() {
  const response = await fetch(API_URL)
  if (!response.ok) {
    throw new Error(`GET ${API_URL} returned ${response.status}`)
  }
  const result = await response.json()
  if (!result.optimalModel) {
    throw new Error('response has no optimalModel block; rebuild the API and retry')
  }
  writeFileSync(OUT_PATH, serialize(result.optimalModel))
  console.log(`wrote ${OUT_PATH}`)
}

function serialize(optimalModel) {
  const artifact = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    ...optimalModel,
    regenerate: REGENERATE,
  }
  return `${JSON.stringify(artifact, null, 2)}\n`
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
