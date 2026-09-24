import assert from 'node:assert/strict'
import test from 'node:test'
import { createMissionDossierRecord, getDiscoveryMissionStage } from '../../src/lib/missions/dossiers.ts'

function candidate(id, qualificationStatus = 'qualified') {
  return {
    id,
    company_name: `Company ${id}`,
    website: `https://${id}.example`,
    country: 'Germany',
    customer_segments: ['mid-market'],
    services: ['managed security'],
    partner_types: ['mssp'],
    fit_score: 80,
    qualification_score: 90,
    qualification_status: qualificationStatus,
    qualification_reasons: ['Verified cybersecurity services'],
    concerns: [],
    evidence: [{ url: 'https://example.test/evidence' }],
  }
}

test('creates a mission dossier linked to its organization, mission, and persisted candidate', () => {
  const dossier = createMissionDossierRecord('org-1', 'mission-1', candidate('candidate-1'))

  assert.equal(dossier.org_id, 'org-1')
  assert.equal(dossier.mission_id, 'mission-1')
  assert.equal(dossier.candidate_id, 'candidate-1')
  assert.equal(dossier.company.name, 'Company candidate-1')
  assert.equal(dossier.intelligence.qualification_status, 'qualified')
  assert.deepEqual(dossier.people, [])
})

test('does not mark a mission dossier_ready below the contact-research threshold', () => {
  const ids = Array.from({ length: 9 }, (_, index) => `candidate-${index}`)
  assert.equal(getDiscoveryMissionStage(ids, ids), 'scored')
})

test('does not mark a mission dossier_ready unless every qualified candidate dossier persisted', () => {
  const ids = Array.from({ length: 10 }, (_, index) => `candidate-${index}`)
  assert.equal(getDiscoveryMissionStage(ids, ids.slice(0, 9)), 'scored')
  assert.equal(getDiscoveryMissionStage(ids, ids), 'dossier_ready')
})

test('does not mark a mission dossier_ready when there are no qualified candidates', () => {
  assert.equal(getDiscoveryMissionStage([], []), 'scored')
})

