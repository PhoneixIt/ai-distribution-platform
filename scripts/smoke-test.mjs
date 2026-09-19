const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

const checks = [
  ['dashboard', '/', [200]],
  ['discovery page', '/discovery', [200]],
  ['partners page', '/partners', [200]],
  ['new partner page', '/partners/new', [200]],
  ['discovery API protection', '/api/discovery', [401, 503]],
  ['AI workforce page', '/workforce', [200]],
  ['AI workforce API protection', '/api/ai/workforce', [401]],
]

let failed = 0

for (const [name, path, expected] of checks) {
  try {
    const response = await fetch(`${baseUrl}${path}`)
    const ok = expected.includes(response.status)
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: HTTP ${response.status} (expected ${expected.join(' or ')})`)
    if (!ok) failed += 1
  } catch (error) {
    console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`)
    failed += 1
  }
}

if (failed) {
  console.error(`\nSmoke test failed: ${failed} check(s).`)
  process.exit(1)
}

console.log('\nSmoke test passed.')
