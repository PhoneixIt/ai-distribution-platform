import type { PartnerEvidenceSource } from './types'

export function findMatchingEvidence(evidence: PartnerEvidenceSource[], values: string[]): PartnerEvidenceSource[] {
  const needles = values.filter(Boolean).map((value) => value.trim().toLowerCase())
  if (!needles.length) return []
  return evidence.filter((source) => {
    const text = `${source.title} ${source.excerpt || ''}`.toLowerCase()
    return needles.some((needle) => text.includes(needle))
  })
}

export function deduplicateEvidence(evidence: PartnerEvidenceSource[]): PartnerEvidenceSource[] {
  const seen = new Set<string>()
  return evidence.filter((source) => {
    const key = `${source.url}|${source.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function formatEvidenceForDisplay(evidence: PartnerEvidenceSource[]): string {
  if (!evidence.length) return ''
  const urls = deduplicateEvidence(evidence).slice(0, 3).map((source) => source.url)
  return ` Sources: ${urls.join(', ')}`
}
