import assert from 'node:assert/strict'
import test from 'node:test'
import { countFullyResearchedCandidates } from '../../src/agents/partner-discovery/runner.ts'

test('counts only candidates whose website research completed successfully', () => {
  const candidates = ['researched', 'partial', 'failed', 'unresearched'].map((researchStatus) => ({
    candidate: { researchStatus },
  }))

  assert.equal(countFullyResearchedCandidates(candidates), 1)
})
