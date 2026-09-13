const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

const checks = [
  ['dashboard', '/'],
  ['discovery page', '/discovery'],
  ['partners page', '/partners'],
  ['new partner page', '/partners/new'],
  ['discovery API', '/api/discovery'],
]

let failed = 0

for (const [name, path] of checks) {
  try {
    const response = await fetch(`${baseUrl}${path}`)
    const ok = response.status < 500
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: HTTP ${response.status}`)
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
