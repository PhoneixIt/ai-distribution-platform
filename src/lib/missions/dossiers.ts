export type DiscoveryCandidateForDossier = {
  id: string
  company_name: string
  website: string | null
  country: string | null
  customer_segments: string[] | null
  services: string[] | null
  partner_types: string[] | null
  fit_score: number | null
  qualification_score: number | null
  qualification_status: string
  qualification_reasons: string[] | null
  concerns: string[] | null
  evidence: unknown
}

export function createMissionDossierRecord(
  orgId: string,
  missionId: string,
  candidate: DiscoveryCandidateForDossier,
) {
  return {
    org_id: orgId,
    mission_id: missionId,
    candidate_id: candidate.id,
    company: {
      name: candidate.company_name,
      website: candidate.website,
      country: candidate.country,
    },
    commercial: {
      customer_segments: candidate.customer_segments || [],
      services: candidate.services || [],
      partner_types: candidate.partner_types || [],
    },
    intelligence: {
      discovery_fit_score: candidate.fit_score,
      qualification_score: candidate.qualification_score,
      qualification_status: candidate.qualification_status,
      reasons: candidate.qualification_reasons || [],
      concerns: candidate.concerns || [],
      evidence: candidate.evidence,
    },
    people: [],
    recommended_action: {
      action: 'review_contact_and_prepare_personalized_outreach',
      rationale: 'Candidate passed the discovery qualification stage; review the evidence and contact context before outreach.',
    },
    status: 'ready',
  }
}

export function getDiscoveryMissionStage(
  qualifiedCandidateIds: string[],
  persistedDossierCandidateIds: string[],
): 'dossier_ready' | 'no_results' {
  const persistedIds = new Set(persistedDossierCandidateIds)
  const everyQualifiedCandidateHasDossier = qualifiedCandidateIds.every((id) => persistedIds.has(id))

  if (!qualifiedCandidateIds.length) return 'no_results'
  return everyQualifiedCandidateHasDossier ? 'dossier_ready' : 'no_results'
}

